import { PublicMediaMigrationService } from '../public-media-migration.service';

describe('PublicMediaMigrationService', () => {
  it('persists public catalog media and replaces database values with CDN URLs', async () => {
    const prisma = {
      story: {
        findMany: jest.fn().mockResolvedValue([{ id: 'story-1', coverUrl: 'data:image/png;base64,AAAA' }]),
        update: jest.fn().mockResolvedValue({}),
      },
      storyPremise: {
        findMany: jest.fn().mockResolvedValue([{ id: 'premise-1', coverUrl: 'https://provider/cover.png' }]),
        update: jest.fn().mockResolvedValue({}),
      },
      storyPlayableCharacter: {
        findMany: jest.fn().mockResolvedValue([{ id: 'playable-1', imageUrl: 'data:image/png;base64,BBBB' }]),
        update: jest.fn().mockResolvedValue({}),
      },
      storyCharacter: {
        findMany: jest.fn().mockResolvedValue([{ id: 'catalog-1', imageUrl: 'https://provider/character.png' }]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const storage = {
      isEnabled: jest.fn().mockReturnValue(true),
      isStoredPublicUrl: jest.fn().mockReturnValue(false),
      persistPublicImage: jest.fn().mockImplementation(async (_source: string, path: string) => `https://cdn/${path}`),
    };

    const service = new PublicMediaMigrationService(prisma as any, storage as any);
    const result = await service.migrateCatalog();

    expect(result).toEqual({ migrated: 4, failed: 0 });
    expect(prisma.story.update).toHaveBeenCalledWith({
      where: { id: 'story-1' },
      data: { coverUrl: 'https://cdn/stories/story-1/cover-720.webp' },
    });
    expect(prisma.storyPremise.update).toHaveBeenCalledWith({
      where: { id: 'premise-1' },
      data: { coverUrl: 'https://cdn/premises/premise-1/cover-720.webp' },
    });
    expect(prisma.storyPlayableCharacter.update).toHaveBeenCalledWith({
      where: { id: 'playable-1' },
      data: { imageUrl: 'https://cdn/characters/playable/playable-1-720.webp' },
    });
    expect(prisma.storyCharacter.update).toHaveBeenCalledWith({
      where: { id: 'catalog-1' },
      data: { imageUrl: 'https://cdn/characters/catalog/catalog-1-720.webp' },
    });
  });

  it('skips existing CDN URLs and keeps database values when upload fails', async () => {
    const prisma = {
      story: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'stored', coverUrl: 'https://cdn/stored.webp' },
          { id: 'failed', coverUrl: 'data:image/png;base64,AAAA' },
        ]),
        update: jest.fn(),
      },
      storyPremise: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      storyPlayableCharacter: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      storyCharacter: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    };
    const storage = {
      isEnabled: jest.fn().mockReturnValue(true),
      isStoredPublicUrl: jest.fn((url: string) => url.includes('/stored.webp')),
      persistPublicImage: jest.fn().mockResolvedValue(null),
    };

    const service = new PublicMediaMigrationService(prisma as any, storage as any);
    const result = await service.migrateCatalog();

    expect(result).toEqual({ migrated: 0, failed: 1 });
    expect(storage.persistPublicImage).toHaveBeenCalledTimes(1);
    expect(prisma.story.update).not.toHaveBeenCalled();
  });
});
