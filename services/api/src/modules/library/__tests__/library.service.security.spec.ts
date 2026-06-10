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

  describe('getStories', () => {
    it('filters out stories with isBetaVisible=false', async () => {
      prisma.story.findMany.mockResolvedValue([]);
      prisma.story.count.mockResolvedValue(0);

      await service.getStories({});

      expect(prisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isBetaVisible: true,
            visibility: 'PUBLIC',
            moderationStatus: 'APPROVED',
          }),
          select: expect.objectContaining({
            id: true,
            title: true,
            premises: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: { coverUrl: true },
            },
          }),
        }),
      );
    });

    it('uses first premise cover as library cover fallback', async () => {
      prisma.story.findMany.mockResolvedValue([
        {
          id: 'story-1',
          slug: 'story-without-cover',
          title: 'Story without cover',
          synopsis: 'Synopsis',
          coverUrl: null,
          coverImageUrl: null,
          genres: ['mistério'],
          authorName: 'Enredo.ai',
          isPremium: false,
          totalChapters: 1,
          publishedAt: null,
          language: 'pt-BR',
          maturityRating: null,
          premises: [{ coverUrl: 'https://cdn.enredo.ai/premise-cover.png' }],
        },
      ]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});

      expect(result.stories[0].coverUrl).toBe('https://cdn.enredo.ai/premise-cover.png');
    });

    it('keeps story cover when both story and premise covers exist', async () => {
      prisma.story.findMany.mockResolvedValue([
        {
          id: 'story-1',
          slug: 'story-with-cover',
          title: 'Story with cover',
          synopsis: 'Synopsis',
          coverUrl: 'https://cdn.enredo.ai/story-cover.png',
          coverImageUrl: null,
          genres: ['mistério'],
          authorName: 'Enredo.ai',
          isPremium: false,
          totalChapters: 1,
          publishedAt: null,
          language: 'pt-BR',
          maturityRating: null,
          premises: [{ coverUrl: 'https://cdn.enredo.ai/premise-cover.png' }],
        },
      ]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});

      expect(result.stories[0].coverUrl).toBe('https://cdn.enredo.ai/story-cover.png');
    });
  });

  describe('getStories — DTO sanitization', () => {
    const safeStory = {
      id: 'story-1',
      slug: 'story-slug',
      title: 'Safe Story',
      synopsis: 'A safe synopsis',
      coverUrl: 'https://cdn.enredo.ai/cover.png',
      coverImageUrl: null,
      genres: ['mistério'],
      authorName: 'Enredo.ai',
      isPremium: false,
      totalChapters: 1,
      publishedAt: new Date('2025-01-01'),
      language: 'pt-BR',
      maturityRating: '14+',
      premises: [{ coverUrl: null }],
    };

    it('does NOT expose basePrompt', async () => {
      prisma.story.findMany.mockResolvedValue([{ ...safeStory, basePrompt: 'SECRET' }]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});
      expect((result.stories[0] as any).basePrompt).toBeUndefined();
    });

    it('does NOT expose tone, styleGuide, worldRules', async () => {
      prisma.story.findMany.mockResolvedValue([{ ...safeStory, tone: 'dark', styleGuide: 'short', worldRules: 'magic' }]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});
      expect((result.stories[0] as any).tone).toBeUndefined();
      expect((result.stories[0] as any).styleGuide).toBeUndefined();
      expect((result.stories[0] as any).worldRules).toBeUndefined();
    });

    it('does NOT expose openingScene', async () => {
      prisma.story.findMany.mockResolvedValue([{ ...safeStory, openingScene: 'It was a dark night...' }]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});
      expect((result.stories[0] as any).openingScene).toBeUndefined();
    });

    it('does NOT expose visibility, moderationStatus, creatorUserId', async () => {
      prisma.story.findMany.mockResolvedValue([{ ...safeStory, visibility: 'PRIVATE', moderationStatus: 'PENDING', creatorUserId: 'user-1' }]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});
      expect((result.stories[0] as any).visibility).toBeUndefined();
      expect((result.stories[0] as any).moderationStatus).toBeUndefined();
      expect((result.stories[0] as any).creatorUserId).toBeUndefined();
    });

    it('does NOT expose isBetaVisible, submittedAt, approvedAt, rejectedAt', async () => {
      prisma.story.findMany.mockResolvedValue([{ ...safeStory, isBetaVisible: true, submittedAt: new Date(), approvedAt: new Date(), rejectedAt: null }]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});
      expect((result.stories[0] as any).isBetaVisible).toBeUndefined();
      expect((result.stories[0] as any).submittedAt).toBeUndefined();
      expect((result.stories[0] as any).approvedAt).toBeUndefined();
      expect((result.stories[0] as any).rejectedAt).toBeUndefined();
    });
  });

  describe('getStoryById — DTO sanitization', () => {
    const safeStory = {
      id: 'story-1',
      slug: 'slug',
      title: 'Safe',
      synopsis: 'Synopsis',
      coverUrl: null,
      coverImageUrl: null,
      genres: ['drama'],
      authorName: 'Author',
      isPremium: false,
      totalChapters: 2,
      publishedAt: null,
      language: 'pt-BR',
      maturityRating: '16+',
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
      creatorUserId: null,
      characters: [],
    };

    it('does NOT expose basePrompt in detail endpoint', async () => {
      prisma.story.findUnique.mockResolvedValue({ ...safeStory, basePrompt: 'HIDDEN' });
      const result = await service.getStoryById('story-1');
      expect((result as any).basePrompt).toBeUndefined();
    });

    it('does NOT expose tone, styleGuide, worldRules in detail endpoint', async () => {
      prisma.story.findUnique.mockResolvedValue({ ...safeStory, tone: 'dark', styleGuide: 'short', worldRules: 'magic' });
      const result = await service.getStoryById('story-1');
      expect((result as any).tone).toBeUndefined();
      expect((result as any).styleGuide).toBeUndefined();
      expect((result as any).worldRules).toBeUndefined();
    });

    it('does NOT expose creatorUserId in detail endpoint', async () => {
      prisma.story.findUnique.mockResolvedValue({ ...safeStory, creatorUserId: 'user-x' });
      const result = await service.getStoryById('story-1');
      expect((result as any).creatorUserId).toBeUndefined();
    });
  });

  describe('getGenres — beta-only filtering', () => {
    it('filters genres by isBetaVisible, PUBLIC, APPROVED', async () => {
      prisma.story.findMany.mockResolvedValue([
        { genres: ['drama'] },
        { genres: ['mistério'] },
        { genres: ['fantasia'] },
      ]);

      const result = await service.getGenres();

      expect(prisma.story.findMany).toHaveBeenCalledWith({
        where: {
          isBetaVisible: true,
          visibility: 'PUBLIC',
          moderationStatus: 'APPROVED',
        },
        select: { genres: true },
        distinct: ['genres'],
      });
      expect(result).toEqual(['drama', 'fantasia', 'mistério']);
    });

    it('returns empty array when no beta stories exist', async () => {
      prisma.story.findMany.mockResolvedValue([]);
      const result = await service.getGenres();
      expect(result).toEqual([]);
    });
  });
});

