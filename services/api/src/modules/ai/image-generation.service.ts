import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleImageProvider } from './providers/google-image.provider';
import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageProvider,
} from './interfaces/image-generation.interface';

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);
  private readonly googleProvider: GoogleImageProvider;

  constructor(
    private readonly configService: ConfigService,
    googleImageProvider: GoogleImageProvider,
  ) {
    this.googleProvider = googleImageProvider;
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
      return {
        success: false,
        error: 'Image generation is disabled in current environment',
      };
    }

    const imagePrompt =
      prompt ||
      `Cinematic book cover for "${storyTitle}", atmospheric, dramatic lighting, no text, no logos, high quality digital art`;

    return this.generateWithFallback({
      prompt: imagePrompt,
      aspectRatio: '16:9',
      style: 'cinematic',
    });
  }

  async generatePremiseCover(premiseTitle: string, synopsis: string, prompt?: string): Promise<ImageGenerationResponse> {
    if (!this.isEnabled()) {
      this.logger.warn('Image generation is disabled');
      return {
        success: false,
        error: 'Image generation is disabled in current environment',
      };
    }

    const imagePrompt =
      prompt ||
      `Cinematic cover image for story premise "${premiseTitle}": ${synopsis}. Atmospheric, dramatic, no text, no logos, high quality`;

    return this.generateWithFallback({
      prompt: imagePrompt,
      aspectRatio: '16:9',
      style: 'cinematic',
    });
  }

  async generateCharacterPortrait(
    characterName: string,
    characterDescription: string,
    prompt?: string,
  ): Promise<ImageGenerationResponse> {
    if (!this.isEnabled()) {
      this.logger.warn('Image generation is disabled');
      return {
        success: false,
        error: 'Image generation is disabled in current environment',
      };
    }

    const imagePrompt =
      prompt ||
      `Character portrait of ${characterName}: ${characterDescription}. Editorial style, dramatic lighting, no text, no logos, high quality`;

    return this.generateWithFallback({
      prompt: imagePrompt,
      aspectRatio: '9:16',
      style: 'cinematic',
    });
  }

  async generateSceneImage(sceneExcerpt: string, prompt?: string): Promise<ImageGenerationResponse> {
    if (!this.isEnabled()) {
      this.logger.warn('Image generation is disabled');
      return {
        success: false,
        error: 'Image generation is disabled in current environment',
      };
    }

    const imagePrompt =
      prompt ||
      `Cinematic scene illustration: ${sceneExcerpt}. Atmospheric, dramatic lighting, detailed background, no text, no logos, high quality digital art`;

    return this.generateWithFallback({
      prompt: imagePrompt,
      aspectRatio: '16:9',
      style: 'cinematic',
    });
  }

  private async generateWithFallback(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.googleProvider.isAvailable()) {
      this.logger.warn('Google AI provider not available - missing API key');
      return {
        success: false,
        error: 'Image generation provider not configured',
      };
    }

    try {
      const result = await this.googleProvider.generate(request);

      if (!result.success) {
        this.logger.warn(`Image generation failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Image generation error: ${error.message}`);
      return {
        success: false,
        error: `Image generation error: ${error.message}`,
      };
    }
  }
}
