import { Injectable, Inject, HttpException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ReadingSession, Story, NarrativeMemory, NarrativeEvent, StoryPremise, StoryPlayableCharacter, SubscriptionType, ReadingSessionStatus, StoryVisibility, StoryModerationStatus, UserActionType } from '@prisma/client';
import { PrismaService } from '@common/prisma.service';
import { NarrativeEngine } from './narrative/narrative-engine.service';
import { NarrativeContextBuilder, StoryCodex } from './narrative/narrative-context.builder';
import { GenerateSceneInput, GenerateSceneResult } from './narrative/narrative-response.types';
import { GenerationBudgetGuard, GenerationBudgetInput, GenerationBudgetDecision } from './application/generation-budget.guard';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { NarrativePreferencesService } from '@modules/narrative-preferences/narrative-preferences.service';
import { getDefaultFreeModel, getDefaultPremiumModel } from '../ai/model-catalog';
import { throwReadingError, throwBudgetDenied, ReadingErrorCode } from './application/reading-errors';
import { FREE_DAILY_INTERACTION_LIMIT, FREE_ACTIVE_SESSION_LIMIT } from './application/reading.constants';

const READER_RECENT_EVENT_LIMIT = 8;

@Injectable()
export class ReadingOrchestratorService {
  private budgetGuard: GenerationBudgetGuard;
  private storyQualityService: StoryQualityService;

  constructor(
    @Inject(StoryQualityService) storyQualityService: StoryQualityService,
    private readonly narrativeEngine: NarrativeEngine,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Optional() private readonly narrativePrefs?: NarrativePreferencesService,
  ) {
    this.budgetGuard = new GenerationBudgetGuard();
    this.storyQualityService = storyQualityService;
  }

  private async getEffectiveNarrativePolicy(userId: string) {
    if (!this.narrativePrefs) return undefined;
    try {
      return await this.narrativePrefs.getEffectivePolicy(userId);
    } catch {
      return undefined;
    }
  }

  private isFreeLlmOnly(): boolean {
    const value = this.configService.get<boolean | string>('FREE_LLM_ONLY');
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase().trim() === 'true';
    return false;
  }

