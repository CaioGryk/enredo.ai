import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import { SceneModerationStatus, SceneVisibility, SceneMediaType, CommentModerationStatus } from '@prisma/client';
import { AdminSceneMediaDto, AdminSceneMediaPaginationDto, AdminSceneMediaMetricsDto, AdminCommentDto, AdminCommentPaginationDto } from './dto/admin-scene-media.dto';

@Injectable()
export class AdminSceneMediaService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<AdminSceneMediaMetricsDto> {
    const [total, statusGroups, typeGroups] = await Promise.all([
      this.prisma.sceneMedia.count(),
      this.prisma.sceneMedia.groupBy({ by: ['moderationStatus'], _count: true }),
      this.prisma.sceneMedia.groupBy({ by: ['mediaType'], _count: true }),
    ]);

    const allStatuses = Object.values(SceneModerationStatus);
    const allTypes = Object.values(SceneMediaType);

    const byStatus = allStatuses.map((status) => {
      const group = statusGroups.find((g) => g.moderationStatus === status);
      return { status, count: group?._count ?? 0 };
    });

    const byMediaType = allTypes.map((mediaType) => {
      const group = typeGroups.find((g) => g.mediaType === mediaType);
      return { mediaType, count: group?._count ?? 0 };
    });

    const pendingCount = statusGroups.find((g) => g.moderationStatus === SceneModerationStatus.PENDING)?._count ?? 0;

