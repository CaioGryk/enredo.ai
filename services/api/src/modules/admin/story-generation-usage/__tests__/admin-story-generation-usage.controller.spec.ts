import { Test, TestingModule } from '@nestjs/testing';
import { AdminStoryGenerationUsageController } from '../admin-story-generation-usage.controller';
import { AdminStoryGenerationUsageService } from '../admin-story-generation-usage.service';
import { UserRole } from '@prisma/client';

describe('AdminStoryGenerationUsageController', () => {
  let controller: AdminStoryGenerationUsageController;
  let service: any;

  const mockUsageRecord = {
    id: 'usage-1',
    userId: 'user-1',
    storyId: 'story-1',
    modelId: 'mock-model',
    provider: 'openrouter',
    isMock: true,
    status: 'SUCCESS',
    failureReason: null,
    inputTokens: 100,
    outputTokens: 200,
    totalTokens: 300,
    estimatedCost: 0.05,
    createdAt: new Date(),
    user: { id: 'user-1' },
    story: { id: 'story-1', title: 'Test Story', origin: 'USER_GENERATED', visibility: 'PRIVATE', moderationStatus: 'NOT_SUBMITTED' },
  };

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStoryGenerationUsageController],
      providers: [
        {
          provide: AdminStoryGenerationUsageService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AdminStoryGenerationUsageController>(AdminStoryGenerationUsageController);
    service = mockService;

    service.findAll.mockResolvedValue({
      data: [mockUsageRecord],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    service.findOne.mockResolvedValue(mockUsageRecord);
  });

  describe('findAll (list endpoint)', () => {
    it('should return paginated usage records for admin', async () => {
      const result = await controller.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should pass filters to service when provided', async () => {
      await controller.findAll(
        'SUCCESS',
        'user-1',
        'story-1',
        'openrouter',
        'mock-model',
        'true',
        '2026-01-01',
        '2026-12-31',
        2,
        50,
        'asc',
      );

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SUCCESS',
          userId: 'user-1',
          storyId: 'story-1',
          provider: 'openrouter',
          modelId: 'mock-model',
          isMock: true,
          from: '2026-01-01',
          to: '2026-12-31',
          page: 2,
          limit: 50,
          order: 'asc',
        })
      );
    });
  });

  describe('findOne (detail endpoint)', () => {
    it('should return a single usage record for admin', async () => {
      const result = await controller.findOne('usage-1');

      expect(result.id).toBe('usage-1');
      expect(result.userId).toBe('user-1');
      expect(service.findOne).toHaveBeenCalledWith('usage-1');
    });
  });

  describe('security - controller level', () => {
    it('should have JwtAuthGuard and RolesGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', AdminStoryGenerationUsageController);
      expect(guards).toBeDefined();
    });

    it('should require ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', AdminStoryGenerationUsageController);
      expect(roles).toContain(UserRole.ADMIN);
    });
  });
});
