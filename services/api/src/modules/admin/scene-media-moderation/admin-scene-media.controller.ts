import { Controller, Get, Post, Param, Body, Query, UseGuards, DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators';
import { UserRole } from '@prisma/client';
import { AdminSceneMediaService } from './admin-scene-media.service';
import { AdminSceneMediaDto, AdminSceneMediaPaginationDto, AdminSceneMediaMetricsDto, AdminCommentPaginationDto, AdminCommentDto } from './dto/admin-scene-media.dto';
import { AdminReportPaginationDto } from '../../scene-media/dto/report.dto';
import { SceneMediaService } from '../../scene-media/scene-media.service';

@ApiTags('admin-scene-media')
@Controller('admin/scene-media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminSceneMediaController {
  constructor(
    private readonly adminService: AdminSceneMediaService,
    private readonly sceneMediaService: SceneMediaService,
  ) {}

  @Get('reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List reports (admin only)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'targetType', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listReports(
    @Query('status') status?: string,
    @Query('targetType') targetType?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<AdminReportPaginationDto> {
    return this.sceneMediaService.listReports({ status, targetType, page, limit });
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get moderation metrics (admin only)' })
  @ApiResponse({ status: 200, description: 'Moderation metrics', type: AdminSceneMediaMetricsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not admin)' })
  async getMetrics(): Promise<AdminSceneMediaMetricsDto> {
    return this.adminService.getMetrics();
  }

  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List scene media for moderation with filters (admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'NOT_SUBMITTED'] })
  @ApiQuery({ name: 'mediaType', required: false, enum: ['TEXT', 'IMAGE', 'VIDEO', 'ANIMATED'] })
  @ApiQuery({ name: 'storyId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'q', required: false, description: 'Search across title, caption, textExcerpt' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated scene media for moderation', type: AdminSceneMediaPaginationDto })
  @ApiResponse({ status: 400, description: 'Invalid filter value' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not admin)' })
  async listPending(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('status') status?: string,
    @Query('mediaType') mediaType?: string,
    @Query('storyId') storyId?: string,
    @Query('userId') userId?: string,
    @Query('q') q?: string,
  ): Promise<AdminSceneMediaPaginationDto> {
    return this.adminService.listForModeration({ page, limit, status, mediaType, storyId, userId, q });
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending scene media submission (admin only)' })
  @ApiResponse({ status: 200, description: 'Scene media approved and published', type: AdminSceneMediaDto })
  @ApiResponse({ status: 400, description: 'Media is not PENDING' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not admin)' })
  @ApiResponse({ status: 404, description: 'SceneMedia not found' })
  async approve(@Param('id') id: string): Promise<AdminSceneMediaDto> {
    return this.adminService.approve(id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending scene media submission (admin only)' })
  @ApiResponse({ status: 200, description: 'Scene media rejected', type: AdminSceneMediaDto })
  @ApiResponse({ status: 400, description: 'Media is not PENDING' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not admin)' })
  @ApiResponse({ status: 404, description: 'SceneMedia not found' })
  async reject(
    @Param('id') id: string,
    @Body() body?: { note?: string },
  ): Promise<AdminSceneMediaDto> {
    return this.adminService.reject(id, body?.note);
  }

  @Get('comments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List comments for moderation (admin only)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'sceneMediaId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listComments(
    @Query('status') status?: string,
    @Query('sceneMediaId') sceneMediaId?: string,
    @Query('userId') userId?: string,
    @Query('q') q?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<AdminCommentPaginationDto> {
    return this.adminService.listComments({ status, sceneMediaId, userId, q, page, limit });
  }

  @Post('comments/:commentId/hide')
  async hideComment(@Param('commentId') commentId: string): Promise<AdminCommentDto> {
    return this.adminService.hideComment(commentId);
  }

  @Post('comments/:commentId/remove')
  async removeComment(@Param('commentId') commentId: string): Promise<AdminCommentDto> {
    return this.adminService.removeComment(commentId);
  }

  @Post('comments/:commentId/restore')
  async restoreComment(@Param('commentId') commentId: string): Promise<AdminCommentDto> {
    return this.adminService.restoreComment(commentId);
  }
}
