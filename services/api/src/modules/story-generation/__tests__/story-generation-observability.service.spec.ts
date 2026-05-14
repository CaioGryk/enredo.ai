import { Test, TestingModule } from '@nestjs/testing';
import { StoryGenerationObservabilityService } from '../services/story-generation-observability.service';
import { StoryGenerationUsageStatus } from '@prisma/client';
import { PrismaService } from '@common/prisma.service';

describe('StoryGenerationObservabilityService', () => {
  let service: StoryGenerationObservabilityService;
  let prisma: any;

  const mockPrismaService = {
    storyGenerationUsage: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryGenerationObservabilityService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StoryGenerationObservabilityService>(StoryGenerationObservabilityService);
    prisma = mockPrismaService;
    jest.clearAllMocks();
  });

  describe('createUsageRecord', () => {
    it('should create SUCCESS record with sanitized metadata only', async () => {
      prisma.storyGenerationUsage.create.mockResolvedValue({
        estimatedCost: 0.05,
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
      });

      const result = await service.createUsageRecord({
        userId: 'user-1',
        storyId: 'story-1',
        modelId: 'mock-model',
        isMock: true,
        status: StoryGenerationUsageStatus.SUCCESS,
        provider: 'openrouter',
      });

      expect(result.tracked).toBe(true);
      expect(result.estimatedCost).toBe(0.05);
      expect(prisma.storyGenerationUsage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          storyId: 'story-1',
          modelId: 'mock-model',
          isMock: true,
          status: StoryGenerationUsageStatus.SUCCESS,
          provider: 'openrouter',
          failureReason: undefined,
        }),
        select: expect.any(Object),
      });
    });

    it('should create FAILED record with sanitized failureReason', async () => {
      prisma.storyGenerationUsage.create.mockResolvedValue({
        estimatedCost: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      });

      const result = await service.createUsageRecord({
        userId: 'user-1',
        modelId: 'mock-model',
        isMock: true,
        status: StoryGenerationUsageStatus.FAILED,
        failureReason: 'Quality check failed: invalid content',
        provider: 'openrouter',
      });

      expect(result.tracked).toBe(true);
    });

    it('should sanitize failureReason by removing stack trace lines', async () => {
      prisma.storyGenerationUsage.create.mockResolvedValue({
        estimatedCost: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      });

      const stackTraceError = `Error: Something went wrong
at Function.execute (file.js:10:5)
at processTicks (node:internal/process:88:5)
Caused by: invalid input`;

      await service.createUsageRecord({
        userId: 'user-1',
        modelId: 'mock-model',
        isMock: true,
        status: StoryGenerationUsageStatus.FAILED,
        failureReason: stackTraceError,
      });

      const createCall = prisma.storyGenerationUsage.create.mock.calls[0][0];
      expect(createCall.data.failureReason).not.toContain('at Function.execute');
      expect(createCall.data.failureReason).not.toContain('at processTicks');
      expect(createCall.data.failureReason).toContain('Error: Something went wrong');
      expect(createCall.data.failureReason).toContain('Caused by: invalid input');
    });

    it('should truncate failureReason longer than 500 characters', async () => {
      prisma.storyGenerationUsage.create.mockResolvedValue({
        estimatedCost: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      });

      const longFailureReason = 'A'.repeat(600);

      await service.createUsageRecord({
        userId: 'user-1',
        modelId: 'mock-model',
        isMock: true,
        status: StoryGenerationUsageStatus.FAILED,
        failureReason: longFailureReason,
      });

      const createCall = prisma.storyGenerationUsage.create.mock.calls[0][0];
      expect(createCall.data.failureReason?.length).toBeLessThanOrEqual(500);
    });

    it('should return tracked false when prisma create fails', async () => {
      prisma.storyGenerationUsage.create.mockRejectedValue(new Error('Database error'));

      const result = await service.createUsageRecord({
        userId: 'user-1',
        modelId: 'mock-model',
        isMock: true,
        status: StoryGenerationUsageStatus.SUCCESS,
      });

      expect(result.tracked).toBe(false);
    });
  });

  describe('security', () => {
    it('should not accept or persist prompt content', async () => {
      prisma.storyGenerationUsage.create.mockResolvedValue({
        estimatedCost: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      });

      // Verify the method signature doesn't include prompt-related parameters
      const methodSignature = service.createUsageRecord.toString();
      expect(methodSignature).not.toContain('prompt');
      expect(methodSignature).not.toContain('basePrompt');
      expect(methodSignature).not.toContain('rawPrompt');
    });

    it('should not accept or persist LLM response content', async () => {
      prisma.storyGenerationUsage.create.mockResolvedValue({
        estimatedCost: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      });

      const methodSignature = service.createUsageRecord.toString();
      expect(methodSignature).not.toContain('llmResponse');
      expect(methodSignature).not.toContain('generatedText');
      expect(methodSignature).not.toContain('rawResponse');
    });

    it('should not accept or persist stack traces in failureReason', async () => {
      prisma.storyGenerationUsage.create.mockResolvedValue({
        estimatedCost: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
      });

      const errorMessage = 'Error occurred\nat Object.handler (file.ts:10:5)\nstack trace here';

      await service.createUsageRecord({
        userId: 'user-1',
        modelId: 'mock-model',
        isMock: true,
        status: StoryGenerationUsageStatus.FAILED,
        failureReason: errorMessage,
      });

      const createCall = prisma.storyGenerationUsage.create.mock.calls[0][0];
      expect(createCall.data.failureReason).not.toContain('at Object.handler');
      // 'stack trace here' is not a stack trace line (no 'at ' prefix), so it will be kept
      // Let's verify actual stack trace lines are removed
      expect(createCall.data.failureReason).not.toContain('file.ts:10:5');
    });
  });
});
