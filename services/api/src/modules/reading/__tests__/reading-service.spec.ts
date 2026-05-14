import { ReadingService } from '../reading.service';
import { ReadingOrchestratorService } from '../reading-orchestrator.service';
import { NarrativeEngine } from '../narrative/narrative-engine.service';
import { ModerationService } from '@modules/moderation/moderation.service';
import { HttpException } from '@nestjs/common';
import { SubscriptionType, ReadingSessionStatus, UserActionType } from '@prisma/client';

jest.mock('../reading-orchestrator.service');

describe('ReadingService', () => {
  let readingService: ReadingService;
  let orchestratorService: jest.Mocked<ReadingOrchestratorService>;
  let moderationService: any;

  beforeEach(() => {
    const mockStoryQuality = {
      validateStoryQuality: jest.fn(() => Promise.resolve()),
    };

    const mockNarrativeEngine = {
      generateScene: jest.fn(),
    };

    const mockPrisma = {
      storyPremise: { findUnique: jest.fn() },
      storyPlayableCharacter: { findFirst: jest.fn() },
      narrativeMemory: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
      narrativeEvent: { create: jest.fn(), findMany: jest.fn() },
      readingSession: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      modelUsage: { create: jest.fn() },
      dailyUsageLimit: { findUnique: jest.fn(), update: jest.fn(), upsert: jest.fn() },
      adEvent: { create: jest.fn() },
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(false),
    };

    orchestratorService = new ReadingOrchestratorService(
      mockStoryQuality as any,
      mockNarrativeEngine as any,
      mockPrisma as any,
      mockConfigService as any,
    ) as jest.Mocked<ReadingOrchestratorService>;
    
    moderationService = {
      moderateUserAction: jest.fn().mockReturnValue({
        allowed: true,
        sanitizedText: 'test action',
      }),
    };

    readingService = new ReadingService(
      orchestratorService,
      moderationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startReading', () => {
    it('should delegate to orchestrator.startReading', async () => {
      const userId = 'user-1';
      const storyId = 'story-4';

      orchestratorService.startReading.mockResolvedValue({
        session: { id: 'session-1' },
        usage: { dailyLimit: 10, dailyUsed: 1 },
      });

      const result = await readingService.startReading(userId, { storyId });

      expect(orchestratorService.startReading).toHaveBeenCalledWith(userId, { storyId });
      expect(result.session.id).toBe('session-1');
    });

    it('should throw if moderation blocks', async () => {
      const userId = 'user-1';
      const storyId = 'story-4';

      moderationService.moderateUserAction.mockReturnValue({
        allowed: false,
        reason: 'blocked',
        flags: [],
      });

      await expect(
        readingService.startReading(userId, { storyId })
      ).rejects.toThrow('Reading action blocked by moderation.');
    });

    it('should reject with HttpException status 400 and INVALID_READING_ACTION code when moderation blocks', async () => {
      const userId = 'user-1';
      const storyId = 'story-4';

      moderationService.moderateUserAction.mockReturnValue({
        allowed: false,
        reason: 'blocked',
        flags: [],
      });

      try {
        await readingService.startReading(userId, { storyId });
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(400);
        expect((error as HttpException).getResponse()).toMatchObject({
          error: 'INVALID_READING_ACTION',
        });
      }
    });
  });

  describe('getSession', () => {
    it('should delegate to orchestrator.getSessionWithStatus', async () => {
      const userId = 'user-1';
      const sessionId = 'session-1';

      orchestratorService.getSessionWithStatus.mockResolvedValue({
        session: { id: sessionId },
        usage: { dailyLimit: 10, dailyUsed: 1 },
      });

      const result = await readingService.getSession(userId, sessionId);

      expect(orchestratorService.getSessionWithStatus).toHaveBeenCalledWith(userId, sessionId);
      expect(result.session.id).toBe(sessionId);
    });
  });

  describe('sendAction', () => {
    it('should delegate to orchestrator.sendAction with sanitized text', async () => {
      const userId = 'user-1';
      const sessionId = 'session-1';

      orchestratorService.sendAction.mockResolvedValue({
        session: { id: sessionId, currentScene: { sceneText: 'Test scene' } },
        usage: { dailyLimit: 10, dailyUsed: 1 },
      });

      moderationService.moderateUserAction.mockReturnValue({
        allowed: true,
        sanitizedText: 'sanitized action',
      });

      const result = await readingService.sendAction(userId, sessionId, {
        action: 'original action',
        actionType: UserActionType.CHOICE,
      });

      expect(orchestratorService.sendAction).toHaveBeenCalledWith(userId, sessionId, {
        action: 'sanitized action',
        actionType: UserActionType.CHOICE,
      });
      expect(result.session.currentScene.sceneText).toBe('Test scene');
    });

    it('should throw if moderation blocks', async () => {
      const userId = 'user-1';
      const sessionId = 'session-1';

      moderationService.moderateUserAction.mockReturnValue({
        allowed: false,
        reason: 'blocked',
        flags: [],
      });

      await expect(
        readingService.sendAction(userId, sessionId, {
          action: 'bad action',
          actionType: UserActionType.CHOICE,
        })
      ).rejects.toThrow('Reading action blocked by moderation.');
    });

    it('should reject with HttpException status 400 and INVALID_READING_ACTION code when sendAction moderation blocks', async () => {
      const userId = 'user-1';
      const sessionId = 'session-1';

      moderationService.moderateUserAction.mockReturnValue({
        allowed: false,
        reason: 'blocked',
        flags: [],
      });

      try {
        await readingService.sendAction(userId, sessionId, {
          action: 'bad action',
          actionType: UserActionType.CHOICE,
        });
        fail('Expected HttpException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(400);
        expect((error as HttpException).getResponse()).toMatchObject({
          error: 'INVALID_READING_ACTION',
        });
      }
    });
  });

  describe('getUserSessions', () => {
    it('should delegate to orchestrator.getUserSessions', async () => {
      const userId = 'user-1';

      orchestratorService.getUserSessions.mockResolvedValue({
        sessions: [{ id: 'session-1' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await readingService.getUserSessions(userId, {});

      expect(orchestratorService.getUserSessions).toHaveBeenCalledWith(userId, {});
      expect(result.sessions).toHaveLength(1);
    });
  });

  describe('abandonSession', () => {
    it('should delegate to orchestrator.abandonSession', async () => {
      const userId = 'user-1';
      const sessionId = 'session-1';

      orchestratorService.abandonSession.mockResolvedValue(undefined);

      await readingService.abandonSession(userId, sessionId);

      expect(orchestratorService.abandonSession).toHaveBeenCalledWith(userId, sessionId);
    });
  });

  describe('startReading with invalid USER_GENERATED story', () => {
    it('should throw BadRequestException for story with title too short', async () => {
      const userId = 'user-1';
      const storyId = 'story-invalid';

      orchestratorService.startReading.mockRejectedValue(
        new Error('Story does not meet minimum quality requirements')
      );

      await expect(
        readingService.startReading(userId, { storyId })
      ).rejects.toThrow('Story does not meet minimum quality requirements');
    });
  });
});
