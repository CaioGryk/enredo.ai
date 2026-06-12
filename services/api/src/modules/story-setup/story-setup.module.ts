import { Module } from '@nestjs/common';
import { StorySetupService } from './story-setup.service';
import { StorySetupController } from './story-setup.controller';
import { PrismaModule } from '@common/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from '@modules/ai/ai.module';
import { StoryQualityModule } from '@modules/story-quality/story-quality.module';
import { ImageOptimizationService } from '@common/image-optimization.service';

@Module({
  imports: [PrismaModule, ConfigModule, AiModule, StoryQualityModule],
  providers: [StorySetupService, ImageOptimizationService],
  controllers: [StorySetupController],
  exports: [StorySetupService],
})
export class StorySetupModule {}
