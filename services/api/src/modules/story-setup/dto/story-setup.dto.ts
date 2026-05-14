import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NarrativeFunction } from '@prisma/client';

export class CreatePremiseDto {
  @ApiProperty({ description: 'Story ID' })
  @IsString()
  storyId: string;

  @ApiProperty({ description: 'Premise title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Premise synopsis' })
  @IsString()
  synopsis: string;

  @ApiProperty({ description: 'Base prompt for the premise' })
  @IsString()
  basePrompt: string;

  @ApiPropertyOptional({ description: 'Opening scene' })
  @IsOptional()
  @IsString()
  openingScene?: string;

  @ApiPropertyOptional({ description: 'Tone' })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiPropertyOptional({ description: 'Style guide' })
  @IsOptional()
  @IsString()
  styleGuide?: string;

  @ApiPropertyOptional({ description: 'World rules' })
  @IsOptional()
  @IsString()
  worldRules?: string;

  @ApiPropertyOptional({ description: 'Cover prompt' })
  @IsOptional()
  @IsString()
  coverPrompt?: string;

  @ApiPropertyOptional({ description: 'Cover URL' })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is premium' })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}

export class CreateCharacterDto {
  @ApiProperty({ description: 'Story ID' })
  @IsString()
  storyId: string;

  @ApiProperty({ description: 'Premise ID' })
  @IsString()
  premiseId: string;

  @ApiProperty({ description: 'Character name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Role label' })
  @IsString()
  roleLabel: string;

  @ApiProperty({ enum: NarrativeFunction, description: 'Narrative function' })
  narrativeFunction: NarrativeFunction;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Personality' })
  @IsOptional()
  @IsString()
  personality?: string;

  @ApiPropertyOptional({ description: 'Motivation' })
  @IsOptional()
  @IsString()
  motivation?: string;

  @ApiPropertyOptional({ description: 'Secret' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ description: 'Relationship to player' })
  @IsOptional()
  @IsString()
  relationshipToPlayer?: string;

  @ApiPropertyOptional({ description: 'Initial goal' })
  @IsOptional()
  @IsString()
  initialGoal?: string;

  @ApiPropertyOptional({ description: 'Conflict potential' })
  @IsOptional()
  @IsString()
  conflictPotential?: string;

  @ApiPropertyOptional({ description: 'Visual prompt' })
  @IsOptional()
  @IsString()
  visualPrompt?: string;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is premium' })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}

export class GenerateDto {
  @ApiPropertyOptional({ description: 'Force regeneration', default: false })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class PremiseResponseDto {
  id: string;
  storyId: string;
  title: string;
  synopsis: string;
  basePrompt: string;
  openingScene: string | null;
  tone: string | null;
  styleGuide: string | null;
  worldRules: string | null;
  coverPrompt: string | null;
  coverUrl: string | null;
  coverGenerationStatus: string;
  coverError: string | null;
  coverFallback: ProceduralVisualDto;
  sortOrder: number;
  isPremium: boolean;
  isAiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CharacterResponseDto {
  id: string;
  storyId: string;
  premiseId: string;
  name: string;
  roleLabel: string;
  narrativeFunction: NarrativeFunction;
  description: string | null;
  personality: string | null;
  motivation: string | null;
  secret: string | null;
  relationshipToPlayer: string | null;
  initialGoal: string | null;
  conflictPotential: string | null;
  visualPrompt: string | null;
  imageUrl: string | null;
  imageGenerationStatus: string;
  imageError: string | null;
  imageFallback: ProceduralVisualDto;
  sortOrder: number;
  isPremium: boolean;
  isAiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ProceduralVisualDto {
  kind: 'procedural';
  seed: string;
  palette: string[];
  symbol: string;
  texture: string;
  title?: string;
  subtitle?: string;
}
