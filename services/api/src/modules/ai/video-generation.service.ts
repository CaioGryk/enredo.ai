import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoProvider,
} from './interfaces/video-generation.interface';
import { KlingVideoProvider } from './providers/kling-video.provider';

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);
  private readonly enabled: boolean;
  private readonly klingProvider: KlingVideoProvider;

  constructor(
    private readonly configService: ConfigService,
    klingVideoProvider: KlingVideoProvider,
  ) {
    const value = this.configService.get<boolean | string>('ENABLE_VIDEO_GENERATION');
    if (typeof value === 'boolean') {
      this.enabled = value;
    } else if (typeof value === 'string') {
      this.enabled = value.toLowerCase().trim() === 'true';
    } else {
      this.enabled = false;
    }
    this.klingProvider = klingVideoProvider;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    if (!this.enabled) {
      this.logger.warn('Video generation is disabled in current environment (ENABLE_VIDEO_GENERATION=false)');
      return {
        success: false,
        error: 'Video generation is disabled in current environment',
        message: 'Video generation feature is currently disabled. Set ENABLE_VIDEO_GENERATION=true to enable.',
      };
    }

    if (this.klingProvider.isAvailable()) {
      this.logger.log('Delegating to Kling video provider');
      return this.klingProvider.generate(request);
    }

    this.logger.warn('Video generation enabled but Kling provider not configured (KLING_ENABLED=false or missing KLING_API_KEY)');
    return {
      success: false,
      error: 'Video generation provider not configured',
      message: 'Video generation is enabled but the Kling provider is not configured. Set KLING_ENABLED=true and KLING_API_KEY.',
    };
  }

  getProvider(): VideoProvider | null {
    if (!this.enabled) {
      return null;
    }

    if (this.klingProvider.isAvailable()) {
      return this.klingProvider;
    }

    return {
      name: 'kling-unconfigured',
      isAvailable: () => false,
      generate: async (_request: VideoGenerationRequest) => {
        return {
          success: false,
          error: 'Kling provider not configured',
        };
      },
    };
  }
}
