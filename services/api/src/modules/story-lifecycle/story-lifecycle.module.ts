import { Module } from '@nestjs/common';
import { StoryLifecycleController } from './story-lifecycle.controller';
import { StoryLifecycleService } from './story-lifecycle.service';
import { PrismaModule } from '@common/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StoryLifecycleController],
  providers: [StoryLifecycleService],
  exports: [StoryLifecycleService],
})
export class StoryLifecycleModule {}
