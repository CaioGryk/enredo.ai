import { ConfigService } from '@nestjs/config';
import { PublicMediaStorageService } from '../public-media-storage.service';

describe('PublicMediaStorageService', () => {
  it('stays disabled when Supabase storage credentials are absent', async () => {
    const config = new ConfigService({});
    const imageOptimization = { resizeToWebp: jest.fn() };
    const service = new PublicMediaStorageService(config, imageOptimization as any);

    expect(service.isEnabled()).toBe(false);
    await expect(service.persistPublicImage('data:image/png;base64,AAAA', 'cover.webp')).resolves.toBeNull();
    expect(imageOptimization.resizeToWebp).not.toHaveBeenCalled();
  });

  it('recognizes URLs served by the configured public bucket', () => {
    const config = new ConfigService({
      SUPABASE_URL: 'https://project.supabase.co/',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      SUPABASE_STORAGE_BUCKET: 'enredo-media',
    });
    const service = new PublicMediaStorageService(config, {} as any);

    expect(service.isEnabled()).toBe(true);
    expect(service.isStoredPublicUrl(
      'https://project.supabase.co/storage/v1/object/public/enredo-media/stories/a.webp',
    )).toBe(true);
    expect(service.isStoredPublicUrl('https://other.example/a.webp')).toBe(false);
  });
});
