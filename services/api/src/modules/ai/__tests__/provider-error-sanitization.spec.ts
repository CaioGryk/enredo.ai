describe('Provider Error Sanitization', () => {
  const SENSITIVE_BODY = 'SECRET_RAW_PROVIDER_BODY_WITH_PROMPT_AND_CONTEXT';

  afterEach(() => {
    if (global.fetch !== undefined) {
      delete (global as any).fetch;
    }
  });

  describe('OpenRouterProvider', () => {
    it('should not include raw error body in thrown error', async () => {
      const { OpenRouterProvider } = require('../providers/openrouter.provider');
      const mockMockProvider = { generate: jest.fn() };

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => SENSITIVE_BODY,
      });

      const provider = new OpenRouterProvider(
        { get: (key: string) => key === 'OPENROUTER_API_KEY' ? 'test-key' : undefined } as any,
        mockMockProvider as any,
      );

      await expect(provider.generate('test prompt', { model: 'openrouter/free' }))
        .rejects.toThrow('OpenRouter API error: status 429');

      expect(() =>
        provider.generate('test prompt', { model: 'openrouter/free' })
      ).rejects.not.toThrow(SENSITIVE_BODY);

      global.fetch = originalFetch;
    });

    it('should not include raw error body in logs', async () => {
      const { OpenRouterProvider } = require('../providers/openrouter.provider');
      const mockMockProvider = { generate: jest.fn() };
      const logger = { error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => SENSITIVE_BODY,
      });

      const provider = new OpenRouterProvider(
        { get: (key: string) => key === 'OPENROUTER_API_KEY' ? 'test-key' : undefined } as any,
        mockMockProvider as any,
      );
      (provider as any).logger = logger;

      try {
        await provider.generate('test prompt', { model: 'openrouter/free' });
      } catch (e) {
      }

      expect(logger.error).toHaveBeenCalled();
      const logArgs = (logger.error as jest.Mock).mock.calls[0][0];
      expect(typeof logArgs).toBe('string');
      expect(logArgs).not.toContain(SENSITIVE_BODY);
      expect(logArgs).toContain('status=500');

      global.fetch = originalFetch;
    });
  });

  describe('OpenAIProvider', () => {
    it('should not include raw error body in thrown error', async () => {
      const { OpenAIProvider } = require('../providers/openai.provider');

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => SENSITIVE_BODY,
      });

      const provider = new OpenAIProvider(
        { get: (key: string) => key === 'OPENAI_API_KEY' ? 'test-key' : undefined } as any,
      );

      await expect(provider.generate('test prompt', { model: 'gpt-4o-mini' }))
        .rejects.toThrow('OpenAI API error: status 401');

      expect(() =>
        provider.generate('test prompt', { model: 'gpt-4o-mini' })
      ).rejects.not.toThrow(SENSITIVE_BODY);

      global.fetch = originalFetch;
    });

    it('should not include raw error body in logs', async () => {
      const { OpenAIProvider } = require('../providers/openai.provider');
      const logger = { error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => SENSITIVE_BODY,
      });

      const provider = new OpenAIProvider(
        { get: (key: string) => key === 'OPENAI_API_KEY' ? 'test-key' : undefined } as any,
      );
      (provider as any).logger = logger;

      try {
        await provider.generate('test prompt', { model: 'gpt-4o-mini' });
      } catch (e) {
      }

      expect(logger.error).toHaveBeenCalled();
      const logArgs = (logger.error as jest.Mock).mock.calls[0][0];
      expect(typeof logArgs).toBe('string');
      expect(logArgs).not.toContain(SENSITIVE_BODY);
      expect(logArgs).toContain('status=500');

      global.fetch = originalFetch;
    });
  });

  describe('AnthropicProvider', () => {
    it('should not include raw error body in thrown error', async () => {
      const { AnthropicProvider } = require('../providers/anthropic.provider');

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => SENSITIVE_BODY,
      });

      const provider = new AnthropicProvider(
        { get: (key: string) => key === 'ANTHROPIC_API_KEY' ? 'test-key' : undefined } as any,
      );

      await expect(provider.generate('test prompt', { model: 'claude-3-5-sonnet-20241022' }))
        .rejects.toThrow('Anthropic API error: status 400');

      expect(() =>
        provider.generate('test prompt', { model: 'claude-3-5-sonnet-20241022' })
      ).rejects.not.toThrow(SENSITIVE_BODY);

      global.fetch = originalFetch;
    });

    it('should not include raw error body in logs', async () => {
      const { AnthropicProvider } = require('../providers/anthropic.provider');
      const logger = { error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => SENSITIVE_BODY,
      });

      const provider = new AnthropicProvider(
        { get: (key: string) => key === 'ANTHROPIC_API_KEY' ? 'test-key' : undefined } as any,
      );
      (provider as any).logger = logger;

      try {
        await provider.generate('test prompt', { model: 'claude-3-5-sonnet-20241022' });
      } catch (e) {
      }

      expect(logger.error).toHaveBeenCalled();
      const logArgs = (logger.error as jest.Mock).mock.calls[0][0];
      expect(typeof logArgs).toBe('string');
      expect(logArgs).not.toContain(SENSITIVE_BODY);
      expect(logArgs).toContain('status=429');

      global.fetch = originalFetch;
    });
  });
});
