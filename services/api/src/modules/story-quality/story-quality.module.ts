import { Module } from '@nestjs/common';
import { StoryQualityService } from './story-quality.service';

@Module({
  providers: [StoryQualityService],
  exports: [StoryQualityService],
})
export class StoryQualityModule {}
