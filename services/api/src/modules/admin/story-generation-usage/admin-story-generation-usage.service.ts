import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import { StoryGenerationUsageStatus, UserRole } from '@prisma/client';
import { AdminStoryGenerationUsageDto, AdminStoryGenerationUsagePaginationDto, AdminStoryGenerationMetricsDto } from './dto/admin-story-generation-usage.dto';

@Injectable()
export class AdminStoryGenerationUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    status?: StoryGenerationUsageStatus;
    userId?: string;
    storyId?: string;
    provider?: string;
    modelId?: string;
    isMock?: boolean;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    order?: 'asc' | 'desc';
  }): Promise<AdminStoryGenerationUsagePaginationDto> {
    const {
      status,
      userId,
      storyId,
      provider,
      modelId,
      isMock,
      from,
      to,
      page = 1,
      limit = 20,
      order = 'desc',
    } = params;

    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where: any = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (storyId) where.storyId = storyId;
    if (provider) where.provider = provider;
    if (modelId) where.modelId = modelId;
    if (isMock !== undefined) where.isMock = isMock;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [records, total] = await Promise.all([
      this.prisma.storyGenerationUsage.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: order },
        include: {
          user: { select: { id: true } },
          story: { select: { id: true, title: true, origin: true, visibility: true, moderationStatus: true } },
        },
      }),
      this.prisma.storyGenerationUsage.count({ where }),
    ]);

    const data = records.map((record) => this.mapToDto(record));

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

  async findOne(id: string): Promise<AdminStoryGenerationUsageDto> {
    const record = await this.prisma.storyGenerationUsage.findUnique({
      where: { id },
      include: {
        user: { select: { id: true } },
        story: { select: { id: true, title: true, origin: true, visibility: true, moderationStatus: true } },
      },
    });

    if (!record) {
      throw new NotFoundException(`StoryGenerationUsage with id ${id} not found`);
    }

    return this.mapToDto(record);
  }

  private sanitizeFailureReason(reason: string | null | undefined): string | null | undefined {
    if (reason === null) return null;
    if (!reason) return undefined;

    const lines = reason.split('\n');
    const filtered = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('at ')) return false;
      if (/\(.*:\d+:\d+\)$/.test(trimmed)) return false;
      return true;
    });

    const cleaned = filtered.join(' ').replace(/\s+/g, ' ').trim();

    return cleaned.length > 500 ? cleaned.slice(0, 500) : cleaned;
  }

  private mapToDto(record: any): AdminStoryGenerationUsageDto {
    const dto = new AdminStoryGenerationUsageDto();
    dto.id = record.id;
    dto.userId = record.userId;
    dto.storyId = record.storyId;
    dto.modelId = record.modelId;
    dto.provider = record.provider;
    dto.isMock = record.isMock;
    dto.status = record.status;
    dto.failureReason = this.sanitizeFailureReason(record.failureReason);
    dto.inputTokens = record.inputTokens;
    dto.outputTokens = record.outputTokens;
    dto.totalTokens = record.totalTokens;
    dto.estimatedCost = record.estimatedCost;
    dto.createdAt = record.createdAt;

    if (record.user) {
      dto.user = {
        id: record.user.id,
      };
    }

    if (record.story) {
      dto.story = {
        id: record.story.id,
        title: record.story.title,
        origin: record.story.origin,
        visibility: record.story.visibility,
        moderationStatus: record.story.moderationStatus,
      };
    }

    return dto;
  }

  async getMetrics(params: {
    from?: string;
    to?: string;
    provider?: string;
    modelId?: string;
    isMock?: boolean;
    status?: StoryGenerationUsageStatus;
  }): Promise<AdminStoryGenerationMetricsDto> {
    const { from, to, provider, modelId, isMock, status } = params;

    const where: any = {};
    if (status) where.status = status;
    if (provider) where.provider = provider;
    if (modelId) where.modelId = modelId;
    if (isMock !== undefined) where.isMock = isMock;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [statusGroup, providerGroup, modelGroup, dayRecords] = await Promise.all([
      this.prisma.storyGenerationUsage.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: {
          estimatedCost: true,
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
        },
      }),
      this.prisma.storyGenerationUsage.groupBy({
        by: ['provider'],
        where,
        _count: true,
        _sum: {
          estimatedCost: true,
          totalTokens: true,
        },
      }),
      this.prisma.storyGenerationUsage.groupBy({
        by: ['modelId'],
        where,
        _count: true,
        _sum: {
          estimatedCost: true,
          totalTokens: true,
        },
      }),
      this.prisma.storyGenerationUsage.findMany({
        where,
        select: {
          createdAt: true,
          status: true,
          estimatedCost: true,
          totalTokens: true,
        },
      }),
    ]);

    const totals = {
      total: 0,
      success: 0,
      failed: 0,
      blocked: 0,
      estimatedCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };

    statusGroup.forEach((group) => {
      const count = group._count || 0;
      const estimatedCost = group._sum.estimatedCost || 0;
      const inputTokens = group._sum.inputTokens || 0;
      const outputTokens = group._sum.outputTokens || 0;
      const totalTokens = group._sum.totalTokens || 0;

      totals.total += count;
      totals.estimatedCost += estimatedCost;
      totals.inputTokens += inputTokens;
      totals.outputTokens += outputTokens;
      totals.totalTokens += totalTokens;

      if (group.status === 'SUCCESS') {
        totals.success = count;
      } else if (group.status === 'FAILED') {
        totals.failed = count;
      } else if (group.status === 'BLOCKED') {
        totals.blocked = count;
      }
    });

    const successRate = totals.total > 0 ? totals.success / totals.total : 0;
    const failureRate = totals.total > 0 ? totals.failed / totals.total : 0;
    const blockedRate = totals.total > 0 ? totals.blocked / totals.total : 0;

    const byStatus = statusGroup.map((group) => ({
      status: group.status,
      count: group._count || 0,
    }));

    const byProvider = providerGroup.map((group) => ({
      provider: group.provider || 'unknown',
      count: group._count || 0,
      estimatedCost: group._sum.estimatedCost || 0,
      totalTokens: group._sum.totalTokens || 0,
    }));

    const byModel = modelGroup.map((group) => ({
      modelId: group.modelId || 'unknown',
      count: group._count || 0,
      estimatedCost: group._sum.estimatedCost || 0,
      totalTokens: group._sum.totalTokens || 0,
    }));

    const dayMap = new Map<string, { total: number; success: number; failed: number; blocked: number; estimatedCost: number; totalTokens: number }>();

    dayRecords.forEach((record) => {
      const date = record.createdAt.toISOString().split('T')[0];
      if (!dayMap.has(date)) {
        dayMap.set(date, {
          total: 0,
          success: 0,
          failed: 0,
          blocked: 0,
          estimatedCost: 0,
          totalTokens: 0,
        });
      }
      const day = dayMap.get(date)!;
      day.total += 1;
      day.estimatedCost += record.estimatedCost || 0;
      day.totalTokens += record.totalTokens || 0;

      if (record.status === 'SUCCESS') {
        day.success += 1;
      } else if (record.status === 'FAILED') {
        day.failed += 1;
      } else if (record.status === 'BLOCKED') {
        day.blocked += 1;
      }
    });

    const byDay = Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totals: {
        total: totals.total,
        success: totals.success,
        failed: totals.failed,
        blocked: totals.blocked,
        estimatedCost: totals.estimatedCost,
        inputTokens: totals.inputTokens,
        outputTokens: totals.outputTokens,
        totalTokens: totals.totalTokens,
        successRate,
        failureRate,
        blockedRate,
      },
      byStatus,
      byProvider,
      byModel,
      byDay,
    };
  }
}
