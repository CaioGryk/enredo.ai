import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { ImageOptimizationService } from './image-optimization.service';
import { isInlineImageDataUrl, parseInlineImageDataUrl } from './safe-image-url';

const PUBLIC_THUMBNAIL_WIDTH = '720';
const MAX_REMOTE_IMAGE_BYTES = 15 * 1024 * 1024;

type BinaryImage = {
  contentType: string;
  buffer: Buffer;
};

@Injectable()
export class PublicMediaStorageService {
  private readonly logger = new Logger(PublicMediaStorageService.name);
  private readonly bucket: string;
  private readonly supabaseUrl: string;
  private readonly client: SupabaseClient | null;
  private bucketReady: Promise<boolean> | null = null;

  constructor(
    config: ConfigService,
    private readonly imageOptimization: ImageOptimizationService,
  ) {
    this.supabaseUrl = (config.get<string>('SUPABASE_URL') || '').replace(/\/+$/, '');
    const serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET') || 'enredo-public-media';
    this.client = this.supabaseUrl && serviceRoleKey
      ? createClient(this.supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          realtime: { transport: WebSocket as any },
        })
      : null;
  }

  isEnabled(): boolean {
    return Boolean(this.client);
  }

  isStoredPublicUrl(url: string | null | undefined): boolean {
    if (!url || !this.supabaseUrl) return false;
    return url.startsWith(`${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/`);
  }

  async persistPublicImage(source: string | null | undefined, objectPath: string): Promise<string | null> {
    if (!source || !this.client) return null;
    if (this.isStoredPublicUrl(source)) return source;

    const image = await this.loadImage(source);
    if (!image) return null;

    const optimized = await this.imageOptimization.resizeToWebp(
      image,
      `public-storage:${objectPath}`,
      PUBLIC_THUMBNAIL_WIDTH,
    );

    if (!(await this.ensureBucket())) return null;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(objectPath, optimized.buffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true,
      });

    if (error) {
      this.logger.warn(`Failed to upload ${objectPath}: ${error.message}`);
      return null;
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(objectPath);
    return data.publicUrl;
  }

  private async ensureBucket(): Promise<boolean> {
    if (!this.client) return false;
    if (this.bucketReady) return this.bucketReady;

    this.bucketReady = (async () => {
      const { data, error } = await this.client!.storage.listBuckets();
      if (error) {
        this.logger.warn(`Failed to list Supabase Storage buckets: ${error.message}`);
        return false;
      }

      if (data.some((bucket) => bucket.name === this.bucket)) return true;

      const { error: createError } = await this.client!.storage.createBucket(this.bucket, {
        public: true,
        allowedMimeTypes: ['image/webp'],
        fileSizeLimit: MAX_REMOTE_IMAGE_BYTES,
      });

      if (createError) {
        this.logger.warn(`Failed to create public media bucket: ${createError.message}`);
        return false;
      }

      this.logger.log(`Created public Supabase Storage bucket "${this.bucket}"`);
      return true;
    })();

    return this.bucketReady;
  }

  private async loadImage(source: string): Promise<BinaryImage | null> {
    if (isInlineImageDataUrl(source)) {
      return parseInlineImageDataUrl(source);
    }

    if (!/^https:\/\//i.test(source)) return null;

    try {
      const response = await fetch(source, {
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        this.logger.warn(`Failed to download image: HTTP ${response.status}`);
        return null;
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_REMOTE_IMAGE_BYTES) {
        this.logger.warn(`Remote image exceeds ${MAX_REMOTE_IMAGE_BYTES} bytes`);
        return null;
      }

      const contentType = response.headers.get('content-type')?.split(';')[0] || '';
      if (!contentType.startsWith('image/')) return null;

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > MAX_REMOTE_IMAGE_BYTES) {
        this.logger.warn(`Downloaded image exceeds ${MAX_REMOTE_IMAGE_BYTES} bytes`);
        return null;
      }

      return { contentType, buffer };
    } catch (error) {
      this.logger.warn(`Failed to download public image: ${(error as Error).message}`);
      return null;
    }
  }
}
