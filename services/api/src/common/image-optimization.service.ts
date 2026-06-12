import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

const MIN_IMAGE_WIDTH = 160;
const MAX_IMAGE_WIDTH = 1200;
const IMAGE_CACHE_TTL_MS = 24 * 60 * 60_000;
const IMAGE_CACHE_MAX_ENTRIES = 100;

type BinaryImage = {
  contentType: string;
  buffer: Buffer;
};

@Injectable()
export class ImageOptimizationService {
  private readonly cache = new Map<string, {
    expiresAt: number;
    image: BinaryImage;
  }>();

  async resizeToWebp(image: BinaryImage, cacheKey: string, requestedWidth?: string): Promise<BinaryImage> {
    const width = this.parseWidth(requestedWidth);
    if (!width) return image;

    const key = `${cacheKey}:${width}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.image;
    }

    const buffer = await sharp(image.buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78, effort: 3 })
      .toBuffer();
    const optimized = { contentType: 'image/webp', buffer };

    if (this.cache.size >= IMAGE_CACHE_MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      expiresAt: Date.now() + IMAGE_CACHE_TTL_MS,
      image: optimized,
    });
    return optimized;
  }

  private parseWidth(value?: string): number | null {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(MAX_IMAGE_WIDTH, Math.max(MIN_IMAGE_WIDTH, parsed));
  }
}
