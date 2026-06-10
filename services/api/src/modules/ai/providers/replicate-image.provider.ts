import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageProvider,
} from '../interfaces/image-generation.interface';

@Injectable()
export class ReplicateImageProvider implements ImageProvider {
  name = 'replicate';
  private readonly apiToken: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.replicate.com/v1';
  private readonly logger = new Logger(ReplicateImageProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.apiToken = this.configService.get<string>('REPLICATE_API_TOKEN') || '';
    this.model =
      this.configService.get<string>('REPLICATE_IMAGE_MODEL') ||
      'black-forest-labs/flux-schnell';
  }

  isAvailable(): boolean {
    return this.apiToken.length > 0;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Replicate image generation is not configured. Missing REPLICATE_API_TOKEN.',
      };
    }

    try {
      const prompt = this.enhancePrompt(request.prompt, request.style);
      const response = await fetch(`${this.baseUrl}/models/${this.model}/predictions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          Prefer: 'wait=60',
        },
        body: JSON.stringify({
          input: {
            prompt,
            aspect_ratio: this.mapAspectRatio(request.aspectRatio),
            num_outputs: 1,
            output_format: 'webp',
            ...(typeof request.seed === 'number' ? { seed: request.seed } : {}),
          },
        }),
        signal: AbortSignal.timeout(65_000),
      });

      if (!response.ok) {
        this.logger.error(`Replicate API error (status=${response.status}) — body redacted`);
        return {
          success: false,
          error: `Replicate API returned status ${response.status}`,
        };
      }

      const data = await response.json();
      const imageUrl = this.extractImageUrl(data?.output);

      if (!imageUrl) {
        this.logger.warn(`Replicate returned no image URL (status=${data?.status || 'unknown'})`);
        return {
          success: false,
          error: data?.error ? 'Replicate image generation failed' : 'No image URL in Replicate response',
        };
      }

      return {
        success: true,
        imageUrl,
        prompt: request.prompt,
        provider: this.name,
      };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        this.logger.error('Replicate API request timed out');
        return {
          success: false,
          error: 'Image generation timed out',
        };
      }

      this.logger.error(`Replicate API network error: ${error.message}`);
      return {
        success: false,
        error: 'Image generation service temporarily unavailable',
      };
    }
  }

  private enhancePrompt(prompt: string, style?: string): string {
    const styleGuide = style || 'cinematic';
    return `${prompt}. Style: ${styleGuide}, high quality, detailed, no text, no logos, no watermarks.`;
  }

  private mapAspectRatio(aspectRatio?: ImageGenerationRequest['aspectRatio']): string {
    return aspectRatio || '1:1';
  }

  private extractImageUrl(output: unknown): string | undefined {
    if (typeof output === 'string') return output;
    if (Array.isArray(output)) {
      const first = output[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object' && typeof (first as any).url === 'string') {
        return (first as any).url;
      }
    }
    return undefined;
  }
}
