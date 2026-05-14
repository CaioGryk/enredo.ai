import { Injectable } from '@nestjs/common';
import { ReadingOrchestratorService } from './reading-orchestrator.service';
import { ModerationService } from '@modules/moderation/moderation.service';
import { 
  StartReadingDto, 
  SendActionDto, 
  ReadingStatusDto, 
  GetSessionsDto,
  SessionListResponseDto,
} from './dto/reading.dto';
import { throwReadingError, ReadingErrorCode } from './application/reading-errors';

@Injectable()
export class ReadingService {
  constructor(
    private readonly orchestrator: ReadingOrchestratorService,
    private readonly moderationService: ModerationService,
  ) {}

  async startReading(userId: string, dto: StartReadingDto): Promise<ReadingStatusDto> {
    const moderationResult = this.moderationService.moderateUserAction(dto.storyId);
    if (!moderationResult.allowed) {
      throwReadingError('Reading action blocked by moderation.', ReadingErrorCode.INVALID_READING_ACTION, 400);
    }

    return this.orchestrator.startReading(userId, dto);
  }

  async getSession(userId: string, sessionId: string): Promise<ReadingStatusDto> {
    return this.orchestrator.getSessionWithStatus(userId, sessionId);
  }

  async sendAction(userId: string, sessionId: string, dto: SendActionDto): Promise<ReadingStatusDto> {
    const moderationResult = this.moderationService.moderateUserAction(dto.action);
    if (!moderationResult.allowed) {
      throwReadingError('Reading action blocked by moderation.', ReadingErrorCode.INVALID_READING_ACTION, 400);
    }

    return this.orchestrator.sendAction(userId, sessionId, {
      ...dto,
      action: moderationResult.sanitizedText,
    });
  }

  async getUserSessions(userId: string, query: GetSessionsDto): Promise<SessionListResponseDto> {
    return this.orchestrator.getUserSessions(userId, query);
  }

  async abandonSession(userId: string, sessionId: string): Promise<void> {
    return this.orchestrator.abandonSession(userId, sessionId);
  }
}
