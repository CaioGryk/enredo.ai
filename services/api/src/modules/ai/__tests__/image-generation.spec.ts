import { ConfigService } from '@nestjs/config';
import { GoogleImageProvider } from '../providers/google-image.provider';
import { ImageGenerationService } from '../image-generation.service';

describe('ImageGenerationService', () => {
  describe('isEnabled', () => {
    it('returns false when ENABLE_IMAGE_GENERATION is not set', () => {
      const mockConfig = { get: () => undefined } as any;
      const service = new ImageGenerationService(mockConfig, new GoogleImageProvider(mockConfig));
      expect(service.isEnabled()).toBe(false);
    });

    it('returns true when ENABLE_IMAGE_GENERATION=true (string)', () => {
      const mockConfig = { get: (key: string) => (key === 'ENABLE_IMAGE_GENERATION' ? 'true' : undefined) } as any;
      const service = new ImageGenerationService(mockConfig, new GoogleImageProvider(mockConfig));
      expect(service.isEnabled()).toBe(true);
    });

    it('returns false when ENABLE_IMAGE_GENERATION=false (string)', () => {
      const mockConfig = { get: (key: string) => (key === 'ENABLE_IMAGE_GENERATION' ? 'false' : undefined) } as any;
      const service = new ImageGenerationService(mockConfig, new GoogleImageProvider(mockConfig));
      expect(service.isEnabled()).toBe(false);
    });

    it('returns true when ENABLE_IMAGE_GENERATION=true (boolean)', () => {
      const mockConfig = { get: (key: string) => (key === 'ENABLE_IMAGE_GENERATION' ? true : undefined) } as any;
      const service = new ImageGenerationService(mockConfig, new GoogleImageProvider(mockConfig));
      expect(service.isEnabled()).toBe(true);
    });

    it('returns false when ENABLE_IMAGE_GENERATION="false" (string) - not truthy string', () => {
      const mockConfig = { get: (key: string) => (key === 'ENABLE_IMAGE_GENERATION' ? 'false' : undefined) } as any;
      const service = new ImageGenerationService(mockConfig, new GoogleImageProvider(mockConfig));
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('generateStoryCover', () => {
    it('returns error when image generation is disabled', async () => {
      const mockConfig = { get: () => undefined } as any;
      const service = new ImageGenerationService(mockConfig, new GoogleImageProvider(mockConfig));
      const result = await service.generateStoryCover('Test Story');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });
  });

  describe('generatePremiseCover', () => {
    it('returns error when image generation is disabled', async () => {
      const mockConfig = { get: () => undefined } as any;
      const service = new ImageGenerationService(mockConfig, new GoogleImageProvider(mockConfig));
      const result = await service.generatePremiseCover('Test Premise', 'Test synopsis');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });
  });

  describe('generateCharacterPortrait', () => {
    it('returns error when image generation is disabled', async () => {
      const mockConfig = { get: () => undefined } as any;
      const service = new ImageGenerationService(mockConfig, new GoogleImageProvider(mockConfig));
      const result = await service.generateCharacterPortrait('John', 'A hero');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });
  });
});

describe('GoogleImageProvider', () => {
  describe('isAvailable', () => {
    it('returns false when GOOGLE_AI_API_KEY is not set', () => {
      const mockConfig = { get: (key: string) => (key === 'GOOGLE_AI_API_KEY' ? '' : undefined) } as any;
      const provider = new GoogleImageProvider(mockConfig);
      expect(provider.isAvailable()).toBe(false);
    });

    it('returns true when GOOGLE_AI_API_KEY is set', () => {
      const mockConfig = { get: (key: string) => (key === 'GOOGLE_AI_API_KEY' ? 'test-key' : undefined) } as any;
      const provider = new GoogleImageProvider(mockConfig);
      expect(provider.isAvailable()).toBe(true);
    });
  });

  describe('generate', () => {
    it('returns error when API key is missing', async () => {
      const mockConfig = { get: () => '' } as any;
      const provider = new GoogleImageProvider(mockConfig);
      const result = await provider.generate({ prompt: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });
});