  async startNewSession(
    userId: string,
    storyId: string,
  ): Promise<ReadingSession> {
    const existingSession = await this.prisma.readingSession.findFirst({
      where: { userId, storyId, status: ReadingSessionStatus.ACTIVE },
    });

    if (existingSession) {
      return existingSession;
    }

    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      include: { premises: true, characters: true },
    });

    if (!story) {
      throwReadingError('Story not found.', ReadingErrorCode.STORY_NOT_FOUND, 404);
    }

    // Access check: only PUBLIC+APPROVED stories are accessible to all users
    // Private or non-approved stories require creator access
    this.assertCanAccessStory(story, userId);

    const session = await this.prisma.readingSession.create({
      data: {
        userId,
        storyId,
        currentSceneIndex: 0,
        status: ReadingSessionStatus.ACTIVE,
        startedAt: new Date(),
        lastSceneAt: new Date(),
      },
    });

    return session;
  }

  async getOrCreateCurrentSession(
    userId: string,
    storyId: string,
  ): Promise<ReadingSession | null> {
    let session = await this.prisma.readingSession.findFirst({
      where: { userId, storyId, status: ReadingSessionStatus.ACTIVE },
      orderBy: { lastSceneAt: 'desc' },
    });

    if (!session) {
      session = await this.startNewSession(userId, storyId);
    }

    return session;
  }

  async generateNextScene(
    userId: string,
    sessionId: string,
    action?: string,
    selectedModelId?: string,
    user?: any,
    selectedModel?: any,
    isCinematic?: boolean,
    narrativePolicy?: any,
    actionType: UserActionType = UserActionType.CHOICE,
  ): Promise<GenerateSceneResult & { session: ReadingSession; adPlacement?: any }> {
    const session = await this.prisma.readingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throwReadingError('Reading session not found.', ReadingErrorCode.READING_SESSION_NOT_FOUND, 404);
    }

    const story = await this.prisma.story.findUnique({
      where: { id: session.storyId },
    });

    if (!story) {
      throwReadingError('Story not found.', ReadingErrorCode.STORY_NOT_FOUND, 404);
    }

    const memory = await this.prisma.narrativeMemory.findUnique({
      where: { sessionId },
    });

    const previousEvents = await this.prisma.narrativeEvent.findMany({
      where: { sessionId },
      orderBy: { sceneIndex: 'desc' },
      take: 10,
    });

    const premise = session.selectedPremiseId
      ? await this.prisma.storyPremise.findUnique({
          where: { id: session.selectedPremiseId },
          include: { characters: true },
        })
      : await this.prisma.storyPremise.findFirst({
          where: { storyId: session.storyId },
          include: { characters: true },
        });

    const playableCharacter = session.selectedCharacterId
      ? await this.prisma.storyPlayableCharacter.findUnique({
          where: { id: session.selectedCharacterId },
        })
      : await this.prisma.storyPlayableCharacter.findFirst({
          where: { premiseId: premise?.id || session.selectedPremiseId },
        });

    const sceneIndex = session.currentSceneIndex + 1;

    const input: GenerateSceneInput = {
      userId,
      sessionId,
      story,
      session,
      action,
      actionType,
      selectedModelId: selectedModelId || undefined,
      sceneIndex,
      memory,
      previousEvents: previousEvents.reverse(),
      premise,
      playableCharacter,
      plan: user?.subscription?.type,
      walletBalance: user?.creditWallet?.balance,
      isCinematic,
      narrativePolicy,
    };

    let result: GenerateSceneResult;
    try {
      result = await this.narrativeEngine.generateScene(input);
    } catch (error) {
      this.mapNarrativeGenerationError(error);
    }

    let adPlacement: any = undefined;

    const dbResult = await this.prisma.$transaction(async (tx) => {
      const savedEvent = await tx.narrativeEvent.create({
        data: {
          sessionId,
          sceneIndex,
          chapterNumber: 1,
          sceneText: result.sceneText,
          choices: result.suggestedActions,
          userAction: action || 'continuar',
          userActionType: actionType,
          modelUsed: result.modelUsed,
          inputTokens: result.tokenUsage?.inputTokens || 0,
          outputTokens: result.tokenUsage?.outputTokens || 0,
          adultContentGenerated: narrativePolicy?.adultContentAllowed === true,
        },
      });

      if (result.memoryPatch) {
        await tx.narrativeMemory.upsert({
          where: { sessionId },
          create: {
            sessionId,
            summary: result.memoryPatch.summary || '',
            worldState: result.memoryPatch.worldState || '',
            characterState: result.memoryPatch.characterState || '',
            importantChoices: JSON.stringify(result.memoryPatch.importantChoices || []),
            openThreads: JSON.stringify(result.memoryPatch.openThreads || []),
            constraints: result.memoryPatch.constraints || '',
            sceneCount: sceneIndex,
            codex: result.memoryPatch.codex as any,
          },
          update: {
            summary: result.memoryPatch.summary,
            worldState: result.memoryPatch.worldState,
            characterState: result.memoryPatch.characterState,
            importantChoices: JSON.stringify(result.memoryPatch.importantChoices || []),
            openThreads: JSON.stringify(result.memoryPatch.openThreads || []),
            constraints: result.memoryPatch.constraints,
            sceneCount: sceneIndex,
            codex: result.memoryPatch.codex as any,
            updatedAt: new Date(),
          },
        });
      }

      const updatedSession = await tx.readingSession.update({
        where: { id: sessionId },
        data: {
          currentSceneIndex: sceneIndex,
          lastSceneAt: new Date(),
        },
      });

      let newWalletBalance: number | undefined = undefined;

      if (user && selectedModel) {
        if (user.subscription?.type === SubscriptionType.FREE) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const updatedLimit = await tx.dailyUsageLimit.upsert({
            where: {
              userId_date: {
                userId: user.id,
                date: today,
              },
            },
            create: {
              userId: user.id,
              date: today,
              limit: FREE_DAILY_INTERACTION_LIMIT,
              freeInteractionsUsed: 1,
            },
            update: {
              freeInteractionsUsed: { increment: 1 },
            },
          });

          const adInterval = 5;
          if (updatedLimit.freeInteractionsUsed > 0 && updatedLimit.freeInteractionsUsed % adInterval === 0) {
            await tx.adEvent.create({
              data: {
                userId: user.id,
                sessionId,
                storyId: session.storyId,
                type: 'INTERSTITIAL',
              },
            });
            adPlacement = {
              type: 'INTERSTITIAL',
              reason: `Free tier - ad shown every ${adInterval} interactions`,
            };
          }
        }

        if (selectedModel.tier === 'CREDITS' && user?.creditWallet) {
          const creditCost = selectedModel.creditCost || 0;
          if (creditCost <= 0) {
            throwReadingError('Invalid credit cost.', ReadingErrorCode.INSUFFICIENT_CREDITS, 402);
          }
          const { count } = await tx.creditWallet.updateMany({
            where: { id: user.creditWallet.id, balance: { gte: creditCost } },
            data: { balance: { decrement: creditCost } },
          });
          if (count === 0) {
            throwReadingError('Insufficient credits.', ReadingErrorCode.INSUFFICIENT_CREDITS, 402);
          }
          await tx.creditTransaction.create({
            data: {
              walletId: user.creditWallet.id,
              type: 'SPEND',
              amount: -creditCost,
              reason: 'SCENE_GENERATION',
              metadata: { modelId: selectedModel.id, mode: isCinematic ? 'cinematic' : 'standard', sessionId },
            },
          });
          newWalletBalance = (user.creditWallet.balance || 0) - creditCost;
        }

        await tx.modelUsage.create({
          data: {
            userId: user.id,
            sessionId,
            model: result.modelUsed,
            inputTokens: result.tokenUsage?.inputTokens || 0,
            outputTokens: result.tokenUsage?.outputTokens || 0,
            costUsed: 0,
            feature: 'SCENE_GENERATION',
          },
        });
      }

      return {
        savedEvent,
        updatedSession,
        newWalletBalance,
      };
    });

    return {
      ...result,
      session: dbResult.updatedSession,
      adPlacement,
    };
  }

  async getCurrentScene(sessionId: string): Promise<NarrativeEvent | null> {
    const session = await this.prisma.readingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return null;

    const event = await this.prisma.narrativeEvent.findFirst({
      where: { sessionId },
      orderBy: { sceneIndex: 'desc' },
    });

    return event;
  }

  async getSession(sessionId: string): Promise<ReadingSession | null> {
    return this.prisma.readingSession.findUnique({
      where: { id: sessionId },
    });
  }

  async getSessionWithStory(sessionId: string): Promise<(ReadingSession & { story: Story }) | null> {
    return this.prisma.readingSession.findUnique({
      where: { id: sessionId },
      include: { story: true },
    });
  }

  async saveScene(
    sessionId: string,
    sceneIndex: number,
    content: string,
  ): Promise<NarrativeEvent> {
    return this.prisma.narrativeEvent.create({
      data: {
        sessionId,
        sceneIndex,
        chapterNumber: 1,
        sceneText: content,
        userAction: 'manual_save',
        userActionType: 'CHOICE',
        modelUsed: 'manual',
        inputTokens: 0,
        outputTokens: 0,
      },
    });
  }

  async getSessionHistory(sessionId: string): Promise<NarrativeEvent[]> {
    return this.prisma.narrativeEvent.findMany({
      where: { sessionId },
      orderBy: { sceneIndex: 'asc' },
    });
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.readingSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new Error('Session not found or unauthorized');
    }

    await this.prisma.narrativeEvent.deleteMany({ where: { sessionId } });
    await this.prisma.narrativeMemory.deleteMany({ where: { sessionId } });
    await this.prisma.readingSession.delete({ where: { id: sessionId } });
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.prisma.readingSession.findMany({
      where: { userId },
    });

    for (const session of sessions) {
      await this.deleteSession(session.id, userId);
    }
  }

  async advanceScene(sessionId: string): Promise<ReadingSession> {
    return this.prisma.readingSession.update({
      where: { id: sessionId },
      data: {
        currentSceneIndex: { increment: 1 },
        lastSceneAt: new Date(),
      },
    });
  }

  async getPremisesByStoryId(storyId: string): Promise<StoryPremise[]> {
    return this.prisma.storyPremise.findMany({
      where: { storyId },
    });
  }

  async getMemory(sessionId: string): Promise<NarrativeMemory | null> {
    return this.prisma.narrativeMemory.findUnique({
      where: { sessionId },
    });
  }

  async getEvents(sessionId: string, limit?: number): Promise<NarrativeEvent[]> {
    return this.prisma.narrativeEvent.findMany({
      where: { sessionId },
      orderBy: { sceneIndex: 'desc' },
      take: limit,
    });
  }

  async getStoryWithPremises(storyId: string): Promise<any> {
    return this.prisma.story.findUnique({
      where: { id: storyId },
      include: {
        characters: true,
        premises: {
          include: {
            characters: true,
          },
        },
      },
    });
  }

  async getUserWithSubscription(userId: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true, creditWallet: true },
    });
  }

  async findActiveSession(
    userId: string,
    storyId: string,
    premiseId?: string | null,
    characterId?: string | null,
  ): Promise<any> {
    return this.prisma.readingSession.findFirst({
      where: {
        userId,
        storyId,
        status: ReadingSessionStatus.ACTIVE,
        selectedPremiseId: premiseId ?? null,
        selectedCharacterId: characterId ?? null,
      },
      include: {
        narrativeEvents: {
          orderBy: {
            generatedAt: 'desc',
          },
        },
      },
    });
  }

  async getSessionEvents(sessionId: string, take?: number): Promise<any[]> {
    return this.prisma.narrativeEvent.findMany({
      where: { sessionId },
      orderBy: { generatedAt: 'desc' },
      take,
    });
  }

  async createSession(userId: string, storyId: string, setupData: any): Promise<any> {
    return this.prisma.readingSession.create({
      data: {
        userId,
        storyId,
        currentChapter: 1,
        currentSceneIndex: 0,
        ...setupData,
      },
    });
  }

  async createAdEvent(userId: string, sessionId: string, storyId: string, type: string): Promise<any> {
    return this.prisma.adEvent.create({
      data: {
        userId,
        sessionId,
        storyId,
        type: type as any,
        provider: 'MOCK',
      },
    });
  }

  async getCreditWallet(userId: string): Promise<any> {
    return this.prisma.creditWallet.findUnique({ where: { userId } });
  }

  async findSessionById(sessionId: string): Promise<any> {
    return this.prisma.readingSession.findUnique({
      where: { id: sessionId },
    });
  }

  async findStoryById(storyId: string): Promise<any> {
    return this.prisma.story.findUnique({
      where: { id: storyId },
    });
  }

  async findMemoryBySessionId(sessionId: string): Promise<any> {
    return this.prisma.narrativeMemory.findUnique({
      where: { sessionId },
    });
  }

  async findEventsBySessionId(sessionId: string, orderBy?: any, take?: number): Promise<any[]> {
    return this.prisma.narrativeEvent.findMany({
      where: { sessionId },
      orderBy: orderBy || { sceneIndex: 'desc' },
      take,
    });
  }

  async createNarrativeEvent(data: any): Promise<any> {
    return this.prisma.narrativeEvent.create({
      data,
    });
  }

  async updateReadingSession(sessionId: string, data: any): Promise<any> {
    return this.prisma.readingSession.update({
      where: { id: sessionId },
      data,
    });
  }

  async createModelUsage(data: any): Promise<any> {
    return this.prisma.modelUsage.create({
      data,
    });
  }

  async updateDailyUsageLimit(userId: string, date: Date, data?: any): Promise<any> {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    return this.prisma.dailyUsageLimit.update({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      data: data || { freeInteractionsUsed: { increment: 1 } },
    });
  }

  async updateCreditWallet(walletId: string, data: any): Promise<any> {
    return this.prisma.creditWallet.update({
      where: { id: walletId },
      data,
    });
  }

  async createCreditTransaction(data: any): Promise<any> {
    return this.prisma.creditTransaction.create({
      data,
    });
  }

  async updateNarrativeMemory(sessionId: string, data: any): Promise<any> {
    return this.prisma.narrativeMemory.update({
      where: { sessionId },
      data,
    });
  }

  async findLatestNarrativeEvent(sessionId: string): Promise<any> {
    return this.prisma.narrativeEvent.findFirst({
      where: { sessionId },
      orderBy: { sceneIndex: 'desc' },
    });
  }

  async findSessions(where: any, page: number, limit: number): Promise<any[]> {
    return this.prisma.readingSession.findMany({
      where,
      include: {
        story: { select: { title: true, coverUrl: true } },
        premise: { select: { title: true, coverUrl: true } },
        character: { select: { name: true, imageUrl: true } },
      },
      skip: (page -1) * limit,
      take: limit,
      orderBy: { lastSceneAt: 'desc' },
    });
  }

  async countSessions(where: any): Promise<number> {
    return this.prisma.readingSession.count({ where });
  }

  async createFreeSessionWithLimitTransaction(userId: string, storyId: string, setupData: any): Promise<any> {
    const activeSessionCount = await this.prisma.readingSession.count({
      where: {
        userId,
        status: ReadingSessionStatus.ACTIVE,
      },
    });

    if (activeSessionCount >= FREE_ACTIVE_SESSION_LIMIT) {
      throwReadingError('Free users can have up to 3 active stories. Abandon one story or upgrade to Premium.', ReadingErrorCode.DAILY_LIMIT_REACHED, 402);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Keep the write transaction short so it remains compatible with PgBouncer
    // transaction pooling and a single Prisma connection in production.
    const [newSession] = await this.prisma.$transaction([
      this.prisma.readingSession.create({
        data: {
          userId,
          storyId,
          currentChapter: 1,
          currentSceneIndex: 0,
          ...setupData,
        },
      }),
      this.prisma.dailyUsageLimit.update({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        data: {
          freeInteractionsUsed: { increment: 1 },
        },
      }),
    ], {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    });

    return newSession;
  }

  async findDailyUsageLimit(userId: string, date: Date): Promise<any> {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    return this.prisma.dailyUsageLimit.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });
  }

  async createDailyUsageLimit(userId: string, date: Date): Promise<any> {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    return this.prisma.dailyUsageLimit.create({
      data: {
        userId,
        date: today,
        freeInteractionsUsed: 0,
        limit: FREE_DAILY_INTERACTION_LIMIT,
      },
    });
  }

  async generateFirstScene(
    session: any,
    userId: string,
    plan?: SubscriptionType,
    walletBalance?: number,
    premise?: any,
    character?: any,
    selectedModelId?: string,
    isCinematic?: boolean,
    narrativePolicy?: any,
  ): Promise<{ id: string; chapterNumber: number; sceneIndex: number; sceneText: string; choices: string[]; sceneMetadata?: { emotion?: string; pacing?: string } }> {
    await this.createInitialMemory(session.id, session.story || await this.findStoryById(session.storyId), premise, character);

    const narrativeMemory = await this.findMemoryBySessionId(session.id);

    const story = session.story || await this.findStoryById(session.storyId);

    const input: GenerateSceneInput = {
      userId,
      sessionId: session.id,
      story,
      session,
      action: 'início',
      selectedModelId,
      sceneIndex: 0,
      memory: narrativeMemory,
      premise,
      playableCharacter: character,
      plan,
      walletBalance,
      isCinematic,
      isFirstScene: true,
      narrativePolicy,
    };

    let result: GenerateSceneResult;
    try {
      result = await this.narrativeEngine.generateScene(input);
    } catch (error) {
      this.mapNarrativeGenerationError(error);
    }

    const narrativeEvent = await this.createNarrativeEvent({
      sessionId: session.id,
      chapterNumber: 1,
      sceneIndex: 0,
      sceneText: result.sceneText,
      choices: result.suggestedActions,
      userAction: 'Início da história',
      userActionType: 'FREE_TEXT',
      modelUsed: result.modelUsed,
      inputTokens: result.tokenUsage?.inputTokens || 0,
      outputTokens: result.tokenUsage?.outputTokens || 0,
      adultContentGenerated: narrativePolicy?.adultContentAllowed === true,
    });

    await this.updateReadingSession(session.id, { currentSceneIndex: 0 });

    await this.createModelUsage({
      userId,
      sessionId: session.id,
      model: result.modelUsed,
      inputTokens: result.tokenUsage?.inputTokens || 0,
      outputTokens: result.tokenUsage?.outputTokens || 0,
      costUsed: 0,
      feature: 'SCENE_GENERATION',
    });

    if (result.memoryPatch) {
      await this.updateNarrativeMemory(session.id, {
        summary: result.memoryPatch.summary || narrativeMemory?.summary || '',
        worldState: result.memoryPatch.worldState || narrativeMemory?.worldState || '',
        characterState: result.memoryPatch.characterState || narrativeMemory?.characterState || '',
        importantChoices: JSON.stringify(result.memoryPatch.importantChoices || []),
        openThreads: JSON.stringify(result.memoryPatch.openThreads || []),
        constraints: result.memoryPatch.constraints || narrativeMemory?.constraints || '',
        sceneCount: 1,
        codex: result.memoryPatch.codex as any,
      });
    }

    return {
      id: narrativeEvent.id,
      chapterNumber: narrativeEvent.chapterNumber,
      sceneIndex: narrativeEvent.sceneIndex,
      sceneText: narrativeEvent.sceneText,
      choices: result.suggestedActions,
      sceneMetadata: result.sceneMetadata,
    };
  }

  private assertCanAccessStory(story: any, userId: string): void {
    const isPublicAndApproved = story.visibility === StoryVisibility.PUBLIC &&
      story.moderationStatus === StoryModerationStatus.APPROVED;

    if (!isPublicAndApproved) {
      if (story.creatorUserId !== userId) {
        throwReadingError('You do not have access to this story.', ReadingErrorCode.STORY_NOT_FOUND, 404);
      }
    }
  }

  private async createInitialMemory(sessionId: string, story: any, premise?: any, character?: any): Promise<void> {
    const charactersList = NarrativeContextBuilder.buildStoryCharacters(story, premise, character)
      .map((c: any) => {
        const traits = [
          c.description || 'personagem',
          c.personality ? `personalidade: ${c.personality}` : '',
          c.motivation ? `motivacao: ${c.motivation}` : '',
          c.relationshipToPlayer ? `relacao: ${c.relationshipToPlayer}` : '',
          c.initialGoal ? `objetivo: ${c.initialGoal}` : '',
          c.conflictPotential ? `conflito: ${c.conflictPotential}` : '',
        ].filter(Boolean).join('; ');
        return `${c.name} (${c.role}): ${traits}`;
      })
      .join('\n');

    const summary = [
      `Historia: ${story.title}`,
      `Sinopse: ${premise?.synopsis || story.synopsis}`,
      premise?.title ? `Premissa selecionada: ${premise.title}` : '',
      character?.name ? `Protagonista selecionado: ${character.name} (${character.roleLabel})` : '',
      character?.startingSituation ? `Ponto de partida do personagem: ${character.startingSituation}` : '',
    ].filter(Boolean).join('\n');
    const worldState = premise?.worldRules || story.worldRules || '';
    const characterState = [
      charactersList,
      character ? `${character.name} (${character.roleLabel}): ${character.personality || character.description || 'personagem jogavel'}; objetivo inicial: ${character.initialGoal || 'N/A'}; ponto de partida: ${character.startingSituation || 'N/A'}` : '',
    ].filter(Boolean).join('\n');
    const constraints = `Tom: ${premise?.tone || story.tone || 'neutro'}\nEstilo: ${premise?.styleGuide || story.styleGuide || 'narrativo'}`;

    const initialCodex = NarrativeContextBuilder.createInitialCodex({
      story: { ...story, characters: NarrativeContextBuilder.buildStoryCharacters(story, premise, character) },
      premise: premise ? { title: premise.title, synopsis: premise.synopsis, tone: premise.tone, styleGuide: premise.styleGuide, worldRules: premise.worldRules } : null,
      character: character ? { name: character.name, roleLabel: character.roleLabel, narrativeFunction: character.narrativeFunction, personality: character.personality, motivation: character.motivation, secret: character.secret, relationshipToPlayer: character.relationshipToPlayer, initialGoal: character.initialGoal, startingSituation: character.startingSituation, conflictPotential: character.conflictPotential } : null,
    });

    await this.prisma.narrativeMemory.upsert({
      where: { sessionId },
      create: {
        sessionId,
        summary,
        worldState,
        characterState,
        importantChoices: '',
        openThreads: '',
        constraints,
        sceneCount: 0,
        codex: initialCodex as any,
      },
      update: {},
    });
  }

  private buildPremiseContextForOrchestrator(premise?: any) {
    if (!premise) return null;
    return {
      title: premise.title,
      synopsis: premise.synopsis,
      basePrompt: premise.basePrompt,
      openingScene: premise.openingScene,
      tone: premise.tone,
      styleGuide: premise.styleGuide,
      worldRules: premise.worldRules,
    };
  }

  private buildCharacterContextForOrchestrator(character?: any) {
    if (!character) return null;
    return {
      name: character.name,
      roleLabel: character.roleLabel,
      narrativeFunction: character.narrativeFunction,
      personality: character.personality,
      motivation: character.motivation,
      secret: character.secret,
      relationshipToPlayer: character.relationshipToPlayer,
      initialGoal: character.initialGoal,
      startingSituation: character.startingSituation,
      conflictPotential: character.conflictPotential,
    };
  }

  private async updateNarrativeMemorySimple(
    sessionId: string,
    userAction: string,
    sceneText: string,
    choices: string[],
    characters?: { name: string; role: string; description?: string }[],
  ): Promise<void> {
    const memory = await this.findMemoryBySessionId(sessionId);
    if (!memory) return;

    await this.updateNarrativeMemory(sessionId, {
      sceneCount: { increment: 1 },
    });
  }

  async startReading(userId: string, dto: any): Promise<any> {
    const [story, user, usage] = await Promise.all([
      this.getStoryWithPremises(dto.storyId),
      this.getUserWithSubscription(userId),
      this.getOrCreateDailyLimit(userId),
    ]);

    const narrativePolicy = await this.getEffectiveNarrativePolicy(userId);

    if (!story) {
      throwReadingError('Story not found.', ReadingErrorCode.STORY_NOT_FOUND, 404);
    }

    // Access check: only PUBLIC+APPROVED stories are accessible to all users
    // Private or non-approved stories require creator access
    this.assertCanAccessStory(story, userId);

    // Validate story quality before starting reading
    await this.storyQualityService.validateStoryQuality(story.id);

    if (story.isPremium && user?.subscription?.type === SubscriptionType.FREE) {
      throwReadingError('This story requires a Premium subscription.', ReadingErrorCode.PREMIUM_REQUIRED, 402);
    }

    let selectedPremise: any = null;
    let selectedCharacter: any = null;

    if (dto.premiseId) {
      selectedPremise = story.premises?.find((p: any) => p.id === dto.premiseId);
    }

    if (dto.characterId && selectedPremise) {
      const allCharacters = story.premises?.flatMap((p: any) => p.characters || []) || [];
      selectedCharacter = allCharacters.find((c: any) => c.id === dto.characterId);
    }

    const existingSession = await this.findActiveSession(
      userId,
      dto.storyId,
      selectedPremise?.id,
      selectedCharacter?.id,
    );

    if (existingSession) {
      const events = await this.getSessionEvents(existingSession.id, READER_RECENT_EVENT_LIMIT);
      if (events.length === 0) {
        // Call guard before generateFirstScene
        const budgetInput: GenerationBudgetInput = {
          userId,
          subscriptionType: user?.subscription?.type || SubscriptionType.FREE,
          requestedModelId: undefined,
          dailyUsageCount: usage.freeInteractionsUsed,
          dailyUsageLimit: usage.limit,
          creditBalance: user?.creditWallet?.balance,
          isCinematicMode: false,
          isFirstScene: true,
          freeLlmOnly: this.isFreeLlmOnly(),
        };

        const decision = this.budgetGuard.decide(budgetInput);
        if (!decision.allowed) {
          throwBudgetDenied(decision.blockReason || 'Model access denied.');
        }

        const firstScene = await this.generateFirstScene(
          existingSession,
          userId,
          user?.subscription?.type,
          user?.creditWallet?.balance,
          selectedPremise,
          selectedCharacter,
           decision.finalModel.id,
           false,
           narrativePolicy,
        );
        return {
          session: {
            ...this.formatSession(existingSession),
            currentScene: firstScene,
            history: [],
          },
          usage: this.formatUsage(usage, user?.creditWallet?.balance),
        };
      }
      const scene = events[0];
      return {
        session: {
          ...this.formatSession(existingSession),
          currentScene: this.formatScene(scene),
          history: events.slice(1).map((e: any) => this.formatScene(e)),
        },
        usage: this.formatUsage(usage, user?.creditWallet?.balance),
      };
    }

    // Call guard BEFORE creating session to avoid orphaned sessions
    const budgetInput: GenerationBudgetInput = {
      userId,
      subscriptionType: user?.subscription?.type || SubscriptionType.FREE,
      requestedModelId: undefined,
      dailyUsageCount: usage.freeInteractionsUsed,
      dailyUsageLimit: usage.limit,
      creditBalance: user?.creditWallet?.balance,
      isCinematicMode: false,
      isFirstScene: true,
      freeLlmOnly: this.isFreeLlmOnly(),
    };

    const decision = this.budgetGuard.decide(budgetInput);
    if (!decision.allowed) {
      throwBudgetDenied(decision.blockReason || 'Model access denied.');
    }

    const sessionSetupData = this.buildSessionSetupData(selectedPremise, selectedCharacter);
    let session: any;

    if (user?.subscription?.type === SubscriptionType.FREE) {
      session = await this.createFreeSessionWithLimit(userId, dto.storyId, sessionSetupData);
    } else {
      session = await this.createSession(userId, dto.storyId, sessionSetupData);
    }

    const firstScene = await this.generateFirstScene(
      session,
      userId,
      user?.subscription?.type,
      user?.creditWallet?.balance,
      selectedPremise,
      selectedCharacter,
      decision.finalModel.id,
      false,
      narrativePolicy,
    );

    let adPlacement: any = undefined;
    if (user?.subscription?.type === SubscriptionType.FREE) {
      await this.createAdEvent(userId, session.id, dto.storyId, 'INTERSTITIAL');
      adPlacement = {
        type: 'INTERSTITIAL',
        reason: 'Free tier - ad shown on story start',
      };
    }

    const freshUsage = await this.getOrCreateDailyLimit(userId);
    const creditBalance = user?.subscription?.type === SubscriptionType.PREMIUM ? undefined : user?.creditWallet?.balance;

    return {
      session: {
        ...this.formatSession(session),
        currentScene: {
          ...firstScene,
          adPlacement,
        },
        history: [],
      },
      usage: this.formatUsage(freshUsage, creditBalance),
    };
  }

  async getSessionWithStatus(userId: string, sessionId: string): Promise<any> {
    const sessionWithStory = await this.getSessionWithStory(sessionId);

    if (!sessionWithStory) {
      throwReadingError('Reading session not found.', ReadingErrorCode.READING_SESSION_NOT_FOUND, 404);
    }

    if (sessionWithStory.userId !== userId) {
      throwReadingError('Reading session not found.', ReadingErrorCode.READING_SESSION_NOT_FOUND, 404);
    }

    // Access check: only PUBLIC+APPROVED stories are accessible to all users
    // Private or non-approved stories require creator access
    this.assertCanAccessStory(sessionWithStory.story, userId);

    const [user, usage, events, narrativePolicy] = await Promise.all([
      this.getUserWithSubscription(userId),
      this.getOrCreateDailyLimit(userId),
      this.getSessionEvents(sessionId, READER_RECENT_EVENT_LIMIT),
      this.getEffectiveNarrativePolicy(userId),
    ]);

    if (events.length === 0) {
      const premise = sessionWithStory.selectedPremiseId
        ? await this.prisma.storyPremise.findUnique({
            where: { id: sessionWithStory.selectedPremiseId },
            include: { characters: true },
          })
        : null;
      const character = sessionWithStory.selectedCharacterId && premise
        ? await this.prisma.storyPlayableCharacter.findFirst({
            where: { id: sessionWithStory.selectedCharacterId, premiseId: premise.id },
          })
        : null;

      // Call guard before generateFirstScene
      const budgetInput: GenerationBudgetInput = {
        userId,
        subscriptionType: user?.subscription?.type || SubscriptionType.FREE,
        requestedModelId: undefined,
        dailyUsageCount: usage.freeInteractionsUsed,
        dailyUsageLimit: usage.limit,
        creditBalance: user?.creditWallet?.balance,
        isCinematicMode: false,
        isFirstScene: true,
        freeLlmOnly: this.isFreeLlmOnly(),
      };

      const decision = this.budgetGuard.decide(budgetInput);
      if (!decision.allowed) {
        throwBudgetDenied(decision.blockReason || 'Model access denied.');
      }

      const firstScene = await this.generateFirstScene(
        sessionWithStory,
        userId,
        user?.subscription?.type,
        user?.creditWallet?.balance,
        premise,
        character,
        decision.finalModel.id,
        false,
        narrativePolicy,
      );
      return {
        session: {
          ...this.formatSession(sessionWithStory),
          currentScene: firstScene,
          history: [],
        },
        usage: this.formatUsage(usage, user?.creditWallet?.balance),
      };
    }

    return {
      session: {
        ...this.formatSession(sessionWithStory),
        currentScene: this.formatScene(events[0]),
        history: events.slice(1).map((e: any) => this.formatScene(e)),
      },
      usage: this.formatUsage(usage, user?.creditWallet?.balance),
    };
  }

  async sendAction(userId: string, sessionId: string, dto: any): Promise<any> {
    const sessionWithStory = await this.getSessionWithStory(sessionId);

    if (!sessionWithStory) {
      throwReadingError('Reading session not found.', ReadingErrorCode.READING_SESSION_NOT_FOUND, 404);
    }

    if (sessionWithStory.userId !== userId) {
      throwReadingError('Reading session not found.', ReadingErrorCode.READING_SESSION_NOT_FOUND, 404);
    }

    // Access check: only PUBLIC+APPROVED stories are accessible to all users
    // Private or non-approved stories require creator access
    this.assertCanAccessStory(sessionWithStory.story, userId);

    const user = await this.getUserWithSubscription(userId);
    const walletBalance = user?.creditWallet?.balance || 0;
    const usage = await this.getOrCreateDailyLimit(userId);
    const narrativePolicy = await this.getEffectiveNarrativePolicy(userId);

    // Call GenerationBudgetGuard BEFORE generateNextScene
    const budgetInput: GenerationBudgetInput = {
      userId,
      subscriptionType: user?.subscription?.type || SubscriptionType.FREE,
      requestedModelId: dto.modelId,
      dailyUsageCount: usage.freeInteractionsUsed,
      dailyUsageLimit: usage.limit,
      creditBalance: walletBalance,
      isCinematicMode: dto.mode === 'cinematic',
      freeLlmOnly: this.isFreeLlmOnly(),
    };

    const decision: GenerationBudgetDecision = this.budgetGuard.decide(budgetInput);

    if (!decision.allowed) {
      throwBudgetDenied(decision.blockReason || 'Model access denied.');
    }

    const result = await this.generateNextScene(
      userId,
      sessionId,
      dto.action,
      decision.finalModel.id,
      user,
      decision.finalModel,
      dto.mode === 'cinematic',
      narrativePolicy,
      dto.actionType,
    );

    const events = await this.getSessionEvents(sessionId, READER_RECENT_EVENT_LIMIT);
    const shouldRefreshWallet = decision.finalModel.tier === 'CREDITS';
    const updatedWallet = shouldRefreshWallet
      ? await this.getCreditWallet(userId)
      : user?.creditWallet;

    return {
      session: {
        id: sessionWithStory.id,
        storyId: sessionWithStory.storyId,
        selectedPremiseId: sessionWithStory.selectedPremiseId ?? undefined,
        selectedCharacterId: sessionWithStory.selectedCharacterId ?? undefined,
        protagonistName: sessionWithStory.protagonistName ?? undefined,
        protagonistRole: sessionWithStory.protagonistRole ?? undefined,
        currentChapter: sessionWithStory.currentChapter,
        currentSceneIndex: result.session.currentSceneIndex,
        status: sessionWithStory.status,
        startedAt: sessionWithStory.startedAt,
        lastSceneAt: new Date(),
        currentScene: {
          id: events[0]?.id,
          chapterNumber: sessionWithStory.currentChapter,
          sceneIndex: result.session.currentSceneIndex,
          sceneText: result.sceneText,
          choices: result.suggestedActions,
          userAction: events[0]?.userAction,
          userActionType: events[0]?.userActionType,
          sceneMetadata: result.sceneMetadata,
          adPlacement: result.adPlacement,
        },
        history: events.slice(1).map((e: any) => this.formatScene(e)),
      },
      usage: this.formatUsage(usage, updatedWallet?.balance),
    };
  }

  async getUserSessions(userId: string, query: any): Promise<any> {
    const { page = 1, limit = 20, status, storyId } = query;

    const where: any = { userId };
    if (status) where.status = status;
    if (storyId) where.storyId = storyId;

    const [sessions, total] = await Promise.all([
      this.findSessions(where, page, limit),
      this.countSessions(where),
    ]);

    const result = {
      data: sessions.map((s: any) => ({
        id: s.id,
        storyId: s.storyId,
        storyTitle: s.story?.title,
        storyCoverUrl: this.pickSessionSummaryImageUrl(s.story?.coverUrl, s.premise?.coverUrl, s.character?.imageUrl),
        selectedPremiseTitle: s.premise?.title ?? null,
        selectedPremiseCoverUrl: this.pickSessionSummaryImageUrl(s.premise?.coverUrl),
        selectedCharacterName: s.character?.name ?? null,
        selectedCharacterImageUrl: this.pickSessionSummaryImageUrl(s.character?.imageUrl),
        currentChapter: s.currentChapter,
        currentSceneIndex: s.currentSceneIndex,
        status: s.status,
        startedAt: s.startedAt,
        lastSceneAt: s.lastSceneAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return {
      sessions: result.data,
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      totalPages: result.meta.totalPages,
    };
  }

  private pickSessionSummaryImageUrl(...urls: Array<string | null | undefined>): string | null {
    const url = urls.find((candidate) => {
      if (!candidate) return false;
      const normalized = candidate.trim().toLowerCase();
      return normalized.startsWith('http://') || normalized.startsWith('https://');
    });

    return url ?? null;
  }

  async abandonSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.findSessionById(sessionId);

    if (!session || session.userId !== userId) {
      throwReadingError('Reading session not found.', ReadingErrorCode.READING_SESSION_NOT_FOUND, 404);
    }

    await this.updateReadingSession(sessionId, { status: ReadingSessionStatus.ABANDONED });
  }

  private buildSessionSetupData(premise?: any, character?: any): Record<string, any> {
    const data: Record<string, any> = {};

    if (premise) {
      data.selectedPremiseId = premise.id;
    }

    if (character) {
      data.selectedCharacterId = character.id;
      data.protagonistName = character.name;
      data.protagonistRole = character.roleLabel;
      data.protagonistContext = JSON.stringify(character);
    }

    return data;
  }

  private formatSession(session: any) {
    return {
      id: session.id,
      storyId: session.storyId,
      selectedPremiseId: session.selectedPremiseId,
      selectedCharacterId: session.selectedCharacterId,
      protagonistName: session.protagonistName,
      protagonistRole: session.protagonistRole,
      currentChapter: session.currentChapter,
      currentSceneIndex: session.currentSceneIndex,
      status: session.status,
      startedAt: session.startedAt,
      lastSceneAt: session.lastSceneAt,
    };
  }

  private formatScene(event: any) {
    return {
      id: event.id,
      chapterNumber: event.chapterNumber,
      sceneIndex: event.sceneIndex,
      sceneText: event.sceneText,
      choices: event.choices,
      userAction: event.userAction,
      userActionType: event.userActionType,
      generatedAt: event.generatedAt,
    };
  }

  private formatUsage(usage: any, creditsRemaining?: number): any {
    return {
      dailyLimit: usage.limit,
      dailyUsed: usage.freeInteractionsUsed,
      dailyRemaining: usage.limit - usage.freeInteractionsUsed,
      isLimited: usage.freeInteractionsUsed >= usage.limit,
      creditsRemaining: creditsRemaining ?? 0,
    };
  }

  private async getOrCreateDailyLimit(userId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.findDailyUsageLimit(userId, today);
    if (existing) return existing;

    return this.createDailyUsageLimit(userId, today);
  }

  private async createFreeSessionWithLimit(
    userId: string,
    storyId: string,
    setupData: any,
  ): Promise<any> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.createFreeSessionWithLimitTransaction(userId, storyId, setupData);
      } catch (error: any) {
        if (error?.code === 'P2034' && attempt < 3) {
          continue;
        }
        throw error;
      }
    }
    throwReadingError('Failed to create session. Please try again.', ReadingErrorCode.READING_GENERATION_FAILED, 500);
  }

  private mapNarrativeGenerationError(error: unknown): never {
    if (error instanceof HttpException) throw error;
    const message = error instanceof Error ? error.message : '';
    const isProviderError =
      /OpenAI API error|OpenRouter API error|Anthropic API error|Provider unavailable|timeout|network|fetch failed|rate limit|status\s*4[29]|status\s*5\d\d/i.test(message);
    if (isProviderError) {
      return throwReadingError(
        'AI service temporarily unavailable. Please try again.',
        ReadingErrorCode.AI_PROVIDER_UNAVAILABLE,
        503,
      );
    }
    return throwReadingError(
      'Failed to generate reading scene. Please try again.',
      ReadingErrorCode.READING_GENERATION_FAILED,
      500,
    );
  }
}
