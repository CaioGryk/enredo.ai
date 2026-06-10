/**
 * Beta catalog readiness check — read-only pass/fail for beta launch.
 *
 * Usage:
 *   npm run catalog:beta:readiness
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { normalizeRuntimeDatabaseUrl } from '../src/common/database-url';

const MIN_STORIES = 15;
const MIN_PREMISES = 45;
const MIN_CHARACTERS_PER_PREMISE = 3;

function normalizeCatalogDatabaseUrl(rawUrl?: string): string | undefined {
  return normalizeRuntimeDatabaseUrl(rawUrl);
}

const catalogDatabaseUrl = normalizeCatalogDatabaseUrl(process.env.DATABASE_URL);
const prisma = catalogDatabaseUrl
  ? new PrismaClient({ log: ['error'], datasources: { db: { url: catalogDatabaseUrl } } })
  : new PrismaClient({ log: ['error'] });

async function main() {
  console.log('Beta Catalog Readiness Check\n');

  const stories = await prisma.story.findMany({
    where: { isBetaVisible: true },
    select: {
      id: true, title: true,
      premises: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true, title: true,
          _count: { select: { characters: true } },
        },
      },
    },
  });

  const allPremises = stories.flatMap(s => s.premises);
  const playablePremises = allPremises.filter(p => (p._count?.characters ?? 0) >= MIN_CHARACTERS_PER_PREMISE);

  console.log(`   Stories:                ${stories.length} (need ≥${MIN_STORIES})`);
  console.log(`   Premises:               ${allPremises.length} (need ≥${MIN_PREMISES})`);
  console.log(`   Playable premises (≥3): ${playablePremises.length}`);

  const incompletePremises = allPremises.filter(p => (p._count?.characters ?? 0) < MIN_CHARACTERS_PER_PREMISE);
  if (incompletePremises.length > 0) {
    console.log(`\n   Incomplete premises:`);
    for (const p of incompletePremises) {
      const story = stories.find(s => s.premises.some(prem => prem.id === p.id));
      console.log(`      "${story?.title || '?'}" → "${p.title}" (${p._count?.characters ?? 0}/3 chars)`);
    }
  }

  let failed = false;

  if (stories.length < MIN_STORIES) {
    console.log(`\n❌ Stories: ${stories.length} < ${MIN_STORIES}`);
    failed = true;
  }

  if (allPremises.length < MIN_PREMISES) {
    console.log(`\n❌ Premises: ${allPremises.length} < ${MIN_PREMISES}`);
    failed = true;
  }

  if (playablePremises.length < allPremises.length) {
    console.log(`\n❌ Playable premises: ${playablePremises.length} / ${allPremises.length}`);
    failed = true;
  }

  if (failed) {
    console.log('\n❌ Beta catalog readiness NOT met.');
    process.exit(1);
  }

  console.log('\n✅ Beta catalog readiness met. All premises are playable-ready.');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
