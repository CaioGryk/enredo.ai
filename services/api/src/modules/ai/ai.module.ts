import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { GroqProvider } from './providers/groq.provider';
import { GoogleTextProvider } from './providers/google-text.provider';
import { MockProvider } from './providers/mock.provider';
import { GoogleImageProvider } from './providers/google-image.provider';
import { CloudflareImageProvider } from './providers/cloudflare-image.provider';
import { ReplicateImageProvider } from './providers/replicate-image.provider';
import { KlingVideoProvider } from './providers/kling-video.provider';
import { ImageGenerationService } from './image-generation.service';
import { VideoGenerationService } from './video-generation.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    OpenAIProvider,
    AnthropicProvider,
    OpenRouterProvider,
    GroqProvider,
    GoogleTextProvider,
    MockProvider,
    GoogleImageProvider,
    CloudflareImageProvider,
    ReplicateImageProvider,
    KlingVideoProvider,
    ImageGenerationService,
    VideoGenerationService,
  ],
  exports: [AiService, ImageGenerationService, VideoGenerationService],
})
export class AiModule {}
