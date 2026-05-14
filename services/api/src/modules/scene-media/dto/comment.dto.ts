export class CommentDto {
  id!: string;
  sceneMediaId!: string;
  body!: string;
  createdAt!: Date;

  user?: {
    id: string;
    name?: string | null;
  };
}

export class CommentListResponseDto {
  data!: CommentDto[];
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class CreateCommentDto {
  body!: string;
}
