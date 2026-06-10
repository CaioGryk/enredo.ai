/**
 * Beta Catalog Refresh — Safe Apply, Idempotent, Honest Assets
 *
 * Safe order:
 *   1. Preflight checks (auth, batch existence, connectivity).
 *   2. Create new batch as draft (isBetaVisible: false).
 *   3. Generate premises + characters for each draft story.
 *   4. Validate minimum readiness (counts, PT-BR, no PENDING+error).
 *   5. Only then: hide old catalog → publish new batch.
 *
 * Usage:
 *   npm run catalog:beta:refresh -- --dry-run
 *   npm run catalog:beta:refresh -- --apply
 *   npm run catalog:beta:refresh -- --apply --resume
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, StoryVisibility, StoryModerationStatus } from '@prisma/client';
import { normalizeRuntimeDatabaseUrl } from '../src/common/database-url';
import { ICP_SEEDS, makeBatchSlug, BATCH_SLUG_PREFIX, countAssets, hasPendingWithError, scanForEnglish, checkDistribution, allHaveUrls } from './refresh-beta-catalog-helpers';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001/api';

function normalizeCatalogDatabaseUrl(rawUrl?: string): string | undefined {
  return normalizeRuntimeDatabaseUrl(rawUrl);
}

const catalogDatabaseUrl = normalizeCatalogDatabaseUrl(process.env.DATABASE_URL);
const prisma = catalogDatabaseUrl
  ? new PrismaClient({ log: ['error'], datasources: { db: { url: catalogDatabaseUrl } } })
  : new PrismaClient({ log: ['error'] });

const isDryRun = process.argv.includes('--dry-run');
const isApply = process.argv.includes('--apply');
const isResume = process.argv.includes('--resume');

const MINIMUM_STORIES = 15;
const MINIMUM_PREMISES = 45;
const MINIMUM_CHARACTERS = 45;
const PROVIDER_DELAY_MS = Number(process.env.BETA_CATALOG_PROVIDER_DELAY_MS || 3000);

// ── Auth ──────────────────────────────────────────────────────────────────

let authToken: string | null = null;

async function authenticate(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env for apply mode.');
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
    console.error(`❌ Authentication failed: ${e.message}`);
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

async function apiGet(path: string): Promise<any> {
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json();
    if (!res.ok) return { error: true, status: res.status, message: data?.message || res.statusText };
    return data;
  } catch (e: any) {
    return { error: true, message: e?.message || 'network error' };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaFailure(result: any): boolean {
  const text = String(result?.message || result?.error || '').toLowerCase();
  return result?.status === 429 ||
    text.includes('429') ||
    text.includes('quota') ||
    text.includes('rate limit') ||
    text.includes('resource_exhausted');
}

async function pauseBetweenProviderCalls(): Promise<void> {
  if (PROVIDER_DELAY_MS > 0) {
    await sleep(PROVIDER_DELAY_MS);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!isDryRun && !isApply) {
    console.error('❌ Specify --dry-run or --apply.');
    process.exit(1);
  }

  if ((process.env.NODE_ENV || '') === 'production') {
    console.error('❌ This script is for local/dev environments only.');
    process.exit(1);
  }

  // ── Preflight: check if batch already exists ──
  const existingBatch = await prisma.story.count({
    where: { slug: { startsWith: BATCH_SLUG_PREFIX } },
  });

  if (existingBatch > 0 && !isResume && !isDryRun) {
    console.error(`❌ Batch already exists (${existingBatch} stories with prefix "${BATCH_SLUG_PREFIX}").`);
    console.error('   Use --resume to continue an incomplete apply, or --dry-run to inspect.');
    process.exit(1);
  }

  // ── Dry-run mode ──
  const currentVisible = await prisma.story.count({ where: { isBetaVisible: true } });

  if (isDryRun) {
    console.log('🔍 DRY RUN — No DB mutation. No provider calls.\n');
    console.log(`📦 Currently visible beta stories: ${currentVisible}`);
    console.log(`   [DRY-RUN] Would hide AFTER new batch is created and validated.\n`);

    if (existingBatch > 0) {
      console.log(`⚠️  Existing batch found: ${existingBatch} stories with prefix "${BATCH_SLUG_PREFIX}".`);
      console.log('   Would need --resume to continue.\n');
    }

    console.log(`📚 Planned new stories: ${ICP_SEEDS.length}`);
    ICP_SEEDS.forEach((s, i) => {
      console.log(`   ${i + 1}. slug=${makeBatchSlug(i, s.keywords)} → ${s.genre}`);
    });

    console.log(`\n🎯 Planned assets:`);
    console.log(`   ${ICP_SEEDS.length} story concepts (no cover generation — procedural fallback)`);
    console.log(`   ${ICP_SEEDS.length * 3} premise covers (incremental, skipped when existing)`);
    console.log(`   ${ICP_SEEDS.length * 3} character portraits (incremental, skipped when existing)`);
    console.log(`   ${ICP_SEEDS.length * 3} premises`);
    console.log(`   ${ICP_SEEDS.length * 3} playable characters`);
    console.log(`\n📋 Readiness gates:`);
    console.log(`   ≥${MINIMUM_STORIES} stories, ≥${MINIMUM_PREMISES} premises, ≥${MINIMUM_CHARACTERS} characters`);
    console.log(`   ALL premises must have coverUrl`);
    console.log(`   ALL first-premise characters must have imageUrl`);
    console.log(`   Each story: ≥3 premises, first premise ≥3 characters`);
    console.log(`   Resume mode only fills missing premises/characters; no force regeneration by default`);
    console.log(`   All narrative text passes PT-BR guard`);
    console.log(`   No PENDING + imageError/coverError records`);
    console.log(`\nℹ️  Story covers: procedural fallback only (not generated by this script).`);
    console.log(`\n✅ Dry run complete. Run with --apply to execute.`);
    return;
  }

  // ── Apply mode ──
  console.log('🚀 APPLY MODE — Generating beta catalog.\n');

  // 0. Authenticate
  console.log('🔑 Authenticating...');
  await authenticate();
  console.log('   ✅ Authenticated as admin.\n');

  // ── Phase 1: Create draft batch ──
  console.log('── Phase 1: Creating draft stories ──');
  const createdIds: string[] = [];

  for (let i = 0; i < ICP_SEEDS.length; i++) {
    const seed = ICP_SEEDS[i];
    const plannedSlug = makeBatchSlug(i, seed.keywords);

    // Skip if already exists (resume/rerun)
    const existing = await prisma.story.findUnique({ where: { slug: plannedSlug } });
    if (existing) {
      console.log(`   ⏭️  Story ${i + 1} already exists (${plannedSlug}). Skipping.`);
      createdIds.push(existing.id);
      continue;
    }

    const result = await apiPost('/story-generation/generate', {
      keywords: seed.keywords,
      genre: seed.genre,
      tone: seed.tone,
      targetAudience: seed.targetAudience,
      constraints: seed.constraints,
    });

    if (result?.error) {
      console.log(`   ❌ Story ${i + 1} generation failed: ${result.message}`);
      continue;
    }

    const storyId: string = result?.story?.id;
    if (!storyId) {
      console.log(`   ❌ Story ${i + 1}: no ID in response.`);
      continue;
    }

    // Patch slug + draft status
    await prisma.story.update({
      where: { id: storyId },
      data: {
        slug: plannedSlug,
        isBetaVisible: false,
        visibility: StoryVisibility.PUBLIC,
        moderationStatus: StoryModerationStatus.APPROVED,
        authorName: 'Enredo.ai',
      },
    });

    createdIds.push(storyId);
    console.log(`   ✅ Story ${i + 1}: "${result.story.title}" (${storyId}) slug=${plannedSlug}`);
  }

  console.log(`\n   Draft stories created: ${createdIds.length} / ${ICP_SEEDS.length}`);

  if (createdIds.length < ICP_SEEDS.length) {
    console.log('\n❌ Draft story target NOT met. Old catalog preserved.');
    console.log(`   Created/resumable stories: ${createdIds.length}/${ICP_SEEDS.length}.`);
    console.log('   Fix the story-generation failure and rerun with --resume before generating premises/characters.');
    process.exit(1);
  }

  // ── Phase 2: Generate premises + characters ──
  console.log('\n── Phase 2: Generating premises + characters ──');
  let totalPremises = 0;
  let totalCharacters = 0;

  for (const storyId of createdIds) {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: {
        title: true,
        id: true,
        premises: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            coverUrl: true,
            coverGenerationStatus: true,
            characters: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, imageUrl: true, imageGenerationStatus: true, imageError: true },
            },
          },
        },
      },
    });
    if (!story) continue;

    let premises: any[] = story.premises || [];

    if (premises.length >= 3) {
      const missingCovers = premises.filter((p: any) => !p.coverUrl);
      totalPremises += premises.length;
      if (missingCovers.length > 0) {
        await prisma.storyPremise.updateMany({
          where: { id: { in: missingCovers.map((p: any) => p.id) } },
          data: { coverGenerationStatus: 'NOT_REQUESTED' as any, coverError: null },
        });
        await apiGet(`/story-setup/stories/${storyId}/premises`);
        console.log(`   🔁 ${story.title}: requested cover backfill for ${missingCovers.length} existing premises.`);
      } else {
        console.log(`   ⏭️  ${story.title}: ${premises.length} premises already complete.`);
      }
    } else {
      const shouldForcePremises = premises.length > 0 && premises.length < 3;
      await pauseBetweenProviderCalls();
      const premResult = await apiPost(`/story-setup/stories/${storyId}/premises/generate`, { force: shouldForcePremises });
      if (premResult?.error) {
        console.log(`   ❌ ${story.title}: premises failed (${premResult.message})`);
        if (isQuotaFailure(premResult)) {
          console.log('\n❌ Provider quota/rate-limit detected. Old catalog preserved.');
          console.log('   Stop now to avoid burning remaining provider calls. Rerun later with --resume.');
          process.exit(1);
        }
        continue;
      }
      premises = Array.isArray(premResult) ? premResult : [];
      totalPremises += premises.length;
    }

    // Characters for first premise
    const firstPremiseId = premises[0]?.id;
    if (firstPremiseId) {
      const firstPremise = await prisma.storyPremise.findUnique({
        where: { id: firstPremiseId },
        select: {
          characters: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, imageUrl: true, imageGenerationStatus: true, imageError: true },
          },
        },
      });
      const existingCharacters = firstPremise?.characters || [];
      const missingPortraits = existingCharacters.filter((c: any) => !c.imageUrl);

      if (existingCharacters.length >= 3 && missingPortraits.length === 0) {
        totalCharacters += existingCharacters.length;
        console.log(`   ⏭️  ${story.title}: ${existingCharacters.length} first-premise characters already complete.`);
      } else if (existingCharacters.length >= 3 && missingPortraits.length > 0) {
        await prisma.storyPlayableCharacter.updateMany({
          where: { id: { in: missingPortraits.map((c: any) => c.id) } },
          data: { imageGenerationStatus: 'NOT_REQUESTED' as any, imageError: null },
        });
        await apiGet(`/story-setup/premises/${firstPremiseId}/characters`);
        totalCharacters += existingCharacters.length;
        console.log(`   🔁 ${story.title}: requested portrait backfill for ${missingPortraits.length} existing characters.`);
      } else {
        await pauseBetweenProviderCalls();
        const shouldForceCharacters = existingCharacters.length > 0 && existingCharacters.length < 3;
        const charsResult = await apiPost(`/story-setup/premises/${firstPremiseId}/characters/generate`, { force: shouldForceCharacters });
        if (charsResult?.error) {
          console.log(`   ❌ ${story.title}: characters failed (${charsResult.message})`);
          if (isQuotaFailure(charsResult)) {
            console.log('\n❌ Provider quota/rate-limit detected. Old catalog preserved.');
            console.log('   Stop now to avoid burning remaining provider calls. Rerun later with --resume.');
            process.exit(1);
          }
        } else {
          const chars: any[] = Array.isArray(charsResult) ? charsResult : [];
          totalCharacters += chars.length;
        }
      }
    }

    console.log(`   📖 ${story.title}: ${premises.length} premises, chars for first premise`);
  }

  // ── Phase 3: Full readiness check ──
  console.log('\n── Phase 3: Readiness check ──');

  // Query draft stories with premises, characters, and full narrative text for validation
  const drafts = await prisma.story.findMany({
    where: { slug: { startsWith: BATCH_SLUG_PREFIX } },
    select: {
      id: true, title: true, synopsis: true, genres: true, openingScene: true,
      basePrompt: true, tone: true, styleGuide: true, worldRules: true,
      premises: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true, title: true, synopsis: true, openingScene: true, basePrompt: true, tone: true, styleGuide: true, worldRules: true,
          sortOrder: true, createdAt: true,
          coverUrl: true, coverGenerationStatus: true, coverError: true,
          characters: {
            select: {
              id: true, name: true, roleLabel: true, description: true, personality: true,
              motivation: true, secret: true, relationshipToPlayer: true,
              initialGoal: true, startingSituation: true, conflictPotential: true, visualPrompt: true,
              imageUrl: true, imageGenerationStatus: true, imageError: true,
            },
          },
        },
      },
    },
  });

  const allPremises = drafts.flatMap((d) => d.premises || []);
  const allCharacters = allPremises.flatMap((p) => (p as any).characters || []);

  const premiseAssets = countAssets(allPremises as any);
  const characterAssets = countAssets(allCharacters as any);
  const pendingWithError = hasPendingWithError(allPremises as any) || hasPendingWithError(allCharacters as any);

  console.log(`   Stories (draft): ${drafts.length} (need ≥${MINIMUM_STORIES})`);
  console.log(`   Premises: ${premiseAssets.total} (${premiseAssets.success} covers, ${premiseAssets.failed} failed, ${premiseAssets.pending} pending)`);
  console.log(`   Characters: ${characterAssets.total} (${characterAssets.success} portraits, ${characterAssets.failed} failed, ${characterAssets.pending} pending)`);

  // ── Gate 1: Counts ──
  const storyCountOk = drafts.length >= MINIMUM_STORIES;
  const premiseCountOk = allPremises.length >= MINIMUM_PREMISES;
  const characterCountOk = allCharacters.length >= MINIMUM_CHARACTERS;

  // ── Gate 2: Image readiness — ALL premises + ALL first-premise characters must have images
  const allPremisesHaveCover = allHaveUrls(allPremises as any);
  const allCharactersHaveImage = allHaveUrls(allCharacters as any);
  const imageReady = allPremisesHaveCover && allCharactersHaveImage;

  // ── Gate 3: Distribution — each story ≥3 premises, first premise ≥3 characters
  const distChecks = checkDistribution(
    drafts.map((d) => ({
      id: d.id, title: d.title,
      premises: (d.premises || []).map((p) => ({
        id: p.id, sortOrder: (p as any).sortOrder, createdAt: (p as any).createdAt,
        characters: (p as any).characters || [],
      })),
    })),
  );
  const allDistOk = distChecks.every((c) => c.ok);

  // ── Gate 4: PT-BR — no English-heavy narrative text
  const englishFindings = scanForEnglish(drafts as any);
  const ptBrOk = englishFindings.length === 0;

  // ── Diagnose failures ──
  let failed = false;

  if (!storyCountOk) { console.log(`   ❌ Stories: ${drafts.length} < ${MINIMUM_STORIES}`); failed = true; }
  if (!premiseCountOk) { console.log(`   ❌ Premises: ${allPremises.length} < ${MINIMUM_PREMISES}`); failed = true; }
  if (!characterCountOk) { console.log(`   ❌ Characters: ${allCharacters.length} < ${MINIMUM_CHARACTERS}`); failed = true; }

  if (!allPremisesHaveCover) {
    const missing = allPremises.filter((p: any) => !p.coverUrl).length;
    console.log(`   ❌ Image readiness: ${missing} premises missing coverUrl (need all ${allPremises.length})`);
    failed = true;
  }
  if (!allCharactersHaveImage) {
    const missing = allCharacters.filter((c: any) => !c.imageUrl).length;
    console.log(`   ❌ Image readiness: ${missing} characters missing imageUrl (need all ${allCharacters.length})`);
    failed = true;
  }

  if (!allDistOk) {
    console.log('   ❌ Distribution failures:');
    for (const c of distChecks.filter((x) => !x.ok)) {
      console.log(`      ${c.storyTitle}: ${c.premiseCount} premises, ${c.characterCount} chars on first premise (need ≥3 each)`);
    }
    failed = true;
  }

  if (!ptBrOk) {
    console.log(`   ❌ PT-BR: ${englishFindings.length} records with English-heavy text.`);
    for (const f of englishFindings.slice(0, 10)) {
      console.log(`      ${f.type} ${f.title}: fields [${f.fields.join(', ')}]`);
    }
    if (englishFindings.length > 10) console.log(`      ... and ${englishFindings.length - 10} more.`);
    failed = true;
  }

  if (pendingWithError) {
    console.log('   ⚠️  PENDING records with errors detected.');
    console.log('      npm run cleanup:stale-image-status -- --apply');
    failed = true;
  }

  if (failed) {
    console.log('\n❌ Readiness NOT met. Old catalog preserved.');
    console.log('   Retry image generation, fix English content, or regenerate premises/characters.');
    console.log('   Rerun with --resume after fixing issues.');
    process.exit(1);
  }

  console.log('   ✅ All readiness gates passed.');

  // ── Phase 4: Switch visibility ──
  console.log('\n── Phase 4: Publishing new catalog ──');

  // Hide OLD beta-visible stories
  const hideResult = await prisma.story.updateMany({
    where: { isBetaVisible: true, slug: { not: { startsWith: BATCH_SLUG_PREFIX } } },
    data: { isBetaVisible: false },
  });
  console.log(`   🙈 Hidden ${hideResult.count} old stories.`);

  // Publish new batch
  const publishResult = await prisma.story.updateMany({
    where: { slug: { startsWith: BATCH_SLUG_PREFIX } },
    data: { isBetaVisible: true },
  });
  console.log(`   ✅ Published ${publishResult.count} new stories.`);

  // ── Summary ──
  console.log(`\n═══════════════════════════════════`);
  console.log(`📊 BETA CATALOG REFRESH COMPLETE`);
  console.log(`═══════════════════════════════════`);
  console.log(`   New stories:    ${drafts.length} / ${ICP_SEEDS.length}`);
  console.log(`   Premises:       ${premiseAssets.total} (${premiseAssets.success} with covers)`);
  console.log(`   Characters:     ${characterAssets.total} (${characterAssets.success} with portraits)`);
  console.log(`   Distribution:   ${distChecks.filter((c) => c.ok).length}/${distChecks.length} stories ok`);
  console.log(`   PT-BR:          ${ptBrOk ? '✅ all valid' : '❌ English found'}`);
  console.log(`   Old hidden:     ${hideResult.count}`);
  console.log(`   Visible now:    ${await prisma.story.count({ where: { isBetaVisible: true } })}`);
  console.log(`\nℹ️  Story covers: not generated by this script (procedural fallback used in app).`);
}

main()
  .catch((e) => {
    console.error('Catalog refresh failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
