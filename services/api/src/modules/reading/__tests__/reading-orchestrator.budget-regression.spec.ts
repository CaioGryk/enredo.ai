import { ReadingOrchestratorService } from '../reading-orchestrator.service';
import { NarrativeEngine } from '../narrative/narrative-engine.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { StoryVisibility, StoryModerationStatus, SubscriptionType } from '@prisma/client';

describe('ReadingOrchestratorService - No Orphaned Session on Budget Denial', () => {
  let service: ReadingOrchestratorService;
  let storyQualityService: jest.Mocked<StoryQualityService>;
  let mockPrisma: any;
  let mockNarrativeEngine: any;
  let mockConfigService: any;

  const mockStory = {
    id: 'story-1',
    title: 'Test Story',
    synopsis: 'Test synopsis for the story',
    visibility: StoryVisibility.PUBLIC,
    moderationStatus: StoryModerationStatus.APPROVED,
    creatorUserId: null,
    characters: [],
    premises: [{ id: 'premise-1', title: 'Premise 1', synopsis: 'synopsis' }],
  };

  const mockPremise = {
    id: 'premise-1',
    storyId: 'story-1',
    title: 'Premissa Principal',
    synopsis: 'Uma sinopse da premissa',
    basePrompt: '',
    openingScene: '',
    tone: 'narrativo',
    styleGuide: '',
    worldRules: '',
  };

  const mockCharacter = {
    id: 'char-1',
    premiseId: 'premise-1',
    name: 'Protagonista',
    roleLabel: 'Protagonista',
    narrativeFunction: 'protagonist',
    personality: '性格',
    motivation: '',
    secret: '',
    relationshipToPlayer: '',
    initialGoal: '',
    conflictPotential: '',
  };

  const mockScene = {
    sceneText: 'The free-only story begins.',
    suggestedActions: ['Continue', 'Investigate'],
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

  beforeEach(() => {
    storyQualityService = {
      validateStoryQuality: jest.fn(() => Promise.resolve()),
    } as any;

    mockNarrativeEngine = {
      generateScene: jest.fn(),
    };

    mockPrisma = {
      $transaction: jest.fn(),
      story: { findUnique: jest.fn().mockResolvedValue(mockStory) },
      storyPremise: { findUnique: jest.fn().mockResolvedValue(mockPremise) },
      storyPlayableCharacter: { findFirst: jest.fn().mockResolvedValue(mockCharacter) },
      narrativeMemory: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      narrativeEvent: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
      readingSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'session-1', userId: 'user-1', storyId: 'story-1' }),
        update: jest.fn().mockResolvedValue({ id: 'session-1' }),
        count: jest.fn().mockResolvedValue(0),
      },
      modelUsage: { create: jest.fn() },
      dailyUsageLimit: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue({ id: 'usage-1', freeInteractionsUsed: 0, limit: 10 }) },
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

  function createStartReadingDto() {
    return {
      storyId: 'story-1',
      premiseId: 'premise-1',
      characterId: 'char-1',
      protagonistName: 'Protagonista',
      protagonistRole: 'Protagonista',
      protagonistContext: 'Context',
    };
  }

  describe('startReading() - new session path', () => {
    it('should create session with the free model when FREE_LLM_ONLY=true and PREMIUM user has no explicit model', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FREE_LLM_ONLY') return true;
        return false;
      });

      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue({
        id: 'usage-1',
        freeInteractionsUsed: 0,
        limit: 10,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { type: SubscriptionType.PREMIUM },
        creditWallet: { balance: 0 },
      });

      mockNarrativeEngine.generateScene.mockResolvedValue(mockScene);
      mockPrisma.narrativeEvent.create.mockResolvedValue({
        id: 'event-1',
        sceneText: mockScene.sceneText,
        choices: mockScene.suggestedActions,
      });

      await service.startReading('user-1', createStartReadingDto());

      expect(mockPrisma.readingSession.create).toHaveBeenCalled();
      expect(mockNarrativeEngine.generateScene).toHaveBeenCalledWith(expect.objectContaining({
        selectedModelId: 'groq/free',
      }));
    });

    it('should not spend credits when the free-only fallback selects the free model', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FREE_LLM_ONLY') return true;
        return false;
      });

      mockPrisma.dailyUsageLimit.findUnique.mockResolvedValue({
        id: 'usage-1',
        freeInteractionsUsed: 0,
        limit: 10,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { type: SubscriptionType.PREMIUM },
        creditWallet: { balance: 0 },
      });

      mockNarrativeEngine.generateScene.mockResolvedValue(mockScene);
      mockPrisma.narrativeEvent.create.mockResolvedValue({
        id: 'event-1',
        sceneText: mockScene.sceneText,
        choices: mockScene.suggestedActions,
      });

      await service.startReading('user-1', createStartReadingDto());

      expect(mockNarrativeEngine.generateScene).toHaveBeenCalledWith(expect.objectContaining({
        selectedModelId: 'groq/free',
      }));
      expect(mockPrisma.creditWallet?.update).toBeUndefined();
      expect(mockPrisma.creditTransaction?.create).toBeUndefined();
    });
  });
});
