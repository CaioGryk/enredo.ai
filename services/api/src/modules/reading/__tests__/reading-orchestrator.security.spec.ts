import { ReadingOrchestratorService } from '../reading-orchestrator.service';
import { NarrativeEngine } from '../narrative/narrative-engine.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { StoryVisibility, StoryModerationStatus, ReadingSessionStatus } from '@prisma/client';

describe('ReadingOrchestratorService - Security (Private Story Access)', () => {
  let service: ReadingOrchestratorService;
  let storyQualityService: jest.Mocked<StoryQualityService>;

  beforeEach(() => {
    storyQualityService = {
      validateStoryQuality: jest.fn(() => Promise.resolve()),
    } as any;

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

    service = new ReadingOrchestratorService(
      storyQualityService,
      mockNarrativeEngine as any,
      mockPrisma as any,
      mockConfigService as any,
    );
    jest.clearAllMocks();
  });

  describe('assertCanAccessStory', () => {
    const publicApprovedStory = {
      id: 'story-1',
      visibility: StoryVisibility.PUBLIC,
      moderationStatus: StoryModerationStatus.APPROVED,
      creatorUserId: null,
    };

    const privateStoryCreator = {
      id: 'story-2',
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
      creatorUserId: 'creator-1',
    };

    const privateStoryOther = {
      id: 'story-3',
      visibility: StoryVisibility.PRIVATE,
      moderationStatus: StoryModerationStatus.NOT_SUBMITTED,
      creatorUserId: 'other-user',
    };

    it('should allow access to PUBLIC+APPROVED story for any user', () => {
      expect(() => {
        service['assertCanAccessStory'](publicApprovedStory, 'user-1');
      }).not.toThrow();
    });

    it('should allow creator to access PRIVATE story', () => {
      expect(() => {
        service['assertCanAccessStory'](privateStoryCreator, 'creator-1');
      }).not.toThrow();
    });

    it('should throw Error for non-creator accessing PRIVATE story', () => {
      expect(() => {
        service['assertCanAccessStory'](privateStoryOther, 'creator-1');
      }).toThrow('You do not have access to this story');
    });

    it('should throw Error for unauthenticated user accessing PRIVATE story', () => {
      expect(() => {
        service['assertCanAccessStory'](privateStoryOther, undefined as any);
      }).toThrow('You do not have access to this story');
    });

    it('should allow access to PUBLIC+APPROVED story with undefined userId', () => {
      expect(() => {
        service['assertCanAccessStory'](publicApprovedStory, undefined as any);
      }).not.toThrow();
    });

    it('should allow access to PUBLIC+APPROVED story with null creatorUserId', () => {
      expect(() => {
        service['assertCanAccessStory'](publicApprovedStory, 'user-1');
      }).not.toThrow();
    });
  });
});
