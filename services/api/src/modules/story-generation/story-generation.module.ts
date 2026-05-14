import { Module } from '@nestjs/common';
import { StoryGenerationService } from './story-generation.service';
import { StoryGenerationController } from './story-generation.controller';
import { StoryGenerationObservabilityService } from './services/story-generation-observability.service';
import { StoryLifecycleModule } from '@modules/story-lifecycle/story-lifecycle.module';
import { AiModule } from '@modules/ai/ai.module';
import { StoryQualityModule } from '@modules/story-quality/story-quality.module';
import { PrismaService } from '@common/prisma.service';
import { StoryGenerationBudgetGuard } from './story-generation-budget.guard';
import { StoryGenerationInputGuard } from './story-generation-input.guard';

@Module({
  imports: [
    StoryLifecycleModule,
    AiModule,
    StoryQualityModule,
  ],
  controllers: [StoryGenerationController],
  providers: [StoryGenerationService, StoryGenerationObservabilityService, PrismaService, StoryGenerationBudgetGuard, StoryGenerationInputGuard],
  exports: [StoryGenerationService],
})
export class StoryGenerationModule {}
