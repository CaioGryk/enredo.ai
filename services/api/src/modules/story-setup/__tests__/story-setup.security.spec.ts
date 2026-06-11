import { Test, TestingModule } from '@nestjs/testing';
import { StorySetupService } from '../story-setup.service';
import { PrismaService } from '@common/prisma.service';
import { AiService } from '@modules/ai/ai.service';
import { ImageGenerationService } from '@modules/ai/image-generation.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { StoryVisibility, StoryModerationStatus } from '@prisma/client';

describe('StorySetupService - Security (Private Story Access)', () => {
  let service: StorySetupService;
  let prisma: any;

  const mockPrismaService: any = {
    story: {
      findUnique: jest.fn(),
    },
    storyPremise: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    storyPlayableCharacter: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
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
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: ImageGenerationService,
          useValue: mockImageGenerationService,
        },
        {
          provide: StoryQualityService,
          useValue: mockStoryQualityService,
        },
      ],
    }).compile();

    service = module.get<StorySetupService>(StorySetupService);
    prisma = mockPrismaService;
    jest.clearAllMocks();
  });

  describe('getCachedPremises', () => {
    const publicApprovedStory = {
      id: 'story-1',
      visibility: StoryVisibility.PUBLIC,
      moderationStatus: StoryModerationStatus.APPROVED,
      creatorUserId: null,
    };

    const privateStory = {
      id: 'story-2',
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
      creatorUserId: 'creator-1',
    };

    it('should allow access to PUBLIC+APPROVED story premises without userId', async () => {
      prisma.story.findUnique.mockResolvedValue(publicApprovedStory);
      prisma.storyPremise.findMany.mockResolvedValue([]);

      const result = await service.getCachedPremises('story-1');

      expect(result).toEqual([]);
    });

    it('should allow creator to access PRIVATE story premises', async () => {
      prisma.story.findUnique.mockResolvedValue(privateStory);
      prisma.storyPremise.findMany.mockResolvedValue([]);

      const result = await service.getCachedPremises('story-2', 'creator-1');

      expect(result).toEqual([]);
    });

    it('should throw ForbiddenException for non-creator accessing PRIVATE story premises', async () => {
      prisma.story.findUnique.mockResolvedValue(privateStory);

      await expect(service.getCachedPremises('story-2', 'other-user'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unauthenticated user accessing PRIVATE story premises', async () => {
      prisma.story.findUnique.mockResolvedValue(privateStory);

      await expect(service.getCachedPremises('story-2'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('generated setup image delivery', () => {
    const publicApprovedStory = {
      id: 'story-1',
      visibility: StoryVisibility.PUBLIC,
      moderationStatus: StoryModerationStatus.APPROVED,
      creatorUserId: null,
    };

    it('maps inline premise covers to the binary API route', () => {
      const dto = service['mapPremiseToDto']({
        id: 'premise-1',
        storyId: 'story-1',
        title: 'Premise',
        synopsis: 'Synopsis',
        coverUrl: 'data:image/png;base64,aGVsbG8=',
        sortOrder: 0,
        isPremium: false,
        isAiGenerated: true,
      });

      expect(dto.coverUrl).toBe('/api/story-setup/premises/premise-1/cover');
    });

    it('maps inline character portraits to the binary API route', () => {
      const dto = service['mapCharacterToDto']({
        id: 'character-1',
        premiseId: 'premise-1',
        premise: { story: publicApprovedStory },
        name: 'Hero',
        roleLabel: 'Hero',
        narrativeFunction: 'HERO',
        imageUrl: 'data:image/jpeg;base64,aGVsbG8=',
        sortOrder: 0,
        isPremium: false,
        isAiGenerated: true,
      });

      expect(dto.imageUrl).toBe('/api/story-setup/characters/character-1/image');
    });

    it('decodes an inline premise cover after validating story access', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue({
        id: 'premise-1',
        storyId: 'story-1',
        coverUrl: 'data:image/png;base64,aGVsbG8=',
      });
      prisma.story.findUnique.mockResolvedValue(publicApprovedStory);

      const image = await service.getPremiseCoverImage('premise-1');

      expect(image.contentType).toBe('image/png');
      expect(image.buffer.toString()).toBe('hello');
    });

    it('decodes an inline character image after validating story access', async () => {
      prisma.storyPlayableCharacter.findUnique.mockResolvedValue({
        id: 'character-1',
        imageUrl: 'data:image/jpeg;base64,aGVsbG8=',
        premise: { storyId: 'story-1' },
      });
      prisma.story.findUnique.mockResolvedValue(publicApprovedStory);

      const image = await service.getCharacterImage('character-1');

      expect(image.contentType).toBe('image/jpeg');
      expect(image.buffer.toString()).toBe('hello');
    });
  });

  describe('validatePremiseAccess', () => {
    const publicApprovedStory = {
      id: 'story-1',
      visibility: StoryVisibility.PUBLIC,
      moderationStatus: StoryModerationStatus.APPROVED,
      creatorUserId: null,
    };

    const privateStory = {
      id: 'story-2',
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
      creatorUserId: 'creator-1',
    };

    const premise = {
      id: 'premise-1',
      storyId: 'story-2',
      isPremium: false,
      story: {
        ...privateStory,
        readingSessions: [],
      },
    };

    it('should allow creator to access PRIVATE story premise', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue(premise);
      prisma.user.findUnique.mockResolvedValue({
        subscription: { type: 'FREE' },
      });

      await expect(service.validatePremiseAccess('premise-1', 'creator-1'))
        .resolves.not.toThrow();
    });

    it('should throw ForbiddenException for non-creator accessing PRIVATE story premise', async () => {
      prisma.storyPremise.findUnique.mockResolvedValue(premise);

      await expect(service.validatePremiseAccess('premise-1', 'other-user'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateCharacterAccess', () => {
    const privateStory = {
      id: 'story-2',
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
      creatorUserId: 'creator-1',
    };

    const character = {
      id: 'character-1',
      isPremium: false,
      premise: {
        story: {
          id: 'story-2',
          visibility: StoryVisibility.PRIVATE,
          moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
          creatorUserId: 'creator-1',
        },
      },
    };

    it('should allow creator to access PRIVATE story character', async () => {
      prisma.storyPlayableCharacter.findUnique.mockResolvedValue(character);
      prisma.user.findUnique.mockResolvedValue({
        subscription: { type: 'FREE' },
      });

      await expect(service.validateCharacterAccess('character-1', 'creator-1'))
        .resolves.not.toThrow();
    });

    it('should throw ForbiddenException for non-creator accessing PRIVATE story character', async () => {
      prisma.storyPlayableCharacter.findUnique.mockResolvedValue(character);

      await expect(service.validateCharacterAccess('character-1', 'other-user'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('Regression - Step 25A/25B Migration', () => {
    const privateStory = {
      id: 'story-2',
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
      creatorUserId: 'creator-1',
    };

    const character = {
      id: 'character-1',
      isPremium: false,
      premise: {
        story: {
          id: 'story-2',
          visibility: StoryVisibility.PRIVATE,
          moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
          creatorUserId: 'creator-1',
        },
      },
    };

    it('should resolve storyId via premise.story (not character.storyId)', async () => {
      prisma.storyPlayableCharacter.findUnique.mockResolvedValue(character);
      prisma.user.findUnique.mockResolvedValue({
        subscription: { type: 'FREE' },
      });

      await expect(service.validateCharacterAccess('character-1', 'creator-1'))
        .resolves.not.toThrow();
    });

    it('should return storyId in DTO via premise traversal', () => {
      const dto = service['mapCharacterToDto'](character);
      expect(dto.storyId).toBe('story-2');
    });

    it('should NOT require storyId field on character object', () => {
      // character object should NOT have storyId property
      expect('storyId' in character).toBe(false);
      // premise.story.id should be used instead
      expect(character.premise?.story?.id).toBe('story-2');
    });
  });
});
