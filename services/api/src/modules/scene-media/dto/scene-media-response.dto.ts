export class SceneMediaResponseDto {
  id: string;
  userId: string;
  narrativeEventId?: string;
  storyId?: string;
  visibility: string;
  moderationStatus: string;
  title?: string;
  caption?: string;
  textExcerpt?: string;
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  mediaType: string;
  moderationNote?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
