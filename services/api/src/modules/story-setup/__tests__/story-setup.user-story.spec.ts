import { Test, TestingModule } from '@nestjs/testing';
import { StorySetupService } from '../story-setup.service';
import { PrismaService } from '@common/prisma.service';
import { AiService } from '@modules/ai/ai.service';
import { ImageGenerationService } from '@modules/ai/image-generation.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { NotFoundException, ForbiddenException, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { StoryVisibility, StoryModerationStatus, SubscriptionType, NarrativeFunction } from '@prisma/client';

describe('StorySetupService - User-Generated Story Setup', () => {
  let service: StorySetupService;
  let prisma: any;

  const mockPrismaService: any = {
    story: { findUnique: jest.fn() },
    storyPremise: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(() => Promise.resolve({}).catch(() => {})),
    },
    storyPlayableCharacter: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(() => Promise.resolve({}).catch(() => {})),
    },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockAiService = {
    generatePremises: jest.fn(),
    generatePlayableCharacters: jest.fn(),
    isMockMode: jest.fn().mockReturnValue(true),
  };

  const mockImageGenerationService = {
    isEnabled: jest.fn().mockReturnValue(false),
  };

  const mockStoryQualityService = {
    validateStoryQuality: jest.fn(() => Promise.resolve()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorySetupService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
        { provide: ImageGenerationService, useValue: mockImageGenerationService },
        { provide: StoryQualityService, useValue: mockStoryQualityService },
      ],
    }).compile();

    service = module.get<StorySetupService>(StorySetupService);
    prisma = mockPrismaService;
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation((callback: any) => callback(mockPrismaService));
  });

  describe('generatePremises - User-Generated Stories', () => {
    const userStory = {
      id: 'user-story-1',
      title: 'My User Story',
      synopsis: 'A story about adventure',
      genres: ['aventura'],
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
      creatorUserId: 'creator-1',
      origin: 'USER_GENERATED',
    };

    const mockPremises = [
      { title: 'Premise 1', synopsis: 'Synopsis 1', basePrompt: 'Prompt 1', openingScene: 'Scene 1', tone: 'adventure', styleGuide: 'Style 1', worldRules: 'Rules 1', coverPrompt: 'Cover 1' },
      { title: 'Premise 2', synopsis: 'Synopsis 2', basePrompt: 'Prompt 2', openingScene: 'Scene 2', tone: 'adventure', styleGuide: 'Style 2', worldRules: 'Rules 2', coverPrompt: 'Cover 2' },
      { title: 'Premise 3', synopsis: 'Synopsis 3', basePrompt: 'Prompt 3', openingScene: 'Scene 3', tone: 'adventure', styleGuide: 'Style 3', worldRules: 'Rules 3', coverPrompt: 'Cover 3' },
    ];

    it('should allow creator to generate premises for own private story', async () => {
      prisma.story.findUnique.mockResolvedValue(userStory);
      prisma.storyPremise.findMany
        .mockResolvedValueOnce([])
        .mockImplementationOnce((args: any) => {
          if (args.where?.id?.in) {
            return Promise.resolve(args.where.id.in.map((id: string, idx: number) => ({ id, ...mockPremises[idx], sortOrder: idx })));
          }
          return Promise.resolve([]);
        });
      mockAiService.generatePremises.mockResolvedValue(mockPremises);
      prisma.storyPremise.create.mockImplementation((args: any) => Promise.resolve({ ...args.data, id: 'premise-' + args.data.sortOrder }));

      const result = await service.generatePremises('user-story-1', 'creator-1', false);
      expect(result).toHaveLength(3);
      expect(mockAiService.generatePremises).toHaveBeenCalledWith({
        storyTitle: 'My User Story',
        storySynopsis: 'A story about adventure',
        genre: 'aventura',
        count: 3,
      });
    });

    it('should throw ForbiddenException for non-creator trying to generate premises', async () => {
      prisma.story.findUnique.mockResolvedValue(userStory);
      await expect(service.generatePremises('user-story-1', 'other-user', false)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unauthenticated user trying to generate premises', async () => {
      prisma.story.findUnique.mockResolvedValue(userStory);
      await expect(service.generatePremises('user-story-1', undefined, false)).rejects.toThrow(ForbiddenException);
    });

    it('should allow generating premises for PUBLIC+APPROVED stories (admin flow preserved)', async () => {
      const publicStory = { ...userStory, visibility: StoryVisibility.PUBLIC, moderationStatus: StoryModerationStatus.APPROVED };
      prisma.story.findUnique.mockResolvedValue(publicStory);
      prisma.storyPremise.findMany
        .mockResolvedValueOnce([])
        .mockImplementationOnce((args: any) => {
          if (args.where?.id?.in) {
            return Promise.resolve(args.where.id.in.map((id: string, idx: number) => ({ id, ...mockPremises[idx], sortOrder: idx })));
          }
          return Promise.resolve([]);
        });
      mockAiService.generatePremises.mockResolvedValue(mockPremises);
      prisma.storyPremise.create.mockImplementation((args: any) => Promise.resolve({ ...args.data, id: 'premise-' + args.data.sortOrder }));

      const result = await service.generatePremises('user-story-1', 'any-user', false);
      expect(result).toHaveLength(3);
    });

    it('should return existing premises without generating if force=false', async () => {
      prisma.story.findUnique.mockResolvedValue(userStory);
      prisma.storyPremise.findMany.mockResolvedValue([{ id: 'premise-1', storyId: 'user-story-1', title: 'Existing Premise' }]);
      const result = await service.generatePremises('user-story-1', 'creator-1', false);
      expect(result).toHaveLength(1);
      expect(mockAiService.generatePremises).not.toHaveBeenCalled();
    });
  });

  describe('generateCharacters - User-Generated Stories', () => {
    const userPremise = {
      id: 'premise-1',
      storyId: 'user-story-1',
      title: 'My Premise',
      synopsis: 'Premise synopsis',
      story: {
        id: 'user-story-1',
        title: 'My User Story',
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        creatorUserId: 'creator-1',
        origin: 'USER_GENERATED',
      },
    };

    const mockCharacters = [
      { name: 'Lia', roleLabel: 'A irmã que voltou depois da meia-noite', narrativeFunction: 'HERO', description: 'A brave hero', personality: 'Brave', motivation: 'Save the world', secret: 'Has a dark past', relationshipToPlayer: 'Leader', initialGoal: 'Defeat the villain', startingSituation: 'Acorda no porão com terra nas mãos.', conflictPotential: 'High', visualPrompt: 'Hero portrait' },
      { name: 'Caio', roleLabel: 'O vigia que trancou o portão cedo demais', narrativeFunction: 'MENTOR', description: 'A wise mentor', personality: 'Wise', motivation: 'Guide the hero', secret: 'Knows the truth', relationshipToPlayer: 'Guide', initialGoal: 'Teach the hero', startingSituation: 'Vê uma criança cruzar o pátio fechado.', conflictPotential: 'Low', visualPrompt: 'Mentor portrait' },
      { name: 'Mara', roleLabel: 'A menina da foto que não deveria existir', narrativeFunction: 'VILLAIN', description: 'An evil villain', personality: 'Cruel', motivation: 'Conquer the world', secret: 'Was once good', relationshipToPlayer: 'Enemy', initialGoal: 'Defeat the hero', startingSituation: 'Aparece dentro de uma fotografia antiga.', conflictPotential: 'High', visualPrompt: 'Villain portrait' },
    ];

    it('should allow creator to generate characters for own private story premise', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue(userPremise);
      // Call 1 (line 218): check existing characters → returns []
      // Call 2 (line 266, inside tx): re-fetch after create → handled by tx mock
      // Call 3 (line 332): final fetch with include → returns characters
      prisma.storyPlayableCharacter.findMany
        .mockResolvedValueOnce([]) // Call 1: no existing
        .mockResolvedValueOnce(
          mockCharacters.map((c, idx) => ({ ...c, id: 'char-' + idx, premiseId: 'premise-1', premise: { story: userPremise.story } }))
        ); // Call 3: final fetch
      mockAiService.generatePlayableCharacters.mockResolvedValue(mockCharacters);
      prisma.storyPlayableCharacter.create.mockImplementation((args: any) => Promise.resolve({ ...args.data, id: 'char-' + args.data.sortOrder, premise: { story: userPremise.story } }));
      // Transaction mock: tx.storyPlayableCharacter.findMany is call 2
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          storyPlayableCharacter: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockImplementation((args: any) => ({ ...args.data, id: 'char-' + args.data.sortOrder, premise: { story: userPremise.story } })),
            findMany: jest.fn().mockResolvedValue(
              mockCharacters.map((c, idx) => ({ ...c, id: 'char-' + idx, premiseId: 'premise-1', premise: { story: userPremise.story } }))
            ),
          },
        };
        return callback(tx);
      });

      const result = await service.generateCharacters('premise-1', 'creator-1', false);
      expect(result).toHaveLength(3);
      expect(result[0].startingSituation).toBe('Acorda no porão com terra nas mãos.');
      expect(mockAiService.generatePlayableCharacters).toHaveBeenCalledWith({
        storyTitle: 'My User Story',
        premiseTitle: 'My Premise',
        premiseSynopsis: 'Premise synopsis',
        count: 3,
      });
    });

    it('should throw ForbiddenException for non-creator trying to generate characters', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue(userPremise);
      await expect(service.generateCharacters('premise-1', 'other-user', false)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unauthenticated user trying to generate characters', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue(userPremise);
      await expect(service.generateCharacters('premise-1', undefined, false)).rejects.toThrow(ForbiddenException);
    });

    it('should allow generating characters for PUBLIC+APPROVED story premise (admin flow preserved)', async () => {
      const publicPremise = { ...userPremise, story: { ...userPremise.story, visibility: StoryVisibility.PUBLIC, moderationStatus: StoryModerationStatus.APPROVED } };
      prisma.storyPremise.findUnique.mockResolvedValue(publicPremise);
      // Call 1 (line 218): check existing → []
      // Call 3 (line 332): final fetch → characters
      prisma.storyPlayableCharacter.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(
          mockCharacters.map((c, idx) => ({ ...c, id: 'char-' + idx, premiseId: 'premise-1', premise: { story: publicPremise.story } }))
        );
      mockAiService.generatePlayableCharacters.mockResolvedValue(mockCharacters);
      prisma.storyPlayableCharacter.create.mockImplementation((args: any) => Promise.resolve({ ...args.data, id: 'char-' + args.data.sortOrder, premise: { story: publicPremise.story } }));
      // Transaction mock: tx.storyPlayableCharacter.findMany is call 2
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          storyPlayableCharacter: {
            deleteMany: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockImplementation((args: any) => ({ ...args.data, id: 'char-' + args.data.sortOrder, premise: { story: publicPremise.story } })),
            findMany: jest.fn().mockResolvedValue(
              mockCharacters.map((c, idx) => ({ ...c, id: 'char-' + idx, premiseId: 'premise-1', premise: { story: publicPremise.story } }))
            ),
          },
        };
        return callback(tx);
      });

      const result = await service.generateCharacters('premise-1', 'any-user', false);
      expect(result).toHaveLength(3);
    });

    it('should return existing characters without calling AI when force=false', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue(userPremise);
      const existingCharacters = mockCharacters.map((c, idx) => ({ ...c, id: 'char-' + idx, premiseId: 'premise-1', premise: { story: userPremise.story } }));
      prisma.storyPlayableCharacter.findMany.mockResolvedValue(existingCharacters);

      const result = await service.generateCharacters('premise-1', 'creator-1', false);
      expect(result).toHaveLength(3);
      expect(mockAiService.generatePlayableCharacters).not.toHaveBeenCalled();
      result.forEach(char => expect(char.storyId).toBe('user-story-1'));
    });
  });

  describe('getCachedPremises - Security', () => {
    const userStory = {
      id: 'user-story-1',
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
      creatorUserId: 'creator-1',
    };

    it('should allow creator to get premises for own private story', async () => {
      prisma.story.findUnique.mockResolvedValue(userStory);
      prisma.storyPremise.findMany.mockResolvedValue([{ id: 'premise-1', storyId: 'user-story-1', title: 'Premise 1' }]);
      const result = await service.getCachedPremises('user-story-1', 'creator-1');
      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException for non-creator accessing premises', async () => {
      prisma.story.findUnique.mockResolvedValue(userStory);
      await expect(service.getCachedPremises('user-story-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getCachedCharacters - Security', () => {
    const userPremise = {
      id: 'premise-1',
      storyId: 'story-1',
      story: {
        id: 'story-1',
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        creatorUserId: 'creator-1',
      },
    };

    it('should allow creator to get characters for own private story premise', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue(userPremise);
      prisma.storyPlayableCharacter.findMany.mockResolvedValue([{ id: 'char-1', name: 'Character 1', premise: { story: userPremise.story } }]);
      const result = await service.getCachedCharacters('premise-1', 'creator-1');
      expect(result).toHaveLength(1);
      expect(result[0].storyId).toBe('story-1');
    });

    it('should throw ForbiddenException for non-creator accessing characters via premiseId', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue(userPremise);
      await expect(service.getCachedCharacters('premise-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unauthenticated user accessing characters via premiseId', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue(userPremise);
      await expect(service.getCachedCharacters('premise-1', undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Premium Restrictions Still Work', () => {
    it('should throw HttpException for premium premise access by free user', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue({
        id: 'premise-1',
        isPremium: true,
        story: { id: 'story-1', visibility: StoryVisibility.PUBLIC, moderationStatus: StoryModerationStatus.APPROVED, creatorUserId: null },
      });
      prisma.user.findUnique.mockResolvedValue({ subscription: { type: SubscriptionType.FREE } });
      await expect(service.validatePremiseAccess('premise-1', 'user-1')).rejects.toThrow(HttpException);
    });

    it('should throw HttpException for premium character access by free user', async () => {
      prisma.storyPlayableCharacter.findUnique.mockResolvedValue({
        id: 'char-1',
        isPremium: true,
        premiseId: 'premise-1',
        premise: { isPremium: false, story: { id: 'story-1', visibility: StoryVisibility.PUBLIC, moderationStatus: StoryModerationStatus.APPROVED, creatorUserId: null } },
      });
      prisma.story.findUnique.mockResolvedValue({ id: 'story-1', visibility: StoryVisibility.PUBLIC, moderationStatus: StoryModerationStatus.APPROVED, creatorUserId: null });
      prisma.user.findUnique.mockResolvedValue({ subscription: { type: SubscriptionType.FREE } });
      await expect(service.validateCharacterAccess('char-1', 'user-1')).rejects.toThrow(HttpException);
    });
  });

  describe('Story Quality Validation', () => {
    it('should throw BadRequestException for generatePremises with invalid USER_GENERATED story', async () => {
      mockStoryQualityService.validateStoryQuality.mockRejectedValue(
        new BadRequestException({ message: 'Story does not meet minimum quality requirements', issues: ['title must be at least 5 characters'] })
      );
      await expect(service.generatePremises('user-story-1', 'creator-1', false)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for generateCharacters with invalid USER_GENERATED story', async () => {
      mockStoryQualityService.validateStoryQuality.mockRejectedValue(
        new BadRequestException({ message: 'Story does not meet minimum quality requirements', issues: ['at least one genre is required'] })
      );
      const userPremise = {
        id: 'premise-1',
        storyId: 'user-story-1',
        title: 'My Premise',
        synopsis: 'Premise synopsis',
        story: { id: 'user-story-1', origin: 'USER_GENERATED', visibility: StoryVisibility.PRIVATE, moderationStatus: StoryModerationStatus.NOT_SUBMITTED, creatorUserId: 'creator-1' },
      };
      prisma.storyPremise.findUnique.mockResolvedValue(userPremise);
      await expect(service.generateCharacters('premise-1', 'creator-1', false)).rejects.toThrow(BadRequestException);
    });
  });
});
