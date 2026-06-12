import sharp from 'sharp';
import { ImageOptimizationService } from '../image-optimization.service';

describe('ImageOptimizationService', () => {
  it('resizes API images to a bounded WebP thumbnail', async () => {
    const service = new ImageOptimizationService();
    const source = await sharp({
      create: {
        width: 1600,
        height: 1000,
        channels: 3,
        background: '#633399',
      },
    }).png().toBuffer();

    const result = await service.resizeToWebp(
      { contentType: 'image/png', buffer: source },
      'story:test',
      '720',
    );
    const metadata = await sharp(result.buffer).metadata();

    expect(result.contentType).toBe('image/webp');
    expect(metadata.width).toBe(720);
    expect(result.buffer.length).toBeLessThan(source.length);
  });

  it('returns the original image when no width is requested', async () => {
    const service = new ImageOptimizationService();
    const image = {
      contentType: 'image/jpeg',
      buffer: Buffer.from('original'),
    };

    await expect(service.resizeToWebp(image, 'story:test')).resolves.toBe(image);
  });
});
