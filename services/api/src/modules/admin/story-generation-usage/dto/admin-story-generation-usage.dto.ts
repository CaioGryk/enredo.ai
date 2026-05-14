import { StoryGenerationUsageStatus } from '@prisma/client';

export class AdminStoryGenerationUsageDto {
  id!: string;
  userId!: string;
  storyId?: string;
  modelId?: string;
  provider?: string;
  isMock!: boolean;
  status!: StoryGenerationUsageStatus;
  failureReason?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  createdAt!: Date;

  user?: {
    id: string;
    email: string;
  };

  story?: {
    id: string;
    title: string;
    origin: string;
    visibility: string;
    moderationStatus: string;
  };
}

export class AdminStoryGenerationUsagePaginationDto {
  data!: AdminStoryGenerationUsageDto[];
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class AdminStoryGenerationMetricsDto {
  totals!: {
    total: number;
    success: number;
    failed: number;
    blocked: number;
    estimatedCost: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    successRate: number;
    failureRate: number;
    blockedRate: number;
  };

  byStatus!: { status: string; count: number }[];

  byProvider!: { provider: string; count: number; estimatedCost: number; totalTokens: number }[];

  byModel!: { modelId: string; count: number; estimatedCost: number; totalTokens: number }[];

  byDay!: {
    date: string;
    total: number;
    success: number;
    failed: number;
    blocked: number;
    estimatedCost: number;
    totalTokens: number;
  }[];
}
