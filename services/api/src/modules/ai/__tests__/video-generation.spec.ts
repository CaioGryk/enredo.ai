import { VideoGenerationService } from '../video-generation.service';

describe('VideoGenerationService', () => {
  const klingUnavailable = { isAvailable: () => false, generate: jest.fn() };
  const klingAvailable = {
    name: 'kling',
    isAvailable: () => true,
    generate: jest.fn().mockResolvedValue({
      success: true,
      videoUrl: 'http://kling.example/video.mp4',
      provider: 'kling',
    }),
  };

  function makeService(config: Record<string, any>, klingProvider = klingUnavailable) {
    const mockConfig = {
      get: (key: string) => config[key] ?? undefined,
    } as any;
    return new VideoGenerationService(mockConfig, klingProvider as any);
  }

  describe('isEnabled', () => {
    it('returns false when ENABLE_VIDEO_GENERATION is not set', () => {
      const service = makeService({});
      expect(service.isEnabled()).toBe(false);
    });

    it('returns false when ENABLE_VIDEO_GENERATION=false (string)', () => {
      const service = makeService({ ENABLE_VIDEO_GENERATION: 'false' });
      expect(service.isEnabled()).toBe(false);
    });

    it('returns true when ENABLE_VIDEO_GENERATION=true (string)', () => {
      const service = makeService({ ENABLE_VIDEO_GENERATION: 'true' });
      expect(service.isEnabled()).toBe(true);
    });

    it('returns false when ENABLE_VIDEO_GENERATION="false" (string)', () => {
      const service = makeService({ ENABLE_VIDEO_GENERATION: 'false' });
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('generateVideo', () => {
    it('returns error when video generation is disabled', async () => {
      const service = makeService({});
      const result = await service.generateVideo({ prompt: 'test video' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('returns provider-not-configured when enabled but Kling is unavailable', async () => {
      const service = makeService({ ENABLE_VIDEO_GENERATION: 'true' }, klingUnavailable);
      const result = await service.generateVideo({ prompt: 'test video' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('delegates to Kling provider when enabled and available', async () => {
      const kling = {
        isAvailable: () => true,
        generate: jest.fn().mockResolvedValue({
          success: true,
          videoUrl: 'http://kling.example/video.mp4',
          provider: 'kling',
        }),
      };
      const service = makeService({ ENABLE_VIDEO_GENERATION: 'true' }, kling);
      const result = await service.generateVideo({ prompt: 'cinematic scene' });
      expect(result.success).toBe(true);
      expect(result.videoUrl).toBe('http://kling.example/video.mp4');
      expect(result.provider).toBe('kling');
      expect(kling.generate).toHaveBeenCalledWith({ prompt: 'cinematic scene' });
    });

    it('returns failure when Kling provider fails', async () => {
      const kling = {
        isAvailable: () => true,
        generate: jest.fn().mockResolvedValue({
          success: false,
          error: 'Provider API error',
        }),
      };
      const service = makeService({ ENABLE_VIDEO_GENERATION: 'true' }, kling);
      const result = await service.generateVideo({ prompt: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Provider API error');
    });
  });

  describe('getProvider', () => {
    it('returns null when video generation is disabled', () => {
      const service = makeService({});
      expect(service.getProvider()).toBeNull();
    });

    it('returns Kling provider when enabled and available', () => {
      const service = makeService({ ENABLE_VIDEO_GENERATION: 'true' }, klingAvailable);
      const provider = service.getProvider();
      expect(provider).not.toBeNull();
      expect(provider?.name).toBe('kling');
    });

    it('returns unconfigured placeholder when enabled but Kling unavailable', () => {
      const service = makeService({ ENABLE_VIDEO_GENERATION: 'true' }, klingUnavailable);
      const provider = service.getProvider();
      expect(provider).not.toBeNull();
      expect(provider?.isAvailable()).toBe(false);
    });
  });
});