    const [oldestPending, newestPending] = await Promise.all([
      this.prisma.sceneMedia.findFirst({ where: { moderationStatus: SceneModerationStatus.PENDING }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      this.prisma.sceneMedia.findFirst({ where: { moderationStatus: SceneModerationStatus.PENDING }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);

    const publishedCount = await this.prisma.sceneMedia.count({ where: { visibility: SceneVisibility.PUBLIC, moderationStatus: SceneModerationStatus.APPROVED, publishedAt: { not: null } } });
    const rejectedCount = statusGroups.find((g) => g.moderationStatus === SceneModerationStatus.REJECTED)?._count ?? 0;

    const withImage = await this.prisma.sceneMedia.count({ where: { imageUrl: { not: null } } });
    const withVideo = await this.prisma.sceneMedia.count({ where: { videoUrl: { not: null } } });

    return {
      total, byStatus, byMediaType,
      pending: { total: pendingCount, oldestCreatedAt: oldestPending?.createdAt?.toISOString() ?? null, newestCreatedAt: newestPending?.createdAt?.toISOString() ?? null },
      published: { total: publishedCount },
      rejected: { total: rejectedCount },
      withImage, withVideo,
    };
  }

  async listForModeration(params: { page?: number; limit?: number; status?: string; mediaType?: string; storyId?: string; userId?: string; q?: string }): Promise<AdminSceneMediaPaginationDto> {
    const { page = 1, limit = 20, status, mediaType, storyId, userId, q } = params;
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where: any = {};
    const statusFilter = status ?? SceneModerationStatus.PENDING;
    if (!Object.values(SceneModerationStatus).includes(statusFilter as SceneModerationStatus)) throw new BadRequestException(`Invalid moderation status: ${statusFilter}`);
    where.moderationStatus = statusFilter;

    if (mediaType) {
      if (!Object.values(SceneMediaType).includes(mediaType as SceneMediaType)) throw new BadRequestException(`Invalid media type: ${mediaType}`);
      where.mediaType = mediaType;
    }
    if (storyId) where.storyId = storyId;
    if (userId) where.userId = userId;
    const trimmedQ = q?.trim();
    if (trimmedQ) where.OR = [{ title: { contains: trimmedQ, mode: 'insensitive' } }, { caption: { contains: trimmedQ, mode: 'insensitive' } }, { textExcerpt: { contains: trimmedQ, mode: 'insensitive' } }];

    const [records, total] = await Promise.all([
      this.prisma.sceneMedia.findMany({ where, skip, take: safeLimit, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true } }, story: { select: { id: true, title: true, slug: true, genres: true, maturityRating: true } }, narrativeEvent: { select: { id: true, sceneIndex: true } }, _count: { select: { likes: true, saves: true, shares: true, comments: { where: { status: CommentModerationStatus.VISIBLE } } } } } }),
      this.prisma.sceneMedia.count({ where }),
    ]);
    const data = records.map((r) => this.mapToDto(r));
    return { data, pagination: { page, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }

  async approve(sceneMediaId: string): Promise<AdminSceneMediaDto> {
    const sceneMedia = await this.prisma.sceneMedia.findUnique({ where: { id: sceneMediaId } });
    if (!sceneMedia) throw new NotFoundException('SceneMedia not found');
    if (sceneMedia.moderationStatus !== SceneModerationStatus.PENDING) throw new BadRequestException(`Cannot approve with status ${sceneMedia.moderationStatus}`);
    const updated = await this.prisma.sceneMedia.update({ where: { id: sceneMediaId }, data: { moderationStatus: SceneModerationStatus.APPROVED, visibility: SceneVisibility.PUBLIC, publishedAt: new Date(), moderationNote: null }, include: { user: { select: { id: true, name: true } }, story: { select: { id: true, title: true, slug: true, genres: true, maturityRating: true } }, narrativeEvent: { select: { id: true, sceneIndex: true } }, _count: { select: { likes: true, saves: true, shares: true, comments: { where: { status: CommentModerationStatus.VISIBLE } } } } } });
    return this.mapToDto(updated);
  }

  async reject(sceneMediaId: string, note?: string): Promise<AdminSceneMediaDto> {
    const sceneMedia = await this.prisma.sceneMedia.findUnique({ where: { id: sceneMediaId } });
    if (!sceneMedia) throw new NotFoundException('SceneMedia not found');
    if (sceneMedia.moderationStatus !== SceneModerationStatus.PENDING) throw new BadRequestException(`Cannot reject with status ${sceneMedia.moderationStatus}`);
    const updated = await this.prisma.sceneMedia.update({ where: { id: sceneMediaId }, data: { moderationStatus: SceneModerationStatus.REJECTED, visibility: SceneVisibility.PRIVATE, moderationNote: note || null }, include: { user: { select: { id: true, name: true } }, story: { select: { id: true, title: true, slug: true, genres: true, maturityRating: true } }, narrativeEvent: { select: { id: true, sceneIndex: true } }, _count: { select: { likes: true, saves: true, shares: true, comments: { where: { status: CommentModerationStatus.VISIBLE } } } } } });
    return this.mapToDto(updated);
  }

  async listComments(params: { status?: string; sceneMediaId?: string; userId?: string; q?: string; page?: number; limit?: number }): Promise<AdminCommentPaginationDto> {
    const { status, sceneMediaId, userId, q, page = 1, limit = 20 } = params;
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;
    const where: any = {};
    if (status && Object.values(CommentModerationStatus).includes(status as CommentModerationStatus)) where.status = status;
    if (sceneMediaId) where.sceneMediaId = sceneMediaId;
    if (userId) where.userId = userId;
    const trimmedQ = q?.trim();
    if (trimmedQ) where.body = { contains: trimmedQ, mode: 'insensitive' };
    const [records, total] = await Promise.all([
      this.prisma.sceneMediaComment.findMany({ where, skip, take: safeLimit, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true } }, sceneMedia: { select: { id: true, storyId: true } } } }),
      this.prisma.sceneMediaComment.count({ where }),
    ]);
    const data: AdminCommentDto[] = records.map((r) => ({ id: r.id, sceneMediaId: r.sceneMediaId, body: r.body, status: r.status, createdAt: r.createdAt, user: r.user ? { id: r.user.id, name: r.user.name } : undefined, sceneMedia: r.sceneMedia ? { id: r.sceneMedia.id, storyId: r.sceneMedia.storyId } : null }));
    return { data, pagination: { page, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }

  async hideComment(commentId: string): Promise<AdminCommentDto> {
    await this.findCommentOrFail(commentId);
    const c = await this.prisma.sceneMediaComment.update({ where: { id: commentId }, data: { status: CommentModerationStatus.HIDDEN }, include: { user: { select: { id: true, name: true } }, sceneMedia: { select: { id: true, storyId: true } } } });
    return { id: c.id, sceneMediaId: c.sceneMediaId, body: c.body, status: c.status, createdAt: c.createdAt, user: c.user ? { id: c.user.id, name: c.user.name } : undefined, sceneMedia: c.sceneMedia ? { id: c.sceneMedia.id, storyId: c.sceneMedia.storyId } : null };
  }

  async removeComment(commentId: string): Promise<AdminCommentDto> {
    await this.findCommentOrFail(commentId);
    const c = await this.prisma.sceneMediaComment.update({ where: { id: commentId }, data: { status: CommentModerationStatus.REMOVED }, include: { user: { select: { id: true, name: true } }, sceneMedia: { select: { id: true, storyId: true } } } });
    return { id: c.id, sceneMediaId: c.sceneMediaId, body: c.body, status: c.status, createdAt: c.createdAt, user: c.user ? { id: c.user.id, name: c.user.name } : undefined, sceneMedia: c.sceneMedia ? { id: c.sceneMedia.id, storyId: c.sceneMedia.storyId } : null };
  }

  async restoreComment(commentId: string): Promise<AdminCommentDto> {
    await this.findCommentOrFail(commentId);
    const c = await this.prisma.sceneMediaComment.update({ where: { id: commentId }, data: { status: CommentModerationStatus.VISIBLE }, include: { user: { select: { id: true, name: true } }, sceneMedia: { select: { id: true, storyId: true } } } });
    return { id: c.id, sceneMediaId: c.sceneMediaId, body: c.body, status: c.status, createdAt: c.createdAt, user: c.user ? { id: c.user.id, name: c.user.name } : undefined, sceneMedia: c.sceneMedia ? { id: c.sceneMedia.id, storyId: c.sceneMedia.storyId } : null };
  }

  private async findCommentOrFail(commentId: string): Promise<any> {
    const comment = await this.prisma.sceneMediaComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  private mapToDto(record: any): AdminSceneMediaDto {
    const dto = new AdminSceneMediaDto();
    dto.id = record.id; dto.userId = record.userId; dto.narrativeEventId = record.narrativeEventId; dto.storyId = record.storyId;
    dto.visibility = record.visibility; dto.moderationStatus = record.moderationStatus;
    dto.title = record.title; dto.caption = record.caption; dto.textExcerpt = record.textExcerpt;
    dto.imageUrl = record.imageUrl; dto.videoUrl = record.videoUrl; dto.thumbnailUrl = record.thumbnailUrl; dto.mediaType = record.mediaType;
    dto.moderationNote = record.moderationNote; dto.publishedAt = record.publishedAt; dto.createdAt = record.createdAt; dto.updatedAt = record.updatedAt;
    dto.hasImage = !!record.imageUrl; dto.hasVideo = !!record.videoUrl;
    dto.likeCount = record._count?.likes ?? 0; dto.saveCount = record._count?.saves ?? 0; dto.shareCount = record._count?.shares ?? 0; dto.commentCount = record._count?.comments ?? 0;
    if (record.narrativeEvent) dto.narrativeEvent = { id: record.narrativeEvent.id, sceneIndex: record.narrativeEvent.sceneIndex };
    if (record.user) dto.user = { id: record.user.id, name: record.user.name };
    if (record.story) dto.story = { id: record.story.id, title: record.story.title, slug: record.story.slug, genres: record.story.genres, maturityRating: record.story.maturityRating };
    return dto;
  }
}
