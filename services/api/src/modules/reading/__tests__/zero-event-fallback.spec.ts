const mockPrismaInstance = {
  storyPremise: {
    findUnique: jest.fn(),
  },
  storyPlayableCharacter: {
    findFirst: jest.fn(),
  },
  narrativeMemory: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  narrativeEvent: {
    create: jest.fn(),
  },
  readingSession: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  modelUsage: {
    create: jest.fn(),
  },
  dailyUsageLimit: {
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  adEvent: {
    create: jest.fn(),
  },
};

import { ReadingOrchestratorService } from '../reading-orchestrator.service';
import { NarrativeEngine } from '../narrative/narrative-engine.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';

describe('ReadingOrchestratorService - Zero-Event Fallback', () => {
  let service: ReadingOrchestratorService;
  let storyQualityService: jest.Mocked<StoryQualityService>;
  let narrativeEngine: jest.Mocked<NarrativeEngine>;

  const mockSessionWithPremiseAndCharacter = {
    id: 'session-1',
    userId: 'user-1',
    storyId: 'story-1',
    status: 'ACTIVE' as any,
    selectedPremiseId: 'premise-1',
    selectedCharacterId: 'character-1',
    protagonistName: 'Hero',
    protagonistRole: 'The Hero',
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
    premise: {
      id: 'premise-1',
      storyId: 'story-1',
      title: 'The Beginning',
      synopsis: 'An epic start',
    },
    character: {
      id: 'character-1',
      premiseId: 'premise-1',
      name: 'Hero',
      roleLabel: 'The Hero',
      narrativeFunction: 'HERO',
    },
  };

  const mockSessionNoPremise = {
    id: 'session-2',
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
      title: 'Test Story 2',
      synopsis: 'Another test story',
      genres: ['fantasy'],
      visibility: 'PUBLIC' as any,
      moderationStatus: 'APPROVED' as any,
      creatorUserId: null,
    },
    premise: null,
    character: null,
  };

  const mockPremise = {
    id: 'premise-1',
    storyId: 'story-1',
    title: 'The Beginning',
    synopsis: 'An epic start',
  };

  const mockCharacter = {
    id: 'character-1',
    premiseId: 'premise-1',
    name: 'Hero',
    roleLabel: 'The Hero',
    narrativeFunction: 'HERO',
  };

  const mockFirstSceneResult = {
    sceneText: 'First scene generated',
    suggestedActions: ['Continue', 'Explore'],
    modelUsed: 'gpt-4o-mini',
    providerUsed: 'mock',
    tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
    sceneMetadata: { emotion: 'expectativa', pacing: 'lenta' },
    memoryPatch: {
      summary: 'Start of story',
      worldState: '',
      characterState: 'Hero begins journey',
      importantChoices: [],
      openThreads: [],
      constraints: 'Epic tone',
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
      mockPrismaInstance as any,
      mockConfigService as any,
    );

    mockPrismaInstance.narrativeMemory.findUnique.mockResolvedValue(null);
    mockPrismaInstance.storyPremise.findUnique.mockResolvedValue(mockPremise);
    mockPrismaInstance.storyPlayableCharacter.findFirst.mockResolvedValue(mockCharacter);
    mockPrismaInstance.narrativeMemory.upsert.mockResolvedValue({});
    mockPrismaInstance.narrativeMemory.update.mockResolvedValue({});
    mockPrismaInstance.narrativeEvent.create.mockResolvedValue({
      chapterNumber: 1,
      sceneIndex: 0,
      sceneText: 'First scene generated',
    });
    mockPrismaInstance.readingSession.update.mockResolvedValue({});
    mockPrismaInstance.modelUsage.create.mockResolvedValue({});
    mockPrismaInstance.dailyUsageLimit.findUnique.mockResolvedValue({ limit: 10, freeInteractionsUsed: 0 });
    mockPrismaInstance.dailyUsageLimit.update.mockResolvedValue({});
    mockPrismaInstance.dailyUsageLimit.upsert.mockResolvedValue({});
    mockPrismaInstance.adEvent.create.mockResolvedValue({});

    jest.spyOn(service as any, 'getSessionWithStory').mockImplementation(async (sessionId: string) => {
      if (sessionId === 'session-1') return mockSessionWithPremiseAndCharacter;
      if (sessionId === 'session-2') return mockSessionNoPremise;
      return null;
    });
    jest.spyOn(service as any, 'getUserWithSubscription').mockResolvedValue({
      id: 'user-1',
      subscription: { type: 'FREE' },
      creditWallet: { balance: 0 },
    });
    jest.spyOn(service as any, 'getOrCreateDailyLimit').mockResolvedValue({
      limit: 10,
      freeInteractionsUsed: 0,
    });
    jest.spyOn(service as any, 'getSessionEvents').mockResolvedValue([]);
    jest.spyOn(service as any, 'assertCanAccessStory').mockImplementation(() => {});
    narrativeEngine.generateScene.mockResolvedValue(mockFirstSceneResult);
  });

  describe('getSessionWithStatus - zero-event fallback', () => {
    it('reuses a background first-scene generation without calling the engine again', async () => {
      const preparedScene = {
        id: 'event-background',
        chapterNumber: 1,
        sceneIndex: 0,
        sceneText: 'Background scene ready',
        choices: ['Continue'],
      };
      (service as any).pendingFirstScenes.set('session-1', Promise.resolve(preparedScene));

      const result = await service.getSessionWithStatus('user-1', 'session-1');

      expect(result.session.currentScene).toEqual(preparedScene);
      expect(narrativeEngine.generateScene).not.toHaveBeenCalled();
    });

    it('should resolve premise and character when selectedPremiseId and selectedCharacterId exist', async () => {
      const result = await service.getSessionWithStatus('user-1', 'session-1');

      expect(mockPrismaInstance.storyPremise.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaInstance.storyPlayableCharacter.findFirst).not.toHaveBeenCalled();

      expect(narrativeEngine.generateScene).toHaveBeenCalledWith(
        expect.objectContaining({
          isFirstScene: true,
          premise: mockPremise,
          playableCharacter: mockCharacter,
        }),
      );

      expect(result.session.currentScene.sceneText).toBe('First scene generated');
    });

    it('should pass null premise/character when no selectedPremiseId/selectedCharacterId', async () => {
      mockPrismaInstance.storyPremise.findUnique.mockResolvedValue(null);
      mockPrismaInstance.storyPlayableCharacter.findFirst.mockResolvedValue(null);

      const result = await service.getSessionWithStatus('user-1', 'session-2');

      expect(mockPrismaInstance.storyPremise.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaInstance.storyPlayableCharacter.findFirst).not.toHaveBeenCalled();

      expect(narrativeEngine.generateScene).toHaveBeenCalledWith(
        expect.objectContaining({
          isFirstScene: true,
          premise: null,
          playableCharacter: null,
        }),
      );

      expect(result.session.currentScene.sceneText).toBe('First scene generated');
    });
  });
});
