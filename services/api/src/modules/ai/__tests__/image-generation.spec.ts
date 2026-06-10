import { ConfigService } from '@nestjs/config';
import { GoogleImageProvider } from '../providers/google-image.provider';
import { CloudflareImageProvider } from '../providers/cloudflare-image.provider';
import { ReplicateImageProvider } from '../providers/replicate-image.provider';
import { ImageGenerationService } from '../image-generation.service';

describe('ImageGenerationService', () => {
  const disabledConfig = { get: () => undefined } as any;
  const enabledConfig = { get: (key: string) => (key === 'ENABLE_IMAGE_GENERATION' ? 'true' : undefined) } as any;
  const mockGoogle = new GoogleImageProvider(disabledConfig as any);
  const mockCloudflare = new CloudflareImageProvider(disabledConfig as any);
  const mockReplicate = new ReplicateImageProvider(disabledConfig as any);

  describe('isEnabled', () => {
    it('returns false when ENABLE_IMAGE_GENERATION is not set', () => {
      const service = new ImageGenerationService(disabledConfig as any, mockGoogle, mockCloudflare, mockReplicate);
      expect(service.isEnabled()).toBe(false);
    });

    it('returns true when ENABLE_IMAGE_GENERATION=true (string)', () => {
      const service = new ImageGenerationService(enabledConfig as any, mockGoogle, mockCloudflare, mockReplicate);
      expect(service.isEnabled()).toBe(true);
    });

    it('returns false when ENABLE_IMAGE_GENERATION=false (string)', () => {
      const config = { get: (key: string) => (key === 'ENABLE_IMAGE_GENERATION' ? 'false' : undefined) } as any;
      const service = new ImageGenerationService(config as any, mockGoogle, mockCloudflare, mockReplicate);
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('generate returns disabled error', () => {
    it('generateStoryCover', async () => {
      const service = new ImageGenerationService(disabledConfig as any, mockGoogle, mockCloudflare, mockReplicate);
      const result = await service.generateStoryCover('Test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('generatePremiseCover', async () => {
      const service = new ImageGenerationService(disabledConfig as any, mockGoogle, mockCloudflare, mockReplicate);
      const result = await service.generatePremiseCover('Test', 'synopsis');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('generateCharacterPortrait', async () => {
      const service = new ImageGenerationService(disabledConfig as any, mockGoogle, mockCloudflare, mockReplicate);
      const result = await service.generateCharacterPortrait('Hero', 'A warrior');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });
  });

  describe('provider chain', () => {
    it('uses Cloudflare first when available', async () => {
      const cfConfig = { get: (key: string) => {
        if (key === 'ENABLE_IMAGE_GENERATION') return 'true';
        if (key === 'CLOUDFLARE_ACCOUNT_ID') return 'acct-1';
        if (key === 'CLOUDFLARE_API_TOKEN') return 'tok-1';
        return undefined;
      } } as any;
      const cf = new CloudflareImageProvider(cfConfig as any);
      jest.spyOn(cf, 'generate').mockResolvedValue({ success: true, base64Image: '...', provider: 'cloudflare' });
      const google = new GoogleImageProvider(disabledConfig);

      const replicate = new ReplicateImageProvider(disabledConfig);
      const service = new ImageGenerationService(cfConfig, google, cf, replicate);
      await service.generateCharacterPortrait('Hero', 'Brave warrior');

      expect(cf.generate).toHaveBeenCalled();
    });

    it('falls back to Google when Cloudflare unavailable', async () => {
      const gConfig = { get: (key: string) => {
        if (key === 'ENABLE_IMAGE_GENERATION') return 'true';
        if (key === 'GOOGLE_AI_API_KEY') return 'google-key';
        return undefined;
      } } as any;
      const cf = new CloudflareImageProvider(disabledConfig);
      const google = new GoogleImageProvider(gConfig as any);
      jest.spyOn(google, 'generate').mockResolvedValue({ success: true, base64Image: '...', provider: 'google-image' });

      const replicate = new ReplicateImageProvider(disabledConfig);
      const service = new ImageGenerationService(gConfig, google, cf, replicate);
      const result = await service.generateCharacterPortrait('Hero', 'Brave warrior');

      expect(google.generate).toHaveBeenCalled();
      expect(result.provider).toBe('google-image');
    });

    it('falls back to Google when Cloudflare request fails', async () => {
      const bothConfig = { get: (key: string) => {
        if (key === 'ENABLE_IMAGE_GENERATION') return 'true';
        if (key === 'CLOUDFLARE_ACCOUNT_ID') return 'acct-1';
        if (key === 'CLOUDFLARE_API_TOKEN') return 'tok-1';
        if (key === 'GOOGLE_AI_API_KEY') return 'google-key';
        return undefined;
      } } as any;
      const cf = new CloudflareImageProvider(bothConfig as any);
      jest.spyOn(cf, 'generate').mockResolvedValue({ success: false, error: 'timeout' });
      const google = new GoogleImageProvider(bothConfig as any);
      jest.spyOn(google, 'generate').mockResolvedValue({ success: true, base64Image: '...', provider: 'google-image' });

      const replicate = new ReplicateImageProvider(disabledConfig);
      const service = new ImageGenerationService(bothConfig as any, google, cf, replicate);
      const result = await service.generateCharacterPortrait('Hero', 'Brave warrior');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('google-image');
    });

    it('falls back to Replicate when Cloudflare and Google fail', async () => {
      const config = { get: (key: string) => {
        if (key === 'ENABLE_IMAGE_GENERATION') return 'true';
        if (key === 'CLOUDFLARE_ACCOUNT_ID') return 'acct-1';
        if (key === 'CLOUDFLARE_API_TOKEN') return 'tok-1';
        if (key === 'GOOGLE_AI_API_KEY') return 'google-key';
        if (key === 'REPLICATE_API_TOKEN') return 'replicate-token';
        return undefined;
      } } as any;
      const cf = new CloudflareImageProvider(config);
      jest.spyOn(cf, 'generate').mockResolvedValue({ success: false, error: 'cloudflare quota' });
      const google = new GoogleImageProvider(config);
      jest.spyOn(google, 'generate').mockResolvedValue({ success: false, error: 'google quota' });
      const replicate = new ReplicateImageProvider(config);
      jest.spyOn(replicate, 'generate').mockResolvedValue({
        success: true,
        imageUrl: 'https://replicate.delivery/image.webp',
        provider: 'replicate',
      });

      const service = new ImageGenerationService(config, google, cf, replicate);
      const result = await service.generateCharacterPortrait('Hero', 'Brave warrior');

      expect(cf.generate).toHaveBeenCalled();
      expect(google.generate).toHaveBeenCalled();
      expect(replicate.generate).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.provider).toBe('replicate');
    });

    it('uses Replicate when Cloudflare and Google are unavailable', async () => {
      const config = { get: (key: string) => {
        if (key === 'ENABLE_IMAGE_GENERATION') return 'true';
        if (key === 'REPLICATE_API_TOKEN') return 'replicate-token';
        return undefined;
      } } as any;
      const cf = new CloudflareImageProvider(disabledConfig);
      const google = new GoogleImageProvider(disabledConfig);
      const replicate = new ReplicateImageProvider(config);
      jest.spyOn(replicate, 'generate').mockResolvedValue({
        success: true,
        imageUrl: 'https://replicate.delivery/image.webp',
        provider: 'replicate',
      });

      const service = new ImageGenerationService(config, google, cf, replicate);
      const result = await service.generateCharacterPortrait('Hero', 'Brave warrior');

      expect(replicate.generate).toHaveBeenCalled();
      expect(result.provider).toBe('replicate');
    });

    it('returns error when no provider is configured', async () => {
      const enabled = { get: (key: string) => (key === 'ENABLE_IMAGE_GENERATION' ? 'true' : undefined) } as any;
      const service = new ImageGenerationService(enabled as any, mockGoogle, mockCloudflare, mockReplicate);
      const result = await service.generateCharacterPortrait('Hero', 'Brave warrior');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });
});

describe('CloudflareImageProvider', () => {
  describe('isAvailable', () => {
    it('returns false when CLOUDFLARE_ACCOUNT_ID is not set', () => {
      const config = { get: (key: string) => (key === 'CLOUDFLARE_API_TOKEN' ? 'tok' : undefined) } as any;
      expect(new CloudflareImageProvider(config).isAvailable()).toBe(false);
    });

    it('returns false when CLOUDFLARE_API_TOKEN is not set', () => {
      const config = { get: (key: string) => (key === 'CLOUDFLARE_ACCOUNT_ID' ? 'acct' : undefined) } as any;
      expect(new CloudflareImageProvider(config).isAvailable()).toBe(false);
    });

    it('returns true when both account and token are set', () => {
      const config = { get: (key: string) => {
        if (key === 'CLOUDFLARE_ACCOUNT_ID') return 'acct';
        if (key === 'CLOUDFLARE_API_TOKEN') return 'tok';
        return undefined;
      } } as any;
      expect(new CloudflareImageProvider(config).isAvailable()).toBe(true);
    });
  });

  describe('generate', () => {
    it('returns error when not available', async () => {
      const provider = new CloudflareImageProvider({ get: () => undefined as any } as any);
      const result = await provider.generate({ prompt: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('handles image binary response and returns base64Image', async () => {
      const config = { get: (key: string) => {
        if (key === 'CLOUDFLARE_ACCOUNT_ID') return 'acct';
        if (key === 'CLOUDFLARE_API_TOKEN') return 'tok';
        return undefined;
      } } as any;
      const provider = new CloudflareImageProvider(config);

      const fakeImageBytes = new Uint8Array([137, 80, 78, 71]);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true, status: 200,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => fakeImageBytes.buffer,
        json: async () => ({}),
      } as any);

      const result = await provider.generate({ prompt: 'a warrior' });
      expect(result.success).toBe(true);
      expect(result.base64Image).toBeDefined();
      expect(result.imageUrl).toContain('data:image/png;base64,');
      expect(result.provider).toBe('cloudflare');
    });

    it('handles JSON response with result.image and infers JPEG data URL', async () => {
      const config = { get: (key: string) => {
        if (key === 'CLOUDFLARE_ACCOUNT_ID') return 'acct';
        if (key === 'CLOUDFLARE_API_TOKEN') return 'tok';
        return undefined;
      } } as any;
      const provider = new CloudflareImageProvider(config);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true, status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ result: { image: '/9j/base64encodedstring' } }),
      } as any);

      const result = await provider.generate({ prompt: 'a warrior' });
      expect(result.success).toBe(true);
      expect(result.base64Image).toBe('/9j/base64encodedstring');
      expect(result.imageUrl).toBe('data:image/jpeg;base64,/9j/base64encodedstring');
    });

    it('returns safe failure on non-2xx without leaking token', async () => {
      const config = { get: (key: string) => {
        if (key === 'CLOUDFLARE_ACCOUNT_ID') return 'acct';
        if (key === 'CLOUDFLARE_API_TOKEN') return 'tok';
        return undefined;
      } } as any;
      const provider = new CloudflareImageProvider(config);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false, status: 401,
        headers: { get: () => 'application/json' },
        text: async () => 'Unauthorized',
      } as any);

      const result = await provider.generate({ prompt: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
      expect(result.error).not.toContain('tok');
    });
  });
});

describe('GoogleImageProvider', () => {
  describe('isAvailable', () => {
    it('returns false when GOOGLE_AI_API_KEY is not set', () => {
      const config = { get: () => undefined as any } as any;
      expect(new GoogleImageProvider(config).isAvailable()).toBe(false);
    });

    it('returns true when GOOGLE_AI_API_KEY is set', () => {
      const config = { get: (key: string) => (key === 'GOOGLE_AI_API_KEY' ? 'test-key' : undefined) } as any;
      expect(new GoogleImageProvider(config).isAvailable()).toBe(true);
    });
  });

  describe('generate', () => {
    it('returns error when API key is missing', async () => {
      const provider = new GoogleImageProvider({ get: () => '' as any } as any);
      const result = await provider.generate({ prompt: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });
});

describe('ReplicateImageProvider', () => {
  describe('isAvailable', () => {
    it('returns false when REPLICATE_API_TOKEN is not set', () => {
      const config = { get: () => undefined as any } as any;
      expect(new ReplicateImageProvider(config).isAvailable()).toBe(false);
    });

    it('returns true when REPLICATE_API_TOKEN is set', () => {
      const config = { get: (key: string) => (key === 'REPLICATE_API_TOKEN' ? 'test-key' : undefined) } as any;
      expect(new ReplicateImageProvider(config).isAvailable()).toBe(true);
    });
  });

  describe('generate', () => {
    it('returns error when API token is missing', async () => {
      const provider = new ReplicateImageProvider({ get: () => '' as any } as any);
      const result = await provider.generate({ prompt: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('returns imageUrl from Replicate output array', async () => {
      const config = { get: (key: string) => {
        if (key === 'REPLICATE_API_TOKEN') return 'replicate-token';
        return undefined;
      } } as any;
      const provider = new ReplicateImageProvider(config);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ status: 'succeeded', output: ['https://replicate.delivery/image.webp'] }),
      } as any);

      const result = await provider.generate({ prompt: 'a warrior', aspectRatio: '9:16' });
      expect(result.success).toBe(true);
      expect(result.imageUrl).toBe('https://replicate.delivery/image.webp');
      expect(result.provider).toBe('replicate');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer replicate-token',
            Prefer: 'wait=60',
          }),
        }),
      );
    });

    it('returns safe failure on non-2xx without leaking token', async () => {
      const config = { get: (key: string) => {
        if (key === 'REPLICATE_API_TOKEN') return 'replicate-token';
        return undefined;
      } } as any;
      const provider = new ReplicateImageProvider(config);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 402,
        json: async () => ({ error: 'payment required' }),
      } as any);

      const result = await provider.generate({ prompt: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('402');
      expect(result.error).not.toContain('replicate-token');
    });
  });
});
