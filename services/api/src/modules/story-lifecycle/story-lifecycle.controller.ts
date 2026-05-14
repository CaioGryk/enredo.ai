import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { StoryLifecycleService } from './story-lifecycle.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';

@Controller('story-lifecycle')
@UseGuards(JwtAuthGuard)
export class StoryLifecycleController {
  constructor(private readonly lifecycleService: StoryLifecycleService) {}

  @Get('my')
  async getMyStories(@CurrentUser('id') userId: string) {
    return this.lifecycleService.getMyStories(userId);
  }

  @Get(':storyId/status')
  async getStoryStatus(@CurrentUser('id') userId: string, @Param('storyId') storyId: string) {
    return this.lifecycleService.getStoryStatus(userId, storyId);
  }

  @Post('')
  async createStory(@CurrentUser('id') userId: string, @Body() dto: CreateStoryDto) {
    return this.lifecycleService.createStory(userId, dto);
  }

  @Patch(':storyId')
  async updateStory(
    @CurrentUser('id') userId: string,
    @Param('storyId') storyId: string,
    @Body() dto: UpdateStoryDto,
  ) {
    return this.lifecycleService.updateStory(userId, storyId, dto);
  }

  @Post(':storyId/submit')
  async submitStory(
    @CurrentUser('id') userId: string,
    @Param('storyId') storyId: string,
    @Body() body?: { note?: string },
  ) {
    return this.lifecycleService.submitStory(userId, storyId, body?.note);
  }
}
