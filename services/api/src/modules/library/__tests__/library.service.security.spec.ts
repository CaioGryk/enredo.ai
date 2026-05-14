import { Test, TestingModule } from '@nestjs/testing';
import { LibraryService } from '../library.service';
import { PrismaService } from '@common/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { StoryVisibility, StoryModerationStatus } from '@prisma/client';

describe('LibraryService - Security (Private Story Access)', () => {
  let service: LibraryService;
  let prisma: any;

  const mockPrismaService = {
    story: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    storyCharacter: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
    prisma = mockPrismaService;
    jest.clearAllMocks();
  });

  describe('getStoryById', () => {
    const publicApprovedStory = {
      id: 'story-1',
      title: 'Public Story',
      visibility: StoryVisibility.PUBLIC,
      moderationStatus: StoryModerationStatus.APPROVED,
      creatorUserId: null,
      characters: [],
    };

    const privateStory = {
      id: 'story-2',
      title: 'Private Story',
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
      creatorUserId: 'creator-1',
      characters: [],
    };

    it('should allow access to PUBLIC+APPROVED story without userId', async () => {
      prisma.story.findUnique.mockResolvedValue(publicApprovedStory);

      const result = await service.getStoryById('story-1');

      expect(result.id).toBe('story-1');
    });

    it('should allow access to PUBLIC+APPROVED story with userId', async () => {
      prisma.story.findUnique.mockResolvedValue(publicApprovedStory);

      const result = await service.getStoryById('story-1', 'user-1');

      expect(result.id).toBe('story-1');
    });

    it('should allow creator to access PRIVATE story', async () => {
      prisma.story.findUnique.mockResolvedValue(privateStory);

      const result = await service.getStoryById('story-2', 'creator-1');

      expect(result.id).toBe('story-2');
    });

    it('should throw ForbiddenException for non-creator accessing PRIVATE story', async () => {
      prisma.story.findUnique.mockResolvedValue(privateStory);

      await expect(service.getStoryById('story-2', 'other-user'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unauthenticated user accessing PRIVATE story', async () => {
      prisma.story.findUnique.mockResolvedValue(privateStory);

      await expect(service.getStoryById('story-2'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent story', async () => {
      prisma.story.findUnique.mockResolvedValue(null);

      await expect(service.getStoryById('non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getStoryCharacters', () => {
    const publicApprovedStory = {
      id: 'story-1',
      title: 'Public Story',
      visibility: StoryVisibility.PUBLIC,
      moderationStatus: StoryModerationStatus.APPROVED,
      creatorUserId: null,
    };

    const privateStory = {
      id: 'story-2',
      title: 'Private Story',
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
      creatorUserId: 'creator-1',
    };

    it('should allow access to PUBLIC+APPROVED story characters without userId', async () => {
      prisma.story.findUnique.mockResolvedValue(publicApprovedStory);
      prisma.storyCharacter.findMany.mockResolvedValue([]);

      const result = await service.getStoryCharacters('story-1');

      expect(result.storyId).toBe('story-1');
    });

    it('should allow creator to access PRIVATE story characters', async () => {
      prisma.story.findUnique.mockResolvedValue(privateStory);
      prisma.storyCharacter.findMany.mockResolvedValue([]);

      const result = await service.getStoryCharacters('story-2', 'creator-1');

      expect(result.storyId).toBe('story-2');
    });

    it('should throw ForbiddenException for non-creator accessing PRIVATE story characters', async () => {
      prisma.story.findUnique.mockResolvedValue(privateStory);

      await expect(service.getStoryCharacters('story-2', 'other-user'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unauthenticated user accessing PRIVATE story characters', async () => {
      prisma.story.findUnique.mockResolvedValue(privateStory);

      await expect(service.getStoryCharacters('story-2'))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
