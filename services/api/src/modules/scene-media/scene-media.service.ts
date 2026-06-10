import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import { SceneMediaType, SceneVisibility, SceneModerationStatus, CreditTransactionReason, SceneMediaReportTargetType, SceneMediaReportStatus, CommentModerationStatus } from '@prisma/client';
import { BillingService } from '../billing/billing.service';
import { ImageGenerationService } from '../ai/image-generation.service';
import { VideoGenerationService } from '../ai/video-generation.service';
import { MEDIA_CREDIT_COSTS } from './constants/scene-media.constants';
import { FeedSceneMediaDto, FeedSceneMediaPaginationDto } from './dto/feed-scene-media.dto';
import { EngagementResponseDto } from './dto/engagement-response.dto';
import { CommentDto, CommentListResponseDto, CreateCommentDto } from './dto/comment.dto';
import { ReportDto, CreateReportDto, AdminReportDto, AdminReportPaginationDto } from './dto/report.dto';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class SceneMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly imageGenerationService: ImageGenerationService,
    private readonly videoGenerationService: VideoGenerationService,
    private readonly moderationService: ModerationService,
  ) {}

  async createFromNarrativeEvent(userId: string, narrativeEventId: string): Promise<any> {
    // 1. Fetch the NarrativeEvent and verify ownership
    const narrativeEvent = await this.prisma.narrativeEvent.findUnique({
      where: { id: narrativeEventId },
      include: {
        session: {
          include: {
            story: true,
          },
        },
      },
    });

    if (!narrativeEvent) {
      throw new NotFoundException('NarrativeEvent not found');
    }

    // 2. Check ownership: userId must match session's user
    if (narrativeEvent.session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this narrative event');
    }

    // 3. Check for existing SceneMedia (unique constraint)
    const existing = await this.prisma.sceneMedia.findUnique({
      where: { narrativeEventId },
    });

    if (existing) {
      throw new ConflictException('SceneMedia already exists for this narrative event');
    }

    // 4. Create SceneMedia (private by default, not submitted)
    const textExcerpt = narrativeEvent.sceneText
      ? narrativeEvent.sceneText.substring(0, 500)
      : null;

    const sceneMedia = await this.prisma.sceneMedia.create({
      data: {
        userId,
        narrativeEventId,
        storyId: narrativeEvent.session.storyId,
        visibility: SceneVisibility.PRIVATE,
        moderationStatus: SceneModerationStatus.NOT_SUBMITTED,
        textExcerpt,
        mediaType: SceneMediaType.TEXT,
        adultContentGenerated: narrativeEvent.adultContentGenerated === true,
      },
    });

    return sceneMedia;
  }

  async getMySceneMedia(userId: string, filters?: {
    visibility?: SceneVisibility;
    moderationStatus?: SceneModerationStatus;
  }): Promise<any[]> {
    return this.prisma.sceneMedia.findMany({
      where: {
        userId,
        ...(filters?.visibility && { visibility: filters.visibility }),
        ...(filters?.moderationStatus && { moderationStatus: filters.moderationStatus }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSceneMediaById(userId: string, sceneMediaId: string): Promise<any> {
    const sceneMedia = await this.prisma.sceneMedia.findUnique({
      where: { id: sceneMediaId },
    });

    if (!sceneMedia) {
      throw new NotFoundException('SceneMedia not found');
    }

    if (sceneMedia.userId !== userId) {
      throw new ForbiddenException('You do not have access to this scene media');
    }

    return sceneMedia;
  }

  async updateSceneMedia(userId: string, sceneMediaId: string, data: {
    title?: string;
    caption?: string;
  }): Promise<any> {
    const sceneMedia = await this.prisma.sceneMedia.findUnique({
      where: { id: sceneMediaId },
    });

    if (!sceneMedia) {
      throw new NotFoundException('SceneMedia not found');
    }

    if (sceneMedia.userId !== userId) {
      throw new ForbiddenException('You do not have access to this scene media');
    }

    // Only allow updates if PRIVATE and NOT_SUBMITTED
    if (
      sceneMedia.visibility !== SceneVisibility.PRIVATE ||
      sceneMedia.moderationStatus !== SceneModerationStatus.NOT_SUBMITTED
    ) {
      throw new BadRequestException('Cannot update SceneMedia after submission');
    }

    return this.prisma.sceneMedia.update({
      where: { id: sceneMediaId },
      data,
    });
  }

  async submitForModeration(userId: string, sceneMediaId: string, note?: string): Promise<any> {
    const sceneMedia = await this.prisma.sceneMedia.findUnique({
      where: { id: sceneMediaId },
    });

    if (!sceneMedia) {
      throw new NotFoundException('SceneMedia not found');
    }

    if (sceneMedia.userId !== userId) {
      throw new ForbiddenException('You do not have access to this scene media');
    }

    // Only allow submission if PRIVATE + NOT_SUBMITTED
    if (
      sceneMedia.visibility !== SceneVisibility.PRIVATE ||
      sceneMedia.moderationStatus !== SceneModerationStatus.NOT_SUBMITTED
    ) {
      throw new BadRequestException('SceneMedia must be PRIVATE and NOT_SUBMITTED to submit');
    }

    // Reject TEXT-only media without generated image or video
    const hasPublishableContent =
      (sceneMedia.mediaType === SceneMediaType.IMAGE && sceneMedia.imageUrl) ||
      (sceneMedia.mediaType === SceneMediaType.VIDEO && sceneMedia.videoUrl) ||
      sceneMedia.imageUrl ||
      sceneMedia.videoUrl;

    if (!hasPublishableContent) {
      throw new BadRequestException('Cannot submit media without generated image or video content.');
    }

    if (sceneMedia.adultContentGenerated) {
      throw new BadRequestException('This scene media cannot be submitted for public feed at this time.');
    }

    return this.prisma.sceneMedia.update({
      where: { id: sceneMediaId },
      data: {
        moderationStatus: SceneModerationStatus.PENDING,
        moderationNote: note || null,
      },
    });
  }

  async generateImage(userId: string, sceneMediaId: string, prompt?: string): Promise<any> {
    const sceneMedia = await this.prisma.sceneMedia.findUnique({
      where: { id: sceneMediaId },
    });

    if (!sceneMedia) {
      throw new NotFoundException('SceneMedia not found');
    }

    if (sceneMedia.userId !== userId) {
      throw new ForbiddenException('You do not have access to this scene media');
    }

    // Check credits before call
    const wallet = await this.billingService.getCreditWallet(userId);
    if (wallet.balance < MEDIA_CREDIT_COSTS.IMAGE) {
      throw new HttpException(
        { message: 'Insufficient credits for media generation.', error: 'INSUFFICIENT_CREDITS' },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Call generation (outside transaction)
    const result = await this.imageGenerationService.generateSceneImage(sceneMedia.textExcerpt || '', prompt);

    if (!result.success || !result.imageUrl) {
      throw new BadRequestException('Image generation failed or is disabled');
    }

    // Spend credits and update media atomically
    return this.persistGeneratedMediaWithCreditSpend(
      userId,
      sceneMediaId,
      MEDIA_CREDIT_COSTS.IMAGE,
      CreditTransactionReason.IMAGE_GENERATION,
      {
        imageUrl: result.imageUrl,
        mediaType: SceneMediaType.IMAGE,
      },
      {
        feature: 'SCENE_MEDIA',
        mediaType: 'IMAGE',
        sceneMediaId: sceneMedia.id,
        narrativeEventId: sceneMedia.narrativeEventId,
        storyId: sceneMedia.storyId,
        provider: result.provider,
      }
    );
  }

  async generateVideo(
    userId: string,
    sceneMediaId: string,
    prompt?: string,
    appearanceOptIn?: boolean,
  ): Promise<any> {
    const sceneMedia = await this.prisma.sceneMedia.findUnique({
      where: { id: sceneMediaId },
      include: {
        narrativeEvent: {
          select: {
            sceneIndex: true,
            session: {
              select: {
                story: {
                  select: {
                    title: true,
                    slug: true,
                    tone: true,
                  },
                },
                selectedPremiseId: true,
              },
            },
          },
        },
      },
    });

    if (!sceneMedia) {
      throw new NotFoundException('SceneMedia not found');
    }

    if (sceneMedia.userId !== userId) {
      throw new ForbiddenException('You do not have access to this scene media');
    }

    const wallet = await this.billingService.getCreditWallet(userId);
    if (wallet.balance < MEDIA_CREDIT_COSTS.VIDEO) {
      throw new HttpException(
        { message: 'Insufficient credits for media generation.', error: 'INSUFFICIENT_CREDITS' },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const session = sceneMedia.narrativeEvent?.session;
    const storyTitle = session?.story?.title || 'Untitled story';
    const premiseId = session?.selectedPremiseId;
    const storyTone = session?.story?.tone || '';

    const contextPrompt = [
      `Story: ${storyTitle}`,
      ...(premiseId ? [`Premise ID: ${premiseId}`] : []),
      ...(storyTone ? [`Tone: ${storyTone}`] : []),
      `Scene excerpt: ${sceneMedia.textExcerpt || ''}`,
    ].filter(Boolean).join('. ');

    const appearanceReference = await this.resolveAppearanceReference(userId, appearanceOptIn ?? false);

    const videoRequest = {
      prompt: prompt || `Cinematic scene: ${sceneMedia.textExcerpt}`,
      duration: 5,
      aspectRatio: '16:9' as const,
      style: 'cinematic' as const,
      contextPrompt,
      ...(appearanceReference ? { appearanceReference } : {}),
    };

    const result = await this.videoGenerationService.generateVideo(videoRequest);

    if (!result.success || !result.videoUrl) {
      throw new BadRequestException('Video generation failed or is disabled');
    }

    const metadataPayload: Record<string, any> = {
      feature: 'SCENE_MEDIA',
      mediaType: 'VIDEO',
      cost: MEDIA_CREDIT_COSTS.VIDEO,
      sceneMediaId: sceneMedia.id,
      narrativeEventId: sceneMedia.narrativeEventId,
      storyId: sceneMedia.storyId,
      provider: result.provider,
      ...(result.model ? { model: result.model } : {}),
      ...(result.taskId ? { taskId: result.taskId } : {}),
      ...(result.durationSeconds ? { durationSeconds: result.durationSeconds } : {}),
    };

    if (appearanceReference) {
      metadataPayload.appearanceConsent = true;
    }

    return this.persistGeneratedMediaWithCreditSpend(
      userId,
      sceneMediaId,
      MEDIA_CREDIT_COSTS.VIDEO,
      CreditTransactionReason.SCENE_GENERATION,
      {
        videoUrl: result.videoUrl,
        mediaType: SceneMediaType.VIDEO,
      },
      metadataPayload,
    );
  }

  /**
   * Resolve the appearance reference URL for video generation.
   *
   * When userAppearanceOptIn is false or no profile photo exists, returns null.
   * When userAppearanceOptIn is true AND a valid profile photo exists, returns
   * the photo URL as a safe appearance reference (NOT a face-swap).
   *
   * DEFERRED: The profile-photo/opt-in persistence contract is not yet
   * implemented in the User model or Prisma schema.  When those fields are
   * added, this method will query the User record for the photo URL and
   * opt-in flag.  Until then, it always returns null.
   */
  private async resolveAppearanceReference(
    _userId: string,
    appearanceOptIn: boolean,
  ): Promise<string | null> {
    if (!appearanceOptIn) {
      return null;
    }

    return null;
  }

  private async persistGeneratedMediaWithCreditSpend(
    userId: string,
    sceneMediaId: string,
    cost: number,
    reason: CreditTransactionReason,
    mediaData: any,
    metadataPayload: Record<string, any>
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // Find wallet
      const wallet = await tx.creditWallet.findUnique({ where: { userId } });
      if (!wallet) {
        throw new HttpException(
          { message: 'Insufficient credits for media generation.', error: 'INSUFFICIENT_CREDITS' },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      // Decrement wallet atomically if balance is sufficient
      const { count } = await tx.creditWallet.updateMany({
        where: { id: wallet.id, balance: { gte: cost } },
        data: { balance: { decrement: cost } },
      });

      if (count === 0) {
        throw new HttpException(
          { message: 'Insufficient credits for media generation.', error: 'INSUFFICIENT_CREDITS' },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      // Create transaction record
      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'SPEND',
          amount: -cost,
          reason,
          metadata: metadataPayload,
        },
      });

      // Update SceneMedia
      return tx.sceneMedia.update({
        where: { id: sceneMediaId },
        data: mediaData,
      });
    });
  }

  async getFeed(params: {
    page?: number;
    limit?: number;
  }): Promise<FeedSceneMediaPaginationDto> {
    const { page = 1, limit = 20 } = params;
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where = {
      visibility: SceneVisibility.PUBLIC,
      moderationStatus: SceneModerationStatus.APPROVED,
      publishedAt: { not: null },
      adultContentGenerated: false,
    };

    const [records, total] = await Promise.all([
      this.prisma.sceneMedia.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { publishedAt: 'desc' },
        include: {
          story: { select: { id: true, title: true, coverUrl: true, genres: true } },
          user: { select: { id: true, name: true } },
        _count: { select: { likes: true, saves: true, shares: true, comments: { where: { status: CommentModerationStatus.VISIBLE } } } },
        },
      }),
      this.prisma.sceneMedia.count({ where }),
    ]);

    const data = records.map((record) => this.mapToFeedDto(record));

    return {
      data,
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  private mapToFeedDto(record: any): FeedSceneMediaDto {
    const dto = new FeedSceneMediaDto();
    dto.id = record.id;
    dto.storyId = record.storyId;
    dto.narrativeEventId = record.narrativeEventId;
    dto.mediaType = record.mediaType;
    dto.imageUrl = record.imageUrl;
    dto.videoUrl = record.videoUrl;
    dto.thumbnailUrl = record.thumbnailUrl;
    dto.textExcerpt = record.textExcerpt;
    dto.title = record.title;
    dto.caption = record.caption;
    dto.publishedAt = record.publishedAt;
    dto.createdAt = record.createdAt;
    dto.likeCount = record._count?.likes ?? 0;
    dto.saveCount = record._count?.saves ?? 0;
    dto.shareCount = record._count?.shares ?? 0;
    dto.commentCount = record._count?.comments ?? 0;

    if (record.story) {
      dto.story = {
        id: record.story.id,
        title: record.story.title,
        coverUrl: record.story.coverUrl,
        genres: record.story.genres,
      };
    }

    if (record.user) {
      dto.user = {
        id: record.user.id,
        name: record.user.name,
      };
    }

    return dto;
  }

  async getSaved(userId: string, params: { page?: number; limit?: number }): Promise<FeedSceneMediaPaginationDto> {
    const { page = 1, limit = 20 } = params;
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where = {
      userId,
      sceneMedia: {
        visibility: SceneVisibility.PUBLIC,
        moderationStatus: SceneModerationStatus.APPROVED,
        publishedAt: { not: null },
        adultContentGenerated: false,
      },
    };

    const [saves, total] = await Promise.all([
      this.prisma.sceneMediaSave.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          sceneMedia: {
            include: {
              story: { select: { id: true, title: true, coverUrl: true, genres: true } },
              user: { select: { id: true, name: true } },
              _count: { select: { likes: true, saves: true, shares: true, comments: { where: { status: CommentModerationStatus.VISIBLE } } } },
            },
          },
        },
      }),
      this.prisma.sceneMediaSave.count({ where }),
    ]);

    const data = saves.filter((s: any) => s.sceneMedia).map((s: any) => this.mapToFeedDto(s.sceneMedia));
    return { data, pagination: { page, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }

  async likeSceneMedia(userId: string, sceneMediaId: string): Promise<EngagementResponseDto> {
    await this.assertMediaIsEngageable(sceneMediaId);

    await this.prisma.sceneMediaLike.upsert({
      where: { userId_sceneMediaId: { userId, sceneMediaId } },
      create: { userId, sceneMediaId },
      update: {},
    });

    return this.buildEngagementResponse(sceneMediaId);
  }

  async unlikeSceneMedia(userId: string, sceneMediaId: string): Promise<EngagementResponseDto> {
    await this.prisma.sceneMediaLike.deleteMany({
      where: { userId, sceneMediaId },
    });

    return this.buildEngagementResponse(sceneMediaId);
  }

  async saveSceneMedia(userId: string, sceneMediaId: string): Promise<EngagementResponseDto> {
    await this.assertMediaIsEngageable(sceneMediaId);

    await this.prisma.sceneMediaSave.upsert({
      where: { userId_sceneMediaId: { userId, sceneMediaId } },
      create: { userId, sceneMediaId },
      update: {},
    });

    return this.buildEngagementResponse(sceneMediaId);
  }

  async unsaveSceneMedia(userId: string, sceneMediaId: string): Promise<EngagementResponseDto> {
    await this.prisma.sceneMediaSave.deleteMany({
      where: { userId, sceneMediaId },
    });

    return this.buildEngagementResponse(sceneMediaId);
  }

  async shareSceneMedia(userId: string, sceneMediaId: string): Promise<EngagementResponseDto> {
    await this.assertMediaIsEngageable(sceneMediaId);

    await this.prisma.sceneMediaShare.create({
      data: { userId, sceneMediaId },
    });

    return this.buildEngagementResponse(sceneMediaId);
  }

  private async assertMediaIsEngageable(sceneMediaId: string): Promise<void> {
    const media = await this.prisma.sceneMedia.findUnique({
      where: { id: sceneMediaId },
      select: { id: true, visibility: true, moderationStatus: true, publishedAt: true, adultContentGenerated: true },
    });

    if (!media) {
      throw new NotFoundException('SceneMedia not found');
    }

    if (
      media.visibility !== SceneVisibility.PUBLIC ||
      media.moderationStatus !== SceneModerationStatus.APPROVED ||
      !media.publishedAt ||
      media.adultContentGenerated === true
    ) {
      throw new BadRequestException('This scene media is not available for engagement.');
    }
  }

  private async buildEngagementResponse(sceneMediaId: string): Promise<EngagementResponseDto> {
    const media = await this.prisma.sceneMedia.findUnique({
      where: { id: sceneMediaId },
      select: {
          _count: { select: { likes: true, saves: true, shares: true, comments: { where: { status: CommentModerationStatus.VISIBLE } } } },
      },
    });

    return {
      sceneMediaId,
      likeCount: media?._count?.likes ?? 0,
      saveCount: media?._count?.saves ?? 0,
      shareCount: media?._count?.shares ?? 0,
      commentCount: media?._count?.comments ?? 0,
    };
  }

  async listComments(sceneMediaId: string, params: { page?: number; limit?: number }): Promise<CommentListResponseDto> {
    await this.assertMediaIsEngageable(sceneMediaId);

    const { page = 1, limit = 20 } = params;
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where: any = { sceneMediaId, status: CommentModerationStatus.VISIBLE };

    const [records, total] = await Promise.all([
      this.prisma.sceneMediaComment.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
      this.prisma.sceneMediaComment.count({ where }),
    ]);

    const data: CommentDto[] = records.map((r) => ({
      id: r.id,
      sceneMediaId: r.sceneMediaId,
      body: r.body,
      createdAt: r.createdAt,
      user: r.user ? { id: r.user.id, name: r.user.name } : undefined,
    }));

    return {
      data,
      pagination: { page, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
    };
  }

  async createComment(userId: string, sceneMediaId: string, dto: CreateCommentDto): Promise<CommentDto> {
    await this.assertMediaIsEngageable(sceneMediaId);

    const modResult = this.moderationService.moderateComment(dto.body ?? '');
    if (!modResult.allowed) {
      throw new BadRequestException(modResult.reason || 'Comment contains unsafe content.');
    }

    const body = modResult.sanitizedText;

    const comment = await this.prisma.sceneMediaComment.create({
      data: { userId, sceneMediaId, body, status: CommentModerationStatus.VISIBLE },
      include: { user: { select: { id: true, name: true } } },
    });

    return {
      id: comment.id,
      sceneMediaId: comment.sceneMediaId,
      body: comment.body,
      createdAt: comment.createdAt,
      user: comment.user ? { id: comment.user.id, name: comment.user.name } : undefined,
    };
  }

  async reportSceneMedia(reporterUserId: string, sceneMediaId: string, dto: CreateReportDto): Promise<ReportDto> {
    await this.assertMediaIsEngageable(sceneMediaId);

    const modResult = this.moderationService.moderateReportReason(dto.reason ?? '');
    if (!modResult.allowed) {
      throw new BadRequestException(modResult.reason || 'Report reason is invalid.');
    }
    const reason = modResult.sanitizedText;

    const existing = await this.prisma.sceneMediaReport.findFirst({
      where: { reporterUserId, sceneMediaId },
    });
    if (existing) throw new ConflictException('You have already reported this scene media.');

    const report = await this.prisma.sceneMediaReport.create({
      data: {
        reporterUserId,
        targetType: SceneMediaReportTargetType.SCENE_MEDIA,
        sceneMediaId,
        reason,
      },
    });

    return { id: report.id, targetType: 'SCENE_MEDIA', sceneMediaId: report.sceneMediaId, commentId: null, reason: report.reason, status: report.status, createdAt: report.createdAt };
  }

  async reportComment(reporterUserId: string, commentId: string, dto: CreateReportDto): Promise<ReportDto> {
    const comment = await this.prisma.sceneMediaComment.findUnique({
      where: { id: commentId },
      include: { sceneMedia: { select: { id: true, visibility: true, moderationStatus: true, publishedAt: true, adultContentGenerated: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const sm = comment.sceneMedia;
    if (!sm || sm.visibility !== SceneVisibility.PUBLIC || sm.moderationStatus !== SceneModerationStatus.APPROVED || !sm.publishedAt || sm.adultContentGenerated === true) {
      throw new BadRequestException('This comment is not available for reporting.');
    }

    const modResult = this.moderationService.moderateReportReason(dto.reason ?? '');
    if (!modResult.allowed) {
      throw new BadRequestException(modResult.reason || 'Report reason is invalid.');
    }
    const reason = modResult.sanitizedText;

    const existing = await this.prisma.sceneMediaReport.findFirst({
      where: { reporterUserId, commentId },
    });
    if (existing) throw new ConflictException('You have already reported this comment.');

    const report = await this.prisma.sceneMediaReport.create({
      data: {
        reporterUserId,
        targetType: SceneMediaReportTargetType.COMMENT,
        commentId,
        reason,
      },
    });

    return { id: report.id, targetType: 'COMMENT', sceneMediaId: null, commentId: report.commentId, reason: report.reason, status: report.status, createdAt: report.createdAt };
  }

  async listReports(params: { status?: string; targetType?: string; page?: number; limit?: number }): Promise<AdminReportPaginationDto> {
    const { status, targetType, page = 1, limit = 20 } = params;
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where: any = {};
    const statusFilter = status ?? SceneMediaReportStatus.OPEN;
    if (status && !Object.values(SceneMediaReportStatus).includes(statusFilter as SceneMediaReportStatus)) {
      throw new BadRequestException(`Invalid report status: ${status}`);
    }
    where.status = statusFilter;

    if (targetType) {
      if (!Object.values(SceneMediaReportTargetType).includes(targetType as SceneMediaReportTargetType)) {
        throw new BadRequestException(`Invalid target type: ${targetType}`);
      }
      where.targetType = targetType;
    }

    const [records, total] = await Promise.all([
      this.prisma.sceneMediaReport.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true } },
          sceneMedia: { select: { id: true, mediaType: true, title: true, caption: true, textExcerpt: true, imageUrl: true, thumbnailUrl: true, moderationStatus: true, visibility: true } },
          comment: { select: { id: true, body: true, createdAt: true } },
        },
      }),
      this.prisma.sceneMediaReport.count({ where }),
    ]);

    const data: AdminReportDto[] = records.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      sceneMediaId: r.sceneMediaId,
      commentId: r.commentId,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      reporter: r.reporter ? { id: r.reporter.id, name: r.reporter.name } : undefined,
      sceneMedia: r.sceneMedia ?? null,
      comment: r.comment ? { id: r.comment.id, body: r.comment.body, createdAt: r.comment.createdAt } : null,
    }));

    return { data, pagination: { page, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }
}
