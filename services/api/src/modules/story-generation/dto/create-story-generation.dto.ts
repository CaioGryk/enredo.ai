import { IsArray, IsString, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoryGenerationDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ApiProperty({
    description: 'Keywords for story generation',
    example: ['mistério', 'cidade futurista', 'memória perdida'],
  })
  keywords: string[];

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Story genre',
    example: 'ficção científica',
    required: false,
  })
  genre?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Story tone',
    example: 'cinematográfico',
    required: false,
  })
  tone?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Target audience',
    example: 'young adult',
    required: false,
  })
  targetAudience?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Narrative constraints',
    example: 'sem violência explícita',
    required: false,
  })
  constraints?: string;
}
