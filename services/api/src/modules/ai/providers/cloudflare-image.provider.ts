import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageProvider,
} from '../interfaces/image-generation.interface';

@Injectable()
export class CloudflareImageProvider implements ImageProvider {
  name = 'cloudflare';
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4/accounts';
  private readonly logger = new Logger(CloudflareImageProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID') || '';
    this.apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN') || '';
    this.model =
      this.configService.get<string>('CLOUDFLARE_IMAGE_MODEL') ||
      '@cf/black-forest-labs/flux-1-schnell';
  }

  isAvailable(): boolean {
    return this.accountId.length > 0 && this.apiToken.length > 0;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Cloudflare image generation is not configured. Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.',
      };
    }

    const prompt = this.enhancePrompt(request.prompt, request.style);

    try {
      const url = `${this.baseUrl}/${this.accountId}/ai/run/${this.model}`;

      this.logger.log(`Calling Cloudflare AI (model=${this.model})`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        this.logger.error(
          `Cloudflare API error (status=${response.status}) — body redacted`,
        );
        return {
          success: false,
          error: `Cloudflare API returned status ${response.status}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('image/')) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = this.arrayBufferToBase64(arrayBuffer);
        const mimeType = contentType.split(';')[0] || 'image/png';
        return {
          success: true,
          imageUrl: `data:${mimeType};base64,${base64}`,
          base64Image: base64,
          prompt: request.prompt,
          provider: this.name,
        };
      }

      const data = await response.json();

      const base64Image: string | undefined =
        data?.result?.image ||
        data?.result?.base64 ||
        data?.image ||
        undefined;

      if (base64Image) {
        const mimeType = this.inferMimeType(base64Image);
        return {
          success: true,
          imageUrl: `data:${mimeType};base64,${base64Image}`,
          base64Image,
          prompt: request.prompt,
          provider: this.name,
        };
      }

      this.logger.warn('Cloudflare API returned success but no image data found');
      return {
        success: false,
        error: 'No image data in Cloudflare response',
      };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        this.logger.error('Cloudflare API request timed out');
        return {
          success: false,
          error: 'Image generation timed out',
        };
      }

      this.logger.error(`Cloudflare API network error: ${error.message}`);
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

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString('base64');
  }

  private inferMimeType(base64: string): string {
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBOR')) return 'image/png';
    if (base64.startsWith('R0lG')) return 'image/gif';
    if (base64.startsWith('UklGR')) return 'image/webp';
    return 'image/png';
  }
}
