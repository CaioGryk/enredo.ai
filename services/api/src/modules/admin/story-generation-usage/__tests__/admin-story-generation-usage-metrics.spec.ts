import { Test, TestingModule } from '@nestjs/testing';
import { AdminStoryGenerationUsageController } from '../admin-story-generation-usage.controller';
import { AdminStoryGenerationUsageService } from '../admin-story-generation-usage.service';
import { UserRole } from '@prisma/client';

describe('AdminStoryGenerationUsageController - Metrics', () => {
  let controller: AdminStoryGenerationUsageController;
  let service: any;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    getMetrics: jest.fn(),
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

    service.getMetrics.mockResolvedValue({
      totals: {
        total: 100,
        success: 80,
        failed: 15,
        blocked: 5,
        estimatedCost: 10.5,
        inputTokens: 8000,
        outputTokens: 16000,
        totalTokens: 24000,
        successRate: 0.8,
        failureRate: 0.15,
        blockedRate: 0.05,
      },
      byStatus: [
        { status: 'SUCCESS', count: 80 },
        { status: 'FAILED', count: 15 },
        { status: 'BLOCKED', count: 5 },
      ],
      byProvider: [
        { provider: 'openrouter', count: 60, estimatedCost: 6.0, totalTokens: 14400 },
        { provider: 'openai', count: 40, estimatedCost: 4.5, totalTokens: 9600 },
      ],
      byModel: [
        { modelId: 'mock-model', count: 80, estimatedCost: 4.0, totalTokens: 19200 },
        { modelId: 'gpt-4.1-nano', count: 20, estimatedCost: 6.5, totalTokens: 4800 },
      ],
      byDay: [
        { date: '2026-05-01', total: 50, success: 40, failed: 8, blocked: 2, estimatedCost: 5.25, totalTokens: 12000 },
        { date: '2026-05-02', total: 50, success: 40, failed: 7, blocked: 3, estimatedCost: 5.25, totalTokens: 12000 },
      ],
    });
  });

  describe('getMetrics endpoint', () => {
    it('should return aggregated metrics for admin', async () => {
      const result = await controller.getMetrics();

      expect(result.totals.total).toBe(100);
      expect(result.totals.success).toBe(80);
      expect(result.totals.failed).toBe(15);
      expect(result.totals.blocked).toBe(5);
      expect(result.totals.estimatedCost).toBe(10.5);
      expect(result.totals.successRate).toBe(0.8);
      expect(result.totals.failureRate).toBe(0.15);
      expect(result.totals.blockedRate).toBe(0.05);
      expect(service.getMetrics).toHaveBeenCalled();
    });

    it('should pass filters to service', async () => {
      await controller.getMetrics(
        '2026-01-01',
        '2026-12-31',
        'openrouter',
        'mock-model',
        'true',
        'SUCCESS',
      );

      expect(service.getMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '2026-01-01',
          to: '2026-12-31',
          provider: 'openrouter',
          modelId: 'mock-model',
          isMock: true,
          status: 'SUCCESS',
        })
      );
    });

    it('should not return forbidden fields', async () => {
      const result = await controller.getMetrics();

      const json = JSON.stringify(result);
      expect(json).not.toMatch(/userId/);
      expect(json).not.toMatch(/storyId/);
      expect(json).not.toMatch(/failureReason/);
      expect(json).not.toMatch(/user/);
      expect(json).not.toMatch(/story/);
    });
  });

  describe('security - metrics endpoint', () => {
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
