import { Test, TestingModule } from '@nestjs/testing';
import { StoryLifecycleService } from '../story-lifecycle.service';
import { PrismaService } from '@common/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { StoryOrigin, StoryVisibility, StoryModerationStatus, SubscriptionType, Prisma } from '@prisma/client';
import { CreateStoryDto } from '../dto/create-story.dto';
import { UpdateStoryDto } from '../dto/update-story.dto';

describe('StoryLifecycleService', () => {
  let service: StoryLifecycleService;
  let prisma: any;

  const mockPrismaService = {
    story: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryLifecycleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StoryLifecycleService>(StoryLifecycleService);
    prisma = mockPrismaService;
    jest.clearAllMocks();

    // Default mocks for story creation limit check
    prisma.story.count.mockResolvedValue(0); // Default: no stories yet
    prisma.user.findUnique.mockResolvedValue({
      subscription: { type: SubscriptionType.FREE },
    });
  });

  describe('getMyStories', () => {
    it('should return user stories', async () => {
      const mockStories = [
        { id: 'story-1', creatorUserId: 'user-1', origin: StoryOrigin.USER_GENERATED },
        { id: 'story-2', creatorUserId: 'user-1', origin: StoryOrigin.USER_GENERATED },
      ];

      prisma.story.findMany.mockResolvedValue(mockStories);

      const result = await service.getMyStories('user-1');

      expect(result).toHaveLength(2);
      expect(prisma.story.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { creatorUserId: 'user-1', origin: StoryOrigin.USER_GENERATED },
        })
      );
    });

    it('should return empty array when no stories', async () => {
      prisma.story.findMany.mockResolvedValue([]);

      const result = await service.getMyStories('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getStoryStatus', () => {
    it('should return status for creator', async () => {
      const mockStory = {
        id: 'story-1',
        title: 'My Story',
        origin: StoryOrigin.USER_GENERATED,
        visibility: StoryVisibility.PRIVATE,
        moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
        creatorUserId: 'user-1',
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        moderationReason: null,
      };

      prisma.story.findUnique.mockResolvedValue(mockStory);

      const result = await service.getStoryStatus('user-1', 'story-1');

      expect(result.moderationStatus).toBe(StoryModerationStatus.NOT_SUBMITTED);
    });

    it('should throw NotFoundException for non-existent story', async () => {
      prisma.story.findUnique.mockResolvedValue(null);

      await expect(service.getStoryStatus('user-1', 'story-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for other user private story', async () => {
      const mockStory = {
        id: 'story-1',
        creatorUserId: 'other-user',
        visibility: StoryVisibility.PRIVATE,
      };

      prisma.story.findUnique.mockResolvedValue(mockStory);

      await expect(service.getStoryStatus('user-1', 'story-1'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('submitStory', () => {
    const validStory = {
      id: 'story-1',
      creatorUserId: 'user-1',
      origin: StoryOrigin.USER_GENERATED,
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
    };

    it('should submit private user-generated story', async () => {
      prisma.story.findUnique.mockResolvedValue(validStory);
      prisma.story.update.mockResolvedValue({
        ...validStory,
        moderationStatus: StoryModerationStatus.PENDING,
        submittedAt: new Date(),
      });

      const result = await service.submitStory('user-1', 'story-1');

      expect(result.moderationStatus).toBe(StoryModerationStatus.PENDING);
    });

    it('should throw ForbiddenException if not creator', async () => {
      prisma.story.findUnique.mockResolvedValue({
        ...validStory,
        creatorUserId: 'other-user',
      });

      await expect(service.submitStory('user-1', 'story-1'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for ADMIN story', async () => {
      prisma.story.findUnique.mockResolvedValue({
        ...validStory,
        origin: StoryOrigin.ADMIN,
      });

      await expect(service.submitStory('user-1', 'story-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if not PRIVATE', async () => {
      prisma.story.findUnique.mockResolvedValue({
        ...validStory,
        visibility: StoryVisibility.PUBLIC,
      });

      await expect(service.submitStory('user-1', 'story-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already PENDING', async () => {
      prisma.story.findUnique.mockResolvedValue({
        ...validStory,
        moderationStatus: StoryModerationStatus.PENDING,
      });

      await expect(service.submitStory('user-1', 'story-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should pass note to moderationReason', async () => {
      prisma.story.findUnique.mockResolvedValue(validStory);
      prisma.story.update.mockResolvedValue({});

      await service.submitStory('user-1', 'story-1', 'Please review');

      expect(prisma.story.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            moderationReason: 'Please review',
          }),
        })
      );
    });
  });

  describe('createStory', () => {
    const createDto: CreateStoryDto = {
      title: 'My New Story',
      synopsis: 'A great story',
      genres: ['adventure'],
      openingScene: 'It was a dark and stormy night',
    };

    describe('story creation limits', () => {
      it('should allow FREE user below limit (2 stories)', async () => {
        prisma.story.count.mockResolvedValue(2);
        prisma.user.findUnique.mockResolvedValue({
          subscription: { type: SubscriptionType.FREE },
        });
        prisma.story.findUnique.mockResolvedValue(null); // No slug conflict
        prisma.user.findUnique.mockResolvedValue({ name: 'John Doe' });
        prisma.story.create.mockImplementation((args: any) => Promise.resolve({
          id: 'story-new',
          ...args.data,
        }));

        const result = await service.createStory('user-1', createDto);

        expect(result.origin).toBe(StoryOrigin.USER_GENERATED);
      });

      it('should block FREE user at limit (3 stories)', async () => {
        prisma.story.count.mockResolvedValue(3);
        prisma.user.findUnique.mockResolvedValue({
          subscription: { type: SubscriptionType.FREE },
        });

        await expect(service.createStory('user-1', createDto))
          .rejects.toThrow('Story creation limit reached for your plan');
      });

      it('should allow PREMIUM user below limit (9 stories)', async () => {
        prisma.story.count.mockResolvedValue(9);
        // Mock user.findUnique to return both subscription and name
        // First call (in checkStoryCreationLimit) returns subscription
        // Second call (in createStory) returns name
        prisma.user.findUnique
          .mockResolvedValueOnce({
            subscription: { type: SubscriptionType.PREMIUM },
          })
          .mockResolvedValueOnce({ name: 'John Doe' });
        prisma.story.findUnique.mockResolvedValue(null); // No slug conflict
        prisma.story.create.mockImplementation((args: any) => Promise.resolve({
          id: 'story-new',
          ...args.data,
        }));

        const result = await service.createStory('user-1', createDto);

        expect(result.origin).toBe(StoryOrigin.USER_GENERATED);
      });

      it('should block PREMIUM user at limit (10 stories)', async () => {
        prisma.story.count.mockResolvedValue(10);
        prisma.user.findUnique.mockResolvedValue({
          subscription: { type: SubscriptionType.PREMIUM },
        });

        await expect(service.createStory('user-1', createDto))
          .rejects.toThrow('Story creation limit reached for your plan');
      });

      it('should skip creation limit only when explicitly requested by internal caller', async () => {
        prisma.story.count.mockResolvedValue(999);
        prisma.story.findUnique.mockResolvedValue(null);
        prisma.user.findUnique.mockResolvedValue({ name: 'Admin Ops' });
        prisma.story.create.mockImplementation((args: any) => Promise.resolve({
          id: 'story-new',
          ...args.data,
        }));

        const result = await service.createStory('admin-1', createDto, { skipCreationLimit: true });

        expect(result.origin).toBe(StoryOrigin.USER_GENERATED);
        expect(prisma.story.count).not.toHaveBeenCalled();
      });
    });

    it('should create private user-generated story', async () => {
      prisma.story.findUnique.mockResolvedValue(null); // No slug conflict
      prisma.user.findUnique.mockResolvedValue({ name: 'John Doe' });
      prisma.story.create.mockImplementation((args: any) => Promise.resolve({
        id: 'story-new',
        ...args.data,
      }));

      const result = await service.createStory('user-1', createDto);

      expect(result.origin).toBe(StoryOrigin.USER_GENERATED);
      expect(result.visibility).toBe(StoryVisibility.PRIVATE);
      expect(result.moderationStatus).toBe(StoryModerationStatus.NOT_SUBMITTED);
      expect(result.creatorUserId).toBe('user-1');
      expect(result.authorName).toBe('John Doe');
      expect(result.openingScene).toBe('It was a dark and stormy night');
    });

    it('should generate slug from title', async () => {
      prisma.story.findUnique.mockResolvedValue(null); // No slug conflict
      prisma.user.findUnique.mockResolvedValue({ name: 'John Doe' });
      prisma.story.create.mockImplementation((args: any) => Promise.resolve({
        id: 'story-new',
        ...args.data,
      }));

      await service.createStory('user-1', createDto);

      expect(prisma.story.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'my-new-story',
          }),
        })
      );
    });

    it('should add numeric suffix for duplicate slugs', async () => {
      // First call returns existing story (conflict), second call returns null (no conflict)
      prisma.story.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // "my-new-story" exists
        .mockResolvedValueOnce(null); // "my-new-story-2" is available
      prisma.user.findUnique.mockResolvedValue({ name: 'John Doe' });
      prisma.story.create.mockImplementation((args: any) => Promise.resolve({
        id: 'story-new',
        ...args.data,
      }));

      await service.createStory('user-1', createDto);

      expect(prisma.story.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'my-new-story-2',
          }),
        })
      );
    });

    it('should use default values when not provided', async () => {
      const minimalDto: CreateStoryDto = {
        title: 'Test',
        synopsis: 'Test synopsis',
        genres: ['test'],
      };

      prisma.story.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ name: 'Jane' });
      prisma.story.create.mockImplementation((args: any) => Promise.resolve({
        id: 'story-new',
        ...args.data,
      }));

      const result = await service.createStory('user-1', minimalDto);

      expect(result.language).toBe('pt-BR');
      expect(result.maturityRating).toBe('12+');
      expect(result.isPremium).toBe(false);
      expect(result.totalChapters).toBe(1);
    });
  });

  describe('updateStory', () => {
    const draftStory = {
      id: 'story-1',
      creatorUserId: 'user-1',
      origin: StoryOrigin.USER_GENERATED,
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
    };

    const updateDto: UpdateStoryDto = {
      title: 'Updated Title',
      synopsis: 'Updated synopsis',
    };

    it('should update draft story', async () => {
      prisma.story.findUnique.mockResolvedValue(draftStory);
      prisma.story.update.mockImplementation((args: any) => Promise.resolve({
        ...draftStory,
        ...args.data,
      }));

      const result = await service.updateStory('user-1', 'story-1', updateDto);

      expect(result.title).toBe('Updated Title');
      expect(result.synopsis).toBe('Updated synopsis');
    });

    it('should throw ForbiddenException if not creator', async () => {
      prisma.story.findUnique.mockResolvedValue({
        ...draftStory,
        creatorUserId: 'other-user',
      });

      await expect(service.updateStory('user-1', 'story-1', updateDto))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for ADMIN story', async () => {
      prisma.story.findUnique.mockResolvedValue({
        ...draftStory,
        origin: StoryOrigin.ADMIN,
      });

      await expect(service.updateStory('user-1', 'story-1', updateDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if not PRIVATE', async () => {
      prisma.story.findUnique.mockResolvedValue({
        ...draftStory,
        visibility: StoryVisibility.PUBLIC,
      });

      await expect(service.updateStory('user-1', 'story-1', updateDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already submitted', async () => {
      prisma.story.findUnique.mockResolvedValue({
        ...draftStory,
        moderationStatus: StoryModerationStatus.PENDING,
      });

      await expect(service.updateStory('user-1', 'story-1', updateDto))
        .rejects.toThrow(BadRequestException);
    });
  });
});
