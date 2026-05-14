import { ApiProperty } from '@nestjs/swagger';

export class UpdateStoryDto {
  @ApiProperty({ description: 'Story title', required: false })
  title?: string;

  @ApiProperty({ description: 'Story synopsis', required: false })
  synopsis?: string;

  @ApiProperty({ description: 'Story genres', required: false })
  genres?: string[];

  @ApiProperty({ description: 'Opening scene text', required: false })
  openingScene?: string;

  @ApiProperty({ description: 'Story language', required: false })
  language?: string;

  @ApiProperty({ description: 'Maturity rating', required: false })
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