describe('LibraryService - Inline/Base64 Image Sanitization (Step 98k)', () => {
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
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
    prisma = mockPrismaService;
    jest.clearAllMocks();
  });

  describe('getStories', () => {
    const baseRow = {
      id: 's1', slug: 'test', title: 'Test', synopsis: 'Syn',
      genres: ['drama'], authorName: null, isPremium: false,
      totalChapters: 1, publishedAt: null, language: 'pt-BR', maturityRating: '12+',
    };

    it('strips inline base64 coverUrl from list response', async () => {
      prisma.story.findMany.mockResolvedValue([{
        ...baseRow,
        coverUrl: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        premises: [],
      }]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});
      expect(result.stories[0].coverUrl).toBeUndefined();
    });

    it('preserves external http(s) coverUrl in list response', async () => {
      prisma.story.findMany.mockResolvedValue([{
        ...baseRow,
        coverUrl: 'https://cdn.example.com/covers/test.jpg',
        premises: [],
      }]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});
      expect(result.stories[0].coverUrl).toBe('https://cdn.example.com/covers/test.jpg');
    });

    it('falls back from story inline to premise http coverUrl', async () => {
      prisma.story.findMany.mockResolvedValue([{
        ...baseRow,
        coverUrl: 'data:image/png;base64,iVBORw0KGgo=',
        premises: [{ coverUrl: 'https://cdn.example.com/premise-cover.jpg' }],
      }]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});
      expect(result.stories[0].coverUrl).toBe('https://cdn.example.com/premise-cover.jpg');
    });

    it('returns undefined coverUrl when both story and premise are inline', async () => {
      prisma.story.findMany.mockResolvedValue([{
        ...baseRow,
        coverUrl: 'data:image/png;base64,iVBORw0KGgo=',
        premises: [{ coverUrl: 'data:image/jpeg;base64,/9j/4AAQ=' }],
      }]);
      prisma.story.count.mockResolvedValue(1);

      const result = await service.getStories({});
      expect(result.stories[0].coverUrl).toBeUndefined();
    });
  });

  describe('getStoryById', () => {
    it('strips inline base64 character imageUrl from detail response', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 's1', title: 'Test', visibility: 'PUBLIC', moderationStatus: 'APPROVED', creatorUserId: null,
        characters: [{ id: 'c1', name: 'Hero', role: 'HERO', description: null, imageUrl: 'data:image/png;base64,AAAA' }],
      });
      const result = await service.getStoryById('s1');
      expect(result.characters[0].imageUrl).toBeUndefined();
    });

    it('preserves external http(s) character imageUrl in detail', async () => {
      prisma.story.findUnique.mockResolvedValue({
        id: 's1', title: 'Test', visibility: 'PUBLIC', moderationStatus: 'APPROVED', creatorUserId: null,
        characters: [{ id: 'c1', name: 'Hero', role: 'HERO', description: null, imageUrl: 'https://cdn.example.com/hero.jpg' }],
      });
      const result = await service.getStoryById('s1');
      expect(result.characters[0].imageUrl).toBe('https://cdn.example.com/hero.jpg');
    });
  });

  describe('getStoryCharacters', () => {
    const publicApprovedStory = {
      id: 's1',
      title: 'Test',
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
      creatorUserId: null,
    };

    it('strips inline base64 character imageUrl from characters endpoint', async () => {
      prisma.story.findUnique.mockResolvedValue(publicApprovedStory);
      prisma.storyCharacter.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Hero',
          role: 'HERO',
          description: null,
          imageUrl: 'data:image/png;base64,AAAA',
        },
      ]);

      const result = await service.getStoryCharacters('s1');

      expect(result.characters[0].imageUrl).toBeUndefined();
      expect(prisma.storyCharacter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            role: true,
          },
        }),
      );
    });

    it('preserves external http(s) character imageUrl in characters endpoint', async () => {
      prisma.story.findUnique.mockResolvedValue(publicApprovedStory);
      prisma.storyCharacter.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Hero',
          role: 'HERO',
          description: 'Public description',
          imageUrl: 'https://cdn.example.com/hero.jpg',
        },
      ]);

      const result = await service.getStoryCharacters('s1');

      expect(result.characters[0]).toEqual({
        id: 'c1',
        name: 'Hero',
        role: 'HERO',
        description: 'Public description',
        imageUrl: 'https://cdn.example.com/hero.jpg',
      });
    });
  });
});
