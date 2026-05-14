import { SceneVisibility, SceneModerationStatus, SceneMediaType } from '@prisma/client';

export class AdminSceneMediaDto {
  id!: string;
  userId!: string;
  narrativeEventId?: string | null;
  storyId?: string | null;

  visibility!: SceneVisibility;
  moderationStatus!: SceneModerationStatus;

  title?: string | null;
  caption?: string | null;
  textExcerpt?: string | null;

  imageUrl?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaType!: SceneMediaType;

  moderationNote?: string | null;
  publishedAt?: Date | null;
  createdAt!: Date;
  updatedAt?: Date;

  // Computed helpers
  hasImage?: boolean;
  hasVideo?: boolean;

  // Social counts
  likeCount?: number;
  saveCount?: number;
  shareCount?: number;
  commentCount?: number;

  // Narrative event context (safe fields only)
  narrativeEvent?: {
    id: string;
    sceneIndex: number;
  } | null;

  // Submitter context
  user?: {
    id: string;
    name?: string | null;
  };

  // Story context
  story?: {
    id: string;
    title: string;
    slug?: string | null;
    genres: string[];
    maturityRating?: string | null;
  };
}

export class AdminSceneMediaPaginationDto {
  data!: AdminSceneMediaDto[];
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class AdminSceneMediaMetricsDto {
  total!: number;

  byStatus!: Array<{ status: string; count: number }>;
  byMediaType!: Array<{ mediaType: string; count: number }>;

  pending!: {
    total: number;
    oldestCreatedAt?: string | null;
    newestCreatedAt?: string | null;
  };

  published!: { total: number };
  rejected!: { total: number };

  withImage!: number;
  withVideo!: number;
}

export class AdminCommentDto {
  id!: string;
  sceneMediaId!: string;
  body!: string;
  status!: string;
  createdAt!: Date;

  user?: { id: string; name?: string | null };
  sceneMedia?: { id: string; storyId?: string | null } | null;
}

export class AdminCommentPaginationDto {
  data!: AdminCommentDto[];
  pagination!: { page: number; limit: number; total: number; totalPages: number };
}
