import { HttpException } from '@nestjs/common';
import { ReadingOrchestratorService } from '../reading-orchestrator.service';
import { NarrativeEngine } from '../narrative/narrative-engine.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { SubscriptionType, ReadingSessionStatus, StoryVisibility, StoryModerationStatus } from '@prisma/client';

describe('ReadingOrchestratorService - Error Contract', () => {
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

  const premiumStory = {
    ...publicStory,
    id: 'story-2',
    isPremium: true,
  };

  beforeEach(() => {
    storyQualityService = {
      validateStoryQuality: jest.fn(() => Promise.resolve()),
    } as any;

    mockNarrativeEngine = {
      generateScene: jest.fn(),
    };

    mockPrisma = {
      $transaction: jest.fn(),
      story: { findUnique: jest.fn().mockResolvedValue(publicStory) },
      storyPremise: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null) },
      storyPlayableCharacter: { findFirst: jest.fn().mockResolvedValue(null) },
      narrativeMemory: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({}), update: jest.fn() },
      narrativeEvent: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
      readingSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1', storyId: 'story-1' }),
        update: jest.fn().mockResolvedValue({ id: 'session-1' }),
        count: jest.fn().mockResolvedValue(0),
      },
      modelUsage: { create: jest.fn() },
      dailyUsageLimit: { findUnique: jest.fn().mockResolvedValue({ id: 'usage-1', freeInteractionsUsed: 0, limit: 10 }), upsert: jest.fn().mockResolvedValue({ id: 'usage-1', freeInteractionsUsed: 0, limit: 10 }) },
      adEvent: { create: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', subscription: { type: SubscriptionType.PREMIUM }, creditWallet: { balance: 0 } }) },
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

  describe('session not found', () => {
    it('should return 404 with READING_SESSION_NOT_FOUND for non-existent session', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(null);
      jest.spyOn(service as any, 'getSessionWithStory').mockResolvedValue(null);

      try {
        await service.getSessionWithStatus('user-1', 'nonexistent');
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(404);
        expect((error as HttpException).getResponse()).toMatchObject({
          message: 'Reading session not found.',
          error: 'READING_SESSION_NOT_FOUND',
        });
      }
    });

    it('should return 404 with READING_SESSION_NOT_FOUND for session owned by another user', async () => {
      const otherSession = {
        id: 'session-1',
        userId: 'other-user',
        storyId: 'story-1',
        status: ReadingSessionStatus.ACTIVE,
        story: publicStory,
      };
      jest.spyOn(service as any, 'getSessionWithStory').mockResolvedValue(otherSession);

      try {
        await service.getSessionWithStatus('user-1', 'session-1');
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(404);
        expect((error as HttpException).getResponse()).toMatchObject({
          error: 'READING_SESSION_NOT_FOUND',
        });
      }
    });
  });

  describe('premium story without access', () => {
    it('should return 402 with PREMIUM_REQUIRED when free user starts premium story', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(premiumStory);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { type: SubscriptionType.FREE },
        creditWallet: { balance: 0 },
      });

      try {
        await service.startReading('user-1', { storyId: 'story-2' });
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(402);
        expect((error as HttpException).getResponse()).toMatchObject({
          message: 'This story requires a Premium subscription.',
          error: 'PREMIUM_REQUIRED',
        });
      }
    });
  });

  describe('insufficient credits', () => {
    it('should return 402 with INSUFFICIENT_CREDITS when PREMIUM user requests high-cost model without credits', async () => {
      const sessionWithEvents = {
        id: 'session-1',
        userId: 'user-1',
        storyId: 'story-1',
        status: ReadingSessionStatus.ACTIVE,
        currentChapter: 1,
        currentSceneIndex: 0,
        selectedPremiseId: null,
        selectedCharacterId: null,
        protagonistName: 'Hero',
        protagonistRole: 'protagonist',
        story: publicStory,
      };

      jest.spyOn(service as any, 'getSessionWithStory').mockResolvedValue(sessionWithEvents);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { type: SubscriptionType.PREMIUM },
        creditWallet: { balance: 0 },
      });

      try {
        await service.sendAction('user-1', 'session-1', {
          action: 'Continue',
          modelId: 'claude-3-5-sonnet-20241022',
        });
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(402);
        expect((error as HttpException).getResponse()).toMatchObject({
          error: 'INSUFFICIENT_CREDITS',
        });
      }
    });
  });

  describe('provider unavailable', () => {
    it('should return 503 with AI_PROVIDER_UNAVAILABLE when AI provider fails', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(publicStory);
      mockPrisma.readingSession.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        storyId: 'story-1',
        status: ReadingSessionStatus.ACTIVE,
        currentChapter: 1,
        currentSceneIndex: 0,
      });

      mockNarrativeEngine.generateScene.mockRejectedValue(
        new Error('Scene generation failed: OpenAI API error: status 500'),
      );

      mockPrisma.narrativeMemory.findUnique.mockResolvedValue({
        id: 'mem-1',
        sessionId: 'session-1',
        summary: '',
        worldState: '',
        characterState: '',
        importantChoices: '',
        openThreads: '',
        constraints: '',
        sceneCount: 0,
      });

      try {
        await service.startReading('user-1', { storyId: 'story-1' });
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(503);
        expect((error as HttpException).getResponse()).toMatchObject({
          error: 'AI_PROVIDER_UNAVAILABLE',
        });
      }
    });
  });

  describe('FREE_LLM_ONLY premium fallback', () => {
    it('should create the first scene with the free model instead of denying premium users', async () => {
      const mockScene = {
        sceneText: 'The free-only story begins.',
        suggestedActions: ['Continue'],
        modelUsed: 'openrouter/free',
        tokenUsage: { inputTokens: 10, outputTokens: 20 },
        sceneMetadata: {},
        memoryPatch: {
          summary: 'A start.',
          worldState: '',
          characterState: '',
          importantChoices: [],
          openThreads: [],
          constraints: '',
        },
      };

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FREE_LLM_ONLY') return true;
        return false;
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { type: SubscriptionType.PREMIUM },
        creditWallet: { balance: 0 },
      });

      mockPrisma.readingSession.create.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        storyId: 'story-1',
        currentChapter: 1,
        currentSceneIndex: 0,
      });
      mockNarrativeEngine.generateScene.mockResolvedValue(mockScene);
      mockPrisma.narrativeEvent.create.mockResolvedValue({
        id: 'event-1',
        sceneText: mockScene.sceneText,
        choices: mockScene.suggestedActions,
      });

      await service.startReading('user-1', { storyId: 'story-1' });

      expect(mockPrisma.readingSession.create).toHaveBeenCalled();
      expect(mockPrisma.narrativeEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userAction: expect.any(String),
            userActionType: 'FREE_TEXT',
          }),
        }),
      );
      const eventCreateData = mockPrisma.narrativeEvent.create.mock.calls[0][0].data;
      expect(eventCreateData).not.toHaveProperty('action');
      expect(mockNarrativeEngine.generateScene).toHaveBeenCalledWith(expect.objectContaining({
        selectedModelId: 'groq/free',
      }));
    });
  });

  describe('generation failure classification', () => {
    it('should return 503 with AI_PROVIDER_UNAVAILABLE for provider/transient error', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(publicStory);
      mockPrisma.readingSession.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        storyId: 'story-1',
        status: ReadingSessionStatus.ACTIVE,
        currentChapter: 1,
        currentSceneIndex: 0,
      });
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue({
        id: 'mem-1',
        sessionId: 'session-1',
        summary: '',
        worldState: '',
        characterState: '',
        importantChoices: '',
        openThreads: '',
        constraints: '',
        sceneCount: 0,
      });

      mockNarrativeEngine.generateScene.mockRejectedValue(
        new Error('Scene generation failed: OpenAI API error: status 500'),
      );

      try {
        await service.startReading('user-1', { storyId: 'story-1' });
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(503);
        expect((error as HttpException).getResponse()).toMatchObject({
          error: 'AI_PROVIDER_UNAVAILABLE',
        });
      }
    });

    it('should return 500 with READING_GENERATION_FAILED for parse/internal error', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(publicStory);
      mockPrisma.readingSession.findFirst.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        storyId: 'story-1',
        status: ReadingSessionStatus.ACTIVE,
        currentChapter: 1,
        currentSceneIndex: 0,
      });
      mockPrisma.narrativeMemory.findUnique.mockResolvedValue({
        id: 'mem-1',
        sessionId: 'session-1',
        summary: '',
        worldState: '',
        characterState: '',
        importantChoices: '',
        openThreads: '',
        constraints: '',
        sceneCount: 0,
      });

      mockNarrativeEngine.generateScene.mockRejectedValue(
        new Error('Scene generation failed: Failed to parse LLM response'),
      );

      try {
        await service.startReading('user-1', { storyId: 'story-1' });
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(500);
        expect((error as HttpException).getResponse()).toMatchObject({
          error: 'READING_GENERATION_FAILED',
        });
      }
    });
  });
});
