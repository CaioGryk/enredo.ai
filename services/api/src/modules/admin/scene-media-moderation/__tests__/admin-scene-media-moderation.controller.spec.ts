import { Test, TestingModule } from '@nestjs/testing';
import { AdminSceneMediaController } from '../admin-scene-media.controller';
import { AdminSceneMediaService } from '../admin-scene-media.service';
import { SceneMediaService } from '../../../scene-media/scene-media.service';
import { UserRole } from '@prisma/client';

describe('AdminSceneMediaController', () => {
  let controller: AdminSceneMediaController;
  let service: any;
  let sceneMediaService: any;

  const mockSceneMedia = {
    id: 'sm-1',
    userId: 'user-1',
    narrativeEventId: 'ne-1',
    storyId: 'story-1',
    visibility: 'PRIVATE',
    moderationStatus: 'PENDING',
    title: null,
    caption: null,
    textExcerpt: 'A scene excerpt',
    imageUrl: 'https://example.com/img.png',
    videoUrl: null,
    thumbnailUrl: null,
    mediaType: 'IMAGE',
    moderationNote: null,
    publishedAt: null,
    createdAt: new Date(),
    user: { id: 'user-1', email: 'user@test.com' },
    story: { id: 'story-1', title: 'Test Story' },
  };

  const mockService = {
    listPending: jest.fn(),
    getMetrics: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSceneMediaController],
      providers: [
        {
          provide: AdminSceneMediaService,
          useValue: mockService,
        },
        {
          provide: SceneMediaService,
          useValue: {
            listReports: jest.fn().mockResolvedValue({
              data: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminSceneMediaController>(AdminSceneMediaController);
    service = mockService;
    sceneMediaService = module.get<SceneMediaService>(SceneMediaService);

    service.listForModeration = jest.fn().mockResolvedValue({
      data: [mockSceneMedia],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    service.getMetrics.mockResolvedValue({
      total: 1,
      byStatus: [{ status: 'PENDING', count: 1 }],
      byMediaType: [{ mediaType: 'IMAGE', count: 1 }],
      pending: {
        total: 1,
        oldestCreatedAt: new Date('2026-05-10').toISOString(),
        newestCreatedAt: new Date('2026-05-11').toISOString(),
      },
      published: { total: 0 },
      rejected: { total: 0 },
      withImage: 1,
      withVideo: 0,
    });
    service.approve.mockResolvedValue({
      ...mockSceneMedia,
      moderationStatus: 'APPROVED',
      visibility: 'PUBLIC',
      publishedAt: new Date(),
    });
    service.reject.mockResolvedValue({
      ...mockSceneMedia,
      moderationStatus: 'REJECTED',
      visibility: 'PRIVATE',
      moderationNote: 'Inappropriate',
    });
  });

  describe('listPending (listForModeration)', () => {
    it('should delegate to service with page and limit', async () => {
      const result = await controller.listPending(2, 50);

      expect(service.listForModeration).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 50 }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('should pass query params to service', async () => {
      await controller.listPending(1, 20, 'APPROVED', 'IMAGE', 'story-1', 'user-1', 'search');

      expect(service.listForModeration).toHaveBeenCalledWith({
        page: 1, limit: 20, status: 'APPROVED', mediaType: 'IMAGE',
        storyId: 'story-1', userId: 'user-1', q: 'search',
      });
    });
  });

  describe('getMetrics', () => {
    it('should delegate to service', async () => {
      const result = await controller.getMetrics();

      expect(service.getMetrics).toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.pending.total).toBe(1);
    });
  });

  describe('listReports', () => {
    it('should delegate report filters to SceneMediaService', async () => {
      const result = await controller.listReports('OPEN', 'COMMENT', 2, 10);

      expect(sceneMediaService.listReports).toHaveBeenCalledWith({
        status: 'OPEN',
        targetType: 'COMMENT',
        page: 2,
        limit: 10,
      });
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('approve', () => {
    it('should delegate to service with id', async () => {
      const result = await controller.approve('sm-1');

      expect(service.approve).toHaveBeenCalledWith('sm-1');
      expect(result.moderationStatus).toBe('APPROVED');
      expect(result.visibility).toBe('PUBLIC');
    });
  });

  describe('reject', () => {
    it('should delegate to service with id and note', async () => {
      const result = await controller.reject('sm-1', { note: 'Inappropriate' });

      expect(service.reject).toHaveBeenCalledWith('sm-1', 'Inappropriate');
      expect(result.moderationStatus).toBe('REJECTED');
      expect(result.moderationNote).toBe('Inappropriate');
    });

    it('should delegate to service with id and undefined note when body is absent', async () => {
      await controller.reject('sm-2');

      expect(service.reject).toHaveBeenCalledWith('sm-2', undefined);
    });
  });

  describe('comment moderation', () => {
    beforeEach(() => {
      service.listComments = jest.fn().mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      service.hideComment = jest.fn().mockResolvedValue({ id: 'c-1', status: 'HIDDEN' });
      service.removeComment = jest.fn().mockResolvedValue({ id: 'c-1', status: 'REMOVED' });
      service.restoreComment = jest.fn().mockResolvedValue({ id: 'c-1', status: 'VISIBLE' });
    });

    it('should delegate listComments to service', async () => {
      await controller.listComments(undefined, undefined, undefined, undefined, 1, 20);
      expect(service.listComments).toHaveBeenCalled();
    });

    it('should delegate hideComment to service', async () => {
      const result = await controller.hideComment('c-1');
      expect(service.hideComment).toHaveBeenCalledWith('c-1');
      expect(result.status).toBe('HIDDEN');
    });

    it('should delegate removeComment to service', async () => {
      const result = await controller.removeComment('c-1');
      expect(service.removeComment).toHaveBeenCalledWith('c-1');
      expect(result.status).toBe('REMOVED');
    });

    it('should delegate restoreComment to service', async () => {
      const result = await controller.restoreComment('c-1');
      expect(service.restoreComment).toHaveBeenCalledWith('c-1');
      expect(result.status).toBe('VISIBLE');
    });
  });

  describe('security - controller level', () => {
    it('should have JwtAuthGuard and RolesGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', AdminSceneMediaController);
      expect(guards).toBeDefined();
    });

    it('should require ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', AdminSceneMediaController);
      expect(roles).toContain(UserRole.ADMIN);
    });
  });
});
