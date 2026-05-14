import { IsOptional, IsString, IsArray, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDTO } from '../../../common/dto/pagination.dto';

export class GetStoriesDto extends PaginationDTO {
  @ApiPropertyOptional({ example: 'misterio' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ example: 'Joao Autor' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ example: 'detetive' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isPremium?: boolean | string;
}

export class StoryResponseDto {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  coverUrl?: string;
  genres: string[];
  authorName: string;
  isPremium: boolean;
  totalChapters: number;
  publishedAt?: Date;
  language?: string;
  maturityRating?: string;
  basePrompt?: string;
  tone?: string;
  styleGuide?: string;
  worldRules?: string;
  openingScene?: string;
}

export class StoryWithCharactersDto extends StoryResponseDto {
  characters: CharacterResponseDto[];
}

export class CharacterResponseDto {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  role: string;
}

export class StoryListResponseDto {
  stories: StoryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
