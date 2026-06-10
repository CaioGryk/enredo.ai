import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CreateStoryGenerationDto } from './dto/create-story-generation.dto';
import { StoryGenerationResponseDto } from './dto/story-generation-response.dto';
import { StoryGenerationService } from './story-generation.service';

@ApiTags('story-generation')
@Controller('story-generation')
@UseGuards(JwtAuthGuard)
export class StoryGenerationController {
  constructor(private readonly storyGenerationService: StoryGenerationService) {}

  @Post('generate')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a new story from keywords' })
  @ApiBody({ type: CreateStoryGenerationDto })
  @ApiResponse({
    status: 201,
    description: 'Story generated successfully',
    type: StoryGenerationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or generated draft' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Story creation limit reached or budget blocked' })
  @ApiResponse({ status: 500, description: 'Unexpected generation failure' })
  async generateStory(@CurrentUser('id') userId: string, @Body() dto: CreateStoryGenerationDto): Promise<StoryGenerationResponseDto> {
    return this.storyGenerationService.generateStory(userId, dto);
  }
}
