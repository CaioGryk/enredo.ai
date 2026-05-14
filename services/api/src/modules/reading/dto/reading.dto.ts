import { IsString, IsArray, IsOptional, IsEnum, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDTO } from '../../../common/dto/pagination.dto';
import { UserActionType, ReadingSessionStatus } from '@prisma/client';

export class StartReadingDto {
  @ApiProperty({ description: 'Story ID to start reading' })
  @IsString()
  storyId: string;

  @ApiPropertyOptional({ description: 'Selected premise ID' })
  @IsOptional()
  @IsString()
  premiseId?: string;

  @ApiPropertyOptional({ description: 'Selected character ID' })
  @IsOptional()
  @IsString()
  characterId?: string;
}

export class SendActionDto {
  @ApiProperty({ description: 'User action: choice index or free text' })
  @IsString()
  action: string;

  @ApiProperty({ enum: UserActionType, description: 'Type of action' })
  @IsEnum(UserActionType)
  actionType: UserActionType;

  @ApiPropertyOptional({ enum: ['standard', 'cinematic'], description: 'Action mode - cinematic uses credits' })
  @IsOptional()
  @IsString()
  mode?: 'standard' | 'cinematic';

  @ApiPropertyOptional({ description: 'Specific model ID to use (must be entitled)' })
  @IsOptional()
  @IsString()
  modelId?: string;
}

export class SceneResponseDto {
  id?: string;
  chapterNumber: number;
  sceneIndex: number;
  sceneText: string;
  choices: string[];
  sceneMetadata?: {
    emotion?: string;
    pacing?: string;
  };
  adPlacement?: {
    type: 'INTERSTITIAL' | 'REWARDED' | 'BANNER';
    reason: string;
  };
}

export class NarrativeEventDto {
  id: string;
  chapterNumber: number;
  sceneIndex: number;
  sceneText: string;
  choices: string[];
  userAction: string;
  userActionType: UserActionType;
  generatedAt: Date;
}

export class ReadingSessionDto {
  id: string;
  storyId: string;
  selectedPremiseId?: string;
  selectedCharacterId?: string;
  protagonistName?: string;
  protagonistRole?: string;
  currentChapter: number;
  currentSceneIndex: number;
  status: ReadingSessionStatus;
  startedAt: Date;
  lastSceneAt: Date;
  currentScene: SceneResponseDto;
  history: NarrativeEventDto[];
}

export class UsageInfoDto {
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  isLimited: boolean;
  creditsRemaining: number;
}

export class ReadingStatusDto {
  session: ReadingSessionDto;
  usage: UsageInfoDto;
}

export class GetSessionsDto extends PaginationDTO {
  @ApiPropertyOptional({ enum: ReadingSessionStatus })
  @IsOptional()
  @IsEnum(ReadingSessionStatus)
  status?: ReadingSessionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storyId?: string;
}

export class SessionListResponseDto {
  sessions: {
    id: string;
    storyId: string;
    storyTitle: string;
    storyCoverUrl?: string | null;
    selectedPremiseTitle?: string | null;
    selectedCharacterName?: string | null;
    currentChapter: number;
    currentSceneIndex: number;
    status: ReadingSessionStatus;
    startedAt: Date;
    lastSceneAt: Date;
  }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}