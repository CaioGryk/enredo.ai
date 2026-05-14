import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReadingController } from './reading.controller';
import { ReadingService } from './reading.service';
import { ReadingOrchestratorService } from './reading-orchestrator.service';
import { NarrativeModule } from './narrative/narrative.module';
import { ModerationModule } from '../moderation/moderation.module';
import { StoryQualityModule } from '../story-quality/story-quality.module';
import { PrismaModule } from '@common/prisma.module';

@Module({
  imports: [ConfigModule, NarrativeModule, ModerationModule, StoryQualityModule, PrismaModule],
  controllers: [ReadingController],
  providers: [ReadingService, ReadingOrchestratorService],
  exports: [ReadingService],
})
export class ReadingModule {}