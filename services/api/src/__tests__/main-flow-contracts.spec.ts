import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SceneMediaService } from '@modules/scene-media/scene-media.service';
import { AdminSceneMediaService } from '@modules/admin/scene-media-moderation/admin-scene-media.service';
import { ReadingOrchestratorService } from '@modules/reading/reading-orchestrator.service';
import { NarrativeEngine } from '@modules/reading/narrative/narrative-engine.service';
import { StoryQualityService } from '@modules/story-quality/story-quality.service';
import { PrismaService } from '@common/prisma.service';
import { BadRequestException, HttpException } from '@nestjs/common';
import { SceneVisibility, SceneModerationStatus, SceneMediaType, SubscriptionType, ReadingSessionStatus } from '@prisma/client';
import { BillingService } from '@modules/billing/billing.service';
import { ImageGenerationService } from '@modules/ai/image-generation.service';
import { VideoGenerationService } from '@modules/ai/video-generation.service';
import { ModerationService } from '@modules/moderation/moderation.service';

describe('Main Flow Contracts', () => {
  let sceneMediaService: SceneMediaService;
  let adminService: AdminSceneMediaService;
  let readingService: ReadingOrchestratorService;
  let prisma: any;

  const mockPrismaService: any = {
    sceneMedia: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn(),
      findFirst: jest.fn(),
    },
    sceneMediaLike: { upsert: jest.fn(), deleteMany: jest.fn() },
    sceneMediaSave: { upsert: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    sceneMediaShare: { create: jest.fn() },
    sceneMediaComment: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    sceneMediaReport: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    story: { findUnique: jest.fn() },
    readingSession: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    narrativeEvent: { create: jest.fn(), findMany: jest.fn() },
    narrativeMemory: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    modelUsage: { create: jest.fn() },
    dailyUsageLimit: { findUnique: jest.fn(), upsert: jest.fn() },
    adEvent: { create: jest.fn() },
    storyPremise: { findUnique: jest.fn(), findFirst: jest.fn() },
    storyPlayableCharacter: { findFirst: jest.fn() },
    creditWallet: { findUnique: jest.fn(), updateMany: jest.fn() },
    creditTransaction: { create: jest.fn() },
    $transaction: jest.fn(async (cb: any) => cb(mockPrismaService)),
  };

  const mockBilling = { getCreditWallet: jest.fn(), spendCredits: jest.fn() };
  const mockImage = { generateSceneImage: jest.fn() };
  const mockVideo = { generateVideo: jest.fn() };
  const mockNarrativeEngine = { generateScene: jest.fn() };
  const mockStoryQuality = { validateStoryQuality: jest.fn().mockResolvedValue(undefined) };
  const mockConfigService = { get: jest.fn().mockReturnValue(false) };

  beforeEach(async () => {
    const m: TestingModule = await Test.createTestingModule({
      providers: [
        SceneMediaService, AdminSceneMediaService,
        ReadingOrchestratorService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NarrativeEngine, useValue: mockNarrativeEngine },
        { provide: StoryQualityService, useValue: mockStoryQuality },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BillingService, useValue: mockBilling },
        { provide: ImageGenerationService, useValue: mockImage },
        { provide: VideoGenerationService, useValue: mockVideo },
        { provide: ModerationService, useValue: { moderateComment: jest.fn().mockReturnValue({ allowed: true, sanitizedText: 'ok' }), moderateReportReason: jest.fn().mockReturnValue({ allowed: true, sanitizedText: 'ok' }) } },
      ],
    }).compile();
    sceneMediaService = m.get(SceneMediaService);
    adminService = m.get(AdminSceneMediaService);
    readingService = m.get(ReadingOrchestratorService);
    prisma = mockPrismaService;
    jest.clearAllMocks();
  });

  const approvedMedia = {
    id: 'sm-1', userId: 'usr', narrativeEventId: null, storyId: null,
    visibility: SceneVisibility.PUBLIC, moderationStatus: SceneModerationStatus.APPROVED,
    title: null, caption: null, textExcerpt: null, imageUrl: null,
    videoUrl: null, thumbnailUrl: null, mediaType: SceneMediaType.IMAGE,
    moderationNote: null, publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    _count: { likes: 0, saves: 0, shares: 0, comments: 0 },
    story: null, user: { id: 'usr', name: 'U' }, narrativeEvent: null,
  };

  describe('A. Reading contract', () => {
    it('currentScene.id included after first-scene start', async () => {
      jest.spyOn(readingService as any, 'getStoryWithPremises').mockResolvedValue({
        id: 's-1', title: 'S', synopsis: 'A test synopsis', genres: ['a'], tone: 'n', styleGuide: '', worldRules: '', openingScene: '', basePrompt: '', visibility: 'PUBLIC', moderationStatus: 'APPROVED', isPremium: false, characters: [], premises: [],
      });
      jest.spyOn(readingService as any, 'getUserWithSubscription').mockResolvedValue({ id: 'u-1', subscription: { type: SubscriptionType.PREMIUM }, creditWallet: { balance: 0 } });
      jest.spyOn(readingService as any, 'getOrCreateDailyLimit').mockResolvedValue({ id: 'dl', freeInteractionsUsed: 0, limit: 10 });
      jest.spyOn(readingService as any, 'findActiveSession').mockResolvedValue({ id: 'ses-1', userId: 'u-1', storyId: 's-1', status: ReadingSessionStatus.ACTIVE, currentChapter: 1, currentSceneIndex: 0 });
      jest.spyOn(readingService as any, 'assertCanAccessStory').mockImplementation(() => {});
      jest.spyOn(readingService as any, 'getSessionEvents').mockResolvedValue([]);
      jest.spyOn(readingService as any, 'generateFirstScene').mockResolvedValue({ id: 'evt-99', chapterNumber: 1, sceneIndex: 0, sceneText: 'Scene', choices: ['A'] });

      const result = await readingService.startReading('u-1', { storyId: 's-1' });
      expect(result.session.currentScene.id).toBe('evt-99');
    });

    it('sendAction returns newest event id in currentScene.id', async () => {
      jest.spyOn(readingService as any, 'getSessionWithStory').mockResolvedValue({
        id: 'ses-1',
        userId: 'u-1',
        storyId: 's-1',
        status: ReadingSessionStatus.ACTIVE,
        currentChapter: 1,
        currentSceneIndex: 1,
        selectedPremiseId: null,
        selectedCharacterId: null,
        protagonistName: null,
        protagonistRole: null,
        story: { id: 's-1', visibility: 'PUBLIC', moderationStatus: 'APPROVED' },
      });
      jest.spyOn(readingService as any, 'assertCanAccessStory').mockImplementation(() => {});
      jest.spyOn(readingService as any, 'getUserWithSubscription').mockResolvedValue({
        id: 'u-1',
        subscription: { type: SubscriptionType.PREMIUM },
        creditWallet: { balance: 0 },
      });
      jest.spyOn(readingService as any, 'getOrCreateDailyLimit').mockResolvedValue({ id: 'dl', freeInteractionsUsed: 1, limit: 10 });
      (readingService as any).budgetGuard = {
        decide: jest.fn().mockReturnValue({
          allowed: true,
          finalModel: { id: 'gpt-4.1-nano', tier: 'PREMIUM' },
          budgetTier: 'PREMIUM',
          blockReason: null,
        }),
      };
      jest.spyOn(readingService as any, 'isFreeLlmOnly').mockReturnValue(false);
      jest.spyOn(readingService as any, 'generateNextScene').mockResolvedValue({
        sceneText: 'Newest scene text',
        suggestedActions: ['Choice A'],
        sceneMetadata: { emotion: 'tense' },
        session: { currentSceneIndex: 2 },
        adPlacement: null,
      });
      jest.spyOn(readingService as any, 'getSessionEvents').mockResolvedValue([
        { id: 'event-latest', sceneIndex: 2, sceneText: 'Newest scene text', choices: ['Choice A'] },
        { id: 'event-older', sceneIndex: 1, sceneText: 'Older scene text', choices: ['Continue'] },
        { id: 'event-oldest', sceneIndex: 0, sceneText: 'Oldest scene text', choices: ['Begin'] },
      ]);

      const result = await readingService.sendAction('u-1', 'ses-1', {
        action: 'Look around',
        actionType: 'FREE_TEXT',
      });

      expect(result.session.currentScene.id).toBe('event-latest');
      expect(result.session.currentScene.id).not.toBe('event-oldest');
      expect(result.session.currentScene.sceneText).toBe('Newest scene text');
    });

    it('currentScene includes userAction from the event that generated it', async () => {
      jest.spyOn(readingService as any, 'getSessionWithStory').mockResolvedValue({
        id: 'ses-1', userId: 'u-1', storyId: 's-1', status: ReadingSessionStatus.ACTIVE,
        currentChapter: 1, currentSceneIndex: 1,
        selectedPremiseId: null, selectedCharacterId: null,
        protagonistName: null, protagonistRole: null,
        story: { id: 's-1', visibility: 'PUBLIC', moderationStatus: 'APPROVED' },
      });
      jest.spyOn(readingService as any, 'assertCanAccessStory').mockImplementation(() => {});
      jest.spyOn(readingService as any, 'getUserWithSubscription').mockResolvedValue({
        id: 'u-1', subscription: { type: SubscriptionType.PREMIUM }, creditWallet: { balance: 0 },
      });
      jest.spyOn(readingService as any, 'getOrCreateDailyLimit').mockResolvedValue({ id: 'dl', freeInteractionsUsed: 1, limit: 10 });
      (readingService as any).budgetGuard = { decide: jest.fn().mockReturnValue({ allowed: true, finalModel: { id: 'groq/free', tier: 'FREE' }, budgetTier: 'FREE', blockReason: null }) };
      jest.spyOn(readingService as any, 'isFreeLlmOnly').mockReturnValue(true);
      jest.spyOn(readingService as any, 'generateNextScene').mockResolvedValue({
        sceneText: 'Scene text', suggestedActions: ['Go'], sceneMetadata: {}, session: { currentSceneIndex: 1 }, adPlacement: null,
      });
      jest.spyOn(readingService as any, 'getSessionEvents').mockResolvedValue([
        { id: 'ev-1', sceneIndex: 1, userAction: 'Look around', userActionType: 'FREE_TEXT', sceneText: 'Scene text', choices: ['Go'] },
        { id: 'ev-0', sceneIndex: 0, userAction: 'Início da história', userActionType: 'FREE_TEXT', sceneText: 'First', choices: ['Start'] },
      ]);
      jest.spyOn(readingService as any, 'getEffectiveNarrativePolicy').mockResolvedValue(undefined);

      const result = await readingService.sendAction('u-1', 'ses-1', { action: 'Look around', actionType: 'FREE_TEXT' });

      expect(result.session.currentScene.userAction).toBe('Look around');
      expect(result.session.currentScene.userActionType).toBe('FREE_TEXT');
      expect(result.session.history[0].userAction).toBe('Início da história');
    });

    it('creditsRemaining always numeric in reading response', () => {
      const formatUsage = (readingService as any).formatUsage;
      const usage = formatUsage({ freeInteractionsUsed: 3, limit: 10 }, 8);
      expect(typeof usage.creditsRemaining).toBe('number');
      expect(usage.creditsRemaining).toBe(8);
    });
  });

  describe('B. Credits/model access', () => {
    it('model access denied via GenerationBudgetGuard from reading orchestrator', async () => {
      jest.spyOn(readingService as any, 'getUserWithSubscription').mockResolvedValue({ id: 'u-free', subscription: { type: SubscriptionType.FREE }, creditWallet: { balance: 0 } });
      jest.spyOn(readingService as any, 'getStoryWithPremises').mockResolvedValue({ id: 's-1', title: 'S', synopsis: 'syn', genres: ['a'], tone: 'n', styleGuide: '', worldRules: '', openingScene: '', basePrompt: '', visibility: 'PUBLIC', moderationStatus: 'APPROVED', isPremium: false, characters: [], premises: [] });
      jest.spyOn(readingService as any, 'getOrCreateDailyLimit').mockResolvedValue({ id: 'dl', freeInteractionsUsed: 5, limit: 10 });
      jest.spyOn(readingService as any, 'findActiveSession').mockResolvedValue(null);
      jest.spyOn(readingService as any, 'assertCanAccessStory').mockImplementation(() => {});

      (readingService as any).budgetGuard = { decide: jest.fn().mockReturnValue({ allowed: false, finalModel: { id: 'credits-model', tier: 'CREDITS' }, budgetTier: 'CREDITS', blockReason: 'INSUFFICIENT_CREDITS' }) };
      jest.spyOn(readingService as any, 'isFreeLlmOnly').mockReturnValue(false);

      // Budget denied -> exception should be thrown before any scene generation
      try {
        await readingService.startReading('u-free', { storyId: 's-1' });
        throw new Error('Expected startReading to fail with INSUFFICIENT_CREDITS');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(402);
        expect((error as HttpException).getResponse()).toMatchObject({ error: 'INSUFFICIENT_CREDITS' });
      }
      expect(mockNarrativeEngine.generateScene).not.toHaveBeenCalled();
    });
  });

  describe('C. Library DTO safety', () => {
    it('feed DTO excludes email, passwordHash, basePrompt, styleGuide, worldRules', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([{
        id: 'sm-1', storyId: 's-1', narrativeEventId: null, mediaType: 'IMAGE',
        imageUrl: 'i.png', videoUrl: null, thumbnailUrl: null, textExcerpt: 'E', title: null, caption: null,
        publishedAt: new Date(), createdAt: new Date(),
        _count: { likes: 0, saves: 0, shares: 0, comments: 0 },
        story: { id: 's-1', title: 'S', coverUrl: null, genres: [] },
        user: { id: 'u', name: 'U', email: 'leak@x.com', passwordHash: 's' },
      }]);
      prisma.sceneMedia.count.mockResolvedValue(1);
      const dto = (await sceneMediaService.getFeed({})).data[0];
      expect((dto.user as any).email).toBeUndefined();
      expect((dto.user as any).passwordHash).toBeUndefined();
      expect((dto as any).basePrompt).toBeUndefined();
      expect((dto as any).styleGuide).toBeUndefined();
      expect((dto as any).worldRules).toBeUndefined();
    });
  });

  describe('D. Social privacy', () => {
    it('feed filters PUBLIC + APPROVED + publishedAt', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);
      prisma.sceneMedia.count.mockResolvedValue(0);
      await sceneMediaService.getFeed({});
      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: { not: null }, adultContentGenerated: false } }));
    });

    it('saved filters via sceneMedia relation', async () => {
      prisma.sceneMediaSave.findMany.mockResolvedValue([]);
      prisma.sceneMediaSave.count.mockResolvedValue(0);
      await sceneMediaService.getSaved('usr', {});
      expect(prisma.sceneMediaSave.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ sceneMedia: { visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: { not: null }, adultContentGenerated: false } }) }));
    });

    it('private media rejected for engagement', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-1', visibility: 'PRIVATE', moderationStatus: 'NOT_SUBMITTED', publishedAt: null });
      await expect(sceneMediaService.likeSceneMedia('usr', 'sm-1')).rejects.toThrow(BadRequestException);
    });

    it('approved media without publishedAt is rejected for engagement', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({
        id: 'sm-1',
        visibility: 'PUBLIC',
        moderationStatus: 'APPROVED',
        publishedAt: null,
      });

      await expect(sceneMediaService.likeSceneMedia('usr', 'sm-1')).rejects.toThrow('not available for engagement');
    });
  });

  describe('E. Admin moderation contract', () => {
    it('approve sets APPROVED + PUBLIC + publishedAt', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-1', moderationStatus: 'PENDING' });
      prisma.sceneMedia.update.mockResolvedValue(approvedMedia);
      const r = await adminService.approve('sm-1');
      expect(r.moderationStatus).toBe('APPROVED');
      expect(r.visibility).toBe('PUBLIC');
      expect(r.publishedAt).not.toBeNull();
    });

    it('admin DTO excludes email, passwordHash, basePrompt', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([{ ...approvedMedia, moderationStatus: 'PENDING', user: { id: 'u', name: 'U', email: 'leak@x.com', passwordHash: 's' } }]);
      prisma.sceneMedia.count.mockResolvedValue(1);
      const dto = (await adminService.listForModeration({})).data[0];
      expect((dto.user as any).email).toBeUndefined();
      expect((dto.user as any).passwordHash).toBeUndefined();
      expect((dto as any).basePrompt).toBeUndefined();
    });

    it('non-PENDING rejected for approval', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-1', moderationStatus: 'APPROVED' });
      await expect(adminService.approve('sm-1')).rejects.toThrow(BadRequestException);
    });
  });
});
