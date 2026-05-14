export class ReportDto {
  id!: string;
  targetType!: 'SCENE_MEDIA' | 'COMMENT';
  sceneMediaId?: string | null;
  commentId?: string | null;
  reason!: string;
  status!: 'OPEN' | 'REVIEWED' | 'DISMISSED';
  createdAt!: Date;
}

export class CreateReportDto {
  reason!: string;
}

export class AdminReportDto {
  id!: string;
  targetType!: string;
  sceneMediaId?: string | null;
  commentId?: string | null;
  reason!: string;
  status!: string;
  createdAt!: Date;

  reporter?: { id: string; name?: string | null };
  sceneMedia?: {
    id: string;
    mediaType?: string;
    title?: string | null;
    caption?: string | null;
    textExcerpt?: string | null;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    moderationStatus?: string;
    visibility?: string;
  } | null;
  comment?: { id: string; body: string; createdAt: Date } | null;
}

export class AdminReportPaginationDto {
  data!: AdminReportDto[];
  pagination!: { page: number; limit: number; total: number; totalPages: number };
}
