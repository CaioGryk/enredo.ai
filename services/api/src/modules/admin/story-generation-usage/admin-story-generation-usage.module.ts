import { Module } from '@nestjs/common';
import { AdminStoryGenerationUsageController } from './admin-story-generation-usage.controller';
import { AdminStoryGenerationUsageService } from './admin-story-generation-usage.service';
import { PrismaService } from '@common/prisma.service';

@Module({
  controllers: [AdminStoryGenerationUsageController],
  providers: [AdminStoryGenerationUsageService, PrismaService],
  exports: [AdminStoryGenerationUsageService],
})
export class AdminStoryGenerationUsageModule {}
