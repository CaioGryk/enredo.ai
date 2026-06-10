import { Module } from '@nestjs/common';
import { NarrativePreferencesService } from './narrative-preferences.service';
import { NarrativePreferencesController } from './narrative-preferences.controller';
import { PrismaModule } from '@common/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NarrativePreferencesController],
  providers: [NarrativePreferencesService],
  exports: [NarrativePreferencesService],
})
export class NarrativePreferencesModule {}
