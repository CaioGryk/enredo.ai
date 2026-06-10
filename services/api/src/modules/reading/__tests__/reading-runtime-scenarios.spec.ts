import { HttpException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ReadingOrchestratorService } from '../reading-orchestrator.service';
import { NarrativeEngine } from '../narrative/narrative-engine.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { SubscriptionType, ReadingSessionStatus, StoryVisibility, StoryModerationStatus } from '@prisma/client';
import { GetSessionsDto } from '../dto/reading.dto';

describe('Reading Runtime Scenarios', () => {
  let service: ReadingOrchestratorService;
  let storyQualityService: jest.Mocked<StoryQualityService>;
  let mockPrisma: any;
  let mockNarrativeEngine: any;
  let mockConfigService: any;

  const publicStory = {
    id: 'story-1',
    title: 'Public Story',
    synopsis: 'A public story',
    visibility: StoryVisibility.PUBLIC,
    moderationStatus: StoryModerationStatus.APPROVED,
    creatorUserId: null,
    isPremium: false,
    characters: [],
    premises: [],
  };

  const premiumUser = {
    id: 'user-1',
    subscription: { type: SubscriptionType.PREMIUM },
    creditWallet: { id: 'wallet-1', balance: 10 },
  };

  const freeUser = {
    id: 'user-1',
    subscription: { type: SubscriptionType.FREE },
    creditWallet: null,
  };

  const defaultUsage = {
    id: 'usage-1',
    freeInteractionsUsed: 0,
    limit: 10,
  };

  const mockSession = {
    id: 'session-1',
    userId: 'user-1',
    storyId: 'story-1',
    status: ReadingSessionStatus.ACTIVE,
    currentChapter: 1,
    currentSceneIndex: 0,
    selectedPremiseId: null,
    selectedCharacterId: null,
    protagonistName: null,
    protagonistRole: null,
    startedAt: new Date('2026-01-01'),
    lastSceneAt: new Date('2026-01-01'),
  };

  const mockScene = {
    sceneText: 'The story begins...',
    suggestedActions: ['Continue', 'Explore'],
    modelUsed: 'openrouter/free',
    tokenUsage: { inputTokens: 100, outputTokens: 200 },
    sceneMetadata: { emotion: 'neutral', pacing: 'slow' },
    memoryPatch: {
      summary: 'The hero has started their journey.',
      worldState: 'A peaceful village.',
      characterState: 'Hero is curious.',
      importantChoices: [],
      openThreads: [],
      constraints: 'None',
    },
  };

  beforeEach(() => {
    storyQualityService = {
      validateStoryQuality: jest.fn(() => Promise.resolve()),
    } as any;

    mockNarrativeEngine = { generateScene: jest.fn() };

    mockPrisma = {
      $transaction: jest.fn((...args: any[]) => {
        const cb = typeof args[0] === 'function' ? args[0] : args[1];
        return Promise.resolve(cb(mockPrisma));
      }),
      story: { findUnique: jest.fn(), findFirst: jest.fn() },
      storyPremise: { findUnique: jest.fn(), findFirst: jest.fn() },
      storyPlayableCharacter: { findFirst: jest.fn() },
      narrativeMemory: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
      narrativeEvent: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
      readingSession: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      modelUsage: { create: jest.fn() },
      dailyUsageLimit: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), create: jest.fn() },
      adEvent: { create: jest.fn() },
      user: { findUnique: jest.fn() },
      creditWallet: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      creditTransaction: { create: jest.fn() },
    };

    mockConfigService = { get: jest.fn().mockReturnValue(false) };

    service = new ReadingOrchestratorService(
      storyQualityService,
      mockNarrativeEngine as any,
      mockPrisma as any,
      mockConfigService as any,
    );
    jest.clearAllMocks();
  });

  function expectHttpException(promise: Promise<any>, status: number, errorCode: string) {
    return promise.then(
      () => { throw new Error('Expected HttpException'); },
      (err: HttpException) => {
        expect(err.getStatus()).toBe(status);
        const response = err.getResponse() as any;
        expect(response.error).toBe(errorCode);
      },
    );
  }

  // ─────────────────────────────────────────────
  // Scenario 1: Free user starts reading with a free model
  // ─────────────────────────────────────────────
  describe('Scenario 1 — Free user starts reading with a free model', () => {
    const startDto = {
      storyId: 'story-1',
      premiseId: 'premise-1',
      characterId: 'char-1',
      protagonistName: 'Hero',
      protagonistRole: 'Protagonist',
      protagonistContext: 'Context',
    };

    beforeEach(() => {
      mockPrisma.story.findUnique.mockResolvedValue({
        ...publicStory,
        premises: [{ id: 'premise-1', title: 'Premise 1', synopsis: 'Synopsis', characters: [] }],
      });
      mockPrisma.user.findUnique.mockResolvedValue(freeUser);
      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue(defaultUsage);
      mockPrisma.readingSession.findFirst.mockResolvedValue(null);
      mockPrisma.readingSession.count.mockResolvedValue(0);
      mockPrisma.readingSession.create.mockResolvedValue({ ...mockSession, id: 'session-new', currentSceneIndex: 0 });
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue(null);
      mockPrisma.narrativeMemory.upsert.mockResolvedValue({});
      mockNarrativeEngine.generateScene.mockResolvedValue(mockScene);
      mockPrisma.narrativeEvent.create.mockResolvedValue({
        id: 'event-0', chapterNumber: 1, sceneIndex: 0, sceneText: mockScene.sceneText,
        choices: mockScene.suggestedActions,
      });
      mockPrisma.readingSession.update.mockResolvedValue({ ...mockSession, currentSceneIndex: 0 });
    });

    it('should allow free user to start a non-premium story', async () => {
      const result = await service.startReading('user-1', startDto);

      expect(result.session.currentScene).toBeDefined();
      expect(result.session.currentScene.sceneText).toBe(mockScene.sceneText);
      expect(result.session.history).toEqual([]);
      expect(typeof result.usage.creditsRemaining).toBe('number');
    });

    it('should not create credit transactions for free model', async () => {
      await service.startReading('user-1', startDto);

      expect(mockPrisma.creditWallet.update).not.toHaveBeenCalled();
      expect(mockPrisma.creditTransaction.create).not.toHaveBeenCalled();
    });

    it('should create a reading session and generate first scene', async () => {
      await service.startReading('user-1', startDto);

      expect(mockPrisma.readingSession.create).toHaveBeenCalled();
      expect(mockNarrativeEngine.generateScene).toHaveBeenCalled();
      expect(mockPrisma.modelUsage.create).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // Scenario 2: Free user reaches daily limit
  // ─────────────────────────────────────────────
  describe('Scenario 2 — Free user reaches daily limit', () => {
    const usageAtLimit = { id: 'usage-1', freeInteractionsUsed: 10, limit: 10 };
    const sessionWithStory = { ...mockSession, story: { ...publicStory } };

    beforeEach(() => {
      mockPrisma.readingSession.findUnique.mockResolvedValue(sessionWithStory);
      mockPrisma.user.findUnique.mockResolvedValue(freeUser);
      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue(usageAtLimit);
      mockPrisma.story.findUnique.mockResolvedValue(publicStory);
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue(null);
      mockPrisma.narrativeEvent.findMany.mockResolvedValue([]);
      mockPrisma.storyPremise.findFirst.mockResolvedValue(null);
      mockPrisma.storyPlayableCharacter.findFirst.mockResolvedValue(null);
    });

    it('should deny action with 402 DAILY_LIMIT_REACHED', async () => {
      const promise = service.sendAction('user-1', 'session-1', { action: 'Continue' });

      await expectHttpException(promise, 402, 'DAILY_LIMIT_REACHED');
    });

    it('should not call generateScene or create events', async () => {
      await service.sendAction('user-1', 'session-1', { action: 'Continue' })
        .then(() => { throw new Error('Expected error'); })
        .catch(() => {});

      expect(mockNarrativeEngine.generateScene).not.toHaveBeenCalled();
      expect(mockPrisma.narrativeEvent.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // Scenario 3: Premium user uses a premium model
  // ─────────────────────────────────────────────
  describe('Scenario 3 — Premium user uses a premium model', () => {
    const premiumModelId = 'gpt-4.1-nano';
    const premiumModelScene = { ...mockScene, modelUsed: premiumModelId };
    const sessionWithStory = { ...mockSession, story: { ...publicStory } };

    beforeEach(() => {
      mockPrisma.readingSession.findUnique
        .mockResolvedValueOnce(sessionWithStory)
        .mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(premiumUser);
      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue(defaultUsage);
      mockPrisma.story.findUnique.mockResolvedValue(publicStory);
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue(null);
      mockPrisma.narrativeEvent.findMany.mockResolvedValue([]);
      mockPrisma.storyPremise.findFirst.mockResolvedValue(null);
      mockPrisma.storyPlayableCharacter.findFirst.mockResolvedValue(null);
      mockNarrativeEngine.generateScene.mockResolvedValue(premiumModelScene);

      mockPrisma.narrativeEvent.create.mockResolvedValue({
        id: 'event-1', chapterNumber: 1, sceneIndex: 1, sceneText: premiumModelScene.sceneText,
        choices: premiumModelScene.suggestedActions,
      });
      mockPrisma.readingSession.update.mockResolvedValue({ ...mockSession, currentSceneIndex: 1 });
      mockPrisma.dailyUsageLimit.upsert.mockResolvedValue(defaultUsage);
      mockPrisma.narrativeMemory.upsert.mockResolvedValue({});
    });

    it('should succeed and record model usage with premium model id', async () => {
      const result = await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: premiumModelId,
      });

      expect(result.session.currentScene).toBeDefined();
      expect(result.session.currentScene.sceneText).toBe(premiumModelScene.sceneText);
      expect(mockPrisma.modelUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ model: premiumModelId }),
        }),
      );
    });

    it('should not decrement credits or create credit transactions for premium-tier model', async () => {
      await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: premiumModelId,
      });

      expect(mockPrisma.creditWallet.update).not.toHaveBeenCalled();
      expect(mockPrisma.creditTransaction.create).not.toHaveBeenCalled();
    });

    it('should call modelUsage.create with the premium model id', async () => {
      await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: premiumModelId,
      });

      expect(mockPrisma.modelUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ model: premiumModelId }) }),
      );
    });
  });

  // ─────────────────────────────────────────────
  // Scenario 4: User without credits tries Cine / credits model
  // ─────────────────────────────────────────────
  describe('Scenario 4 — User without credits tries credits model', () => {
    const poorUser = {
      id: 'user-1',
      subscription: { type: SubscriptionType.FREE },
      creditWallet: { id: 'wallet-1', balance: 0 },
    };
    const sessionWithStory = { ...mockSession, story: { ...publicStory } };

    beforeEach(() => {
      mockPrisma.readingSession.findUnique.mockResolvedValue(sessionWithStory);
      mockPrisma.user.findUnique.mockResolvedValue(poorUser);
      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue(defaultUsage);
    });

    it('should deny with 402 INSUFFICIENT_CREDITS', async () => {
      const promise = service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: 'claude-3-5-sonnet-20241022',
      });

      await expectHttpException(promise, 402, 'INSUFFICIENT_CREDITS');
    });

    it('should not generate or persist anything', async () => {
      await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: 'claude-3-5-sonnet-20241022',
      }).then(() => { throw new Error('Expected error'); })
        .catch(() => {});

      expect(mockNarrativeEngine.generateScene).not.toHaveBeenCalled();
      expect(mockPrisma.narrativeEvent.create).not.toHaveBeenCalled();
      expect(mockPrisma.creditWallet.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.creditTransaction.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // Scenario 5: User with credits uses Cine / credits model
  // ─────────────────────────────────────────────
  describe('Scenario 5 — User with credits uses credits model successfully', () => {
    const richUser = {
      id: 'user-1',
      subscription: { type: SubscriptionType.FREE },
      creditWallet: { id: 'wallet-1', balance: 10 },
    };
    const sessionWithStory = { ...mockSession, story: { ...publicStory } };

    beforeEach(() => {
      mockPrisma.readingSession.findUnique
        .mockResolvedValueOnce(sessionWithStory)
        .mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(richUser);
      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue(defaultUsage);
      mockPrisma.story.findUnique.mockResolvedValue(publicStory);
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue(null);
      mockPrisma.narrativeEvent.findMany.mockResolvedValue([]);
      mockPrisma.storyPremise.findFirst.mockResolvedValue(null);
      mockPrisma.storyPlayableCharacter.findFirst.mockResolvedValue(null);
      mockNarrativeEngine.generateScene.mockResolvedValue(mockScene);

      mockPrisma.narrativeEvent.create.mockResolvedValue({
        id: 'event-1', chapterNumber: 1, sceneIndex: 1, sceneText: mockScene.sceneText,
        choices: mockScene.suggestedActions,
      });
      mockPrisma.readingSession.update.mockResolvedValue({ ...mockSession, currentSceneIndex: 1 });
      mockPrisma.dailyUsageLimit.upsert.mockResolvedValue(defaultUsage);
      mockPrisma.narrativeMemory.upsert.mockResolvedValue({});
      mockPrisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.creditTransaction.create.mockResolvedValue({});
      mockPrisma.creditWallet.findUnique.mockResolvedValue({ balance: 8 });
    });

    it('should succeed and record model usage', async () => {
      const result = await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: 'claude-3-5-sonnet-20241022',
      });

      expect(result.session.currentScene).toBeDefined();
      expect(mockPrisma.modelUsage.create).toHaveBeenCalled();
    });

    it('should decrement credits atomically via updateMany and create transaction', async () => {
      await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: 'claude-3-5-sonnet-20241022',
      });

      expect(mockPrisma.creditWallet.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ balance: { gte: 2 } }),
          data: { balance: { decrement: 2 } },
        }),
      );
      expect(mockPrisma.creditTransaction.create).toHaveBeenCalled();
    });

    it('should create credit transaction with negative amount', async () => {
      await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: 'claude-3-5-sonnet-20241022',
      });

      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'SPEND',
            amount: -2,
          }),
        }),
      );
    });

    it('should include modelId, mode, and sessionId in credit transaction metadata', async () => {
      await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: 'claude-3-5-sonnet-20241022',
      });

      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              modelId: 'claude-3-5-sonnet-20241022',
              mode: 'standard',
              sessionId: 'session-1',
            }),
          }),
        }),
      );
    });

    it('should reflect exact updated credit balance after credits-tier spend without cinematic mode', async () => {
      const result = await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: 'claude-3-5-sonnet-20241022',
      });

      expect(result.usage.creditsRemaining).toBe(8);
    });

    it('should throw 402 when atomic wallet update returns count 0', async () => {
      mockPrisma.creditWallet.updateMany.mockResolvedValue({ count: 0 });

      const promise = service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: 'claude-3-5-sonnet-20241022',
      });

      await expectHttpException(promise, 402, 'INSUFFICIENT_CREDITS');
    });

    it('should not persist event or model usage when wallet update fails', async () => {
      mockPrisma.creditWallet.updateMany.mockResolvedValue({ count: 0 });

      await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: 'claude-3-5-sonnet-20241022',
      }).then(() => { throw new Error('Expected error'); })
        .catch(() => {});

      expect(mockPrisma.creditTransaction.create).not.toHaveBeenCalled();
      expect(mockPrisma.modelUsage.create).not.toHaveBeenCalled();
    });

    it('should not persist event or model usage when transaction creation fails', async () => {
      mockPrisma.creditTransaction.create.mockRejectedValue(new Error('DB error'));

      await service.sendAction('user-1', 'session-1', {
        action: 'Continue',
        modelId: 'claude-3-5-sonnet-20241022',
      }).then(() => { throw new Error('Expected error'); })
        .catch(() => {});

      expect(mockPrisma.modelUsage.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // Scenario 6: Continuation persists scene, usage, and memory
  // ─────────────────────────────────────────────
  describe('Scenario 6 — Continuation', () => {
    const sessionWithStory = { ...mockSession, story: { ...publicStory } };
    const previousEvent = {
      id: 'event-0', chapterNumber: 1, sceneIndex: 0, sceneText: 'Previous scene',
      choices: [], userAction: 'Continue', userActionType: 'CHOICE', generatedAt: new Date(),
    };
    const newEvent = {
      id: 'event-1', chapterNumber: 1, sceneIndex: 1, sceneText: mockScene.sceneText,
      choices: mockScene.suggestedActions,
    };

    beforeEach(() => {
      mockPrisma.readingSession.findUnique
        .mockResolvedValueOnce(sessionWithStory)
        .mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(premiumUser);
      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue(defaultUsage);
      mockPrisma.story.findUnique.mockResolvedValue(publicStory);
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue(null);
      mockPrisma.narrativeEvent.findMany
        .mockResolvedValueOnce([previousEvent])
        .mockResolvedValue([newEvent, previousEvent]);
      mockPrisma.storyPremise.findFirst.mockResolvedValue(null);
      mockPrisma.storyPlayableCharacter.findFirst.mockResolvedValue(null);
      mockNarrativeEngine.generateScene.mockResolvedValue(mockScene);

      mockPrisma.narrativeEvent.create.mockResolvedValue(newEvent);
      mockPrisma.readingSession.update.mockResolvedValue({ ...mockSession, currentSceneIndex: 1 });
      mockPrisma.narrativeMemory.upsert.mockResolvedValue({});
      mockPrisma.creditWallet.findUnique.mockResolvedValue(premiumUser.creditWallet);
    });

    it('should create a new narrative event', async () => {
      await service.sendAction('user-1', 'session-1', { action: 'Continue' });

      expect(mockPrisma.narrativeEvent.create).toHaveBeenCalled();
    });

    it('should persist the action type from free-text continuation actions', async () => {
      await service.sendAction('user-1', 'session-1', {
        action: 'Investigate the candlelit corridor',
        actionType: 'FREE_TEXT' as any,
      });

      expect(mockPrisma.narrativeEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userAction: 'Investigate the candlelit corridor',
            userActionType: 'FREE_TEXT',
          }),
        }),
      );
      expect(mockNarrativeEngine.generateScene).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'Investigate the candlelit corridor',
          actionType: 'FREE_TEXT',
        }),
      );
    });

    it('should update the reading session current scene index', async () => {
      await service.sendAction('user-1', 'session-1', { action: 'Continue' });

      expect(mockPrisma.readingSession.update).toHaveBeenCalled();
    });

    it('should persist memory patch', async () => {
      await service.sendAction('user-1', 'session-1', { action: 'Continue' });

      expect(mockPrisma.narrativeMemory.upsert).toHaveBeenCalled();
    });

    it('should record model usage', async () => {
      await service.sendAction('user-1', 'session-1', { action: 'Continue' });

      expect(mockPrisma.modelUsage.create).toHaveBeenCalled();
    });

    it('should return nested currentScene and history in response', async () => {
      const result = await service.sendAction('user-1', 'session-1', { action: 'Continue' });

      expect(result.session.currentScene).toBeDefined();
      expect(result.session.history).toBeDefined();
      expect(result.session.currentScene.sceneText).toBe(mockScene.sceneText);
      expect((result as any).currentScene).toBeUndefined();
      expect((result as any).history).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────
  // Scenario 7: Provider failure returns stable 503
  // ─────────────────────────────────────────────
  describe('Scenario 7 — Provider failure returns 503', () => {
    const sessionWithStory = { ...mockSession, story: { ...publicStory } };

    beforeEach(() => {
      mockPrisma.readingSession.findUnique
        .mockResolvedValueOnce(sessionWithStory)
        .mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(premiumUser);
      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue(defaultUsage);
      mockPrisma.story.findUnique.mockResolvedValue(publicStory);
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue(null);
      mockPrisma.narrativeEvent.findMany.mockResolvedValue([]);
      mockPrisma.storyPremise.findFirst.mockResolvedValue(null);
      mockPrisma.storyPlayableCharacter.findFirst.mockResolvedValue(null);
      mockNarrativeEngine.generateScene.mockRejectedValue(
        new Error('OpenAI API error: 429 Too Many Requests'),
      );
    });

    it('should return 503 AI_PROVIDER_UNAVAILABLE', async () => {
      const promise = service.sendAction('user-1', 'session-1', { action: 'Continue' });

      await expectHttpException(promise, 503, 'AI_PROVIDER_UNAVAILABLE');
    });

    it('should not persist any event after failure', async () => {
      await service.sendAction('user-1', 'session-1', { action: 'Continue' })
        .then(() => { throw new Error('Expected error'); })
        .catch(() => {});

      expect(mockPrisma.narrativeEvent.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // Scenario 8: Parse/internal failure returns stable 500
  // ─────────────────────────────────────────────
  describe('Scenario 8 — Parse/internal failure returns 500', () => {
    const sessionWithStory = { ...mockSession, story: { ...publicStory } };

    beforeEach(() => {
      mockPrisma.readingSession.findUnique
        .mockResolvedValueOnce(sessionWithStory)
        .mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(premiumUser);
      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue(defaultUsage);
      mockPrisma.story.findUnique.mockResolvedValue(publicStory);
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue(null);
      mockPrisma.narrativeEvent.findMany.mockResolvedValue([]);
      mockPrisma.storyPremise.findFirst.mockResolvedValue(null);
      mockPrisma.storyPlayableCharacter.findFirst.mockResolvedValue(null);
      mockNarrativeEngine.generateScene.mockRejectedValue(
        new Error('Failed to parse AI response: malformed JSON'),
      );
    });

    it('should return 500 READING_GENERATION_FAILED', async () => {
      const promise = service.sendAction('user-1', 'session-1', { action: 'Continue' });

      await expectHttpException(promise, 500, 'READING_GENERATION_FAILED');
    });

    it('should not persist any event after failure', async () => {
      await service.sendAction('user-1', 'session-1', { action: 'Continue' })
        .then(() => { throw new Error('Expected error'); })
        .catch(() => {});

      expect(mockPrisma.narrativeEvent.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // Scenario 9: Budget denial before session creation
  // ─────────────────────────────────────────────
  describe('Scenario 9 — Free-only fallback before session creation', () => {
    const startDto = {
      storyId: 'story-1',
      premiseId: 'premise-1',
      characterId: 'char-1',
      protagonistName: 'Hero',
      protagonistRole: 'Protagonist',
      protagonistContext: 'Context',
    };

    beforeEach(() => {
      mockPrisma.story.findUnique.mockResolvedValue({
        ...publicStory,
        premises: [{ id: 'premise-1', title: 'Premise 1', synopsis: 'Synopsis', characters: [] }],
      });
      mockPrisma.user.findUnique.mockResolvedValue(premiumUser);
      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue(defaultUsage);
      mockPrisma.readingSession.findFirst.mockResolvedValue(null);
      mockPrisma.readingSession.count.mockResolvedValue(0);
      mockPrisma.readingSession.create.mockResolvedValue({ ...mockSession, id: 'session-free-only', currentSceneIndex: 0 });
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue(null);
      mockPrisma.narrativeMemory.upsert.mockResolvedValue({});
      mockNarrativeEngine.generateScene.mockResolvedValue(mockScene);
      mockPrisma.narrativeEvent.create.mockResolvedValue({
        id: 'event-free-only',
        chapterNumber: 1,
        sceneIndex: 0,
        sceneText: mockScene.sceneText,
        choices: mockScene.suggestedActions,
      });
      mockPrisma.readingSession.update.mockResolvedValue({ ...mockSession, currentSceneIndex: 0 });
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FREE_LLM_ONLY') return true;
        return false;
      });
    });

    it('should use the free model instead of denying premium users when FREE_LLM_ONLY=true', async () => {
      await service.startReading('user-1', startDto);

      expect(mockPrisma.readingSession.create).toHaveBeenCalled();
      expect(mockNarrativeEngine.generateScene).toHaveBeenCalledWith(expect.objectContaining({
        selectedModelId: 'groq/free',
      }));
      expect(mockPrisma.creditWallet.update).not.toHaveBeenCalled();
      expect(mockPrisma.creditTransaction.create).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────
  // Sessions list — summary mapping
  // ─────────────────────────────────────────────
  describe('Sessions list — summary mapping', () => {
    it('should include storyTitle, currentChapter, currentSceneIndex, status, timestamps', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([{
        id: 'session-1',
        storyId: 'story-1',
        currentChapter: 1,
        currentSceneIndex: 2,
        status: 'ACTIVE',
        startedAt: new Date(),
        lastSceneAt: new Date(),
        story: { title: 'Test Story', coverUrl: null },
        premise: null,
        character: null,
      }]);

      const result = await (service as any).getUserSessions('user-1', {});

      expect(result.sessions).toHaveLength(1);
      const s = result.sessions[0];
      expect(s.id).toBe('session-1');
      expect(s.storyTitle).toBe('Test Story');
      expect(s.currentChapter).toBe(1);
      expect(s.currentSceneIndex).toBe(2);
      expect(s.status).toBe('ACTIVE');
      expect(s.startedAt).toBeDefined();
      expect(s.lastSceneAt).toBeDefined();
    });

    it('should include optional storyCoverUrl, selectedPremiseTitle, selectedCharacterName when available', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([{
        id: 'session-1',
        storyId: 'story-1',
        currentChapter: 1,
        currentSceneIndex: 2,
        status: 'ACTIVE',
        startedAt: new Date(),
        lastSceneAt: new Date(),
        story: { title: 'Test Story', coverUrl: 'https://example.com/cover.jpg' },
        premise: { title: 'Premise One' },
        character: { name: 'Hero' },
      }]);

      const result = await (service as any).getUserSessions('user-1', {});

      const s = result.sessions[0];
      expect(s.storyCoverUrl).toBe('https://example.com/cover.jpg');
      expect(s.selectedPremiseTitle).toBe('Premise One');
      expect(s.selectedCharacterName).toBe('Hero');
    });

    it('should use premise or character image as session cover fallback when story cover is missing', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([
        {
          id: 'session-1',
          storyId: 'story-1',
          currentChapter: 1,
          currentSceneIndex: 2,
          status: 'ACTIVE',
          startedAt: new Date(),
          lastSceneAt: new Date(),
          story: { title: 'Story Without Cover', coverUrl: null },
          premise: { title: 'Premise With Cover', coverUrl: 'https://example.com/premise.jpg' },
          character: { name: 'Hero', imageUrl: 'https://example.com/hero.jpg' },
        },
        {
          id: 'session-2',
          storyId: 'story-2',
          currentChapter: 1,
          currentSceneIndex: 0,
          status: 'ACTIVE',
          startedAt: new Date(),
          lastSceneAt: new Date(),
          story: { title: 'Story Without Images', coverUrl: null },
          premise: { title: 'Premise Without Cover', coverUrl: null },
          character: { name: 'Hero Two', imageUrl: 'https://example.com/hero-two.jpg' },
        },
      ]);

      const result = await (service as any).getUserSessions('user-1', {});

      expect(result.sessions[0].storyCoverUrl).toBe('https://example.com/premise.jpg');
      expect(result.sessions[1].storyCoverUrl).toBe('https://example.com/hero-two.jpg');
    });

    it('should not expose data-url images in session summaries', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([{
        id: 'session-1',
        storyId: 'story-1',
        currentChapter: 1,
        currentSceneIndex: 2,
        status: 'ACTIVE',
        startedAt: new Date(),
        lastSceneAt: new Date(),
        story: { title: 'Story With Inline Cover', coverUrl: 'data:image/png;base64,large-payload' },
        premise: { title: 'Premise With Inline Cover', coverUrl: 'data:image/png;base64,large-payload' },
        character: { name: 'Hero', imageUrl: 'data:image/png;base64,large-payload' },
      }]);

      const result = await (service as any).getUserSessions('user-1', {});

      expect(result.sessions[0].storyCoverUrl).toBeNull();
    });

    it('should return null for optional fields when relations are missing', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([{
        id: 'session-1',
        storyId: 'story-1',
        currentChapter: 1,
        currentSceneIndex: 0,
        status: 'ACTIVE',
        startedAt: new Date(),
        lastSceneAt: new Date(),
        story: { title: 'Test Story', coverUrl: null },
        premise: null,
        character: null,
      }]);

      const result = await (service as any).getUserSessions('user-1', {});

      const s = result.sessions[0];
      expect(s.storyCoverUrl).toBeNull();
      expect(s.selectedPremiseTitle).toBeNull();
      expect(s.selectedCharacterName).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // Sessions list — status filter
  // ─────────────────────────────────────────────
  describe('Sessions list — status filter', () => {
    it('should pass ACTIVE status to the query', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([]);
      mockPrisma.readingSession.count.mockResolvedValue(0);

      await (service as any).getUserSessions('user-1', { status: 'ACTIVE' });

      expect(mockPrisma.readingSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should pass COMPLETED status to the query', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([]);
      mockPrisma.readingSession.count.mockResolvedValue(0);

      await (service as any).getUserSessions('user-1', { status: 'COMPLETED' });

      expect(mockPrisma.readingSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('should pass ABANDONED status to the query', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([]);
      mockPrisma.readingSession.count.mockResolvedValue(0);

      await (service as any).getUserSessions('user-1', { status: 'ABANDONED' });

      expect(mockPrisma.readingSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ABANDONED' }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────
  // Abandon session contract
  // ─────────────────────────────────────────────
  describe('Abandon session contract', () => {
    it('should return 404 READING_SESSION_NOT_FOUND for non-existent session', async () => {
      mockPrisma.readingSession.findUnique.mockResolvedValue(null);

      const promise = service.abandonSession('user-1', 'nonexistent');

      await expectHttpException(promise, 404, 'READING_SESSION_NOT_FOUND');
    });

    it('should return 404 READING_SESSION_NOT_FOUND for session owned by another user', async () => {
      mockPrisma.readingSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'other-user',
      });

      const promise = service.abandonSession('user-1', 'session-1');

      await expectHttpException(promise, 404, 'READING_SESSION_NOT_FOUND');
    });

    it('should update status to ABANDONED for owned session', async () => {
      mockPrisma.readingSession.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        storyId: 'story-1',
      });

      await service.abandonSession('user-1', 'session-1');

      expect(mockPrisma.readingSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-1' },
          data: expect.objectContaining({ status: 'ABANDONED' }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────
  // DTO validation — invalid status filter
  // ─────────────────────────────────────────────
  describe('GetSessionsDto — status validation', () => {
    async function validateStatus(value: string | undefined): Promise<boolean> {
      const dto = plainToInstance(GetSessionsDto, { status: value });
      const errors = await validate(dto);
      return errors.some(e => e.property === 'status');
    }

    it('should reject invalid status FINISHED', async () => {
      const hasError = await validateStatus('FINISHED');
      expect(hasError).toBe(true);
    });

    it('should reject invalid status INVALID', async () => {
      const hasError = await validateStatus('INVALID');
      expect(hasError).toBe(true);
    });

    it('should accept valid status ACTIVE', async () => {
      const hasError = await validateStatus('ACTIVE');
      expect(hasError).toBe(false);
    });

    it('should accept valid status COMPLETED', async () => {
      const hasError = await validateStatus('COMPLETED');
      expect(hasError).toBe(false);
    });

    it('should accept valid status ABANDONED', async () => {
      const hasError = await validateStatus('ABANDONED');
      expect(hasError).toBe(false);
    });

    it('should accept undefined status (optional)', async () => {
      const hasError = await validateStatus(undefined);
      expect(hasError).toBe(false);
    });
  });

  describe('Session Summary Image URL Selection (Step 98j)', () => {
    it('story cover http(s) wins over premise and character', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([{
        id: 'session-1', storyId: 'story-1', currentChapter: 1, currentSceneIndex: 2,
        status: 'ACTIVE', startedAt: new Date(), lastSceneAt: new Date(),
        story: { title: 'Test', coverUrl: 'https://cdn.example.com/story-cover.jpg' },
        premise: { title: 'P1', coverUrl: 'https://cdn.example.com/premise-cover.jpg' },
        character: { name: 'Hero', imageUrl: 'https://cdn.example.com/char.jpg' },
      }]);
      mockPrisma.readingSession.count.mockResolvedValue(1);

      const result = await (service as any).getUserSessions('user-1', {});
      const s = result.sessions[0];

      expect(s.storyCoverUrl).toBe('https://cdn.example.com/story-cover.jpg');
    });

    it('premise cover http(s) fallback works when story cover missing', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([{
        id: 'session-1', storyId: 'story-1', currentChapter: 1, currentSceneIndex: 2,
        status: 'ACTIVE', startedAt: new Date(), lastSceneAt: new Date(),
        story: { title: 'Test', coverUrl: null },
        premise: { title: 'P1', coverUrl: 'https://cdn.example.com/premise-cover.jpg' },
        character: { name: 'Hero', imageUrl: 'https://cdn.example.com/char.jpg' },
      }]);
      mockPrisma.readingSession.count.mockResolvedValue(1);

      const result = await (service as any).getUserSessions('user-1', {});
      const s = result.sessions[0];

      expect(s.storyCoverUrl).toBe('https://cdn.example.com/premise-cover.jpg');
      expect(s.selectedPremiseCoverUrl).toBe('https://cdn.example.com/premise-cover.jpg');
    });

    it('character image http(s) fallback works when story and premise missing', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([{
        id: 'session-1', storyId: 'story-1', currentChapter: 1, currentSceneIndex: 2,
        status: 'ACTIVE', startedAt: new Date(), lastSceneAt: new Date(),
        story: { title: 'Test', coverUrl: null },
        premise: { title: 'P1', coverUrl: null },
        character: { name: 'Hero', imageUrl: 'https://cdn.example.com/char.jpg' },
      }]);
      mockPrisma.readingSession.count.mockResolvedValue(1);

      const result = await (service as any).getUserSessions('user-1', {});
      const s = result.sessions[0];

      expect(s.storyCoverUrl).toBe('https://cdn.example.com/char.jpg');
      expect(s.selectedCharacterImageUrl).toBe('https://cdn.example.com/char.jpg');
    });

    it('inline/base64 coverUrl is stripped and returns null', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([{
        id: 'session-1', storyId: 'story-1', currentChapter: 1, currentSceneIndex: 2,
        status: 'ACTIVE', startedAt: new Date(), lastSceneAt: new Date(),
        story: { title: 'Test', coverUrl: 'data:image/png;base64,iVBORw0KGgo=' },
        premise: { title: 'P1', coverUrl: 'data:image/png;base64,AAAA' },
        character: { name: 'Hero', imageUrl: 'data:image/png;base64,BBBB' },
      }]);
      mockPrisma.readingSession.count.mockResolvedValue(1);

      const result = await (service as any).getUserSessions('user-1', {});
      const s = result.sessions[0];

      expect(s.storyCoverUrl).toBeNull();
      expect(s.selectedPremiseCoverUrl).toBeNull();
      expect(s.selectedCharacterImageUrl).toBeNull();
    });

    it('mixed http and inline returns http URL only, stripping inline', async () => {
      mockPrisma.readingSession.findMany.mockResolvedValue([{
        id: 'session-1', storyId: 'story-1', currentChapter: 1, currentSceneIndex: 2,
        status: 'ACTIVE', startedAt: new Date(), lastSceneAt: new Date(),
        story: { title: 'Test', coverUrl: null },
        premise: { title: 'P1', coverUrl: 'https://cdn.example.com/premise-cover.jpg' },
        character: { name: 'Hero', imageUrl: 'data:image/png;base64,BBBB' },
      }]);
      mockPrisma.readingSession.count.mockResolvedValue(1);

      const result = await (service as any).getUserSessions('user-1', {});
      const s = result.sessions[0];

      expect(s.storyCoverUrl).toBe('https://cdn.example.com/premise-cover.jpg');
      expect(s.selectedPremiseCoverUrl).toBe('https://cdn.example.com/premise-cover.jpg');
      expect(s.selectedCharacterImageUrl).toBeNull();
    });
  });

  describe('QA Provider Failure Harness (Step 98l)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns 503 AI_PROVIDER_UNAVAILABLE when narrative engine throws provider error', async () => {
      mockNarrativeEngine.generateScene.mockRejectedValue(new Error('Provider unavailable (QA forced'));

      mockPrisma.readingSession.findUnique.mockResolvedValue({
        id: 'session-1', userId: 'user-1', storyId: 'story-1',
        currentSceneIndex: 1, status: 'ACTIVE',
      });

      mockPrisma.story.findUnique.mockResolvedValue({
        id: 'story-1', title: 'Test', synopsis: 'Syn', genres: ['drama'],
        visibility: 'PUBLIC', moderationStatus: 'APPROVED',
      });

      mockPrisma.narrativeMemory.findUnique.mockResolvedValue({});
      mockPrisma.storyPremise.findUnique.mockResolvedValue({ id: 'premise-1', storyId: 'story-1' });
      mockPrisma.storyPlayableCharacter.findFirst.mockResolvedValue({ id: 'char-1', premiseId: 'premise-1' });
      mockPrisma.narrativeEvent.findMany.mockResolvedValue([]);

      try {
        await (service as any).generateNextScene('user-1', 'session-1', 'test action');
        fail('Expected error');
      } catch (error: any) {
        expect(error.status).toBe(503);
        expect(error.message).toContain('temporarily unavailable');
      }

      expect(mockNarrativeEngine.generateScene).toHaveBeenCalledTimes(1);
    });

    it('does not persist any event when provider fails', async () => {
      mockNarrativeEngine.generateScene.mockRejectedValue(new Error('Provider unavailable (QA forced'));

      mockPrisma.readingSession.findUnique.mockResolvedValue({
        id: 'session-1', userId: 'user-1', storyId: 'story-1',
        currentSceneIndex: 1, status: 'ACTIVE',
      });

      mockPrisma.story.findUnique.mockResolvedValue({
        id: 'story-1', title: 'Test', synopsis: 'Syn', genres: ['drama'],
        visibility: 'PUBLIC', moderationStatus: 'APPROVED',
      });

      mockPrisma.narrativeMemory.findUnique.mockResolvedValue({});
      mockPrisma.storyPremise.findUnique.mockResolvedValue({ id: 'premise-1', storyId: 'story-1' });
      mockPrisma.storyPlayableCharacter.findFirst.mockResolvedValue({ id: 'char-1', premiseId: 'premise-1' });
      mockPrisma.narrativeEvent.findMany.mockResolvedValue([]);

      try { await (service as any).generateNextScene('user-1', 'session-1', 'test'); } catch {}

      expect(mockPrisma.narrativeEvent.create).not.toHaveBeenCalled();
    });
  });
});
