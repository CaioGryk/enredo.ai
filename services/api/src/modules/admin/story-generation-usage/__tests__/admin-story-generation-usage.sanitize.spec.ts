import { AdminStoryGenerationUsageService } from '../admin-story-generation-usage.service';

describe('AdminStoryGenerationUsageService – sanitizeFailureReason', () => {
  let service: AdminStoryGenerationUsageService;

  beforeEach(() => {
    service = new AdminStoryGenerationUsageService({} as any);
  });

  it('should return undefined when reason is undefined', () => {
    expect((service as any).sanitizeFailureReason(undefined)).toBeUndefined();
  });

  it('should return null when reason is null', () => {
    expect((service as any).sanitizeFailureReason(null)).toBeNull();
  });

  it('should keep normal messages unchanged', () => {
    const msg = 'Generation timeout';
    expect((service as any).sanitizeFailureReason(msg)).toBe('Generation timeout');
  });

  it('should remove stack trace lines starting with "at "', () => {
    const reason = 'Error: something broke\nat Object.<anonymous> (/app/src/file.ts:10:5)\nat step (/app/node_modules/lib/index.js:20:3)';
    const result = (service as any).sanitizeFailureReason(reason);
    expect(result).toBe('Error: something broke');
  });

  it('should remove multiline stack traces', () => {
    const reason = [
      'Error: provider failure',
      'at Service.generate (/app/service.ts:42:11)',
      'at processTicks (node:internal/process/task_queues:96:5)',
      'at async run (/app/main.ts:10:1)',
    ].join('\n');

    const result = (service as any).sanitizeFailureReason(reason);
    expect(result).toBe('Error: provider failure');
  });

  it('should remove lines containing stack frame pattern "(...:line:column)"', () => {
    const reason = 'Failed\n  at (/app/src/file.ts:10:5)\n  at (/node_modules/x:1:2)';
    const result = (service as any).sanitizeFailureReason(reason);
    expect(result).toBe('Failed');
  });

  it('should truncate to 500 characters', () => {
    const long = 'A'.repeat(600);
    const result = (service as any).sanitizeFailureReason(long);
    expect(result.length).toBe(500);
  });

  it('should normalize whitespace', () => {
    const reason = '  too   many    spaces  \n  and   newlines  ';
    const result = (service as any).sanitizeFailureReason(reason);
    expect(result).toBe('too many spaces and newlines');
  });

  it('should preserve provider names and normal error categories', () => {
    const reason = 'OpenRouterProvider: rate limit exceeded';
    expect((service as any).sanitizeFailureReason(reason)).toBe('OpenRouterProvider: rate limit exceeded');
  });

  it('should map usage user without exposing email', () => {
    const dto = (service as any).mapToDto({
      id: 'usage-1',
      userId: 'user-1',
      storyId: 'story-1',
      modelId: 'mock-model',
      provider: 'openrouter',
      isMock: true,
      status: 'SUCCESS',
      failureReason: null,
      inputTokens: 1,
      outputTokens: 2,
      totalTokens: 3,
      estimatedCost: 0,
      createdAt: new Date(),
      user: { id: 'user-1', email: 'leak@test.com' },
      story: {
        id: 'story-1',
        title: 'Story',
        origin: 'USER_GENERATED',
        visibility: 'PRIVATE',
        moderationStatus: 'NOT_SUBMITTED',
      },
    });

    expect(dto.user).toEqual({ id: 'user-1' });
    expect((dto.user as any).email).toBeUndefined();
  });
});
