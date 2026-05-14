import { Module } from '@nestjs/common';
import { AdminSceneMediaController } from './admin-scene-media.controller';
import { AdminSceneMediaService } from './admin-scene-media.service';
import { PrismaService } from '@common/prisma.service';
import { SceneMediaModule } from '../../scene-media/scene-media.module';

@Module({
  imports: [SceneMediaModule],
  controllers: [AdminSceneMediaController],
  providers: [AdminSceneMediaService, PrismaService],
  exports: [AdminSceneMediaService],
})
export class AdminSceneMediaModule {}
