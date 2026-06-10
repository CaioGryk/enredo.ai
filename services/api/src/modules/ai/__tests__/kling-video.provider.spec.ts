import { KlingVideoProvider } from '../providers/kling-video.provider';

describe('KlingVideoProvider', () => {
  const enabledConfig = new Map<string, string>([
    ['KLING_ENABLED', 'true'],
    ['KLING_API_KEY', 'sk-kling-test-key'],
    ['KLING_API_BASE_URL', 'https://api.klingapi.com'],
    ['KLING_MODEL', 'kling-v1-5'],
  ]);

  const disabledConfig = new Map<string, string>([
    ['KLING_ENABLED', 'false'],
  ]);

  function makeProvider(config: Map<string, string>) {
    return new KlingVideoProvider({
      get: (key: string) => config.get(key) ?? undefined,
    } as any);
  }

  function stubFetch(json: unknown, status = 200) {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => json,
      text: async () => JSON.stringify(json),
    });
    (global as any).fetch = fetchMock;
    return fetchMock;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('returns kling', () => {
      expect(makeProvider(enabledConfig).name).toBe('kling');
    });
  });

  describe('isAvailable', () => {
    it('returns false when disabled', () => {
      expect(makeProvider(disabledConfig).isAvailable()).toBe(false);
    });

    it('returns false when enabled but no API key', () => {
      const config = new Map(enabledConfig);
      config.set('KLING_API_KEY', '');
      expect(makeProvider(config).isAvailable()).toBe(false);
    });

    it('returns true when enabled with API key', () => {
      expect(makeProvider(enabledConfig).isAvailable()).toBe(true);
    });
  });

  describe('generate', () => {
    it('returns disabled error when KLING_ENABLED=false', async () => {
      const result = await makeProvider(disabledConfig).generate({ prompt: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('returns not-configured error when API key is empty', async () => {
      const config = new Map(enabledConfig);
      config.set('KLING_API_KEY', '');
      const result = await makeProvider(config).generate({ prompt: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should send model (not model_name) in create-task payload', async () => {
      const fetchMock = stubFetch({
        data: { task_id: 'task-1', task_status: 'succeed', task_result: { videos: [{ url: 'http://vid.mp4' }] } },
      });

      const provider = makeProvider(enabledConfig);
      jest.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);
      await provider.generate({ prompt: 'cinematic scene', duration: 5 });

      const createCall = fetchMock.mock.calls.find(([url]: [string]) => url.includes('text2video'));
      const body = JSON.parse(createCall?.[1]?.body ?? '{}');
      expect(body.model).toBe('kling-v1-5');
      expect(body.model_name).toBeUndefined();
      expect(body.prompt).toBe('cinematic scene');
    });

    it('should extract task_id from create-task and poll with it', async () => {
      stubFetch({
        data: { task_id: 'task-42', task_status: 'succeed', task_result: { videos: [{ url: 'http://vid.mp4' }] } },
      });

      const provider = makeProvider(enabledConfig);
      jest.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);
      const result = await provider.generate({ prompt: 'test' });

      expect(result.success).toBe(true);
      expect(result.videoUrl).toBe('http://vid.mp4');
      expect(result.provider).toBe('kling');
    });

    it('should return failure when task creation is non-2xx', async () => {
      stubFetch({ error: 'unauthorized' }, 401);

      const result = await makeProvider(enabledConfig).generate({ prompt: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
      expect(result.videoUrl).toBeUndefined();
    });

    it('should return failure when task creation response has no task_id', async () => {
      stubFetch({ data: { status: 'ok' } });

      const result = await makeProvider(enabledConfig).generate({ prompt: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('no task_id');
    });

    it('should return success after polling completes (simulated)', async () => {
      let callCount = 0;
      (global as any).fetch = jest.fn().mockImplementation(async (url: string, _init: any) => {
        if (url.includes('text2video')) {
          return { ok: true, status: 200, json: async () => ({ data: { task_id: 'task-poll' } }), text: async () => '' };
        }
        callCount++;
        if (callCount <= 2) {
          return { ok: true, status: 200, json: async () => ({ data: { task_status: 'processing' } }), text: async () => '' };
        }
        return {
          ok: true, status: 200,
          json: async () => ({ data: { task_status: 'succeed', task_result: { videos: [{ url: 'http://final.mp4' }] } } }),
          text: async () => '',
        };
      });

      const provider = makeProvider(enabledConfig);
      const sleepSpy = jest.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);
      const result = await provider.generate({ prompt: 'test' });

      expect(result.success).toBe(true);
      expect(result.videoUrl).toBe('http://final.mp4');
      expect(sleepSpy).toHaveBeenCalled();
    });

    it('should return failure when task status is failed', async () => {
      (global as any).fetch = jest.fn().mockImplementation(async (url: string, _init: any) => {
        if (url.includes('text2video')) {
          return { ok: true, status: 200, json: async () => ({ data: { task_id: 'task-fail' } }), text: async () => '' };
        }
        return { ok: true, status: 200, json: async () => ({ data: { task_status: 'failed' } }), text: async () => '' };
      });

      const provider = makeProvider(enabledConfig);
      jest.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);
      const result = await provider.generate({ prompt: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('failed');
    });

    it('should return failure when non-2xx on polling', async () => {
      (global as any).fetch = jest.fn().mockImplementation(async (url: string, _init: any) => {
        if (url.includes('text2video')) {
          return { ok: true, status: 200, json: async () => ({ data: { task_id: 'task-503' } }), text: async () => '' };
        }
        return { ok: false, status: 503, json: async () => ({}), text: async () => '' };
      });

      const provider = makeProvider(enabledConfig);
      jest.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);
      const result = await provider.generate({ prompt: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('503');
    });

    it('should extract video URL from alt path data.videos[0].url', async () => {
      (global as any).fetch = jest.fn().mockImplementation(async (url: string, _init: any) => {
        if (url.includes('text2video')) {
          return { ok: true, status: 200, json: async () => ({ data: { task_id: 'task-alt' } }), text: async () => '' };
        }
        return {
          ok: true, status: 200,
          json: async () => ({ data: { task_status: 'completed', videos: [{ url: 'http://alt-vid.mp4' }] } }),
          text: async () => '',
        };
      });

      const provider = makeProvider(enabledConfig);
      jest.spyOn(provider as any, 'sleep').mockResolvedValue(undefined);
      const result = await provider.generate({ prompt: 'test' });

      expect(result.success).toBe(true);
      expect(result.videoUrl).toBe('http://alt-vid.mp4');
    });

    it('should handle network error gracefully', async () => {
      (global as any).fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await makeProvider(enabledConfig).generate({ prompt: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Provider unavailable');
    });
  });
});
