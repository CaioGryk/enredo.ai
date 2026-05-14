import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { LibraryModule } from './modules/library/library.module';
import { ReadingModule } from './modules/reading/reading.module';
import { AiModule } from './modules/ai/ai.module';
import { BillingModule } from './modules/billing/billing.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { HealthModule } from './modules/health/health.module';
import { StorySetupModule } from './modules/story-setup/story-setup.module';
import { SceneMediaModule } from './modules/scene-media/scene-media.module';
import { StoryLifecycleModule } from './modules/story-lifecycle/story-lifecycle.module';
import { StoryGenerationModule } from './modules/story-generation/story-generation.module';
import { AdminStoryGenerationUsageModule } from './modules/admin/story-generation-usage/admin-story-generation-usage.module';
import { AdminSceneMediaModule } from './modules/admin/scene-media-moderation/admin-scene-media.module';
import { PrismaModule } from './common/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    LibraryModule,
    ReadingModule,
    AiModule,
    BillingModule,
    ModerationModule,
    StorySetupModule,
    SceneMediaModule,
    StoryLifecycleModule,
    StoryGenerationModule,
    AdminStoryGenerationUsageModule,
    AdminSceneMediaModule,
  ],
})
export class AppModule {}