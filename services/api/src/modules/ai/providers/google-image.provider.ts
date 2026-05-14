import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageProvider,
} from '../interfaces/image-generation.interface';

@Injectable()
export class GoogleImageProvider implements ImageProvider {
  name = 'google-image';
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly logger = new Logger(GoogleImageProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY') || '';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.apiKey) {
      this.logger.error('GOOGLE_AI_API_KEY is not configured');
      return {
        success: false,
        error: 'Image generation is not configured. Missing GOOGLE_AI_API_KEY.',
      };
    }

    try {
      const enhancedPrompt = this.enhancePrompt(request.prompt, request.style);

      const response = await fetch(
        `${this.baseUrl}/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: enhancedPrompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Google AI API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Image generation failed: ${response.status}`,
        };
      }

      const data = await response.json();

      const imagePart = data.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData,
      );

      if (!imagePart?.inlineData?.data) {
        this.logger.warn('No image data in Google AI response');
        return {
          success: false,
          error: 'No image generated from prompt',
        };
      }

      return {
        success: true,
        base64Image: imagePart.inlineData.data,
        prompt: request.prompt,
        provider: this.name,
      };
    } catch (error) {
      this.logger.error(`Google image generation error: ${error.message}`);
      return {
        success: false,
        error: `Image generation error: ${error.message}`,
      };
    }
  }

  private enhancePrompt(prompt: string, style?: string): string {
    const styleGuide = style || 'cinematic';
    return `${prompt}. Style: ${styleGuide}, high quality, detailed, no text, no logos, no watermarks.`;
  }
}
