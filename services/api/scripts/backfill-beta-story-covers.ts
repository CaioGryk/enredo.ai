/**
 * Backfill beta story covers from the first premise cover.
 *
 * Usage:
 *   npm run catalog:beta:backfill-story-covers -- --dry-run
 *   npm run catalog:beta:backfill-story-covers -- --apply
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { normalizeRuntimeDatabaseUrl } from '../src/common/database-url';

const isDryRun = process.argv.includes('--dry-run');
const isApply = process.argv.includes('--apply');

const databaseUrl = normalizeRuntimeDatabaseUrl(process.env.DATABASE_URL);
const prisma = databaseUrl
  ? new PrismaClient({ log: ['error'], datasources: { db: { url: databaseUrl } } })
  : new PrismaClient({ log: ['error'] });

async function main() {
  if (!isDryRun && !isApply) {
    console.error('Specify --dry-run or --apply.');
    process.exit(1);
  }

  if ((process.env.NODE_ENV || '') === 'production') {
    console.error('This script is for local/dev beta catalog operations only.');
    process.exit(1);
  }

  const stories = await prisma.story.findMany({
    where: {
      isBetaVisible: true,
      coverUrl: null,
      slug: { startsWith: 'beta-icp-refresh-' },
    },
    orderBy: { slug: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      premises: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
        select: { coverUrl: true },
      },
    },
  });

  const candidates = stories
    .map((story) => ({
      id: story.id,
      slug: story.slug,
      title: story.title,
      coverUrl: story.premises[0]?.coverUrl ?? null,
    }))
    .filter((story) => !!story.coverUrl);

  const missingSource = stories.length - candidates.length;

  console.log(`Visible beta stories without direct coverUrl: ${stories.length}`);
  console.log(`Backfill candidates with first-premise coverUrl: ${candidates.length}`);
  if (missingSource > 0) {
    console.log(`Stories missing first-premise coverUrl: ${missingSource}`);
  }

  if (isDryRun) {
    for (const story of candidates) {
      console.log(`[DRY-RUN] ${story.slug} -> ${story.title}`);
    }
    return;
  }

  for (const story of candidates) {
    await prisma.story.update({
      where: { id: story.id },
      data: { coverUrl: story.coverUrl },
    });
    console.log(`Backfilled ${story.slug} -> ${story.title}`);
  }

  console.log(`Done. Backfilled ${candidates.length} story covers.`);
}

main()
  .catch((error) => {
    console.error('Story cover backfill failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
