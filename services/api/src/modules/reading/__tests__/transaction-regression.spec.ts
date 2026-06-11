import { ReadingOrchestratorService } from '../reading-orchestrator.service';
import { NarrativeEngine } from '../narrative/narrative-engine.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { Prisma, SubscriptionType } from '@prisma/client';

describe('ReadingOrchestratorService - Transaction Failure Regression', () => {
  let service: ReadingOrchestratorService;
  let storyQualityService: jest.Mocked<StoryQualityService>;
  let narrativeEngine: jest.Mocked<NarrativeEngine>;

  const mockSession = {
    id: 'session-1',
    userId: 'user-1',
    storyId: 'story-1',
    status: 'ACTIVE' as any,
    selectedPremiseId: null,
    selectedCharacterId: null,
    protagonistName: null,
    protagonistRole: null,
    currentChapter: 1,
    currentSceneIndex: 0,
    story: {
      id: 'story-1',
      title: 'Test Story',
      synopsis: 'A test story',
      genres: ['adventure'],
      visibility: 'PUBLIC' as any,
      moderationStatus: 'APPROVED' as any,
      creatorUserId: null,
    },
  };

  const mockStory = {
    id: 'story-1',
    title: 'Test Story',
    synopsis: 'A test story',
    genres: ['adventure'],
    visibility: 'PUBLIC' as any,
    moderationStatus: 'APPROVED' as any,
    creatorUserId: null,
  };

  const mockSceneResult = {
    sceneText: 'Scene text',
    suggestedActions: ['Continue'],
    modelUsed: 'gpt-4o-mini',
    providerUsed: 'mock',
    tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    sceneMetadata: { emotion: 'expectativa', pacing: 'steady' },
    memoryPatch: {
      summary: 'Story continues',
      worldState: '',
      characterState: '',
      importantChoices: [],
      openThreads: [],
      constraints: '',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    storyQualityService = {
      validateStoryQuality: jest.fn(() => Promise.resolve()),
    } as any;

    narrativeEngine = {
      generateScene: jest.fn(),
    } as any;

    const mockConfigService = {
      get: jest.fn().mockReturnValue(false),
    };

    service = new ReadingOrchestratorService(
      storyQualityService as any,
      narrativeEngine as any,
      {} as any,
      mockConfigService as any,
    );
  });

  describe('generateNextScene - dailyUsageLimit transaction failure', () => {
    it('should reject when dailyUsageLimit.upsert() fails inside transaction', async () => {
      const mockTxClient = {
        readingSession: {
          findUnique: jest.fn().mockResolvedValue(mockSession),
          update: jest.fn().mockResolvedValue({ ...mockSession, currentSceneIndex: 1 }),
        },
        story: {
          findUnique: jest.fn().mockResolvedValue(mockStory),
        },
        narrativeMemory: {
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn().mockResolvedValue({}),
        },
        narrativeEvent: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: 'event-1' }),
        },
        storyPremise: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        storyPlayableCharacter: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        dailyUsageLimit: {
          upsert: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        },
        modelUsage: {
          create: jest.fn().mockResolvedValue({}),
        },
        adEvent: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      const mockPrisma = {
        readingSession: {
          findUnique: jest.fn().mockResolvedValue(mockSession),
        },
        story: {
          findUnique: jest.fn().mockResolvedValue(mockStory),
        },
        narrativeMemory: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        narrativeEvent: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        storyPremise: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        storyPlayableCharacter: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        $transaction: jest.fn((callback: (tx: any) => Promise<any>) => callback(mockTxClient)),
      };

      (service as any).prisma = mockPrisma;

      narrativeEngine.generateScene.mockResolvedValue(mockSceneResult);

      await expect(
        service.generateNextScene('user-1', 'session-1', 'continue', undefined, {
          id: 'user-1',
          subscription: { type: SubscriptionType.FREE },
          creditWallet: { id: 'wallet-1', balance: 0 },
        }, {
          id: 'gpt-4o-mini',
          tier: 'FREE',
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('createFreeSessionWithLimitTransaction', () => {
    it('uses a short batch transaction compatible with pooled production connections', async () => {
      const createdSession = { ...mockSession, id: 'session-new' };
      const sessionCreate = Promise.resolve(createdSession);
      const usageUpdate = Promise.resolve({ freeInteractionsUsed: 1 });
      const mockPrisma = {
        readingSession: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn().mockReturnValue(sessionCreate),
        },
        dailyUsageLimit: {
          update: jest.fn().mockReturnValue(usageUpdate),
        },
        $transaction: jest.fn().mockResolvedValue([createdSession, { freeInteractionsUsed: 1 }]),
      };

      (service as any).prisma = mockPrisma;

      const result = await service.createFreeSessionWithLimitTransaction(
        'user-1',
        'story-1',
        { selectedPremiseId: 'premise-1' },
      );

      expect(result).toBe(createdSession);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        [sessionCreate, usageUpdate],
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    });
  });
});
