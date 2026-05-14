import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SceneMediaService } from './scene-media.service';
import { FeedSceneMediaPaginationDto } from './dto/feed-scene-media.dto';

@ApiTags('scene-media-feed')
@Controller('scene-media/feed')
export class SceneMediaFeedController {
  constructor(private readonly sceneMediaService: SceneMediaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List approved public scene media for the social feed' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated feed items', type: FeedSceneMediaPaginationDto })
  async getFeed(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<FeedSceneMediaPaginationDto> {
    return this.sceneMediaService.getFeed({ page, limit });
  }
}
