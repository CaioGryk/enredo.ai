import { Module } from '@nestjs/common';
import { AiModule } from '@modules/ai/ai.module';
import { NarrativeEngine } from './narrative-engine.service';

@Module({
  imports: [AiModule],
  providers: [NarrativeEngine],
  exports: [NarrativeEngine],
})
export class NarrativeModule {}