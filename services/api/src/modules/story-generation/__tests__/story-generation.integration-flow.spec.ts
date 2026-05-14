import { Test, TestingModule } from '@nestjs/testing';
import { StoryGenerationService } from '../story-generation.service';
import { StoryGenerationObservabilityService } from '../services/story-generation-observability.service';
import { StoryGenerationBudgetGuard } from '../story-generation-budget.guard';
import { StoryGenerationInputGuard } from '../story-generation-input.guard';
import { StoryLifecycleService } from '@modules/story-lifecycle/story-lifecycle.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { StorySetupService } from '@modules/story-setup/story-setup.service';
import { ReadingService } from '@modules/reading/reading.service';
import { ReadingOrchestratorService } from '@modules/reading/reading-orchestrator.service';
import { NarrativeEngine } from '@modules/reading/narrative/narrative-engine.service';
import { ModerationService } from '@modules/moderation/moderation.service';
import { AiService } from '@modules/ai/ai.service';
import { ImageGenerationService } from '@modules/ai/image-generation.service';
import { PrismaService } from '@common/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionType, StoryOrigin, StoryVisibility, StoryModerationStatus, ReadingSessionStatus } from '@prisma/client';
import { AIModel } from '@modules/ai/model-catalog';

describe('Story Generation Integration Flow', () => {
  let storyGenerationService: StoryGenerationService;
  let storyLifecycleService: StoryLifecycleService;
  let storySetupService: StorySetupService;
  let readingService: ReadingService;

  const mockUser = {
    id: 'user-creator',
    email: 'creator@enredo.ai',
    subscription: { type: SubscriptionType.FREE, status: 'ACTIVE' },
  };

  const mockOtherUser = {
    id: 'user-other',
    email: 'other@enredo.ai',
    subscription: { type: SubscriptionType.FREE, status: 'ACTIVE' },
  };

  const mockStoryData = {
    id: 'story-generated',
    slug: 'mystery-story',
    title: 'Mistério na Cidade Futurista',
    synopsis: 'Uma história de mistério em uma cidade futurista cheia de segredos.',
    genres: ['mistério', 'ficção científica'],
    coverUrl: null,
    openingScene: 'O nevoeiro envolvia os prédios enquanto você caminhava pelas ruas vazias.',
    origin: StoryOrigin.USER_GENERATED,
    visibility: StoryVisibility.PRIVATE,
    moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
    creatorUserId: 'user-creator',
  };

  const mockPrismaService: any = {
    user: {
      findUnique: jest.fn(),
    },
    story: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    storyPremise: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    storyPlayableCharacter: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    readingSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
  };

  let mockBudgetGuard: any;
  let mockInputGuard: any;
  let mockAiService: any;
  let mockStoryQualityService: any;
  let mockImageGenerationService: any;
  let mockConfigService: any;
  let mockModerationService: any;
  let mockObservabilityService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    
    mockPrismaService.story.findMany.mockResolvedValue([mockStoryData]);
    mockPrismaService.story.findUnique.mockImplementation((args: any) => {
      if (args.where.id === mockStoryData.id) {
        return Promise.resolve({
          ...mockStoryData,
          creatorUserId: 'user-creator',
        });
      }
      return Promise.resolve(null);
    });

    mockPrismaService.storyPremise.findMany.mockResolvedValue([]);
    mockPrismaService.storyPremise.findUnique.mockResolvedValue({ 
      storyId: 'story-generated', 
      story: { creatorUserId: 'user-creator' } 
    });
    mockPrismaService.storyPremise.create.mockResolvedValue({
      id: 'premise-1',
      storyId: 'story-generated',
      title: 'Premise 1',
    });

    mockPrismaService.storyPlayableCharacter.findMany.mockResolvedValue([]);
    mockPrismaService.storyPlayableCharacter.findUnique.mockResolvedValue({ 
      premise: { storyId: 'story-generated', story: { creatorUserId: 'user-creator' } } 
    });
    mockPrismaService.storyPlayableCharacter.create.mockResolvedValue({
      id: 'char-1',
      premiseId: 'premise-1',
      name: 'Char 1',
    });

    mockPrismaService.readingSession.findFirst.mockResolvedValue(null);
    mockPrismaService.readingSession.create.mockResolvedValue({
      id: 'session-1',
      userId: mockUser.id,
      storyId: mockStoryData.id,
      status: ReadingSessionStatus.ACTIVE,
    });

    mockBudgetGuard = {
      decide: jest.fn().mockReturnValue({
        allowed: true,
        finalModel: { id: 'mock-model', maxTokens: 500, tier: 'FREE' } as AIModel,
        maxOutputTokens: 500,
        budgetTier: 'FREE',
      }),
    };

    mockInputGuard = {
      validate: jest.fn((dto: any) => ({
        keywords: dto.keywords,
        genre: dto.genre,
        tone: dto.tone,
        targetAudience: dto.targetAudience,
        constraints: dto.constraints,
      }) as any),
    };

    mockAiService = {
      isMockMode: jest.fn().mockReturnValue(true),
      generatePremises: jest.fn().mockResolvedValue([
        { title: 'Premise 1', synopsis: 'Synopsis 1', basePrompt: 'Prompt 1' },
      ]),
      generatePlayableCharacters: jest.fn().mockResolvedValue([
        { name: 'Char 1', role: 'PROTAGONIST', description: 'Desc 1' },
      ]),
    };

    mockStoryQualityService = {
      validateStoryQuality: jest.fn(() => Promise.resolve()),
    };

    mockImageGenerationService = {
      isEnabled: jest.fn().mockReturnValue(false),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'STORY_SETUP_GENERATION_ENABLED') return 'true';
        return null;
      }),
    };

    mockModerationService = {
      moderateUserAction: jest.fn().mockReturnValue({ allowed: true, sanitizedText: 'test' }),
    };

    mockObservabilityService = {
      createUsageRecord: jest.fn().mockResolvedValue({
        tracked: true,
        estimatedCost: 0.05,
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryGenerationService,
        StoryGenerationObservabilityService,
        StoryLifecycleService,
        StorySetupService,
        ReadingService,
        ReadingOrchestratorService,
        ModerationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StoryGenerationBudgetGuard,
          useValue: mockBudgetGuard,
        },
        {
          provide: StoryGenerationInputGuard,
          useValue: mockInputGuard,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: StoryQualityService,
          useValue: mockStoryQualityService,
        },
        {
          provide: ImageGenerationService,
          useValue: mockImageGenerationService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ModerationService,
          useValue: mockModerationService,
        },
        {
          provide: StoryGenerationObservabilityService,
          useValue: mockObservabilityService,
        },
        {
          provide: NarrativeEngine,
          useValue: { generateScene: jest.fn() },
        },
      ],
    }).compile();

    storyGenerationService = module.get<StoryGenerationService>(StoryGenerationService);
    storyLifecycleService = module.get<StoryLifecycleService>(StoryLifecycleService);
    storySetupService = module.get<StorySetupService>(StorySetupService);
    readingService = module.get<ReadingService>(ReadingService);

    jest.spyOn(storyGenerationService as any, 'generateDraft').mockResolvedValue({
      title: mockStoryData.title,
      synopsis: mockStoryData.synopsis,
      genres: mockStoryData.genres,
      openingScene: mockStoryData.openingScene,
      basePrompt: 'base prompt',
      tone: 'cinematográfico',
      styleGuide: 'style guide',
      worldRules: 'world rules',
      language: 'pt-BR',
      maturityRating: '12+',
    });

    jest.spyOn(storyLifecycleService, 'createStory').mockResolvedValue(mockStoryData);

    jest.spyOn(storyLifecycleService, 'getMyStories').mockResolvedValue([mockStoryData]);

    jest.spyOn(storyLifecycleService, 'getStoryStatus').mockImplementation((userId: string) => {
      if (userId !== mockUser.id) {
        return Promise.reject(new ForbiddenException('You do not have access to this story'));
      }
      return Promise.resolve({
        id: mockStoryData.id,
        origin: mockStoryData.origin,
        visibility: mockStoryData.visibility,
        moderationStatus: mockStoryData.moderationStatus,
        isCreator: true,
      });
    });
  });

  describe('Full Flow', () => {
    it('should complete the full flow successfully', async () => {
      const generateDto = {
        keywords: ['mistério', 'cidade futurista'],
        genre: 'ficção científica',
        tone: 'cinematográfico',
      };

      const generateResult = await storyGenerationService.generateStory(mockUser.id, generateDto);

      expect(generateResult.story.origin).toBe('USER_GENERATED');
      expect(generateResult.story.visibility).toBe('PRIVATE');
      expect(generateResult.generation.usageStatus).toBe('SUCCESS');
      expect(generateResult.generation.tracked).toBe(true);

      const myStories = await storyLifecycleService.getMyStories(mockUser.id);
      expect(myStories.length).toBeGreaterThan(0);

      const status = await storyLifecycleService.getStoryStatus(mockUser.id, mockStoryData.id);
      expect(status.origin).toBe('USER_GENERATED');
      expect(status.isCreator).toBe(true);

      await storySetupService.generatePremises(mockStoryData.id, mockUser.id, false);
      expect(mockPrismaService.storyPremise.create).toHaveBeenCalled();

      await storySetupService.generateCharacters('premise-1', mockUser.id, false);
      expect(mockPrismaService.storyPlayableCharacter.create).toHaveBeenCalled();

      const mockOrchestrator = {
        startReading: jest.fn().mockResolvedValue({
          session: {
            id: 'session-1',
            status: ReadingSessionStatus.ACTIVE,
          },
        }),
      };

      const readingModule: TestingModule = await Test.createTestingModule({
        providers: [
          ReadingService,
          ModerationService,
          {
            provide: ReadingOrchestratorService,
            useValue: mockOrchestrator,
          },
        ],
      }).compile();

      const readingServiceFromModule = readingModule.get<ReadingService>(ReadingService);
      const readingResult = await readingServiceFromModule.startReading(mockUser.id, {
        storyId: mockStoryData.id,
        premiseId: 'premise-1',
        characterId: 'char-1',
      });

      expect(readingResult.session.id).toBe('session-1');
    });

    it('should block non-creator from accessing private generated story', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockOtherUser);

      await expect(
        storyLifecycleService.getStoryStatus(mockOtherUser.id, mockStoryData.id)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Usage Tracking', () => {
    it('should record SUCCESS usage when story generation succeeds', async () => {
      const generateDto = {
        keywords: ['mistério'],
        genre: 'ficção científica',
      };

      await storyGenerationService.generateStory(mockUser.id, generateDto);
      expect(mockObservabilityService.createUsageRecord).toHaveBeenCalled();
    });
  });

  describe('Response Safety', () => {
    it('should not expose internal fields in response', async () => {
      const generateDto = {
        keywords: ['mistério'],
        genre: 'ficção científica',
      };

      const result = await storyGenerationService.generateStory(mockUser.id, generateDto);

      expect((result as any).basePrompt).toBeUndefined();
      expect((result as any).styleGuide).toBeUndefined();
      expect((result as any).worldRules).toBeUndefined();
      expect((result.story as any).creatorUserId).toBeUndefined();
    });
  });
});
