import { Module } from '@nestjs/common';
import { SceneMediaController } from './scene-media.controller';
import { SceneMediaFeedController } from './scene-media-feed.controller';
import { SceneMediaService } from './scene-media.service';
import { PrismaModule } from '@common/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { AiModule } from '../ai/ai.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [PrismaModule, BillingModule, AiModule, ModerationModule],
  controllers: [SceneMediaFeedController, SceneMediaController],
  providers: [SceneMediaService],
  exports: [SceneMediaService],
})
export class SceneMediaModule {}
