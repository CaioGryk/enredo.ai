import { Global, Module } from '@nestjs/common';
import { ImageOptimizationService } from './image-optimization.service';
import { PublicMediaMigrationService } from './public-media-migration.service';
import { PublicMediaStorageService } from './public-media-storage.service';

@Global()
@Module({
  providers: [
    ImageOptimizationService,
    PublicMediaStorageService,
    PublicMediaMigrationService,
  ],
  exports: [ImageOptimizationService, PublicMediaStorageService],
})
export class PublicMediaStorageModule {}
