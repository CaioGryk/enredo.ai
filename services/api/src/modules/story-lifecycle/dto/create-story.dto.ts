import { ApiProperty } from '@nestjs/swagger';

export class CreateStoryDto {
  @ApiProperty({ description: 'Story title', example: 'My New Story' })
  title: string;

  @ApiProperty({ description: 'Story synopsis', example: 'A great story about...' })
  synopsis: string;

  @ApiProperty({ description: 'Story genres', example: ['adventure', 'fantasy'] })
  genres: string[];

  @ApiProperty({ description: 'Opening scene text', example: 'It was a dark night...', required: false })
  openingScene?: string;

  @ApiProperty({ description: 'Story language', example: 'pt-BR', required: false })
  language?: string;

  @ApiProperty({ description: 'Maturity rating', example: '12+', required: false })
  maturityRating?: string;

  @ApiProperty({ description: 'Base prompt for AI', required: false })
  basePrompt?: string;

  @ApiProperty({ description: 'Story tone', required: false })
  tone?: string;

  @ApiProperty({ description: 'Style guide', required: false })
  styleGuide?: string;

  @ApiProperty({ description: 'World rules', required: false })
  worldRules?: string;
}
