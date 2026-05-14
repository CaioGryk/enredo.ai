import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SceneMediaService } from './scene-media.service';
import { SceneVisibility, SceneModerationStatus } from '@prisma/client';
import { CreateCommentDto, CommentDto, CommentListResponseDto } from './dto/comment.dto';
import { ReportDto, CreateReportDto } from './dto/report.dto';

@Controller('scene-media')
@UseGuards(JwtAuthGuard)
export class SceneMediaController {
  constructor(private readonly sceneMediaService: SceneMediaService) {}

  @Post('from-event/:narrativeEventId')
  async createFromEvent(
    @CurrentUser('id') userId: string,
    @Param('narrativeEventId') narrativeEventId: string,
  ) {
    return this.sceneMediaService.createFromNarrativeEvent(userId, narrativeEventId);
  }

  @Get('my')
  async getMySceneMedia(
    @CurrentUser('id') userId: string,
    @Query('visibility') visibility?: string,
    @Query('moderationStatus') moderationStatus?: string,
  ) {
    const filters: any = {};
    if (visibility && Object.values(SceneVisibility).includes(visibility as SceneVisibility)) {
      filters.visibility = visibility;
    }
    if (moderationStatus && Object.values(SceneModerationStatus).includes(moderationStatus as SceneModerationStatus)) {
      filters.moderationStatus = moderationStatus;
    }
    return this.sceneMediaService.getMySceneMedia(userId, filters);
  }

  @Get(':id')
  async getById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.sceneMediaService.getSceneMediaById(userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; caption?: string },
  ) {
    return this.sceneMediaService.updateSceneMedia(userId, id, body);
  }

  @Post(':id/submit')
  async submit(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body?: { note?: string },
  ) {
    return this.sceneMediaService.submitForModeration(userId, id, body?.note);
  }

  @Post(':id/generate-image')
  async generateImage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body?: { prompt?: string },
  ) {
    return this.sceneMediaService.generateImage(userId, id, body?.prompt);
  }

  @Post(':id/generate-video')
  async generateVideo(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body?: { prompt?: string },
  ) {
    return this.sceneMediaService.generateVideo(userId, id, body?.prompt);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async likeSceneMedia(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.sceneMediaService.likeSceneMedia(userId, id);
  }

  @Delete(':id/like')
  @HttpCode(HttpStatus.OK)
  async unlikeSceneMedia(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.sceneMediaService.unlikeSceneMedia(userId, id);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  async saveSceneMedia(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.sceneMediaService.saveSceneMedia(userId, id);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  async unsaveSceneMedia(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.sceneMediaService.unsaveSceneMedia(userId, id);
  }

  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  async shareSceneMedia(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.sceneMediaService.shareSceneMedia(userId, id);
  }

  @Get(':id/comments')
  @HttpCode(HttpStatus.OK)
  async listComments(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<CommentListResponseDto> {
    return this.sceneMediaService.listComments(id, { page, limit });
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return this.sceneMediaService.createComment(userId, id, dto);
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  async reportSceneMedia(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateReportDto,
  ): Promise<ReportDto> {
    return this.sceneMediaService.reportSceneMedia(userId, id, dto);
  }

  @Post('comments/:commentId/report')
  @HttpCode(HttpStatus.CREATED)
  async reportComment(
    @CurrentUser('id') userId: string,
    @Param('commentId') commentId: string,
    @Body() dto: CreateReportDto,
  ): Promise<ReportDto> {
    return this.sceneMediaService.reportComment(userId, commentId, dto);
  }
}
