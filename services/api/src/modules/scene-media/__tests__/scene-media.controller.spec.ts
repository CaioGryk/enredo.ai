import { Test, TestingModule } from '@nestjs/testing';
import { SceneMediaController } from '../scene-media.controller';
import { SceneMediaService } from '../scene-media.service';

describe('SceneMediaController', () => {
  let controller: SceneMediaController;
  let service: {
    reportSceneMedia: jest.Mock;
    reportComment: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      reportSceneMedia: jest.fn().mockResolvedValue({
        id: 'report-1',
        targetType: 'SCENE_MEDIA',
        sceneMediaId: 'scene-media-1',
        commentId: null,
        reason: 'Unsafe content',
        status: 'OPEN',
        createdAt: new Date('2026-05-14T00:00:00.000Z'),
      }),
      reportComment: jest.fn().mockResolvedValue({
        id: 'report-2',
        targetType: 'COMMENT',
        sceneMediaId: null,
        commentId: 'comment-1',
        reason: 'Harassing comment',
        status: 'OPEN',
        createdAt: new Date('2026-05-14T00:00:00.000Z'),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SceneMediaController],
      providers: [
        {
          provide: SceneMediaService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<SceneMediaController>(SceneMediaController);
  });

  describe('reportSceneMedia', () => {
    it('should delegate to service with authenticated user, scene id, and body', async () => {
      const dto = { reason: 'Unsafe content' };

      const result = await controller.reportSceneMedia('user-1', 'scene-media-1', dto);

      expect(service.reportSceneMedia).toHaveBeenCalledWith('user-1', 'scene-media-1', dto);
      expect(result.targetType).toBe('SCENE_MEDIA');
    });
  });

  describe('reportComment', () => {
    it('should delegate to service with authenticated user, comment id, and body', async () => {
      const dto = { reason: 'Harassing comment' };

      const result = await controller.reportComment('user-1', 'comment-1', dto);

      expect(service.reportComment).toHaveBeenCalledWith('user-1', 'comment-1', dto);
      expect(result.targetType).toBe('COMMENT');
    });
  });
});
