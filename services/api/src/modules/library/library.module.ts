import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { ImageOptimizationService } from '@common/image-optimization.service';

@Module({
  controllers: [LibraryController],
  providers: [LibraryService, ImageOptimizationService],
  exports: [LibraryService],
})
export class LibraryModule {}
