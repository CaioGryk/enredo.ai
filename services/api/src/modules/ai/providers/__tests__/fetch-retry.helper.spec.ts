import { withRetry, isAuthError, isTransientError } from '../fetch-retry.helper';

describe('fetch-retry helper', () => {
  describe('isAuthError', () => {
    it('should return true for 401 status', () => {
      expect(isAuthError(401)).toBe(true);
    });

    it('should return true for 403 status', () => {
      expect(isAuthError(403)).toBe(true);
    });

    it('should return false for 429 status', () => {
      expect(isAuthError(429)).toBe(false);
    });

    it('should return false for 500 status', () => {
      expect(isAuthError(500)).toBe(false);
    });
  });

  describe('isTransientError', () => {
    it('should return true for 429', () => {
      expect(isTransientError(429)).toBe(true);
    });

    it('should return true for 500', () => {
      expect(isTransientError(500)).toBe(true);
    });

    it('should return true for 502', () => {
      expect(isTransientError(502)).toBe(true);
    });

    it('should return true for 503', () => {
      expect(isTransientError(503)).toBe(true);
    });

    it('should return true for 504', () => {
      expect(isTransientError(504)).toBe(true);
    });

    it('should return false for 401', () => {
      expect(isTransientError(401)).toBe(false);
    });

    it('should return false for 403', () => {
      expect(isTransientError(403)).toBe(false);
    });

    it('should return false for 400', () => {
      expect(isTransientError(400)).toBe(false);
    });
  });

  describe('withRetry', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should succeed on first attempt', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'success' }),
      } as Response);

      const operation = jest.fn().mockResolvedValue({ result: 'success' });
      const result = await withRetry(operation, { maxAttempts: 2 });

      expect(result).toEqual({ result: 'success' });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry once on 429 then succeed', async () => {
      let attempts = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            text: async () => 'Rate limited',
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ result: 'success' }),
        } as Response);
      });

      const operation = jest.fn().mockImplementation(async () => {
        const response = await global.fetch('http://test');
        if (!response.ok) {
          throw new Error(`API error: status ${response.status}`);
        }
        return response.json();
      });

      const result = await withRetry(operation, { maxAttempts: 2 });

      expect(result).toEqual({ result: 'success' });
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry once on 500 then succeed', async () => {
      let attempts = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: async () => 'Internal error',
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ result: 'success' }),
        } as Response);
      });

      const operation = jest.fn().mockImplementation(async () => {
        const response = await global.fetch('http://test');
        if (!response.ok) {
          throw new Error(`API error: status ${response.status}`);
        }
        return response.json();
      });

      const result = await withRetry(operation, { maxAttempts: 2 });

      expect(result).toEqual({ result: 'success' });
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry once on 503 then succeed', async () => {
      let attempts = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts === 1) {
          return Promise.resolve({
            ok: false,
            status: 503,
            text: async () => 'Service unavailable',
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ result: 'success' }),
        } as Response);
      });

      const operation = jest.fn().mockImplementation(async () => {
        const response = await global.fetch('http://test');
        if (!response.ok) {
          throw new Error(`API error: status ${response.status}`);
        }
        return response.json();
      });

      const result = await withRetry(operation, { maxAttempts: 2 });

      expect(result).toEqual({ result: 'success' });
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 401', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      const operation = jest.fn().mockImplementation(async () => {
        const response = await global.fetch('http://test');
        if (!response.ok) {
          throw new Error(`API error: status ${response.status}`);
        }
        return response.json();
      });

      await expect(withRetry(operation, { maxAttempts: 2 })).rejects.toThrow('status 401');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 403', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      } as Response);

      const operation = jest.fn().mockImplementation(async () => {
        const response = await global.fetch('http://test');
        if (!response.ok) {
          throw new Error(`API error: status ${response.status}`);
        }
        return response.json();
      });

      await expect(withRetry(operation, { maxAttempts: 2 })).rejects.toThrow('status 403');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on missing API key error', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('OPENAI_API_KEY is not configured'));

      await expect(withRetry(operation, { maxAttempts: 2 })).rejects.toThrow('OPENAI_API_KEY is not configured');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on FREE_LLM_ONLY paid model block', async () => {
      const operation = jest.fn().mockRejectedValue(
        new Error('Paid models are disabled. FREE_LLM_ONLY=true restricts to free models only.')
      );

      await expect(withRetry(operation, { maxAttempts: 2 })).rejects.toThrow('FREE_LLM_ONLY');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw last error after max attempts exhausted', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable',
      } as Response);

      const operation = jest.fn().mockImplementation(async () => {
        const response = await global.fetch('http://test');
        if (!response.ok) {
          throw new Error(`API error: status ${response.status}`);
        }
        return response.json();
      });

      await expect(withRetry(operation, { maxAttempts: 2 })).rejects.toThrow('status 503');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback on transient failures', async () => {
      const onRetry = jest.fn();
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limited',
      } as Response);

      const operation = jest.fn().mockImplementation(async () => {
        const response = await global.fetch('http://test');
        if (!response.ok) {
          throw new Error(`API error: status ${response.status}`);
        }
        return response.json();
      });

      await expect(withRetry(operation, { maxAttempts: 2, onRetry })).rejects.toThrow();
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 429);
    });
  });
});