import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma.service';
import { StoryGenerationUsageStatus } from '@prisma/client';

@Injectable()
export class StoryGenerationObservabilityService {
  private readonly logger = new Logger(StoryGenerationObservabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createUsageRecord(params: {
    userId: string;
    storyId?: string;
    modelId: string;
    isMock: boolean;
    status: StoryGenerationUsageStatus;
    failureReason?: string;
    inputTokens?: number;
    outputTokens?: number;
    provider?: string;
  }): Promise<{
    tracked: boolean;
    estimatedCost?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
  }> {
    try {
      const sanitizedFailureReason = this.sanitizeFailureReason(params.failureReason);

      const record = await this.prisma.storyGenerationUsage.create({
        data: {
          userId: params.userId,
          storyId: params.storyId,
          modelId: params.modelId,
          isMock: params.isMock,
          status: params.status,
          failureReason: sanitizedFailureReason,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          provider: params.provider,
        },
        select: {
          estimatedCost: true,
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
        },
      });

      return {
        tracked: true,
        estimatedCost: record.estimatedCost,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        totalTokens: record.totalTokens,
      };
    } catch (error) {
      this.logger.warn('Failed to create story generation usage record:', error.message);
      return { tracked: false };
    }
  }

  private sanitizeFailureReason(reason: string | undefined): string | undefined {
    if (!reason) return undefined;

    const lines = reason.split('\n');
    const filteredLines = lines.filter(line => !line.trim().startsWith('at '));
    let cleaned = filteredLines.join('\n').trim();

    if (cleaned.length > 500) {
      cleaned = cleaned.substring(0, 500);
    }

    return cleaned || undefined;
  }
}
