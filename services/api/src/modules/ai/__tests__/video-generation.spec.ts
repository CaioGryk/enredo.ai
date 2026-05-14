import { VideoGenerationService } from '../video-generation.service';

describe('VideoGenerationService', () => {
  describe('isEnabled', () => {
    it('returns false when ENABLE_VIDEO_GENERATION is not set', () => {
      const mockConfig = { get: () => undefined } as any;
      const service = new VideoGenerationService(mockConfig);
      expect(service.isEnabled()).toBe(false);
    });

    it('returns false when ENABLE_VIDEO_GENERATION=false (string)', () => {
      const mockConfig = { get: (key: string) => (key === 'ENABLE_VIDEO_GENERATION' ? 'false' : undefined) } as any;
      const service = new VideoGenerationService(mockConfig);
      expect(service.isEnabled()).toBe(false);
    });

    it('returns true when ENABLE_VIDEO_GENERATION=true (string)', () => {
      const mockConfig = { get: (key: string) => (key === 'ENABLE_VIDEO_GENERATION' ? 'true' : undefined) } as any;
      const service = new VideoGenerationService(mockConfig);
      expect(service.isEnabled()).toBe(true);
    });

    it('returns false when ENABLE_VIDEO_GENERATION="false" (string) - not truthy string', () => {
      const mockConfig = { get: (key: string) => (key === 'ENABLE_VIDEO_GENERATION' ? 'false' : undefined) } as any;
      const service = new VideoGenerationService(mockConfig);
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('generateVideo', () => {
    it('returns error when video generation is disabled', async () => {
      const mockConfig = { get: () => undefined } as any;
      const service = new VideoGenerationService(mockConfig);
      const result = await service.generateVideo({ prompt: 'test video' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('returns error when video generation is enabled but not implemented', async () => {
      const mockConfig = { get: (key: string) => (key === 'ENABLE_VIDEO_GENERATION' ? 'true' : undefined) } as any;
      const service = new VideoGenerationService(mockConfig);
      const result = await service.generateVideo({ prompt: 'test video' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not yet implemented');
    });
  });

  describe('getProvider', () => {
    it('returns null when video generation is disabled', () => {
      const mockConfig = { get: () => undefined } as any;
      const service = new VideoGenerationService(mockConfig);
      expect(service.getProvider()).toBeNull();
    });

    it('returns provider when video generation is enabled', () => {
      const mockConfig = { get: (key: string) => (key === 'ENABLE_VIDEO_GENERATION' ? 'true' : undefined) } as any;
      const service = new VideoGenerationService(mockConfig);
      const provider = service.getProvider();
      expect(provider).not.toBeNull();
      expect(provider?.name).toBe('video-placeholder');
    });
  });
});
