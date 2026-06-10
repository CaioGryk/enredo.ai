/**
 * Reset only reading sessions for beta QA.
 *
 * Preserves users, catalog stories, premises, playable characters, covers, portraits,
 * subscriptions, credits, narrative preferences, and beta catalog visibility.
 *
 * ReadingSession deletion cascades NarrativeEvent and NarrativeMemory by schema.
 * ModelUsage and AdEvent are preserved with sessionId set to null by schema.
 *
 * Usage:
 *   npm run qa:reset-reading-sessions -- --dry-run
 *   npm run qa:reset-reading-sessions -- --apply
 *   npm run qa:reset-reading-sessions -- --dry-run --user-email demo@example.com
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, ReadingSessionStatus } from '@prisma/client';
import { normalizeRuntimeDatabaseUrl } from '../src/common/database-url';

const isDryRun = process.argv.includes('--dry-run');
const isApply = process.argv.includes('--apply');
const userEmailArgIndex = process.argv.indexOf('--user-email');
const userEmail = userEmailArgIndex >= 0 ? process.argv[userEmailArgIndex + 1] : undefined;

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
    console.error('This script is blocked in production.');
    process.exit(1);
  }

  const user = userEmail
    ? await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, email: true },
      })
    : null;

  if (userEmail && !user) {
    console.error(`No user found for --user-email=${userEmail}. Nothing was changed.`);
    process.exit(1);
  }

  const where = user ? { userId: user.id } : {};

  const [sessionsByStatus, totalEvents, totalMemories, linkedSceneMedia] = await Promise.all([
    prisma.readingSession.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    }),
    prisma.narrativeEvent.count({
      where: { session: where },
    }),
    prisma.narrativeMemory.count({
      where: { session: where },
    }),
    prisma.sceneMedia.count({
      where: {
        narrativeEvent: { session: where },
      },
    }),
  ]);

  const totalSessions = sessionsByStatus.reduce((sum, row) => sum + row._count._all, 0);
  const countFor = (status: ReadingSessionStatus) =>
    sessionsByStatus.find((row) => row.status === status)?._count._all || 0;

  console.log('Enredo.ai — Reading Sessions QA Reset');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'APPLY'}`);
  console.log(`Scope: ${user ? `user ${user.email}` : 'all users'}`);
  console.log('');
  console.log(`Reading sessions: ${totalSessions}`);
  console.log(`  ACTIVE: ${countFor(ReadingSessionStatus.ACTIVE)}`);
  console.log(`  COMPLETED: ${countFor(ReadingSessionStatus.COMPLETED)}`);
  console.log(`  ABANDONED: ${countFor(ReadingSessionStatus.ABANDONED)}`);
  console.log(`Narrative events to be cascade-deleted: ${totalEvents}`);
  console.log(`Narrative memories to be cascade-deleted: ${totalMemories}`);
  console.log(`Scene media linked to deleted events: ${linkedSceneMedia} (preserved; narrativeEventId becomes null)`);
  console.log('');
  console.log('Preserved: users, stories, premises, playable characters, covers, portraits, credits, subscriptions, preferences.');

  if (isDryRun) {
    console.log('\n[DRY-RUN] No data changed. Run with --apply to delete reading sessions.');
    return;
  }

  const result = await prisma.readingSession.deleteMany({ where });
  console.log(`\nDeleted reading sessions: ${result.count}`);
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error('Reading sessions reset failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
