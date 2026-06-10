import { Test, TestingModule } from '@nestjs/testing';
import { SceneMediaService } from '../scene-media.service';
import { SceneMediaModule } from '../scene-media.module';
import { SceneMediaFeedController } from '../scene-media-feed.controller';
import { SceneMediaController } from '../scene-media.controller';
import { PrismaService } from '@common/prisma.service';
import { NotFoundException, ForbiddenException, ConflictException, BadRequestException, HttpException } from '@nestjs/common';
import { SceneVisibility, SceneModerationStatus, SceneMediaType, CreditTransactionReason, CommentModerationStatus } from '@prisma/client';
import { ModerationService } from '../../moderation/moderation.service';
import { BillingService } from '../../billing/billing.service';
import { ImageGenerationService } from '../../ai/image-generation.service';
import { VideoGenerationService } from '../../ai/video-generation.service';

describe('SceneMediaService', () => {
  let service: SceneMediaService;
  let prisma: any;
  let billingService: any;
  let imageGenService: any;
  let videoGenService: any;

  const mockPrismaService: any = {
    narrativeEvent: {
      findUnique: jest.fn(),
    },
    sceneMedia: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    creditWallet: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    creditTransaction: {
      create: jest.fn(),
    },
    sceneMediaLike: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    sceneMediaSave: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    sceneMediaShare: {
      create: jest.fn(),
    },
    sceneMediaComment: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    sceneMediaReport: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
  };

  const mockBillingService = {
    getCreditWallet: jest.fn(),
    spendCredits: jest.fn(),
  };

  const mockImageGenerationService = {
    generateSceneImage: jest.fn(),
  };

  const mockVideoGenerationService = {
    generateVideo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SceneMediaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: BillingService,
          useValue: mockBillingService,
        },
        {
          provide: ImageGenerationService,
          useValue: mockImageGenerationService,
        },
        {
          provide: VideoGenerationService,
          useValue: mockVideoGenerationService,
        },
        {
          provide: ModerationService,
          useClass: ModerationService,
        },
      ],
    }).compile();

    service = module.get<SceneMediaService>(SceneMediaService);
    prisma = mockPrismaService;
    billingService = mockBillingService;
    imageGenService = mockImageGenerationService;
    videoGenService = mockVideoGenerationService;
    jest.clearAllMocks();
  });

  describe('createFromNarrativeEvent', () => {
    it('should create SceneMedia from own NarrativeEvent', async () => {
      const mockEvent = {
        id: 'event-1',
        sceneText: 'Once upon a time...',
        adultContentGenerated: false,
        session: {
          userId: 'user-1',
          storyId: 'story-1',
        },
      };

      prisma.narrativeEvent.findUnique.mockResolvedValue(mockEvent);
      prisma.sceneMedia.findUnique.mockResolvedValue(null);
      prisma.sceneMedia.create.mockImplementation((args: any) => Promise.resolve({
        id: 'scene-media-1',
        ...args.data,
      }));

      const result = await service.createFromNarrativeEvent('user-1', 'event-1');

      expect(result.visibility).toBe(SceneVisibility.PRIVATE);
      expect(result.moderationStatus).toBe(SceneModerationStatus.NOT_SUBMITTED);
      expect(result.textExcerpt).toBe('Once upon a time...');
      expect(result.mediaType).toBe(SceneMediaType.TEXT);
      expect(result.adultContentGenerated).toBe(false);
    });

    it('should inherit adultContentGenerated from the NarrativeEvent', async () => {
      const mockEvent = {
        id: 'event-1',
        sceneText: 'Private adult-enabled scene',
        adultContentGenerated: true,
        session: {
          userId: 'user-1',
          storyId: 'story-1',
        },
      };

      prisma.narrativeEvent.findUnique.mockResolvedValue(mockEvent);
      prisma.sceneMedia.findUnique.mockResolvedValue(null);
      prisma.sceneMedia.create.mockImplementation((args: any) => Promise.resolve({
        id: 'scene-media-1',
        ...args.data,
      }));

      const result = await service.createFromNarrativeEvent('user-1', 'event-1');

      expect(result.adultContentGenerated).toBe(true);
      expect(prisma.sceneMedia.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ adultContentGenerated: true }),
      }));
    });

    it('should truncate textExcerpt to 500 characters', async () => {
      const longText = 'a'.repeat(1000);
      const mockEvent = {
        id: 'event-1',
        sceneText: longText,
        session: {
          userId: 'user-1',
          storyId: 'story-1',
        },
      };

      prisma.narrativeEvent.findUnique.mockResolvedValue(mockEvent);
      prisma.sceneMedia.findUnique.mockResolvedValue(null);
      prisma.sceneMedia.create.mockImplementation((args: any) => Promise.resolve({
        id: 'scene-media-1',
        ...args.data,
      }));

      const result = await service.createFromNarrativeEvent('user-1', 'event-1');

      expect(result.textExcerpt).toHaveLength(500);
    });

    it('should throw NotFoundException for non-existent NarrativeEvent', async () => {
      prisma.narrativeEvent.findUnique.mockResolvedValue(null);

      await expect(service.createFromNarrativeEvent('user-1', 'event-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for another user\'s NarrativeEvent', async () => {
      const mockEvent = {
        id: 'event-1',
        session: {
          userId: 'other-user',
        },
      };

      prisma.narrativeEvent.findUnique.mockResolvedValue(mockEvent);

      await expect(service.createFromNarrativeEvent('user-1', 'event-1'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException for duplicate SceneMedia', async () => {
      const mockEvent = {
        id: 'event-1',
        session: {
          userId: 'user-1',
          storyId: 'story-1',
        },
      };

      prisma.narrativeEvent.findUnique.mockResolvedValue(mockEvent);
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.createFromNarrativeEvent('user-1', 'event-1'))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('getMySceneMedia', () => {
    it('should return empty array when no SceneMedia', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);

      const result = await service.getMySceneMedia('user-1');

      expect(result).toEqual([]);
    });

    it('should return user\'s SceneMedia', async () => {
      const mockData = [
        { id: 'sm-1', userId: 'user-1' },
        { id: 'sm-2', userId: 'user-1' },
      ];

      prisma.sceneMedia.findMany.mockResolvedValue(mockData);

      const result = await service.getMySceneMedia('user-1');

      expect(result).toHaveLength(2);
    });

    it('should filter by visibility', async () => {
      await service.getMySceneMedia('user-1', { visibility: SceneVisibility.PRIVATE });

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ visibility: SceneVisibility.PRIVATE }),
        })
      );
    });

    it('should filter by moderationStatus', async () => {
      await service.getMySceneMedia('user-1', { moderationStatus: SceneModerationStatus.PENDING });

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ moderationStatus: SceneModerationStatus.PENDING }),
        })
      );
    });
  });

  describe('getSceneMediaById', () => {
    it('should return SceneMedia for owner', async () => {
      const mockData = { id: 'sm-1', userId: 'user-1' };
      prisma.sceneMedia.findUnique.mockResolvedValue(mockData);

      const result = await service.getSceneMediaById('user-1', 'sm-1');

      expect(result.id).toBe('sm-1');
    });

    it('should throw NotFoundException for non-existent SceneMedia', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(null);

      await expect(service.getSceneMediaById('user-1', 'sm-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for another user\'s SceneMedia', async () => {
      const mockData = { id: 'sm-1', userId: 'other-user' };
      prisma.sceneMedia.findUnique.mockResolvedValue(mockData);

      await expect(service.getSceneMediaById('user-1', 'sm-1'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateSceneMedia', () => {
    it('should update PRIVATE + NOT_SUBMITTED SceneMedia', async () => {
      const mockData = {
        id: 'sm-1',
        userId: 'user-1',
        visibility: SceneVisibility.PRIVATE,
        moderationStatus: SceneModerationStatus.NOT_SUBMITTED,
      };

      prisma.sceneMedia.findUnique.mockResolvedValue(mockData);
      prisma.sceneMedia.update.mockResolvedValue({ ...mockData, title: 'New Title' });

      const result = await service.updateSceneMedia('user-1', 'sm-1', { title: 'New Title' });

      expect(result.title).toBe('New Title');
    });

    it('should throw BadRequestException for PENDING SceneMedia', async () => {
      const mockData = {
        id: 'sm-1',
        userId: 'user-1',
        visibility: SceneVisibility.PRIVATE,
        moderationStatus: SceneModerationStatus.PENDING,
      };

      prisma.sceneMedia.findUnique.mockResolvedValue(mockData);

      await expect(service.updateSceneMedia('user-1', 'sm-1', { title: 'New' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('submitForModeration', () => {
    it('should submit PRIVATE + NOT_SUBMITTED SceneMedia', async () => {
      const mockData = {
        id: 'sm-1',
        userId: 'user-1',
        visibility: SceneVisibility.PRIVATE,
        moderationStatus: SceneModerationStatus.NOT_SUBMITTED,
        mediaType: SceneMediaType.IMAGE,
        imageUrl: 'https://example.com/image.png',
        videoUrl: null,
      };

      prisma.sceneMedia.findUnique.mockResolvedValue(mockData);
      prisma.sceneMedia.update.mockResolvedValue({
        ...mockData,
        moderationStatus: SceneModerationStatus.PENDING,
      });

      const result = await service.submitForModeration('user-1', 'sm-1');

      expect(result.moderationStatus).toBe(SceneModerationStatus.PENDING);
      expect(prisma.sceneMedia.update).toHaveBeenCalledWith({
        where: { id: 'sm-1' },
        data: {
          moderationStatus: SceneModerationStatus.PENDING,
          moderationNote: null,
        },
      });
    });

    it('should throw ForbiddenException if user does not own SceneMedia', async () => {
      const mockData = {
        id: 'sm-1',
        userId: 'other-user',
        visibility: SceneVisibility.PRIVATE,
        moderationStatus: SceneModerationStatus.NOT_SUBMITTED,
        mediaType: SceneMediaType.IMAGE,
        imageUrl: 'https://example.com/image.png',
        videoUrl: null,
      };

      prisma.sceneMedia.findUnique.mockResolvedValue(mockData);

      await expect(service.submitForModeration('user-1', 'sm-1'))
        .rejects.toThrow(ForbiddenException);
      expect(prisma.sceneMedia.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if already PENDING', async () => {
      const mockData = {
        id: 'sm-1',
        userId: 'user-1',
        visibility: SceneVisibility.PRIVATE,
        moderationStatus: SceneModerationStatus.PENDING,
      };

      prisma.sceneMedia.findUnique.mockResolvedValue(mockData);

      await expect(service.submitForModeration('user-1', 'sm-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if PUBLIC', async () => {
      const mockData = {
        id: 'sm-1',
        userId: 'user-1',
        visibility: SceneVisibility.PUBLIC,
        moderationStatus: SceneModerationStatus.APPROVED,
      };

      prisma.sceneMedia.findUnique.mockResolvedValue(mockData);

      await expect(service.submitForModeration('user-1', 'sm-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for TEXT-only media without image', async () => {
      const mockData = {
        id: 'sm-1',
        userId: 'user-1',
        visibility: SceneVisibility.PRIVATE,
        moderationStatus: SceneModerationStatus.NOT_SUBMITTED,
        mediaType: SceneMediaType.TEXT,
        imageUrl: null,
        videoUrl: null,
      };

      prisma.sceneMedia.findUnique.mockResolvedValue(mockData);

      await expect(service.submitForModeration('user-1', 'sm-1'))
        .rejects.toThrow(BadRequestException);
      expect(prisma.sceneMedia.update).not.toHaveBeenCalled();
    });
  });

  describe('generateImage', () => {
    const mockSceneMedia = {
      id: 'sm-1',
      userId: 'user-1',
      narrativeEventId: 'ne-1',
      storyId: 'story-1',
      textExcerpt: 'A bright scene',
    };

    it('should throw ForbiddenException if user does not own SceneMedia', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ ...mockSceneMedia, userId: 'other-user' });
      await expect(service.generateImage('user-1', 'sm-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw HttpException if insufficient credits before provider call', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMedia);
      billingService.getCreditWallet.mockResolvedValue({ balance: 0 }); // IMAGE costs 1

      await expect(service.generateImage('user-1', 'sm-1')).rejects.toThrow(HttpException);
      expect(imageGenService.generateSceneImage).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if generation fails and NOT start transaction', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMedia);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      imageGenService.generateSceneImage.mockResolvedValue({ success: false });

      await expect(service.generateImage('user-1', 'sm-1')).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw HttpException if wallet race condition occurs (updateMany count: 0) and NOT update sceneMedia', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMedia);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      imageGenService.generateSceneImage.mockResolvedValue({ success: true, imageUrl: 'http://img.png', provider: 'google' });
      
      // Inside transaction
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 1 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 0 }); // simulate race condition failure

      await expect(service.generateImage('user-1', 'sm-1')).rejects.toThrow(HttpException);
      expect(prisma.sceneMedia.update).not.toHaveBeenCalled();
    });

    it('should reject and NOT return success if sceneMedia.update fails inside transaction callback', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMedia);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      imageGenService.generateSceneImage.mockResolvedValue({ success: true, imageUrl: 'http://img.png' });
      
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.sceneMedia.update.mockRejectedValue(new Error('DB Error')); // simulate failure

      await expect(service.generateImage('user-1', 'sm-1')).rejects.toThrow('DB Error');
    });

    it('should execute full transaction on success with exact cost and enriched metadata', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMedia);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      imageGenService.generateSceneImage.mockResolvedValue({ success: true, imageUrl: 'http://img.png', provider: 'google' });
      
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.sceneMedia.update.mockResolvedValue({ ...mockSceneMedia, imageUrl: 'http://img.png', mediaType: SceneMediaType.IMAGE });

      const result = await service.generateImage('user-1', 'sm-1');

      // Assert transaction behavior
      expect(prisma.creditWallet.updateMany).toHaveBeenCalledWith({
        where: { id: 'wallet-1', balance: { gte: 1 } },
        data: { balance: { decrement: 1 } },
      });
      expect(prisma.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          type: 'SPEND',
          amount: -1,
          reason: CreditTransactionReason.IMAGE_GENERATION,
          metadata: {
            feature: 'SCENE_MEDIA',
            mediaType: 'IMAGE',
            sceneMediaId: 'sm-1',
            narrativeEventId: 'ne-1',
            storyId: 'story-1',
            provider: 'google',
          },
        },
      });
      expect(prisma.sceneMedia.update).toHaveBeenCalledWith({
        where: { id: 'sm-1' },
        data: { imageUrl: 'http://img.png', mediaType: SceneMediaType.IMAGE },
      });
      expect(result.imageUrl).toBe('http://img.png');
    });
  });

  describe('generateVideo', () => {
    const mockSceneMedia = {
      id: 'sm-1',
      userId: 'user-1',
      narrativeEventId: 'ne-1',
      storyId: 'story-1',
      textExcerpt: 'A dynamic scene',
    };

    const mockSceneMediaWithContext = {
      ...mockSceneMedia,
      narrativeEvent: {
        sceneIndex: 2,
        session: {
          story: { title: 'Test Story', slug: 'test-story', tone: 'dark' },
          selectedPremiseId: 'premise-1',
        },
      },
    };

    it('should throw HttpException if insufficient credits', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 4 }); // VIDEO costs 5

      await expect(service.generateVideo('user-1', 'sm-1')).rejects.toThrow(HttpException);
      expect(videoGenService.generateVideo).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if generation fails and not start transaction', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      videoGenService.generateVideo.mockResolvedValue({ success: false });

      await expect(service.generateVideo('user-1', 'sm-1')).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw HttpException if wallet race condition occurs (updateMany count: 0) and NOT update sceneMedia', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      videoGenService.generateVideo.mockResolvedValue({ success: true, videoUrl: 'http://vid.mp4', provider: 'google' });
      
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 5 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 0 }); // failure

      await expect(service.generateVideo('user-1', 'sm-1')).rejects.toThrow(HttpException);
      expect(prisma.sceneMedia.update).not.toHaveBeenCalled();
    });

    it('should execute full transaction on success with exact cost and enriched metadata', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      videoGenService.generateVideo.mockResolvedValue({
        success: true,
        videoUrl: 'http://vid.mp4',
        provider: 'kling',
        model: 'kling-v1-5',
        taskId: 'task-abc',
        durationSeconds: 5,
      });
      
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.sceneMedia.update.mockResolvedValue({ ...mockSceneMedia, videoUrl: 'http://vid.mp4', mediaType: SceneMediaType.VIDEO });

      const result = await service.generateVideo('user-1', 'sm-1');

      expect(prisma.creditWallet.updateMany).toHaveBeenCalledWith({
        where: { id: 'wallet-1', balance: { gte: 5 } },
        data: { balance: { decrement: 5 } },
      });
      expect(prisma.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          walletId: 'wallet-1',
          type: 'SPEND',
          amount: -5,
          reason: CreditTransactionReason.SCENE_GENERATION,
          metadata: {
            feature: 'SCENE_MEDIA',
            mediaType: 'VIDEO',
            cost: 5,
            sceneMediaId: 'sm-1',
            narrativeEventId: 'ne-1',
            storyId: 'story-1',
            provider: 'kling',
            model: 'kling-v1-5',
            taskId: 'task-abc',
            durationSeconds: 5,
          },
        },
      });
      expect(prisma.sceneMedia.update).toHaveBeenCalledWith({
        where: { id: 'sm-1' },
        data: { videoUrl: 'http://vid.mp4', mediaType: SceneMediaType.VIDEO },
      });
      expect(result.videoUrl).toBe('http://vid.mp4');
    });

    it('metadata must not include raw prompts, API keys, or appearance reference URLs', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      videoGenService.generateVideo.mockResolvedValue({
        success: true,
        videoUrl: 'http://vid.mp4',
        provider: 'kling',
        model: 'kling-v1-5',
      });
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.sceneMedia.update.mockResolvedValue({ ...mockSceneMedia, videoUrl: 'http://vid.mp4', mediaType: SceneMediaType.VIDEO });

      await service.generateVideo('user-1', 'sm-1');

      const callData = prisma.creditTransaction.create.mock.calls[0][0].data;
      const metadata = callData.metadata;
      const metaJson = JSON.stringify(metadata);
      expect(metaJson).not.toContain('sk-');
      expect(metaJson).not.toContain('Bearer');
      expect(metaJson).not.toContain('apiKey');
      expect(metaJson).not.toContain('prompt');
      expect(metaJson).not.toContain('appearanceReference');
      expect(metaJson).not.toContain('reference_image');
      expect(callData.amount).toBe(-5);
    });

    it('provider task creation failure (success=false) must NOT spend credits', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 50 });
      videoGenService.generateVideo.mockResolvedValue({ success: false, error: 'Kling API error' });

      await expect(service.generateVideo('user-1', 'sm-1')).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('provider polling timeout must NOT spend credits', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 50 });
      videoGenService.generateVideo.mockResolvedValue({
        success: false,
        error: 'Video generation timed out',
        message: 'Video generation is taking longer than expected.',
      });

      await expect(service.generateVideo('user-1', 'sm-1')).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('provider failed task status must NOT spend credits', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 50 });
      videoGenService.generateVideo.mockResolvedValue({
        success: false,
        error: 'Video generation task failed',
        message: 'The video generation task did not complete successfully.',
      });

      await expect(service.generateVideo('user-1', 'sm-1')).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('provider success without videoUrl must NOT spend credits', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 50 });
      videoGenService.generateVideo.mockResolvedValue({
        success: true,
        videoUrl: undefined,
        provider: 'kling',
      });

      await expect(service.generateVideo('user-1', 'sm-1')).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('sceneMedia.update failure inside transaction must propagate and roll back', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      videoGenService.generateVideo.mockResolvedValue({
        success: true,
        videoUrl: 'http://vid.mp4',
        provider: 'kling',
      });

      const wallet = { id: 'wallet-1', balance: 10 };
      prisma.creditWallet.findUnique.mockResolvedValue(wallet);
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.creditTransaction.create.mockResolvedValue({});
      const dbError = new Error('Database constraint violation');
      prisma.sceneMedia.update.mockRejectedValue(dbError);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        await fn({
          creditWallet: prisma.creditWallet,
          creditTransaction: prisma.creditTransaction,
          sceneMedia: prisma.sceneMedia,
        });
      });

      await expect(service.generateVideo('user-1', 'sm-1')).rejects.toThrow(dbError);
      expect(prisma.creditWallet.updateMany).toHaveBeenCalled();
      expect(prisma.creditTransaction.create).toHaveBeenCalled();
      expect(prisma.sceneMedia.update).toHaveBeenCalled();
    });

    it('should not include appearanceReference when appearanceOptIn is false', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      videoGenService.generateVideo.mockResolvedValue({ success: true, videoUrl: 'http://vid.mp4', provider: 'google' });
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.sceneMedia.update.mockResolvedValue({ ...mockSceneMedia, videoUrl: 'http://vid.mp4', mediaType: SceneMediaType.VIDEO });

      await service.generateVideo('user-1', 'sm-1', undefined, false);

      const callArgs = videoGenService.generateVideo.mock.calls[0][0];
      expect(callArgs.appearanceReference).toBeUndefined();
    });

    it('should not include appearanceReference when appearanceOptIn is true but no profile photo (deferred)', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      videoGenService.generateVideo.mockResolvedValue({ success: true, videoUrl: 'http://vid.mp4', provider: 'google' });
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.sceneMedia.update.mockResolvedValue({ ...mockSceneMedia, videoUrl: 'http://vid.mp4', mediaType: SceneMediaType.VIDEO });

      await service.generateVideo('user-1', 'sm-1', undefined, true);

      const callArgs = videoGenService.generateVideo.mock.calls[0][0];
      expect(callArgs.appearanceReference).toBeUndefined();
    });

    it('should include story/session context prompt in generation request', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      videoGenService.generateVideo.mockResolvedValue({ success: true, videoUrl: 'http://vid.mp4', provider: 'google' });
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.sceneMedia.update.mockResolvedValue({ ...mockSceneMedia, videoUrl: 'http://vid.mp4', mediaType: SceneMediaType.VIDEO });

      await service.generateVideo('user-1', 'sm-1');

      const callArgs = videoGenService.generateVideo.mock.calls[0][0];
      expect(callArgs.contextPrompt).toBeDefined();
      expect(callArgs.contextPrompt).toContain('Test Story');
      expect(callArgs.contextPrompt).toContain('premise-1');
      expect(callArgs.contextPrompt).toContain('dark');
      expect(callArgs.contextPrompt).toContain('A dynamic scene');
    });

    it('should not include appearanceConsent in metadata when appearanceOptIn is true (photo lookup deferred)', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      videoGenService.generateVideo.mockResolvedValue({ success: true, videoUrl: 'http://vid.mp4', provider: 'google' });
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.sceneMedia.update.mockResolvedValue({ ...mockSceneMedia, videoUrl: 'http://vid.mp4', mediaType: SceneMediaType.VIDEO });

      await service.generateVideo('user-1', 'sm-1', undefined, true);

      const txData = prisma.creditTransaction.create.mock.calls[0][0].data;
      expect(txData.metadata.appearanceConsent).toBeUndefined();
    });

    it('should not include appearanceConsent in metadata when appearanceOptIn is false', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue(mockSceneMediaWithContext);
      billingService.getCreditWallet.mockResolvedValue({ balance: 10 });
      videoGenService.generateVideo.mockResolvedValue({ success: true, videoUrl: 'http://vid.mp4', provider: 'google' });
      prisma.creditWallet.findUnique.mockResolvedValue({ id: 'wallet-1', balance: 10 });
      prisma.creditWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.sceneMedia.update.mockResolvedValue({ ...mockSceneMedia, videoUrl: 'http://vid.mp4', mediaType: SceneMediaType.VIDEO });

      await service.generateVideo('user-1', 'sm-1', undefined, false);

      const txData = prisma.creditTransaction.create.mock.calls[0][0].data;
      expect(txData.metadata.appearanceConsent).toBeUndefined();
    });
  });

  describe('getFeed', () => {
    const approvedMedia = {
      id: 'sm-feed-1',
      storyId: 'story-1',
      narrativeEventId: 'ne-1',
      visibility: SceneVisibility.PUBLIC,
      moderationStatus: SceneModerationStatus.APPROVED,
      mediaType: SceneMediaType.IMAGE,
      imageUrl: 'https://example.com/img.png',
      videoUrl: null,
      thumbnailUrl: null,
      textExcerpt: 'A scene excerpt',
      title: null,
      caption: null,
      publishedAt: new Date('2026-05-13'),
      createdAt: new Date('2026-05-01'),
      _count: { likes: 3, saves: 1, shares: 2 },
      story: { id: 'story-1', title: 'Test Story', coverUrl: 'https://cover.png', genres: ['adventure'] },
      user: { id: 'user-1', name: 'Test User' },
    };

    it('should return only PUBLIC + APPROVED media with publishedAt', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([approvedMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.getFeed({});

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            visibility: SceneVisibility.PUBLIC,
            moderationStatus: SceneModerationStatus.APPROVED,
            publishedAt: { not: null },
            adultContentGenerated: false,
          },
          orderBy: { publishedAt: 'desc' },
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].imageUrl).toBe('https://example.com/img.png');
    });

    it('should not expose prompts, basePrompt, or raw AI output', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([approvedMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.getFeed({});
      const dto = result.data[0];

      expect((dto as any).basePrompt).toBeUndefined();
      expect((dto as any).rawPrompt).toBeUndefined();
      expect((dto as any).providerDetails).toBeUndefined();
    });

    it('should not expose user wallet/credit or password data', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([approvedMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.getFeed({});
      const dto = result.data[0];

      expect((dto as any).creditWallet).toBeUndefined();
      expect((dto as any).passwordHash).toBeUndefined();
      if (dto.user) {
        expect((dto.user as any).email).toBeUndefined();
      }
    });

    it('should cap limit at 100', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);
      prisma.sceneMedia.count.mockResolvedValue(0);

      await service.getFeed({ limit: 200 });

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should order by publishedAt desc', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([approvedMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      await service.getFeed({});

      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { publishedAt: 'desc' } }),
      );
    });

    it('should only include story safe fields', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([approvedMedia]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.getFeed({});
      const dto = result.data[0];

      expect(dto.story).toBeDefined();
      expect(dto.story).toEqual({
        id: 'story-1',
        title: 'Test Story',
        coverUrl: 'https://cover.png',
        genres: ['adventure'],
      });
      expect(dto.likeCount).toBe(3);
      expect(dto.saveCount).toBe(1);
      expect(dto.shareCount).toBe(2);
      expect(dto.commentCount).toBe(0);
    });

    it('should request only VISIBLE comments for feed commentCount', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([
        { ...approvedMedia, _count: { likes: 3, saves: 1, shares: 2, comments: 4 } },
      ]);
      prisma.sceneMedia.count.mockResolvedValue(1);

      const result = await service.getFeed({});
      const callArgs = prisma.sceneMedia.findMany.mock.calls[0][0];

      expect(callArgs.include._count.select.comments).toEqual({
        where: { status: CommentModerationStatus.VISIBLE },
      });
      expect(result.data[0].commentCount).toBe(4);
    });
  });

  describe('module route order', () => {
    it('should register SceneMediaFeedController before SceneMediaController', () => {
      const controllers = Reflect.getMetadata('controllers', SceneMediaModule);
      expect(controllers).toBeDefined();
      const feedIndex = controllers.indexOf(SceneMediaFeedController);
      const sceneIndex = controllers.indexOf(SceneMediaController);
      expect(feedIndex).toBeGreaterThanOrEqual(0);
      expect(sceneIndex).toBeGreaterThanOrEqual(0);
      expect(feedIndex).toBeLessThan(sceneIndex);
    });
  });

  describe('engagement', () => {
    const publishedMedia = {
      id: 'sm-pub',
      visibility: SceneVisibility.PUBLIC,
      moderationStatus: SceneModerationStatus.APPROVED,
      publishedAt: new Date('2026-05-13'),
    };

    const privateMedia = {
      id: 'sm-priv',
      visibility: SceneVisibility.PRIVATE,
      moderationStatus: SceneModerationStatus.NOT_SUBMITTED,
      publishedAt: null,
    };

    const engagementResponse = {
      _count: { likes: 5, saves: 2, shares: 3 },
    };

    beforeEach(() => {
      prisma.sceneMedia.findUnique.mockImplementation((args: any) => {
        if (args.where.id === 'sm-pub') {
          if (args.select?.id !== undefined) return Promise.resolve(publishedMedia);
          return Promise.resolve(engagementResponse);
        }
        if (args.where.id === 'sm-priv') {
          if (args.select?.id !== undefined) return Promise.resolve(privateMedia);
          return Promise.resolve(engagementResponse);
        }
        return Promise.resolve(null);
      });
      prisma.sceneMediaLike.upsert.mockResolvedValue({});
      prisma.sceneMediaLike.deleteMany.mockResolvedValue({});
      prisma.sceneMediaSave.upsert.mockResolvedValue({});
      prisma.sceneMediaSave.deleteMany.mockResolvedValue({});
      prisma.sceneMediaShare.create.mockResolvedValue({});
    });

    describe('like', () => {
      it('should like approved public media', async () => {
        const result = await service.likeSceneMedia('user-1', 'sm-pub');
        expect(result.likeCount).toBe(5);
        expect(result.saveCount).toBe(2);
        expect(result.shareCount).toBe(3);
        expect(prisma.sceneMediaLike.upsert).toHaveBeenCalled();
      });

      it('should reject like for private/unpublished media', async () => {
        await expect(service.likeSceneMedia('user-1', 'sm-priv'))
          .rejects.toThrow(BadRequestException);
        expect(prisma.sceneMediaLike.upsert).not.toHaveBeenCalled();
      });

      it('should unlike media', async () => {
        const result = await service.unlikeSceneMedia('user-1', 'sm-pub');
        expect(prisma.sceneMediaLike.deleteMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { userId: 'user-1', sceneMediaId: 'sm-pub' } }),
        );
        expect(result.likeCount).toBe(5);
      });
    });

    describe('save', () => {
      it('should save approved public media', async () => {
        const result = await service.saveSceneMedia('user-1', 'sm-pub');
        expect(result.saveCount).toBe(2);
        expect(prisma.sceneMediaSave.upsert).toHaveBeenCalled();
      });

      it('should reject save for private media', async () => {
        await expect(service.saveSceneMedia('user-1', 'sm-priv'))
          .rejects.toThrow(BadRequestException);
        expect(prisma.sceneMediaSave.upsert).not.toHaveBeenCalled();
      });

      it('should unsave media', async () => {
        const result = await service.unsaveSceneMedia('user-1', 'sm-pub');
        expect(prisma.sceneMediaSave.deleteMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { userId: 'user-1', sceneMediaId: 'sm-pub' } }),
        );
        expect(result.saveCount).toBe(2);
      });
    });

    describe('share', () => {
      it('should share approved public media', async () => {
        const result = await service.shareSceneMedia('user-1', 'sm-pub');
        expect(result.shareCount).toBe(3);
        expect(prisma.sceneMediaShare.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: { userId: 'user-1', sceneMediaId: 'sm-pub' } }),
        );
      });

      it('should reject share for private media', async () => {
        await expect(service.shareSceneMedia('user-1', 'sm-priv'))
          .rejects.toThrow(BadRequestException);
        expect(prisma.sceneMediaShare.create).not.toHaveBeenCalled();
      });
    });

    describe('not found', () => {
      it('should throw NotFoundException for non-existent media', async () => {
        await expect(service.likeSceneMedia('user-1', 'nonexistent'))
          .rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('comments', () => {
    const publishedMedia = {
      id: 'sm-pub',
      visibility: SceneVisibility.PUBLIC,
      moderationStatus: SceneModerationStatus.APPROVED,
      publishedAt: new Date('2026-05-13'),
    };

    beforeEach(() => {
      prisma.sceneMedia.findUnique.mockImplementation((args: any) => {
        if (args.where.id === 'sm-pub') {
          if (args.select?.id !== undefined) return Promise.resolve(publishedMedia);
          return Promise.resolve({ _count: { likes: 0, saves: 0, shares: 0, comments: 0 } });
        }
        return Promise.resolve(null);
      });
    });

    describe('createComment', () => {
      it('should create comment on approved public media', async () => {
        prisma.sceneMediaComment.create.mockResolvedValue({
          id: 'c-1', sceneMediaId: 'sm-pub', body: 'Great scene!', createdAt: new Date(),
          user: { id: 'user-1', name: 'Test User' },
        });

        const result = await service.createComment('user-1', 'sm-pub', { body: 'Great scene!' });
        expect(prisma.sceneMediaComment.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: CommentModerationStatus.VISIBLE }),
          }),
        );
        expect(result.body).toBe('Great scene!');
        expect(result.user).toBeDefined();
        expect(result.user).toEqual({ id: 'user-1', name: 'Test User' });
      });

      it('should reject empty/blank comment', async () => {
        await expect(service.createComment('user-1', 'sm-pub', { body: '' }))
          .rejects.toThrow(BadRequestException);
        await expect(service.createComment('user-1', 'sm-pub', { body: '   ' }))
          .rejects.toThrow(BadRequestException);
      });

      it('should trim comment body', async () => {
        prisma.sceneMediaComment.create.mockResolvedValue({
          id: 'c-1', sceneMediaId: 'sm-pub', body: 'hi', createdAt: new Date(),
          user: { id: 'user-1', name: 'Test User' },
        });

        const result = await service.createComment('user-1', 'sm-pub', { body: '  hi  ' });
        expect(result.body).toBe('hi');
      });

      it('should reject comment longer than 500 chars', async () => {
        await expect(service.createComment('user-1', 'sm-pub', { body: 'a'.repeat(501) }))
          .rejects.toThrow(BadRequestException);
        expect(prisma.sceneMediaComment.create).not.toHaveBeenCalled();
      });

      it('should reject comment on private media', async () => {
        prisma.sceneMedia.findUnique.mockImplementation((args: any) => {
          return Promise.resolve({ id: 'sm-priv', visibility: SceneVisibility.PRIVATE, moderationStatus: SceneModerationStatus.NOT_SUBMITTED, publishedAt: null });
        });
        await expect(service.createComment('user-1', 'some-id', { body: 'hi' }))
          .rejects.toThrow(BadRequestException);
      });
    });

    describe('listComments', () => {
      it('should return paginated comments', async () => {
        prisma.sceneMediaComment.findMany.mockResolvedValue([
          { id: 'c-1', sceneMediaId: 'sm-pub', body: 'Nice!', createdAt: new Date(), user: { id: 'user-1', name: 'A' } },
        ]);
        prisma.sceneMediaComment.count.mockResolvedValue(1);

        const result = await service.listComments('sm-pub', {});
        expect(prisma.sceneMediaComment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ status: CommentModerationStatus.VISIBLE }),
          }),
        );
        expect(prisma.sceneMediaComment.count).toHaveBeenCalledWith({
          where: expect.objectContaining({ status: CommentModerationStatus.VISIBLE }),
        });
        expect(result.data).toHaveLength(1);
        expect(result.data[0].body).toBe('Nice!');
      });

      it('should cap limit at 100', async () => {
        prisma.sceneMediaComment.findMany.mockResolvedValue([]);
        prisma.sceneMediaComment.count.mockResolvedValue(0);

        await service.listComments('sm-pub', { limit: 200 });
        expect(prisma.sceneMediaComment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 100 }),
        );
      });

      it('should not expose user email in response', async () => {
        prisma.sceneMediaComment.findMany.mockResolvedValue([{
          id: 'c-1', sceneMediaId: 'sm-pub', body: 'Nice!', createdAt: new Date(),
          user: { id: 'user-1', name: 'A', email: 'should-not-leak@test.com' },
        }]);
        prisma.sceneMediaComment.count.mockResolvedValue(1);

        const result = await service.listComments('sm-pub', {});
        expect(result.data[0].user).toBeDefined();
        expect((result.data[0].user as any).email).toBeUndefined();
      });

      it('should reject listing comments for private media', async () => {
        prisma.sceneMedia.findUnique.mockImplementation((args: any) => {
          return Promise.resolve({ id: 'sm-priv', visibility: SceneVisibility.PRIVATE, moderationStatus: SceneModerationStatus.NOT_SUBMITTED, publishedAt: null });
        });

        await expect(service.listComments('sm-priv', {}))
          .rejects.toThrow(BadRequestException);
      });

      it('should reject listing comments for approved but unpublished media', async () => {
        prisma.sceneMedia.findUnique.mockImplementation((args: any) => {
          return Promise.resolve({ id: 'sm-1', visibility: SceneVisibility.PUBLIC, moderationStatus: SceneModerationStatus.APPROVED, publishedAt: null });
        });

        await expect(service.listComments('sm-1', {}))
          .rejects.toThrow(BadRequestException);
      });

      it('should throw NotFoundException for missing media', async () => {
        prisma.sceneMedia.findUnique.mockResolvedValue(null);

        await expect(service.listComments('nonexistent', {}))
          .rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('reports', () => {
    const publishedMedia = { id: 'sm-pub', visibility: SceneVisibility.PUBLIC, moderationStatus: SceneModerationStatus.APPROVED, publishedAt: new Date() };
    const commentWithScene = { id: 'c-1', body: 'hi', sceneMedia: { id: 'sm-pub', visibility: SceneVisibility.PUBLIC, moderationStatus: SceneModerationStatus.APPROVED, publishedAt: new Date() } };

    describe('reportSceneMedia', () => {
      it('should report approved public scene media', async () => {
        prisma.sceneMedia.findUnique.mockResolvedValue(publishedMedia);
        prisma.sceneMediaReport.findFirst.mockResolvedValue(null);
        prisma.sceneMediaReport.create.mockResolvedValue({ id: 'r-1', sceneMediaId: 'sm-pub', commentId: null, targetType: 'SCENE_MEDIA', reason: 'Bad content', status: 'OPEN', createdAt: new Date() });

        const result = await service.reportSceneMedia('user-1', 'sm-pub', { reason: 'Bad content' });
        expect(result.targetType).toBe('SCENE_MEDIA');
        expect(result.reason).toBe('Bad content');
      });

      it('should reject report for private media', async () => {
        prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-priv', visibility: SceneVisibility.PRIVATE, moderationStatus: SceneModerationStatus.NOT_SUBMITTED, publishedAt: null });
        await expect(service.reportSceneMedia('user-1', 'sm-priv', { reason: 'Bad content' })).rejects.toThrow(BadRequestException);
      });

      it('should reject duplicate scene media report', async () => {
        prisma.sceneMedia.findUnique.mockResolvedValue(publishedMedia);
        prisma.sceneMediaReport.findFirst.mockResolvedValue({ id: 'existing' });
        await expect(service.reportSceneMedia('user-1', 'sm-pub', { reason: 'Bad content' })).rejects.toThrow(ConflictException);
      });

      it('should reject short reason', async () => {
        prisma.sceneMedia.findUnique.mockResolvedValue(publishedMedia);
        await expect(service.reportSceneMedia('user-1', 'sm-pub', { reason: 'ab' })).rejects.toThrow(BadRequestException);
      });
    });

    describe('reportComment', () => {
      it('should report comment on approved public scene', async () => {
        prisma.sceneMediaComment.findUnique.mockResolvedValue(commentWithScene);
        prisma.sceneMediaReport.findFirst.mockResolvedValue(null);
        prisma.sceneMediaReport.create.mockResolvedValue({ id: 'r-1', sceneMediaId: null, commentId: 'c-1', targetType: 'COMMENT', reason: 'Bad', status: 'OPEN', createdAt: new Date() });

        const result = await service.reportComment('user-1', 'c-1', { reason: 'Bad comment' });
        expect(result.targetType).toBe('COMMENT');
      });

      it('should reject comment report when parent scene not engageable', async () => {
        prisma.sceneMediaComment.findUnique.mockResolvedValue({ id: 'c-1', body: 'hi', sceneMedia: { id: 'sm-1', visibility: SceneVisibility.PRIVATE, moderationStatus: SceneModerationStatus.NOT_SUBMITTED, publishedAt: null } });
        await expect(service.reportComment('user-1', 'c-1', { reason: 'Bad' })).rejects.toThrow(BadRequestException);
      });

      it('should reject duplicate comment report', async () => {
        prisma.sceneMediaComment.findUnique.mockResolvedValue(commentWithScene);
        prisma.sceneMediaReport.findFirst.mockResolvedValue({ id: 'existing' });
        await expect(service.reportComment('user-1', 'c-1', { reason: 'Bad' })).rejects.toThrow(ConflictException);
      });
    });

    describe('listReports (admin)', () => {
      it('should default to OPEN status', async () => {
        prisma.sceneMediaReport.findMany.mockResolvedValue([]);
        prisma.sceneMediaReport.count.mockResolvedValue(0);
        await service.listReports({});
        expect(prisma.sceneMediaReport.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'OPEN' } }));
      });

      it('should filter by status and targetType', async () => {
        prisma.sceneMediaReport.findMany.mockResolvedValue([]);
        prisma.sceneMediaReport.count.mockResolvedValue(0);
        await service.listReports({ status: 'REVIEWED', targetType: 'COMMENT' });
        expect(prisma.sceneMediaReport.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'REVIEWED', targetType: 'COMMENT' } }));
      });

      it('should throw on invalid status', async () => {
        await expect(service.listReports({ status: 'INVALID' })).rejects.toThrow(BadRequestException);
      });

      it('should cap limit at 100', async () => {
        prisma.sceneMediaReport.findMany.mockResolvedValue([]);
        prisma.sceneMediaReport.count.mockResolvedValue(0);
        await service.listReports({ limit: 200 });
        expect(prisma.sceneMediaReport.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
      });
    });
  });

  describe('getSaved', () => {
    const savedMedia = {
      id: 'sm-1', storyId: 'story-1', narrativeEventId: 'ne-1', mediaType: 'IMAGE', imageUrl: 'img.png',
      videoUrl: null, thumbnailUrl: null, textExcerpt: 'Scene', title: null, caption: null,
      publishedAt: new Date(), createdAt: new Date(),
      _count: { likes: 1, saves: 1, shares: 0, comments: 0 },
      story: { id: 'story-1', title: 'Story', coverUrl: 'c.png', genres: ['drama'] },
      user: { id: 'user-1', name: 'A' },
    };

    it('should return saved scenes for a user', async () => {
      prisma.sceneMediaSave.findMany.mockResolvedValue([{ sceneMedia: savedMedia }]);
      prisma.sceneMediaSave.count.mockResolvedValue(1);

      const result = await service.getSaved('user-1', {});
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('sm-1');
    });

    it('should return empty list for user with no saves', async () => {
      prisma.sceneMediaSave.findMany.mockResolvedValue([]);
      prisma.sceneMediaSave.count.mockResolvedValue(0);
      const result = await service.getSaved('user-1', {});
      expect(result.data).toEqual([]);
    });

    it('should filter saved scenes to PUBLIC + APPROVED + publishedAt != null', async () => {
      prisma.sceneMediaSave.findMany.mockResolvedValue([]);
      prisma.sceneMediaSave.count.mockResolvedValue(0);

      await service.getSaved('user-1', {});

      expect(prisma.sceneMediaSave.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sceneMedia: {
              visibility: 'PUBLIC',
              moderationStatus: 'APPROVED',
              publishedAt: { not: null },
              adultContentGenerated: false,
            },
          }),
        }),
      );
    });

    it('should paginate after visibility filtering, not before', async () => {
      prisma.sceneMediaSave.findMany.mockResolvedValue([{ sceneMedia: savedMedia }]);
      prisma.sceneMediaSave.count.mockResolvedValue(2);

      const result = await service.getSaved('user-1', { page: 1, limit: 1 });

      expect(prisma.sceneMediaSave.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1 }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(2);
    });

    it('should exclude non-visible saved scenes from the page', async () => {
      prisma.sceneMediaSave.findMany.mockResolvedValue([{ sceneMedia: savedMedia }]);
      prisma.sceneMediaSave.count.mockResolvedValue(1);

      const result = await service.getSaved('user-1', {});

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('privacy contract', () => {
    it('assertMediaIsEngageable rejects private visibility', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-1', visibility: 'PRIVATE', moderationStatus: 'APPROVED', publishedAt: new Date() });
      await expect(service.likeSceneMedia('user-1', 'sm-1')).rejects.toThrow(BadRequestException);
    });

    it('assertMediaIsEngageable rejects NOT_SUBMITTED moderation', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-1', visibility: 'PUBLIC', moderationStatus: 'NOT_SUBMITTED', publishedAt: new Date() });
      await expect(service.likeSceneMedia('user-1', 'sm-1')).rejects.toThrow(BadRequestException);
    });

    it('assertMediaIsEngageable rejects null publishedAt', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-1', visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: null });
      await expect(service.likeSceneMedia('user-1', 'sm-1')).rejects.toThrow(BadRequestException);
    });

    it('assertMediaIsEngageable rejects adult-generated public media defensively', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({
        id: 'sm-1',
        visibility: 'PUBLIC',
        moderationStatus: 'APPROVED',
        publishedAt: new Date(),
        adultContentGenerated: true,
      });

      await expect(service.likeSceneMedia('user-1', 'sm-1')).rejects.toThrow(BadRequestException);
    });

    it('getFeed filters to PUBLIC + APPROVED + publishedAt', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);
      prisma.sceneMedia.count.mockResolvedValue(0);
      await service.getFeed({});
      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: { not: null }, adultContentGenerated: false },
      }));
    });

    it('reportComment rejects comments attached to adult-generated public media defensively', async () => {
      prisma.sceneMediaComment.findUnique.mockResolvedValue({
        id: 'c-1',
        body: 'hi',
        sceneMedia: {
          id: 'sm-1',
          visibility: 'PUBLIC',
          moderationStatus: 'APPROVED',
          publishedAt: new Date(),
          adultContentGenerated: true,
        },
      });

      await expect(service.reportComment('user-1', 'c-1', { reason: 'Bad' })).rejects.toThrow(BadRequestException);
    });

    it('reportComment rejects comment on non-public scene', async () => {
      prisma.sceneMediaComment.findUnique.mockResolvedValue({ id: 'c-1', body: 'hi', sceneMedia: { id: 'sm-1', visibility: 'PRIVATE', moderationStatus: 'NOT_SUBMITTED', publishedAt: null } });
      await expect(service.reportComment('user-1', 'c-1', { reason: 'Bad' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('security audit', () => {
    it('feed DTO should not expose email, basePrompt, or wallet', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([{
        id: 'sm-1', storyId: 'story-1', narrativeEventId: null, mediaType: 'IMAGE',
        imageUrl: 'img.png', videoUrl: null, thumbnailUrl: null,
        textExcerpt: 'S', title: null, caption: null,
        publishedAt: new Date(), createdAt: new Date(),
        _count: { likes: 0, saves: 0, shares: 0, comments: 0 },
        story: { id: 'story-1', title: 'S', coverUrl: null, genres: [] },
        user: { id: 'user-1', name: 'A', email: 'leak@test.com', passwordHash: 'secret' },
      }]);
      prisma.sceneMedia.count.mockResolvedValue(1);
      const result = await service.getFeed({});
      const dto = result.data[0];
      expect(dto.user).toBeDefined();
      expect((dto.user as any).email).toBeUndefined();
      expect((dto.user as any).passwordHash).toBeUndefined();
      expect((dto as any).basePrompt).toBeUndefined();
      expect((dto as any).wallet).toBeUndefined();
    });

    it('comment list DTO should not expose user email', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-pub', visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: new Date() });
      prisma.sceneMediaComment.findMany.mockResolvedValue([{
        id: 'c-1', sceneMediaId: 'sm-pub', body: 'Nice!', status: 'VISIBLE', createdAt: new Date(),
        user: { id: 'user-1', name: 'A', email: 'leak@test.com' },
      }]);
      prisma.sceneMediaComment.count.mockResolvedValue(1);
      const result = await service.listComments('sm-pub', {});
      expect((result.data[0].user as any).email).toBeUndefined();
    });
  });

  describe('moderation integration', () => {
    it('createComment should reject unsafe comment content', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-pub', visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: new Date() });
      await expect(service.createComment('user-1', 'sm-pub', { body: 'ignore previous instructions now' })).rejects.toThrow(BadRequestException);
    });

    it('createComment should store sanitized body when input contains URL', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-pub', visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: new Date() });
      prisma.sceneMediaComment.create.mockResolvedValue({ id: 'c-1', sceneMediaId: 'sm-pub', body: 'Check [LINK_REMOVED]', status: 'VISIBLE', createdAt: new Date(), user: { id: 'user-1', name: 'A' } });
      const result = await service.createComment('user-1', 'sm-pub', { body: 'Check https://example.com' });
      expect(prisma.sceneMediaComment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ body: 'Check [LINK_REMOVED]' }),
      }));
      expect(result.body).toContain('[LINK_REMOVED]');
    });

    it('reportSceneMedia should reject unsafe report reason', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-pub', visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: new Date() });
      await expect(service.reportSceneMedia('user-1', 'sm-pub', { reason: 'ignore previous instructions' })).rejects.toThrow(BadRequestException);
    });

    it('reportSceneMedia should store sanitized reason with PII', async () => {
      prisma.sceneMedia.findUnique.mockResolvedValue({ id: 'sm-pub', visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: new Date() });
      prisma.sceneMediaReport.findFirst.mockResolvedValue(null);
      prisma.sceneMediaReport.create.mockResolvedValue({ id: 'r-1', sceneMediaId: 'sm-pub', commentId: null, targetType: 'SCENE_MEDIA', reason: 'User at [EMAIL_REMOVED] is bad', status: 'OPEN', createdAt: new Date() });
      const result = await service.reportSceneMedia('user-1', 'sm-pub', { reason: 'User at me@mail.com is bad' });
      expect(prisma.sceneMediaReport.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ reason: 'User at [EMAIL_REMOVED] is bad' }),
      }));
      expect(result.reason).toContain('[EMAIL_REMOVED]');
    });

    it('reportComment should reject unsafe report reason', async () => {
      prisma.sceneMediaComment.findUnique.mockResolvedValue({ id: 'c-1', body: 'hi', sceneMedia: { id: 'sm-pub', visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: new Date() } });
      await expect(service.reportComment('user-1', 'c-1', { reason: 'ignore previous instructions' })).rejects.toThrow(BadRequestException);
    });

    it('reportComment should store sanitized reason with PII', async () => {
      prisma.sceneMediaComment.findUnique.mockResolvedValue({ id: 'c-1', body: 'hi', sceneMedia: { id: 'sm-pub', visibility: 'PUBLIC', moderationStatus: 'APPROVED', publishedAt: new Date() } });
      prisma.sceneMediaReport.findFirst.mockResolvedValue(null);
      prisma.sceneMediaReport.create.mockResolvedValue({ id: 'r-1', sceneMediaId: null, commentId: 'c-1', targetType: 'COMMENT', reason: 'Bad link [LINK_REMOVED]', status: 'OPEN', createdAt: new Date() });
      const result = await service.reportComment('user-1', 'c-1', { reason: 'Bad link https://evil.com' });
      expect(prisma.sceneMediaReport.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ reason: 'Bad link [LINK_REMOVED]' }),
      }));
      expect(result.reason).toContain('[LINK_REMOVED]');
    });
  });

  describe('adult content guardrails', () => {
    it('blocks submitForModeration when adultContentGenerated is true', async () => {
      const adultMedia = {
        id: 'sm-adult',
        userId: 'user-1',
        visibility: SceneVisibility.PRIVATE,
        moderationStatus: SceneModerationStatus.NOT_SUBMITTED,
        mediaType: SceneMediaType.IMAGE,
        imageUrl: 'http://img.png',
        videoUrl: null,
        adultContentGenerated: true,
      };
      prisma.sceneMedia.findUnique.mockResolvedValue(adultMedia);

      await expect(service.submitForModeration('user-1', 'sm-adult')).rejects.toThrow(BadRequestException);
    });

    it('allows submitForModeration when adultContentGenerated is false', async () => {
      const normalMedia = {
        id: 'sm-normal',
        userId: 'user-1',
        visibility: SceneVisibility.PRIVATE,
        moderationStatus: SceneModerationStatus.NOT_SUBMITTED,
        mediaType: SceneMediaType.IMAGE,
        imageUrl: 'http://img.png',
        videoUrl: null,
        adultContentGenerated: false,
      };
      prisma.sceneMedia.findUnique.mockResolvedValue(normalMedia);
      prisma.sceneMedia.update.mockResolvedValue({ ...normalMedia, moderationStatus: SceneModerationStatus.PENDING });

      const result = await service.submitForModeration('user-1', 'sm-normal');
      expect(result.moderationStatus).toBe(SceneModerationStatus.PENDING);
    });

    it('getFeed excludes adultContentGenerated media', async () => {
      prisma.sceneMedia.findMany.mockResolvedValue([]);
      prisma.sceneMedia.count.mockResolvedValue(0);

      await service.getFeed({});
      expect(prisma.sceneMedia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ adultContentGenerated: false }),
        }),
      );
    });
  });
});
