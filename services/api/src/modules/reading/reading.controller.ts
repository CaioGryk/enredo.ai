import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReadingService } from './reading.service';
import { 
  StartReadingDto, 
  SendActionDto, 
  ReadingStatusDto, 
  GetSessionsDto,
  SessionListResponseDto
} from './dto/reading.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('reading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reading')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Post('start')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new reading session' })
  @ApiResponse({ status: 201, description: 'Reading session started', type: ReadingStatusDto })
  @ApiResponse({ status: 404, description: 'Story not found' })
  @ApiResponse({ status: 402, description: 'Premium story requires subscription' })
  async startReading(
    @CurrentUser('id') userId: string,
    @Body() dto: StartReadingDto,
  ): Promise<ReadingStatusDto> {
    return this.readingService.startReading(userId, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all reading sessions for current user' })
  @ApiResponse({ status: 200, description: 'List of sessions', type: SessionListResponseDto })
  async getSessions(
    @CurrentUser('id') userId: string,
    @Query() query: GetSessionsDto,
  ): Promise<SessionListResponseDto> {
    return this.readingService.getUserSessions(userId, query);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a specific reading session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session details', type: ReadingStatusDto })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ): Promise<ReadingStatusDto> {
    return this.readingService.getSession(userId, sessionId);
  }

  @Post('sessions/:id/action')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an action in a reading session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Next scene generated', type: ReadingStatusDto })
  @ApiResponse({ status: 402, description: 'Daily limit reached' })
  async sendAction(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() dto: SendActionDto,
  ): Promise<ReadingStatusDto> {
    return this.readingService.sendAction(userId, sessionId, dto);
  }

  @Post('sessions/:id/abandon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Abandon a reading session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session abandoned' })
  async abandonSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ): Promise<{ message: string }> {
    await this.readingService.abandonSession(userId, sessionId);
    return { message: 'Session abandoned' };
  }
}