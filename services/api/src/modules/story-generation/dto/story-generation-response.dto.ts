import { ApiProperty } from '@nestjs/swagger';

export class StoryDto {
  @ApiProperty({ description: 'Story ID' })
  id: string;

  @ApiProperty({ description: 'URL slug' })
  slug: string;

  @ApiProperty({ description: 'Story title' })
  title: string;

  @ApiProperty({ description: 'Story synopsis' })
  synopsis: string;

  @ApiProperty({ description: 'Genres', type: [String] })
  genres: string[];

  @ApiProperty({ description: 'Cover URL', nullable: true })
  coverUrl: string | null;

  @ApiProperty({ description: 'Opening scene' })
  openingScene: string;

  @ApiProperty({ description: 'Origin', enum: ['ADMIN', 'USER_GENERATED'] })
  origin: string;

  @ApiProperty({ description: 'Visibility', enum: ['PRIVATE', 'UNLISTED', 'PUBLIC'] })
  visibility: string;

  @ApiProperty({ description: 'Moderation status', enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'] })
  moderationStatus: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class GenerationMetadataDto {
  @ApiProperty({ enum: ['MOCK', 'AI'] })
  mode: 'MOCK' | 'AI';

  @ApiProperty({ type: String, nullable: true })
  modelId: string | null;

  @ApiProperty({ type: String, nullable: true })
  provider: string | null;

  @ApiProperty({ enum: ['FREE', 'PREMIUM'] })
  budgetTier: 'FREE' | 'PREMIUM';

  @ApiProperty({ enum: ['SUCCESS', 'FAILED', 'BLOCKED'] })
  usageStatus: 'SUCCESS' | 'FAILED' | 'BLOCKED';

  @ApiProperty()
  tracked: boolean;

  @ApiProperty({ type: Number, nullable: true })
  estimatedCost?: number | null;

  @ApiProperty({ type: Number, nullable: true })
  inputTokens?: number | null;

  @ApiProperty({ type: Number, nullable: true })
  outputTokens?: number | null;

  @ApiProperty({ type: Number, nullable: true })
  totalTokens?: number | null;
}

export class NextActionsDto {
  @ApiProperty()
  canEdit: boolean;

  @ApiProperty()
  canSubmit: boolean;

  @ApiProperty()
  canGeneratePremises: boolean;

  @ApiProperty()
  canStartReading: boolean;
}

export class StoryGenerationResponseDto {
  @ApiProperty({ type: StoryDto })
  story: StoryDto;

  @ApiProperty({ type: GenerationMetadataDto })
  generation: GenerationMetadataDto;

  @ApiProperty({ type: NextActionsDto })
  nextActions: NextActionsDto;

  // For backward compatibility in tests (mapped from story.*)
  get origin(): string {
    return this.story.origin;
  }

  get visibility(): string {
    return this.story.visibility;
  }

  get moderationStatus(): string {
    return this.story.moderationStatus;
  }

  get title(): string {
    return this.story.title;
  }

  get openingScene(): string {
    return this.story.openingScene;
  }
}
