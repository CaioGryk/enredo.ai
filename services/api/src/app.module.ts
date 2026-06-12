import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { LibraryModule } from './modules/library/library.module';
import { ReadingModule } from './modules/reading/reading.module';
import { AiModule } from './modules/ai/ai.module';
import { BillingModule } from './modules/billing/billing.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { NarrativePreferencesModule } from './modules/narrative-preferences/narrative-preferences.module';
import { HealthModule } from './modules/health/health.module';
import { StorySetupModule } from './modules/story-setup/story-setup.module';
import { SceneMediaModule } from './modules/scene-media/scene-media.module';
import { StoryLifecycleModule } from './modules/story-lifecycle/story-lifecycle.module';
import { StoryGenerationModule } from './modules/story-generation/story-generation.module';
import { AdminStoryGenerationUsageModule } from './modules/admin/story-generation-usage/admin-story-generation-usage.module';
import { AdminSceneMediaModule } from './modules/admin/scene-media-moderation/admin-scene-media.module';
import { AdminBillingModule } from './modules/admin/billing/admin-billing.module';
import { PrismaModule } from './common/prisma.module';
import { PublicMediaStorageModule } from './common/public-media-storage.module';

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: parsePositiveInt(config.get<string>('RATE_LIMIT_TTL_MS'), 60000),
        limit: parsePositiveInt(config.get<string>('RATE_LIMIT_DEFAULT'), 100),
      }],
    }),
    PrismaModule,
    PublicMediaStorageModule,
    HealthModule,
    AuthModule,
    LibraryModule,
    ReadingModule,
    AiModule,
    BillingModule,
    ModerationModule,
    NarrativePreferencesModule,
    StorySetupModule,
    SceneMediaModule,
    StoryLifecycleModule,
    StoryGenerationModule,
    AdminStoryGenerationUsageModule,
    AdminSceneMediaModule,
    AdminBillingModule,
  ],
})
export class AppModule {}
