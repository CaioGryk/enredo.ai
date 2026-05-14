export class FeedSceneMediaDto {
  id!: string;
  storyId?: string | null;
  narrativeEventId?: string | null;
  mediaType!: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  textExcerpt?: string | null;
  title?: string | null;
  caption?: string | null;
  publishedAt?: Date | null;
  createdAt!: Date;

  likeCount!: number;
  saveCount!: number;
  shareCount!: number;
  commentCount!: number;

  story?: {
    id: string;
    title: string;
    coverUrl?: string | null;
    genres: string[];
  };

  user?: {
    id: string;
    name?: string | null;
  };
}

export class FeedSceneMediaPaginationDto {
  data!: FeedSceneMediaDto[];
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
