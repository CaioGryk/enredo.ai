import { Controller, Get, Param, Query, UseGuards, Request, ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators';
import { UserRole } from '@prisma/client';
import { AdminStoryGenerationUsageService } from './admin-story-generation-usage.service';
import { AdminStoryGenerationUsageDto, AdminStoryGenerationUsagePaginationDto, AdminStoryGenerationMetricsDto } from './dto/admin-story-generation-usage.dto';

@ApiTags('admin-story-generation-usage')
@Controller('admin/story-generation/usage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminStoryGenerationUsageController {
  constructor(private readonly adminService: AdminStoryGenerationUsageService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List story generation usage records (admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: ['SUCCESS', 'FAILED', 'BLOCKED'] })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'storyId', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'modelId', required: false })
  @ApiQuery({ name: 'isMock', required: false, type: Boolean })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Paginated usage records', type: AdminStoryGenerationUsagePaginationDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not admin)' })
  async findAll(
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('storyId') storyId?: string,
    @Query('provider') provider?: string,
    @Query('modelId') modelId?: string,
    @Query('isMock') isMock?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('order') order?: 'asc' | 'desc',
  ): Promise<AdminStoryGenerationUsagePaginationDto> {
    return this.adminService.findAll({
      status: status as any,
      userId,
      storyId,
      provider,
      modelId,
      isMock: isMock !== undefined ? isMock === 'true' : undefined,
      from,
      to,
      page,
      limit,
      order,
    });
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get aggregated metrics for story generation usage (admin only)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'modelId', required: false })
  @ApiQuery({ name: 'isMock', required: false, type: Boolean })
  @ApiQuery({ name: 'status', required: false, enum: ['SUCCESS', 'FAILED', 'BLOCKED'] })
  @ApiResponse({ status: 200, description: 'Aggregated metrics', type: AdminStoryGenerationMetricsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not admin)' })
  async getMetrics(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('provider') provider?: string,
    @Query('modelId') modelId?: string,
    @Query('isMock') isMock?: string,
    @Query('status') status?: string,
  ): Promise<AdminStoryGenerationMetricsDto> {
    return this.adminService.getMetrics({
      from,
      to,
      provider,
      modelId,
      isMock: isMock !== undefined ? isMock === 'true' : undefined,
      status: status as any,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a story generation usage record by id (admin only)' })
  @ApiResponse({ status: 200, description: 'Usage record', type: AdminStoryGenerationUsageDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (not admin)' })
  @ApiResponse({ status: 404, description: 'Usage record not found' })
  async findOne(@Param('id') id: string): Promise<AdminStoryGenerationUsageDto> {
    return this.adminService.findOne(id);
  }
}
