import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleImageProvider } from './providers/google-image.provider';
import { CloudflareImageProvider } from './providers/cloudflare-image.provider';
import { ReplicateImageProvider } from './providers/replicate-image.provider';
import {
  ImageGenerationRequest,
  ImageGenerationResponse,
} from './interfaces/image-generation.interface';

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);
  private readonly googleProvider: GoogleImageProvider;
  private readonly cloudflareProvider: CloudflareImageProvider;
  private readonly replicateProvider: ReplicateImageProvider;

  constructor(
    private readonly configService: ConfigService,
    googleImageProvider: GoogleImageProvider,
    cloudflareImageProvider: CloudflareImageProvider,
    replicateImageProvider: ReplicateImageProvider,
  ) {
    this.googleProvider = googleImageProvider;
    this.cloudflareProvider = cloudflareImageProvider;
    this.replicateProvider = replicateImageProvider;
  }

  isEnabled(): boolean {
    const value = this.configService.get<boolean | string>('ENABLE_IMAGE_GENERATION');
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase().trim() === 'true';
    return false;
  }

  async generateStoryCover(storyTitle: string, prompt?: string): Promise<ImageGenerationResponse> {
    if (!this.isEnabled()) {
      this.logger.warn('Image generation is disabled');
      return { success: false, error: 'Image generation is disabled in current environment' };
    }

    const imagePrompt = prompt ||
      `Cinematic book cover for "${storyTitle}", atmospheric, dramatic lighting, no text, no logos, high quality digital art`;

    return this.generateWithFallback({ prompt: imagePrompt, aspectRatio: '16:9', style: 'cinematic' });
  }

  async generatePremiseCover(premiseTitle: string, synopsis: string, prompt?: string): Promise<ImageGenerationResponse> {
    if (!this.isEnabled()) {
      this.logger.warn('Image generation is disabled');
      return { success: false, error: 'Image generation is disabled in current environment' };
    }

    const imagePrompt = prompt ||
      `Cinematic cover image for story premise "${premiseTitle}": ${synopsis}. Atmospheric, dramatic, no text, no logos, high quality`;

    return this.generateWithFallback({ prompt: imagePrompt, aspectRatio: '16:9', style: 'cinematic' });
  }

  async generateCharacterPortrait(
    characterName: string,
    characterDescription: string,
    prompt?: string,
  ): Promise<ImageGenerationResponse> {
    if (!this.isEnabled()) {
      this.logger.warn('Image generation is disabled');
      return { success: false, error: 'Image generation is disabled in current environment' };
    }

    const imagePrompt = prompt ||
      `Character portrait of ${characterName}: ${characterDescription}. Editorial style, dramatic lighting, no text, no logos, high quality`;

    return this.generateWithFallback({ prompt: imagePrompt, aspectRatio: '9:16', style: 'cinematic' });
  }

  async generateSceneImage(sceneExcerpt: string, prompt?: string): Promise<ImageGenerationResponse> {
    if (!this.isEnabled()) {
      this.logger.warn('Image generation is disabled');
      return { success: false, error: 'Image generation is disabled in current environment' };
    }

    const imagePrompt = prompt ||
      `Cinematic scene illustration: ${sceneExcerpt}. Atmospheric, dramatic lighting, detailed background, no text, no logos, high quality digital art`;

    return this.generateWithFallback({ prompt: imagePrompt, aspectRatio: '16:9', style: 'cinematic' });
  }

  private async generateWithFallback(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (this.cloudflareProvider.isAvailable()) {
      this.logger.log('Using Cloudflare for image generation');
      const result = await this.cloudflareProvider.generate(request);
      if (result.success) return result;

      this.logger.warn(`Cloudflare image generation failed: ${result.error}`);
      if (this.googleProvider.isAvailable()) {
        this.logger.log('Falling back to Google for image generation');
        const googleResult = await this.googleProvider.generate(request);
        if (googleResult.success) return googleResult;

        this.logger.warn(`Google image generation failed: ${googleResult.error}`);
        if (this.replicateProvider.isAvailable()) {
          this.logger.log('Falling back to Replicate for image generation');
          return this.replicateProvider.generate(request);
        }
        return googleResult;
      }
      if (this.replicateProvider.isAvailable()) {
        this.logger.log('Falling back to Replicate for image generation');
        return this.replicateProvider.generate(request);
      }
      return result;
    }

    if (this.googleProvider.isAvailable()) {
      this.logger.log('Cloudflare unavailable, using Google for image generation');
      const googleResult = await this.googleProvider.generate(request);
      if (googleResult.success) return googleResult;

      this.logger.warn(`Google image generation failed: ${googleResult.error}`);
      if (this.replicateProvider.isAvailable()) {
        this.logger.log('Falling back to Replicate for image generation');
        return this.replicateProvider.generate(request);
      }
      return googleResult;
    }

    if (this.replicateProvider.isAvailable()) {
      this.logger.log('Cloudflare and Google unavailable, using Replicate for image generation');
      return this.replicateProvider.generate(request);
    }

    this.logger.warn('No image generation provider configured');
    return { success: false, error: 'Image generation provider not configured' };
  }
}
