import { ReadingOrchestratorService } from '../reading-orchestrator.service';
import { NarrativeEngine } from '../narrative/narrative-engine.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { SubscriptionType, ReadingSessionStatus, UserActionType } from '@prisma/client';

describe('ReadingOrchestratorService - Reading Contract Fix', () => {
  let service: ReadingOrchestratorService;
  let storyQualityService: jest.Mocked<StoryQualityService>;
  let mockPrisma: any;
  let mockNarrativeEngine: any;
  let mockConfigService: any;

  beforeEach(() => {
    storyQualityService = {
      validateStoryQuality: jest.fn(() => Promise.resolve()),
    } as any;

    mockNarrativeEngine = {
      generateScene: jest.fn(),
    };

    mockPrisma = {
      $transaction: jest.fn(),
      story: { findUnique: jest.fn().mockResolvedValue(null) },
      storyPremise: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null) },
      storyPlayableCharacter: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null) },
      narrativeMemory: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}), update: jest.fn() },
      narrativeEvent: { create: jest.fn().mockResolvedValue({ chapterNumber: 1, sceneIndex: 0, sceneText: 'First scene' }), findMany: jest.fn().mockResolvedValue([]) },
      readingSession: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1', storyId: 'story-1' }),
        update: jest.fn().mockResolvedValue({ id: 'session-1' }),
        count: jest.fn().mockResolvedValue(0),
      },
      modelUsage: { create: jest.fn() },
      dailyUsageLimit: { findUnique: jest.fn().mockResolvedValue({ id: 'usage-1', freeInteractionsUsed: 0, limit: 10 }), upsert: jest.fn().mockResolvedValue({ id: 'usage-1', freeInteractionsUsed: 0, limit: 10 }) },
      adEvent: { create: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(false),
    };

    service = new ReadingOrchestratorService(
      storyQualityService,
      mockNarrativeEngine as any,
      mockPrisma as any,
      mockConfigService as any,
    );
    jest.clearAllMocks();
  });

  describe('startReading() - existing session response shape', () => {
    const existingSession = {
      id: 'session-1',
      userId: 'user-1',
      storyId: 'story-1',
      status: ReadingSessionStatus.ACTIVE,
      currentChapter: 1,
      currentSceneIndex: 0,
    };

    const mockStory = {
      id: 'story-1',
      title: 'Test',
      synopsis: 'A test',
      genres: ['adventure'],
      tone: 'narrativo',
      styleGuide: '',
      worldRules: '',
      openingScene: '',
      basePrompt: '',
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
      isPremium: false,
      characters: [{ name: 'Hero', role: 'protagonist', description: 'The hero' }],
      premises: [],
    };

    const mockUser = {
      id: 'user-1',
      subscription: { type: SubscriptionType.PREMIUM },
      creditWallet: { balance: 0 },
    };

    const mockUsage = {
      id: 'usage-1',
      freeInteractionsUsed: 0,
      limit: 10,
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'getStoryWithPremises').mockResolvedValue(mockStory);
      jest.spyOn(service as any, 'getUserWithSubscription').mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'getOrCreateDailyLimit').mockResolvedValue(mockUsage);
      jest.spyOn(service as any, 'findActiveSession').mockResolvedValue(existingSession);
      jest.spyOn(service as any, 'assertCanAccessStory').mockImplementation(() => {});
    });

    it('should return currentScene and history nested inside session when zero events exist', async () => {
      jest.spyOn(service as any, 'getSessionEvents').mockResolvedValue([]);
      jest.spyOn(service as any, 'generateFirstScene').mockResolvedValue({
        chapterNumber: 1,
        sceneIndex: 0,
        sceneText: 'First scene',
        choices: ['Continue'],
      });

      const result = await service.startReading('user-1', { storyId: 'story-1' });

      expect(result.session.currentScene).toBeDefined();
      expect(result.session.history).toEqual([]);
      expect(result.session.currentScene.sceneText).toBe('First scene');
      expect((result as any).currentScene).toBeUndefined();
      expect((result as any).history).toBeUndefined();
    });

    it('should return currentScene and history nested inside session when events exist', async () => {
      jest.spyOn(service as any, 'getSessionEvents').mockResolvedValue([
        { id: 'event-1', sceneIndex: 0, sceneText: 'Scene zero', choices: ['Continue'] },
        { id: 'event-2', sceneIndex: 1, sceneText: 'Scene one', choices: ['Continue'] },
      ]);

      const result = await service.startReading('user-1', { storyId: 'story-1' });

      expect(result.session.currentScene).toBeDefined();
      expect(result.session.history).toBeDefined();
      expect(result.session.currentScene.sceneText).toBe('Scene zero');
      expect(result.session.history).toHaveLength(1);
      expect(result.session.history[0].sceneText).toBe('Scene one');
      expect((result as any).currentScene).toBeUndefined();
      expect((result as any).history).toBeUndefined();
    });
  });

  describe('formatUsage', () => {
    it('should always return numeric creditsRemaining when balance is defined', () => {
      jest.spyOn(service as any, 'getUserWithSubscription').mockResolvedValue({
        id: 'user-1',
        subscription: { type: SubscriptionType.PREMIUM },
        creditWallet: { balance: 5 },
      });

      jest.spyOn(service as any, 'getSessionWithStory').mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        storyId: 'story-1',
        status: ReadingSessionStatus.ACTIVE,
        story: { id: 'story-1', title: 'Test', visibility: 'PUBLIC', moderationStatus: 'APPROVED' },
      });

      jest.spyOn(service as any, 'getOrCreateDailyLimit').mockResolvedValue({
        id: 'usage-1',
        freeInteractionsUsed: 2,
        limit: 10,
      });

      jest.spyOn(service as any, 'getSessionEvents').mockResolvedValue([
        { id: 'event-1', sceneIndex: 0, sceneText: 'Scene', choices: ['Continue'] },
      ]);

      jest.spyOn(service as any, 'assertCanAccessStory').mockImplementation(() => {});

      return service.getSessionWithStatus('user-1', 'session-1').then((result: any) => {
        expect(typeof result.usage.creditsRemaining).toBe('number');
        expect(result.usage.creditsRemaining).toBe(5);
      });
    });

    it('should always return numeric creditsRemaining when balance is undefined', () => {
      const usage = (service as any).formatUsage({ freeInteractionsUsed: 3, limit: 10 }, undefined);
      expect(typeof usage.creditsRemaining).toBe('number');
      expect(usage.creditsRemaining).toBe(0);
      expect(usage.dailyLimit).toBe(0);
      expect(usage.dailyRemaining).toBe(0);
      expect(usage.isLimited).toBe(false);
    });

    it('should always return numeric creditsRemaining when balance is null', () => {
      const usage = (service as any).formatUsage({ freeInteractionsUsed: 3, limit: 10 }, null);
      expect(typeof usage.creditsRemaining).toBe('number');
      expect(usage.creditsRemaining).toBe(0);
    });
  });

  describe('currentScene.id contract', () => {
    const mockStory = {
      id: 'story-1',
      title: 'Test',
      synopsis: 'A test',
      genres: ['adventure'],
      tone: 'narrativo',
      styleGuide: '',
      worldRules: '',
      openingScene: '',
      basePrompt: '',
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
      isPremium: false,
      characters: [{ name: 'Hero', role: 'protagonist', description: 'The hero' }],
      premises: [],
    };

    const mockUser = {
      id: 'user-1',
      subscription: { type: SubscriptionType.PREMIUM },
      creditWallet: { balance: 0 },
    };

    const mockUsage = {
      id: 'usage-1',
      freeInteractionsUsed: 0,
      limit: 10,
    };

    beforeEach(() => {
      jest.spyOn(service as any, 'getUserWithSubscription').mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'getOrCreateDailyLimit').mockResolvedValue(mockUsage);
      jest.spyOn(service as any, 'assertCanAccessStory').mockImplementation(() => {});
    });

    it('should include NarrativeEvent.id in currentScene after first-scene start', async () => {
      const existingSession = {
        id: 'session-1',
        userId: 'user-1',
        storyId: 'story-1',
        status: ReadingSessionStatus.ACTIVE,
        currentChapter: 1,
        currentSceneIndex: 0,
      };

      jest.spyOn(service as any, 'getStoryWithPremises').mockResolvedValue(mockStory);
      jest.spyOn(service as any, 'findActiveSession').mockResolvedValue(existingSession);
      jest.spyOn(service as any, 'getSessionEvents').mockResolvedValue([]);
      jest.spyOn(service as any, 'generateFirstScene').mockResolvedValue({
        id: 'event-new',
        chapterNumber: 1,
        sceneIndex: 0,
        sceneText: 'First scene text',
        choices: ['Continue'],
      });

      const result = await service.startReading('user-1', { storyId: 'story-1' });

      expect(result.session.currentScene.id).toBe('event-new');
      expect(result.session.currentScene.sceneText).toBe('First scene text');
    });

    it('should map NarrativeEvent.id into generateFirstScene() return value', async () => {
      const session = {
        id: 'session-1',
        storyId: 'story-1',
        story: {
          id: 'story-1',
          title: 'Test Story',
          synopsis: 'A test',
          genres: ['adventure'],
          tone: 'dark',
          styleGuide: null,
          worldRules: null,
          openingScene: 'It began...',
          basePrompt: null,
          visibility: 'PUBLIC',
          moderationStatus: 'APPROVED',
          isPremium: false,
          characters: [{ name: 'Hero', role: 'protagonist', description: 'The hero' }],
          premises: [],
        },
      };

      jest.spyOn(service as any, 'createInitialMemory').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'findMemoryBySessionId').mockResolvedValue({
        id: 'mem-1',
        sessionId: 'session-1',
        summary: '',
        worldState: '',
        characterState: '',
        importantChoices: '[]',
        openThreads: '[]',
        constraints: '',
        sceneCount: 0,
      });
      jest.spyOn(service as any, 'findStoryById').mockResolvedValue(session.story);
      jest.spyOn(service as any, 'createNarrativeEvent').mockResolvedValue({
        id: 'event-created-by-prisma',
        chapterNumber: 1,
        sceneIndex: 0,
        sceneText: 'Generated scene text',
        choices: ['Choice A'],
      });
      jest.spyOn(service as any, 'updateReadingSession').mockResolvedValue({});
      jest.spyOn(service as any, 'createModelUsage').mockResolvedValue({});
      jest.spyOn(service as any, 'updateNarrativeMemory').mockResolvedValue({});

      mockNarrativeEngine.generateScene.mockResolvedValue({
        sceneText: 'Generated scene text',
        suggestedActions: ['Choice A'],
        sceneMetadata: { emotion: 'mysterious' },
        modelUsed: 'openrouter/free',
        tokenUsage: { inputTokens: 10, outputTokens: 50 },
        memoryPatch: null,
      });

      const result = await service.generateFirstScene(
        session,
        'user-1',
        SubscriptionType.FREE,
        0,
        null,
        null,
        'openrouter/free',
        false,
      );

      expect(result.id).toBe('event-created-by-prisma');
      expect(result.chapterNumber).toBe(1);
      expect(result.sceneIndex).toBe(0);
      expect(result.sceneText).toBe('Generated scene text');
      expect(result.choices).toEqual(['Choice A']);
      expect(result.sceneMetadata).toEqual({ emotion: 'mysterious' });
    });

    it('should return newest event id in continuation currentScene (not oldest)', async () => {
      jest.spyOn(service as any, 'getSessionWithStory').mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        storyId: 'story-1',
        status: ReadingSessionStatus.ACTIVE,
        currentChapter: 1,
        currentSceneIndex: 1,
        selectedPremiseId: null,
        selectedCharacterId: null,
        protagonistName: null,
        protagonistRole: null,
        story: { id: 'story-1', title: 'Test', visibility: 'PUBLIC', moderationStatus: 'APPROVED' },
      });

      // GenerateNextScene mocked to return the new result
      jest.spyOn(service as any, 'generateNextScene').mockResolvedValue({
        sceneText: 'Newest scene text',
        suggestedActions: ['Choice A'],
        sceneMetadata: { emotion: 'tense' },
        modelUsed: 'gpt-4.1-nano',
        tokenUsage: { inputTokens: 10, outputTokens: 20 },
        memoryPatch: null,
        session: { currentSceneIndex: 2 },
        adPlacement: null,
      });

      // Events ordered by generatedAt desc — events[0] is the newest
      jest.spyOn(service as any, 'getSessionEvents').mockResolvedValue([
        { id: 'event-latest', sceneIndex: 2, sceneText: 'Newest scene text', choices: ['Choice A'] },
        { id: 'event-older', sceneIndex: 1, sceneText: 'Older scene text', choices: ['Continue'] },
        { id: 'event-oldest', sceneIndex: 0, sceneText: 'Oldest scene text', choices: ['Begin'] },
      ]);

      (service as any).budgetGuard = {
        decide: jest.fn().mockReturnValue({
          allowed: true,
          finalModel: { id: 'openrouter/free', tier: 'FREE' },
          budgetTier: 'FREE',
          blockReason: null,
        }),
      } as any;

      jest.spyOn(service as any, 'getCreditWallet').mockResolvedValue({
        id: 'wallet-1',
        balance: 0,
      });
      jest.spyOn(service as any, 'isFreeLlmOnly').mockReturnValue(false);

      const result = await service.sendAction('user-1', 'session-1', {
        action: 'Look around',
        actionType: 'FREE_TEXT' as any,
      });

      // events[0] is newest due to generatedAt desc ordering
      expect(result.session.currentScene.id).toBe('event-latest');
      expect(result.session.currentScene.sceneText).toBe('Newest scene text');
      // Should NOT be the oldest event
      expect(result.session.currentScene.id).not.toBe('event-oldest');
    });

    it('should continue with the session selected premise and character context', async () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        storyId: 'story-1',
        status: ReadingSessionStatus.ACTIVE,
        currentSceneIndex: 1,
        selectedPremiseId: 'premise-selected',
        selectedCharacterId: 'character-selected',
      };
      const selectedPremise = {
        id: 'premise-selected',
        storyId: 'story-1',
        title: 'Premissa Selecionada',
        synopsis: 'A premissa correta da sessão.',
      };
      const selectedCharacter = {
        id: 'character-selected',
        premiseId: 'premise-selected',
        name: 'Lia',
        roleLabel: 'A investigadora',
      };

      mockPrisma.readingSession.findUnique.mockResolvedValue(session);
      mockPrisma.story.findUnique.mockResolvedValue(mockStory);
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue({
        id: 'memory-1',
        sessionId: 'session-1',
        summary: '',
        worldState: '',
        characterState: '',
        importantChoices: '',
        openThreads: '',
        constraints: '',
        sceneCount: 1,
        codex: null,
      });
      mockPrisma.narrativeEvent.findMany.mockResolvedValue([
        { id: 'event-1', sceneIndex: 1, sceneText: 'Previous scene', choices: ['Continue'] },
      ]);
      mockPrisma.storyPremise.findUnique.mockResolvedValue(selectedPremise);
      mockPrisma.storyPlayableCharacter.findUnique.mockResolvedValue(selectedCharacter);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));
      mockPrisma.narrativeEvent.create.mockResolvedValue({
        id: 'event-2',
        sceneIndex: 2,
        sceneText: 'Next scene',
        choices: ['Choice A'],
      });
      mockPrisma.readingSession.update.mockResolvedValue({ ...session, currentSceneIndex: 2 });
      mockPrisma.modelUsage = { create: jest.fn().mockResolvedValue({}) };

      mockNarrativeEngine.generateScene.mockResolvedValue({
        sceneText: 'Next scene',
        suggestedActions: ['Choice A'],
        sceneMetadata: { emotion: 'tense' },
        modelUsed: 'groq/free',
        tokenUsage: { inputTokens: 10, outputTokens: 20 },
        memoryPatch: null,
      });

      await service.generateNextScene(
        'user-1',
        'session-1',
        'Investigar a carta',
        'groq/free',
        mockUser,
        { id: 'groq/free', tier: 'FREE' },
        false,
        undefined,
        UserActionType.FREE_TEXT,
      );

      expect(mockPrisma.storyPremise.findUnique).toHaveBeenCalledWith({
        where: { id: 'premise-selected' },
        include: { characters: true },
      });
      expect(mockPrisma.storyPremise.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.storyPlayableCharacter.findUnique).toHaveBeenCalledWith({
        where: { id: 'character-selected' },
      });
      expect(mockPrisma.storyPlayableCharacter.findFirst).not.toHaveBeenCalled();

      const engineInput = mockNarrativeEngine.generateScene.mock.calls[0][0];
      expect(engineInput.premise).toBe(selectedPremise);
      expect(engineInput.playableCharacter).toBe(selectedCharacter);
      expect(engineInput.actionType).toBe(UserActionType.FREE_TEXT);
    });
  });
});
