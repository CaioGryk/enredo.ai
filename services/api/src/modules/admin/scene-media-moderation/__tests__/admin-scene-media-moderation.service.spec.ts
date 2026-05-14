import { Test, TestingModule } from '@nestjs/testing';
import { AdminSceneMediaService } from '../admin-scene-media.service';
import { PrismaService } from '@common/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SceneModerationStatus, SceneVisibility, SceneMediaType, CommentModerationStatus } from '@prisma/client';

describe('AdminSceneMediaService', () => {
  let service: AdminSceneMediaService;
  let prisma: any;

  const mockPrismaService: any = {
    sceneMedia: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    sceneMediaComment: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
  };

  const pendingMedia = {
    id: 'sm-1',
    userId: 'user-1',
    narrativeEventId: 'ne-1',
    storyId: 'story-1',
    visibility: SceneVisibility.PRIVATE,
    moderationStatus: SceneModerationStatus.PENDING,
    title: null,
    caption: null,
    textExcerpt: 'A scene excerpt',
    imageUrl: 'https://example.com/img.png',
    videoUrl: null,
    thumbnailUrl: null,
    mediaType: SceneMediaType.IMAGE,
    moderationNote: null,
    publishedAt: null,
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
    user: { id: 'user-1', name: 'Test User' },
    story: { id: 'story-1', title: 'Test Story', slug: 'test-story', genres: ['adventure'], maturityRating: 'TEEN' },
    narrativeEvent: { id: 'ne-1', sceneIndex: 2 },
    _count: { likes: 0, saves: 0, shares: 0, comments: 0 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSceneMediaService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdminSceneMediaService>(AdminSceneMediaService);
    prisma = mockPrismaService;
    jest.clearAllMocks();
  });

  describe('listForModeration', () => {
    it('should return PENDING by default with pagination', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([pendingMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.listForModeration({});

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { moderationStatus: SceneModerationStatus.PENDING },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].moderationStatus).toBe(SceneModerationStatus.PENDING);
    });

    it('should filter by status=APPROVED', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);
      prisma.sceneMedia.count.mockResolvedValue(0);

      await service.listForModeration({ status: 'APPROVED' });

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ moderationStatus: SceneModerationStatus.APPROVED }),
        }),
      );
    });

    it('should throw BadRequestException for invalid status', async () => {
      await expect(service.listForModeration({ status: 'INVALID' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should filter by valid mediaType', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);
      prisma.sceneMedia.count.mockResolvedValue(0);

      await service.listForModeration({ mediaType: 'IMAGE' });

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ mediaType: SceneMediaType.IMAGE }),
        }),
      );
    });

    it('should throw BadRequestException for invalid mediaType', async () => {
      await expect(service.listForModeration({ mediaType: 'INVALID' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should filter by storyId', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);
      prisma.sceneMedia.count.mockResolvedValue(0);

      await service.listForModeration({ storyId: 'story-1' });

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ storyId: 'story-1' }),
        }),
      );
    });

    it('should filter by userId', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);
      prisma.sceneMedia.count.mockResolvedValue(0);

      await service.listForModeration({ userId: 'user-1' });

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('should search by q (title, caption, textExcerpt)', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);
      prisma.sceneMedia.count.mockResolvedValue(0);

      await service.listForModeration({ q: 'scene' });

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'scene', mode: 'insensitive' } },
              { caption: { contains: 'scene', mode: 'insensitive' } },
              { textExcerpt: { contains: 'scene', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should ignore blank q', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([pendingMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      await service.listForModeration({ q: '   ' });

      const callArgs = prisma.sceneMedia.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toBeUndefined();
    });

    it('should cap limit at 100', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);
      prisma.sceneMedia.count.mockResolvedValue(0);

      await service.listForModeration({ limit: 200 });

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  describe('approve', () => {
    it('should approve PENDING media to APPROVED + PUBLIC with publishedAt', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(pendingMedia);
      prisma.sceneMedia.update.mockResolvedValue({
        ...pendingMedia,
        moderationStatus: SceneModerationStatus.APPROVED,
        visibility: SceneVisibility.PUBLIC,
        publishedAt: new Date('2026-05-13'),
        moderationNote: null,
      });

      const result = await service.approve('sm-1');

      expect(prisma.sceneMedia.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sm-1' },
          data: {
            moderationStatus: SceneModerationStatus.APPROVED,
            visibility: SceneVisibility.PUBLIC,
            publishedAt: expect.any(Date),
            moderationNote: null,
          },
        }),
      );
      expect(result.moderationStatus).toBe(SceneModerationStatus.APPROVED);
      expect(result.visibility).toBe(SceneVisibility.PUBLIC);
      expect(result.publishedAt).toBeDefined();
    });

    it('should throw NotFoundException if media not found', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(null);

      await expect(service.approve('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if media is NOT_SUBMITTED', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({
        ...pendingMedia,
        moderationStatus: SceneModerationStatus.NOT_SUBMITTED,
      });

      await expect(service.approve('sm-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if media is already APPROVED', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({
        ...pendingMedia,
        moderationStatus: SceneModerationStatus.APPROVED,
      });

      await expect(service.approve('sm-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if media is REJECTED', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({
        ...pendingMedia,
        moderationStatus: SceneModerationStatus.REJECTED,
      });

      await expect(service.approve('sm-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject PENDING media to REJECTED + PRIVATE with note', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(pendingMedia);
      prisma.sceneMedia.update.mockResolvedValue({
        ...pendingMedia,
        moderationStatus: SceneModerationStatus.REJECTED,
        visibility: SceneVisibility.PRIVATE,
        moderationNote: 'Inappropriate content',
      });

      const result = await service.reject('sm-1', 'Inappropriate content');

      expect(prisma.sceneMedia.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sm-1' },
          data: {
            moderationStatus: SceneModerationStatus.REJECTED,
            visibility: SceneVisibility.PRIVATE,
            moderationNote: 'Inappropriate content',
          },
        }),
      );
      expect(result.moderationStatus).toBe(SceneModerationStatus.REJECTED);
      expect(result.visibility).toBe(SceneVisibility.PRIVATE);
      expect(result.moderationNote).toBe('Inappropriate content');
    });

    it('should reject with null note when note is not provided', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(pendingMedia);
      prisma.sceneMedia.update.mockResolvedValue({
        ...pendingMedia,
        moderationStatus: SceneModerationStatus.REJECTED,
        moderationNote: null,
      });

      const result = await service.reject('sm-1');

      expect(result.moderationNote).toBeNull();
    });

    it('should throw NotFoundException if media not found', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(null);

      await expect(service.reject('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if media is NOT_SUBMITTED', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({
        ...pendingMedia,
        moderationStatus: SceneModerationStatus.NOT_SUBMITTED,
      });

      await expect(service.reject('sm-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if media is already APPROVED', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({
        ...pendingMedia,
        moderationStatus: SceneModerationStatus.APPROVED,
      });

      await expect(service.reject('sm-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if media is REJECTED', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({
        ...pendingMedia,
        moderationStatus: SceneModerationStatus.REJECTED,
      });

      await expect(service.reject('sm-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('DTO safety', () => {
    it('should expose user-safe fields (id, name) and not email', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([pendingMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.listForModeration({});

      const dto = result.data[0];
      expect(dto.user).toBeDefined();
      expect(dto.user).toEqual({ id: 'user-1', name: 'Test User' });
      expect((dto.user as any).email).toBeUndefined();
      expect((dto as any).passwordHash).toBeUndefined();
      expect((dto as any).refreshToken).toBeUndefined();
    });

    it('should expose story safe fields (id, title, slug, genres, maturityRating)', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([pendingMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.listForModeration({});
      const dto = result.data[0];

      expect(dto.story).toBeDefined();
      expect(dto.story).toEqual({
        id: 'story-1',
        title: 'Test Story',
        slug: 'test-story',
        genres: ['adventure'],
        maturityRating: 'TEEN',
      });
      expect((dto.story as any).basePrompt).toBeUndefined();
      expect((dto.story as any).worldRules).toBeUndefined();
      expect((dto.story as any).styleGuide).toBeUndefined();
    });

    it('should expose social counts', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([pendingMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.listForModeration({});
      const dto = result.data[0];

      expect(dto.likeCount).toBe(0);
      expect(dto.saveCount).toBe(0);
      expect(dto.shareCount).toBe(0);
      expect(dto.commentCount).toBe(0);
    });

    it('should expose narrative event safe context', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([pendingMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.listForModeration({});
      const dto = result.data[0];

      expect(dto.narrativeEvent).toBeDefined();
      expect(dto.narrativeEvent).toEqual({ id: 'ne-1', sceneIndex: 2 });
    });

    it('should expose hasImage / hasVideo helpers', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([pendingMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.listForModeration({});
      const dto = result.data[0];

      expect(dto.hasImage).toBe(true);
      expect(dto.hasVideo).toBe(false);
    });

    it('should not expose imageUrl/videoUrl mutations that did not happen', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(pendingMedia);
      prisma.sceneMedia.update.mockResolvedValue({
        ...pendingMedia,
        moderationStatus: SceneModerationStatus.APPROVED,
        visibility: SceneVisibility.PUBLIC,
        publishedAt: new Date(),
        moderationNote: null,
      });

      const result = await service.approve('sm-1');

      expect(result.imageUrl).toBe(pendingMedia.imageUrl);
      expect(result.userId).toBe(pendingMedia.userId);
      expect(result.storyId).toBe(pendingMedia.storyId);
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      prisma.sceneMedia.count.mockResolvedValue(10);
      prisma.sceneMedia.groupBy.mockImplementation(async (args: any) => {
        if (args.by[0] === 'moderationStatus') {
          return [
            { moderationStatus: SceneModerationStatus.PENDING, _count: 3 },
            { moderationStatus: SceneModerationStatus.APPROVED, _count: 5 },
            { moderationStatus: SceneModerationStatus.REJECTED, _count: 2 },
          ];
        }
        if (args.by[0] === 'mediaType') {
          return [
            { mediaType: SceneMediaType.IMAGE, _count: 6 },
            { mediaType: SceneMediaType.TEXT, _count: 4 },
          ];
        }
        return [];
      });
      prisma.sceneMedia.findFirst.mockResolvedValue({ createdAt: new Date('2026-05-10') });
    });

    it('should return total count', async () => {
      const result = await service.getMetrics();
      expect(result.total).toBe(10);
    });

    it('should return counts by moderation status (normalized)', async () => {
      const result = await service.getMetrics();
      expect(result.byStatus).toContainEqual({ status: 'PENDING', count: 3 });
      expect(result.byStatus).toContainEqual({ status: 'APPROVED', count: 5 });
      expect(result.byStatus).toContainEqual({ status: 'REJECTED', count: 2 });
      expect(result.byStatus).toContainEqual({ status: 'NOT_SUBMITTED', count: 0 });
    });

    it('should return counts by media type (normalized)', async () => {
      const result = await service.getMetrics();
      expect(result.byMediaType).toContainEqual({ mediaType: 'IMAGE', count: 6 });
      expect(result.byMediaType).toContainEqual({ mediaType: 'TEXT', count: 4 });
      expect(result.byMediaType).toContainEqual({ mediaType: 'VIDEO', count: 0 });
    });

    it('should return pending queue summary with oldest/newest dates', async () => {
      const result = await service.getMetrics();
      expect(result.pending.total).toBe(3);
      expect(result.pending.oldestCreatedAt).toBeDefined();
      expect(result.pending.newestCreatedAt).toBeDefined();
    });

    it('should return published total using safe criteria', async () => {
      const countSpy = prisma.sceneMedia.count;
      countSpy
        .mockResolvedValueOnce(10)   // total
        .mockResolvedValueOnce(5);   // published -> remaining calls default
      const result = await service.getMetrics();
      expect(result.published.total).toBe(5);
    });

    it('should return rejected total', async () => {
      const result = await service.getMetrics();
      expect(result.rejected.total).toBe(2);
    });

    it('should return withImage and withVideo counts', async () => {
      const countSpy = prisma.sceneMedia.count;
      countSpy
        .mockResolvedValueOnce(10)   // total
        .mockResolvedValueOnce(5)    // published
        .mockResolvedValueOnce(6)    // withImage
        .mockResolvedValueOnce(1);   // withVideo
      const result = await service.getMetrics();
      expect(result.withImage).toBe(6);
      expect(result.withVideo).toBe(1);
    });

    it('should not expose individual records, prompts, or sensitive data', async () => {
      prisma.sceneMedia.count.mockResolvedValue(5);
      const result = await service.getMetrics();
      expect((result as any).data).toBeUndefined();
      expect((result as any).records).toBeUndefined();
      expect((result as any).prompts).toBeUndefined();
      expect((result as any).users).toBeUndefined();
    });
  });

  describe('comment moderation', () => {
    const mockComment = { id: 'c-1', sceneMediaId: 'sm-1', body: 'Hello', status: 'VISIBLE', createdAt: new Date(), user: { id: 'user-1', name: 'A' }, sceneMedia: { id: 'sm-1', storyId: 'story-1' } };

    describe('listComments', () => {
      it('should return paginated comments', async () => {
        prisma.sceneMediaComment.findMany.mockResolvedValue([mockComment]);
        prisma.sceneMediaComment.count.mockResolvedValue(1);
        const result = await service.listComments({});
        expect(result.data).toHaveLength(1);
        expect(result.data[0].body).toBe('Hello');
      });

      it('should filter by status', async () => {
        prisma.sceneMediaComment.findMany.mockResolvedValue([]);
        prisma.sceneMediaComment.count.mockResolvedValue(0);
        await service.listComments({ status: 'HIDDEN' });
        expect(prisma.sceneMediaComment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'HIDDEN' } }));
      });

      it('should not expose user email', async () => {
        prisma.sceneMediaComment.findMany.mockResolvedValue([{ ...mockComment, user: { id: 'user-1', name: 'A', email: 'nope@test.com' } }]);
        prisma.sceneMediaComment.count.mockResolvedValue(1);
        const result = await service.listComments({});
        expect((result.data[0].user as any).email).toBeUndefined();
      });
    });

    describe('hide', () => {
      it('should set status to HIDDEN', async () => {
        prisma.sceneMediaComment.findUnique.mockResolvedValue({ id: 'c-1' });
        prisma.sceneMediaComment.update.mockResolvedValue({ ...mockComment, status: 'HIDDEN' });
        const result = await service.hideComment('c-1');
        expect(result.status).toBe('HIDDEN');
      });
    });

    describe('remove', () => {
      it('should set status to REMOVED', async () => {
        prisma.sceneMediaComment.findUnique.mockResolvedValue({ id: 'c-1' });
        prisma.sceneMediaComment.update.mockResolvedValue({ ...mockComment, status: 'REMOVED' });
        const result = await service.removeComment('c-1');
        expect(result.status).toBe('REMOVED');
      });
    });

    describe('restore', () => {
      it('should set status to VISIBLE', async () => {
        prisma.sceneMediaComment.findUnique.mockResolvedValue({ id: 'c-1' });
        prisma.sceneMediaComment.update.mockResolvedValue({ ...mockComment, status: 'VISIBLE' });
        const result = await service.restoreComment('c-1');
        expect(result.status).toBe('VISIBLE');
      });
    });

    describe('not found', () => {
      it('should throw NotFoundException for missing comment on hide', async () => {
        prisma.sceneMediaComment.findUnique.mockResolvedValue(null);
        await expect(service.hideComment('nonexistent')).rejects.toThrow(NotFoundException);
      });
      it('should throw NotFoundException for missing comment on remove', async () => {
        prisma.sceneMediaComment.findUnique.mockResolvedValue(null);
        await expect(service.removeComment('nonexistent')).rejects.toThrow(NotFoundException);
      });
      it('should throw NotFoundException for missing comment on restore', async () => {
        prisma.sceneMediaComment.findUnique.mockResolvedValue(null);
        await expect(service.restoreComment('nonexistent')).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('commentCount visibility', () => {
    it('should only count VISIBLE comments in listForModeration DTO', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([{ ...pendingMedia, _count: { likes: 0, saves: 0, shares: 0, comments: 3 } }]);
      prisma.sceneMedia.count.mockResolvedValue(1);
      const result = await service.listForModeration({});
      const callArgs = prisma.sceneMedia.findMany.mock.calls[0][0];
      expect(callArgs.include._count.select.comments).toEqual({
        where: { status: CommentModerationStatus.VISIBLE },
      });
      expect(result.data[0].commentCount).toBe(3);
    });

    it('should only count VISIBLE comments when approving media', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(pendingMedia);
      prisma.sceneMedia.update.mockResolvedValue({ ...pendingMedia, moderationStatus: SceneModerationStatus.APPROVED });

      await service.approve('sm-1');
      const callArgs = prisma.sceneMedia.update.mock.calls[0][0];

      expect(callArgs.include._count.select.comments).toEqual({
        where: { status: CommentModerationStatus.VISIBLE },
      });
    });

    it('should only count VISIBLE comments when rejecting media', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(pendingMedia);
      prisma.sceneMedia.update.mockResolvedValue({ ...pendingMedia, moderationStatus: SceneModerationStatus.REJECTED });

      await service.reject('sm-1');
      const callArgs = prisma.sceneMedia.update.mock.calls[0][0];

      expect(callArgs.include._count.select.comments).toEqual({
        where: { status: CommentModerationStatus.VISIBLE },
      });
    });
  });
});
