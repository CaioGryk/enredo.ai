import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoProvider,
} from './interfaces/video-generation.interface';

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const value = this.configService.get<boolean | string>('ENABLE_VIDEO_GENERATION');
    if (typeof value === 'boolean') {
      this.enabled = value;
    } else if (typeof value === 'string') {
      this.enabled = value.toLowerCase().trim() === 'true';
    } else {
      this.enabled = false;
    }
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

    // Feature-flagged: Real video generation not yet implemented
    // This is a foundation for future implementation
    this.logger.log('Video generation called but real provider not yet implemented');
    return {
      success: false,
      error: 'Video generation not yet implemented',
      message: 'Video generation is prepared but not yet available. Check back later.',
    };
  }

  getProvider(): VideoProvider | null {
    if (!this.enabled) {
      return null;
    }

    // Return a placeholder provider for now
    return {
      name: 'video-placeholder',
      isAvailable: () => false,
      generate: async (_request: VideoGenerationRequest) => {
        return {
          success: false,
          error: 'Video provider not yet implemented',
        };
      },
    };
  }
}
