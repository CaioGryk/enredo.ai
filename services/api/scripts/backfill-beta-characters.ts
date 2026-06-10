/**
 * Backfill playable characters for ALL beta-visible premises.
 *
 * Scans every isBetaVisible=true story. For every premise with fewer than
 * 3 playable characters, generates the missing characters via the API.
 *
 * Safe, idempotent, resumable — skips premises that already have ≥3 characters.
 * Handles provider quota/rate-limit by stopping safely and instructing the
 * operator to rerun with --resume later.
 *
 * Usage:
 *   npm run catalog:beta:backfill-characters -- --dry-run
 *   npm run catalog:beta:backfill-characters -- --apply
 *   npm run catalog:beta:backfill-characters -- --apply --resume
 *   npm run catalog:beta:backfill-characters -- --apply --force-partial-regenerate
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, StoryVisibility, StoryModerationStatus } from '@prisma/client';
import { normalizeRuntimeDatabaseUrl } from '../src/common/database-url';

// ── Config ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001/api';
const PROVIDER_DELAY_MS = Number(process.env.BETA_CATALOG_PROVIDER_DELAY_MS || 3000);
const MIN_CHARACTERS = 3;

const isDryRun = process.argv.includes('--dry-run');
const isApply = process.argv.includes('--apply');
const isResume = process.argv.includes('--resume');
const forcePartialRegenerate = process.argv.includes('--force-partial-regenerate');

function normalizeCatalogDatabaseUrl(rawUrl?: string): string | undefined {
  return normalizeRuntimeDatabaseUrl(rawUrl);
}

const catalogDatabaseUrl = normalizeCatalogDatabaseUrl(process.env.DATABASE_URL);
const prisma = catalogDatabaseUrl
  ? new PrismaClient({ log: ['error'], datasources: { db: { url: catalogDatabaseUrl } } })
  : new PrismaClient({ log: ['error'] });

// ── Auth ──────────────────────────────────────────────────────────────────

let authToken: string | null = null;

async function authenticate(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env for apply mode.');
    process.exit(1);
  }
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Login returned ${res.status}`);
    const data = await res.json();
    authToken = data.accessToken;
    if (!authToken) throw new Error('No accessToken in response');
  } catch (e: any) {
    console.error(`Authentication failed: ${e.message}`);
    process.exit(1);
  }
}

async function apiPost(path: string, body: any): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json();
    if (!res.ok) return { error: true, status: res.status, message: data?.message || res.statusText };
    return data;
  } catch (e: any) {
    return { error: true, message: e?.message || 'network error' };
  }
}

function isQuotaFailure(result: any): boolean {
  const text = String(result?.message || result?.error || '').toLowerCase();
  return result?.status === 429 ||
    text.includes('429') ||
    text.includes('quota') ||
    text.includes('rate limit') ||
    text.includes('resource_exhausted');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pauseBetweenProviderCalls(): Promise<void> {
  if (PROVIDER_DELAY_MS > 0) {
    await sleep(PROVIDER_DELAY_MS);
  }
}

// ── Readiness Query ───────────────────────────────────────────────────────

interface PremiseStatus {
  storyId: string;
  storyTitle: string;
  premiseId: string;
  premiseTitle: string;
  premiseIndex: number;
  characterCount: number;
  existingCharacterIds: string[];
}

interface ReadinessReport {
  totalStories: number;
  totalPremises: number;
  playablePremises: number;
  incompletePremises: number;
  charactersToCreate: number;
  premises: PremiseStatus[];
}

async function scanReadiness(): Promise<ReadinessReport> {
  const stories = await prisma.story.findMany({
    where: { isBetaVisible: true },
    select: {
      id: true, title: true,
      premises: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true, title: true,
          _count: { select: { characters: true } },
          characters: { select: { id: true } },
        },
      },
    },
  });

  const premises: PremiseStatus[] = [];
  let playableCount = 0;

  for (const story of stories) {
    for (let i = 0; i < story.premises.length; i++) {
      const prem = story.premises[i];
      const charCount = prem._count?.characters ?? prem.characters?.length ?? 0;
      const status: PremiseStatus = {
        storyId: story.id,
        storyTitle: story.title,
        premiseId: prem.id,
        premiseTitle: prem.title,
        premiseIndex: i + 1,
        characterCount: charCount,
        existingCharacterIds: prem.characters?.map(c => c.id) ?? [],
      };
      premises.push(status);
      if (charCount >= MIN_CHARACTERS) playableCount++;
    }
  }

  const incompletePremises = premises.filter(p => p.characterCount < MIN_CHARACTERS);
  const charactersToCreate = incompletePremises.reduce((sum, p) => sum + (MIN_CHARACTERS - p.characterCount), 0);

  return {
    totalStories: stories.length,
    totalPremises: premises.length,
    playablePremises: playableCount,
    incompletePremises: incompletePremises.length,
    charactersToCreate,
    premises,
  };
}

function printReadiness(report: ReadinessReport, label?: string): void {
  if (label) console.log(`\n${label}`);
  console.log(`   Total beta stories:       ${report.totalStories}`);
  console.log(`   Total premises:           ${report.totalPremises}`);
  console.log(`   Playable premises (≥3):   ${report.playablePremises}`);
  console.log(`   Incomplete premises (<3): ${report.incompletePremises}`);
  console.log(`   Characters to create:     ${report.charactersToCreate}`);
  if (report.incompletePremises > 0) {
    console.log('\n   Incomplete premises:');
    for (const p of report.premises.filter(p => p.characterCount < MIN_CHARACTERS)) {
      console.log(`      "${p.storyTitle}" → premise ${p.premiseIndex} "${p.premiseTitle}" (${p.characterCount}/3 chars)`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!isDryRun && !isApply) {
    console.error('Specify --dry-run or --apply.');
    process.exit(1);
  }

  if ((process.env.NODE_ENV || '') === 'production') {
    console.error('This script is for local/dev beta catalog operations only.');
    process.exit(1);
  }

  console.log('Beta Catalog Character Backfill');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'APPLY'}${isResume ? ' (RESUME)' : ''}\n`);

  // ── Initial scan ──
  const initial = await scanReadiness();
  printReadiness(initial, '── BEFORE ──');

  if (initial.incompletePremises === 0) {
    console.log('\nAll premises are playable-ready. Nothing to do.');
    process.exit(0);
  }

  if (isDryRun) {
    console.log(`\n[DRY-RUN] Would generate ${initial.charactersToCreate} characters across ${initial.incompletePremises} premises.`);
    return;
  }

  // ── Apply mode ──
  await authenticate();

  let created = 0;
  const failures: Array<{ story: string; premise: string; error: string }> = [];
  const skippedPartial: Array<{ story: string; premise: string; count: number }> = [];
  let quotaHit = false;

  for (const prem of initial.premises) {
    if (prem.characterCount >= MIN_CHARACTERS) continue;

    const needed = MIN_CHARACTERS - prem.characterCount;
    console.log(`\n🔧 "${prem.storyTitle}" / "${prem.premiseTitle}" — ${prem.characterCount}/3 chars, needs ${needed}`);

    if (prem.characterCount > 0 && !forcePartialRegenerate) {
      console.log('   ⏭️  Skipped partial premise to avoid deleting existing characters.');
      console.log('      Rerun with --force-partial-regenerate only if replacing the existing partial cast is intentional.');
      skippedPartial.push({ story: prem.storyTitle, premise: prem.premiseTitle, count: prem.characterCount });
      continue;
    }

    await pauseBetweenProviderCalls();

    const forceRegenerate = prem.characterCount > 0 && prem.characterCount < MIN_CHARACTERS && forcePartialRegenerate;
    const result = await apiPost(`/story-setup/premises/${prem.premiseId}/characters/generate`, { force: forceRegenerate });

    if (result?.error) {
      console.log(`   ❌ Failed: ${result.message}`);
      failures.push({ story: prem.storyTitle, premise: prem.premiseTitle, error: result.message });
      if (isQuotaFailure(result)) {
        console.log('\n⚠️  Provider quota/rate-limit detected. Stopping.');
        console.log('   Remaining premises NOT processed. Rerun later with --apply --resume.');
        quotaHit = true;
        break;
      }
      continue;
    }

    const chars: any[] = Array.isArray(result) ? result : [];
    const added = chars.length - prem.characterCount;
    created += Math.max(0, added);
    console.log(`   ✅ Generated ${chars.length} characters (${added > 0 ? '+' + added : 'refreshed'})`);
  }

  // ── Final scan ──
  const final = await scanReadiness();
  printReadiness(final, '── AFTER ──');
  console.log(`   Characters created: ${created}`);

  if (failures.length > 0) {
    console.log(`\n   Failures (${failures.length}):`);
    for (const f of failures) {
      console.log(`      "${f.story}" / "${f.premise}": ${f.error}`);
    }
  }

  if (skippedPartial.length > 0) {
    console.log(`\n   Skipped partial premises (${skippedPartial.length}):`);
    for (const s of skippedPartial) {
      console.log(`      "${s.story}" / "${s.premise}": ${s.count}/3 chars`);
    }
    console.log('   These were not regenerated because doing so would delete existing characters.');
    console.log('   Use --force-partial-regenerate only after intentionally accepting replacement.');
  }

  if (final.incompletePremises === 0) {
    console.log('\n✅ ALL premises are now playable-ready.');
  } else if (quotaHit) {
    console.log(`\n⚠️  ${final.incompletePremises} premises still incomplete (provider quota). Rerun with --apply --resume.`);
    process.exit(2);
  } else if (skippedPartial.length > 0) {
    console.log(`\n⚠️  ${final.incompletePremises} premises still incomplete. Partial premises were skipped safely.`);
    process.exit(1);
  } else {
    console.log(`\n⚠️  ${final.incompletePremises} premises still incomplete. Review failures above.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
