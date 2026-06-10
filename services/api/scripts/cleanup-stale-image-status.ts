/**
 * Safely converts stale PENDING image generation records to FAILED
 * when an imageError is already present (provider/network failure).
 *
 * Usage:
 *   npx ts-node scripts/cleanup-stale-image-status.ts [--dry-run] [--scope characters|premises|all]
 *
 * Default: dry-run mode, scope=all
 *
 * Safe: only updates records where status is PENDING AND imageError/coverError is NOT null.
 * Never deletes data. Never touches SUCCESS or NOT_REQUESTED records.
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
  const scopeIdx = process.argv.indexOf('--scope');
  const scope = scopeIdx >= 0 ? (process.argv[scopeIdx + 1] || 'all') : 'all';

  const prisma = new PrismaClient();

  try {
    let charsFixed = 0;
    let premisesFixed = 0;

    if (scope === 'all' || scope === 'characters') {
      const staleChars = await prisma.storyPlayableCharacter.findMany({
        where: {
          imageGenerationStatus: 'PENDING',
          imageError: { not: null },
        },
        select: { id: true, name: true, imageError: true },
      });

      if (dryRun) {
        console.log(`[DRY-RUN] Would fix ${staleChars.length} stale PENDING character portraits:`);
        staleChars.forEach((c) => console.log(`  - ${c.id} (${c.name}): ${c.imageError?.substring(0, 80) ?? 'no error'}`));
        charsFixed = staleChars.length;
      } else {
        const result = await prisma.storyPlayableCharacter.updateMany({
          where: {
            imageGenerationStatus: 'PENDING',
            imageError: { not: null },
          },
          data: { imageGenerationStatus: 'FAILED' },
        });
        charsFixed = result.count;
        console.log(`Fixed ${result.count} stale PENDING character portraits → FAILED`);
      }
    }

    if (scope === 'all' || scope === 'premises') {
      const stalePremises = await prisma.storyPremise.findMany({
        where: {
          coverGenerationStatus: 'PENDING',
          coverError: { not: null },
        },
        select: { id: true, title: true, coverError: true },
      });

      if (dryRun) {
        console.log(`[DRY-RUN] Would fix ${stalePremises.length} stale PENDING premise covers:`);
        stalePremises.forEach((p) => console.log(`  - ${p.id} (${p.title}): ${p.coverError?.substring(0, 80) ?? 'no error'}`));
        premisesFixed = stalePremises.length;
      } else {
        const result = await prisma.storyPremise.updateMany({
          where: {
            coverGenerationStatus: 'PENDING',
            coverError: { not: null },
          },
          data: { coverGenerationStatus: 'FAILED' },
        });
        premisesFixed = result.count;
        console.log(`Fixed ${result.count} stale PENDING premise covers → FAILED`);
      }
    }

    const total = charsFixed + premisesFixed;
    if (dryRun) {
      console.log(`\n[DRY-RUN] Total records that would be fixed: ${total}. Run with --apply to execute.`);
    } else {
      console.log(`\nTotal records fixed: ${total}.`);
    }
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
