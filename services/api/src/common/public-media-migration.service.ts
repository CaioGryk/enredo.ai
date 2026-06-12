import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PublicMediaStorageService } from './public-media-storage.service';
import { StoryModerationStatus, StoryVisibility } from '@prisma/client';

const PUBLIC_STORY_FILTER = {
  isBetaVisible: true,
  visibility: StoryVisibility.PUBLIC,
  moderationStatus: StoryModerationStatus.APPROVED,
} as const;

@Injectable()
export class PublicMediaMigrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PublicMediaMigrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: PublicMediaStorageService,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.storage.isEnabled()) {
      this.logger.log('Supabase public media storage is disabled; keeping API image fallback');
      return;
    }

    setImmediate(() => {
      void this.migrateCatalog().catch((error: Error) => {
        this.logger.error(`Public media migration failed: ${error.message}`);
      });
    });
  }

  async migrateCatalog(): Promise<{ migrated: number; failed: number }> {
    let migrated = 0;
    let failed = 0;

    const stories = await this.prisma.story.findMany({
      where: PUBLIC_STORY_FILTER,
      select: { id: true, coverUrl: true },
    });
    for (const story of stories) {
      if (!story.coverUrl || this.storage.isStoredPublicUrl(story.coverUrl)) continue;
      const url = await this.storage.persistPublicImage(story.coverUrl, `stories/${story.id}/cover-720.webp`);
      if (url) {
        await this.prisma.story.update({ where: { id: story.id }, data: { coverUrl: url } });
        migrated++;
      } else {
        failed++;
      }
    }

    const premises = await this.prisma.storyPremise.findMany({
      where: { story: PUBLIC_STORY_FILTER },
      select: { id: true, coverUrl: true },
    });
    for (const premise of premises) {
      if (!premise.coverUrl || this.storage.isStoredPublicUrl(premise.coverUrl)) continue;
      const url = await this.storage.persistPublicImage(premise.coverUrl, `premises/${premise.id}/cover-720.webp`);
      if (url) {
        await this.prisma.storyPremise.update({ where: { id: premise.id }, data: { coverUrl: url } });
        migrated++;
      } else {
        failed++;
      }
    }

    const playableCharacters = await this.prisma.storyPlayableCharacter.findMany({
      where: { premise: { story: PUBLIC_STORY_FILTER } },
      select: { id: true, imageUrl: true },
    });
    for (const character of playableCharacters) {
      if (!character.imageUrl || this.storage.isStoredPublicUrl(character.imageUrl)) continue;
      const url = await this.storage.persistPublicImage(
        character.imageUrl,
        `characters/playable/${character.id}-720.webp`,
      );
      if (url) {
        await this.prisma.storyPlayableCharacter.update({
          where: { id: character.id },
          data: { imageUrl: url },
        });
        migrated++;
      } else {
        failed++;
      }
    }

    const catalogCharacters = await this.prisma.storyCharacter.findMany({
      where: { story: PUBLIC_STORY_FILTER },
      select: { id: true, imageUrl: true },
    });
    for (const character of catalogCharacters) {
      if (!character.imageUrl || this.storage.isStoredPublicUrl(character.imageUrl)) continue;
      const url = await this.storage.persistPublicImage(
        character.imageUrl,
        `characters/catalog/${character.id}-720.webp`,
      );
      if (url) {
        await this.prisma.storyCharacter.update({
          where: { id: character.id },
          data: { imageUrl: url },
        });
        migrated++;
      } else {
        failed++;
      }
    }

    this.logger.log(`Public media migration complete: migrated=${migrated}, failed=${failed}`);
    return { migrated, failed };
  }
}
