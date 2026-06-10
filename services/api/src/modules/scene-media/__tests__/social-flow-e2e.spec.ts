import { Test, TestingModule } from '@nestjs/testing';
import { SceneMediaService } from '../scene-media.service';
import { AdminSceneMediaService } from '../../admin/scene-media-moderation/admin-scene-media.service';
import { PrismaService } from '@common/prisma.service';
import { NotFoundException, ForbiddenException, ConflictException, BadRequestException, HttpException } from '@nestjs/common';
import { SceneVisibility, SceneModerationStatus, SceneMediaType, CreditTransactionReason, CommentModerationStatus, SceneMediaReportTargetType, SceneMediaReportStatus } from '@prisma/client';
import { BillingService } from '../../billing/billing.service';
import { ImageGenerationService } from '../../ai/image-generation.service';
import { VideoGenerationService } from '../../ai/video-generation.service';
import { ModerationService } from '../../moderation/moderation.service';

describe('Social Flow E2E Contract', () => {
  let sceneMediaService: SceneMediaService;
  let adminService: AdminSceneMediaService;
  let prisma: any;

  const mockPrismaService: any = {
    narrativeEvent: { findUnique: jest.fn() },
    sceneMedia: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn(),
      findFirst: jest.fn(),
    },
    creditWallet: { findUnique: jest.fn(), updateMany: jest.fn() },
    creditTransaction: { create: jest.fn() },
    sceneMediaLike: { upsert: jest.fn(), deleteMany: jest.fn() },
    sceneMediaSave: { upsert: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    sceneMediaShare: { create: jest.fn() },
    sceneMediaComment: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    sceneMediaReport: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  };

  const mockBillingService = { getCreditWallet: jest.fn(), spendCredits: jest.fn() };
  const mockImageGenerationService = { generateSceneImage: jest.fn() };
  const mockVideoGenerationService = { generateVideo: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SceneMediaService,
        AdminSceneMediaService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BillingService, useValue: mockBillingService },
        { provide: ImageGenerationService, useValue: mockImageGenerationService },
        { provide: VideoGenerationService, useValue: mockVideoGenerationService },
        { provide: ModerationService, useValue: { moderateComment: jest.fn().mockReturnValue({ allowed: true, sanitizedText: 'ok' }), moderateReportReason: jest.fn().mockReturnValue({ allowed: true, sanitizedText: 'ok' }) } },
      ],
    }).compile();

    sceneMediaService = module.get<SceneMediaService>(SceneMediaService);
    adminService = module.get<AdminSceneMediaService>(AdminSceneMediaService);
    prisma = mockPrismaService;
    jest.clearAllMocks();
  });

  const pendingMedia = {
    id: 'sm-1', userId: 'creator', narrativeEventId: 'ne-1', storyId: 'story-1',
    visibility: SceneVisibility.PRIVATE, moderationStatus: SceneModerationStatus.PENDING,
    title: 'Scene Title', caption: 'A caption', textExcerpt: 'Text excerpt',
    imageUrl: 'https://img.png', videoUrl: null, thumbnailUrl: null,
    mediaType: SceneMediaType.IMAGE, moderationNote: null,
    publishedAt: null, createdAt: new Date(), updatedAt: new Date(),
  };

  const approvedMedia = {
    ...pendingMedia,
    visibility: SceneVisibility.PUBLIC,
    moderationStatus: SceneModerationStatus.APPROVED,
    publishedAt: new Date('2026-05-15'),
    moderationNote: null,
    _count: { likes: 0, saves: 0, shares: 0, comments: 0 },
    story: { id: 'story-1', title: 'Story', coverUrl: 'c.png', slug: 'story', genres: ['drama'], maturityRating: 'TEEN' },
    user: { id: 'creator', name: 'Creator' },
    narrativeEvent: { id: 'ne-1', sceneIndex: 2 },
  };

  describe('full social flow', () => {
    it('should flow: submit → approve → feed → engage → comment → report → saved', async () => {
      // 1. Submit: NOT_SUBMITTED → PENDING (via SceneMediaService)
      const notSubmitted = { ...pendingMedia, moderationStatus: SceneModerationStatus.NOT_SUBMITTED };
      prisma.sceneMedia.findUnique.mockResolvedValue(notSubmitted);
      prisma.sceneMedia.update.mockResolvedValue(pendingMedia);
      const submResult = await sceneMediaService.submitForModeration('creator', 'sm-1');
      expect(submResult.moderationStatus).toBe(SceneModerationStatus.PENDING);

      // 2. Approve: PENDING → APPROVED + PUBLIC + publishedAt (via AdminSceneMediaService)
      prisma.sceneMedia.findUnique.mockResolvedValue(pendingMedia);
      prisma.sceneMedia.update.mockResolvedValue(approvedMedia);
      const approved = await adminService.approve('sm-1');
      expect(approved.moderationStatus).toBe(SceneModerationStatus.APPROVED);
      expect(approved.visibility).toBe(SceneVisibility.PUBLIC);
      expect(approved.publishedAt).not.toBeNull();
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

      // 3. Feed returns approved media with counts
      prisma.sceneMedia.findMany.mockResolvedValue([{ ...approvedMedia, _count: { likes: 5, saves: 2, shares: 3, comments: 1 } }]);
      prisma.sceneMedia.count.mockResolvedValue(1);
      const feed = await sceneMediaService.getFeed({});
      expect(feed.data).toHaveLength(1);
      expect(feed.data[0].likeCount).toBe(5);

      // 4. Like
      prisma.sceneMedia.findUnique.mockImplementation(async (args: any) => {
        if (args.select?._count) return { _count: { likes: 6, saves: 2, shares: 3, comments: 1 } };
        return approvedMedia;
      });
      prisma.sceneMediaLike.upsert.mockResolvedValue({});
      expect((await sceneMediaService.likeSceneMedia('user-2', 'sm-1')).likeCount).toBe(6);

      // 5. Save
      prisma.sceneMedia.findUnique.mockImplementation(async (args: any) => {
        if (args.select?._count) return { _count: { likes: 6, saves: 3, shares: 3, comments: 1 } };
        return approvedMedia;
      });
      prisma.sceneMediaSave.upsert.mockResolvedValue({});
      expect((await sceneMediaService.saveSceneMedia('user-2', 'sm-1')).saveCount).toBe(3);

      // 6. Share
      prisma.sceneMedia.findUnique.mockImplementation(async (args: any) => {
        if (args.select?._count) return { _count: { likes: 6, saves: 3, shares: 4, comments: 1 } };
        return approvedMedia;
      });
      prisma.sceneMediaShare.create.mockResolvedValue({});
      expect((await sceneMediaService.shareSceneMedia('user-2', 'sm-1')).shareCount).toBe(4);

      // 7. Comment
      prisma.sceneMediaComment.create.mockResolvedValue({ id: 'c-1', sceneMediaId: 'sm-1', body: 'Great!', status: 'VISIBLE', createdAt: new Date(), user: { id: 'user-2', name: 'User 2' } });
      expect((await sceneMediaService.createComment('user-2', 'sm-1', { body: 'Great!' })).body).toBe('Great!');

      // 8. List comments — only VISIBLE
      prisma.sceneMediaComment.findMany.mockResolvedValue([{ id: 'c-1', sceneMediaId: 'sm-1', body: 'Great!', status: 'VISIBLE', createdAt: new Date(), user: { id: 'user-2', name: 'User 2' } }]);
      prisma.sceneMediaComment.count.mockResolvedValue(1);
      await sceneMediaService.listComments('sm-1', {});
      expect(prisma.sceneMediaComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sceneMediaId: 'sm-1', status: 'VISIBLE' } }),
      );

      // 9. Report scene
      prisma.sceneMediaReport.findFirst.mockResolvedValue(null);
      prisma.sceneMediaReport.create.mockResolvedValue({ id: 'r-1', sceneMediaId: 'sm-1', commentId: null, targetType: 'SCENE_MEDIA', reason: 'Test', status: 'OPEN', createdAt: new Date() });
      expect((await sceneMediaService.reportSceneMedia('user-2', 'sm-1', { reason: 'Test' })).targetType).toBe('SCENE_MEDIA');

      // 10. Report comment
      prisma.sceneMediaComment.findUnique.mockResolvedValue({ id: 'c-1', body: 'Great!', sceneMedia: { id: 'sm-1', visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: new Date() } });
      prisma.sceneMediaReport.create.mockResolvedValue({ id: 'r-2', sceneMediaId: null, commentId: 'c-1', targetType: 'COMMENT', reason: 'Test', status: 'OPEN', createdAt: new Date() });
      const commentReportResult = await sceneMediaService.reportComment('user-2', 'c-1', { reason: 'Test' });
      expect(commentReportResult.targetType).toBe('COMMENT');

      // 11. Saved scenes
      prisma.sceneMediaSave.findMany.mockResolvedValue([{ sceneMedia: { ...approvedMedia, _count: { likes: 6, saves: 3, shares: 4, comments: 1 } } }]);
      prisma.sceneMediaSave.count.mockResolvedValue(1);
      const saved = await sceneMediaService.getSaved('user-2', {});
      expect(saved.data).toHaveLength(1);
    });
  });

  describe('privacy boundaries', () => {
    it('should reject engagement for private media', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-priv', visibility: 'PRIVATE', moderationStatus: 'NOT_SUBMITTED', publishedAt: null });
      await expect(sceneMediaService.likeSceneMedia('user-2', 'sm-priv')).rejects.toThrow(BadRequestException);
    });

    it('should reject comments for non-public media', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-priv', visibility: 'PRIVATE', moderationStatus: 'NOT_SUBMITTED', publishedAt: null });
      await expect(sceneMediaService.createComment('user-2', 'sm-priv', { body: 'Hi' })).rejects.toThrow(BadRequestException);
    });

    it('feed DTO must not expose sensitive internal fields', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([{
        id: 'sm-1', storyId: 'story-1', narrativeEventId: 'ne-1', mediaType: 'IMAGE',
        imageUrl: 'img.png', videoUrl: null, thumbnailUrl: null,
        textExcerpt: 'S', title: null, caption: null,
        publishedAt: new Date(), createdAt: new Date(),
        _count: { likes: 0, saves: 0, shares: 0, comments: 0 },
        story: { id: 'story-1', title: 'S', coverUrl: null, genres: [] },
        user: { id: 'user-1', name: 'A', email: 'leak@test.com', passwordHash: 'secret' },
      }]);
      prisma.sceneMedia.count.mockResolvedValue(1);
      const dto = (await sceneMediaService.getFeed({})).data[0];
      expect((dto.user as any).email).toBeUndefined();
      expect((dto.user as any).passwordHash).toBeUndefined();
      expect((dto as any).basePrompt).toBeUndefined();
    });

    describe('comment visibility', () => {
      it('should query only VISIBLE comments', async () => {
        prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-pub', visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: new Date() });
        prisma.sceneMediaComment.findMany.mockResolvedValue([]);
        prisma.sceneMediaComment.count.mockResolvedValue(0);
        await sceneMediaService.listComments('sm-pub', {});
        expect(prisma.sceneMediaComment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { sceneMediaId: 'sm-pub', status: 'VISIBLE' } }),
        );
      });
    });

    describe('saved scenes privacy', () => {
      it('should filter saved scenes via relation query', async () => {
        prisma.sceneMediaSave.findMany.mockResolvedValue([]);
        prisma.sceneMediaSave.count.mockResolvedValue(0);
        await sceneMediaService.getSaved('user-2', {});
        expect(prisma.sceneMediaSave.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId: 'user-2',
              sceneMedia: {
                visibility: SceneVisibility.PUBLIC,
                moderationStatus: SceneModerationStatus.APPROVED,
                publishedAt: { not: null },
                adultContentGenerated: false,
              },
            },
          }),
        );
        expect(prisma.sceneMediaSave.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId: 'user-2',
              sceneMedia: {
                visibility: SceneVisibility.PUBLIC,
                moderationStatus: SceneModerationStatus.APPROVED,
                publishedAt: { not: null },
                adultContentGenerated: false,
              },
            },
          }),
        );
      });
    });
  });
});
