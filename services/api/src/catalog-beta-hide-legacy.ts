import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    console.error('❌ This script is for local/dev environments only.');
    console.error(`   Current NODE_ENV: ${process.env.NODE_ENV}`);
    process.exit(1);
  }

  if (isDryRun) {
    console.log('🔍 DRY RUN — no changes will be made.');
  } else {
    console.log('🔍 Scanning for legacy seed/mock stories...');
  }

  const legacyPatterns = [
    { title: 'O Enigma do Lighthouse' },
    { title: 'Amor nas Estrelas' },
    { title: 'O Clube dos Mentirosos' },
    { title: 'A Última Biblioteca' },
    { title: 'Noite de Halloween' },
    { title: 'O Último Trem' },
  ];

  let hiddenCount = 0;

  for (const pattern of legacyPatterns) {
    const story = await prisma.story.findFirst({
      where: { title: pattern.title, isBetaVisible: true },
    });

    if (story) {
      if (isDryRun) {
        console.log(`   🔎 Would hide: "${story.title}" (${story.id})`);
        hiddenCount++;
      } else {
        await prisma.story.update({
          where: { id: story.id },
          data: { isBetaVisible: false },
        });
        console.log(`   🙈 Hidden: "${story.title}" (${story.id})`);
        hiddenCount++;
      }
    }
  }

  if (isDryRun) {
    const visible = await prisma.story.count({ where: { isBetaVisible: true } });
    console.log('');
    console.log(`✅ Dry run complete. Would hide ${hiddenCount} stories.`);
    console.log(`   Currently visible: ${visible}`);
    console.log(`   Run without --dry-run to apply changes.`);
    return;
  }

  const stillVisible = await prisma.story.count({ where: { isBetaVisible: true } });
  const hidden = await prisma.story.count({ where: { isBetaVisible: false } });

  console.log('');
  console.log(`✅ Catalog beta preparation complete.`);
  console.log(`   Visible stories: ${stillVisible}`);
  console.log(`   Hidden (legacy): ${hidden}`);
  console.log('');
  console.log('ℹ️  Hidden stories remain in the database but are excluded from the library.');
  console.log('   To restore: UPDATE "stories" SET "isBetaVisible" = true WHERE "isBetaVisible" = false;');
}

main()
  .catch((e: any) => {
    const isP1001 = e?.message?.includes("Can't reach") || e?.errorCode === 'P1001' || e?.code === 'P1001';
    if (isP1001) {
      console.error('');
      console.error('❌ Database unreachable (Prisma P1001).');
      console.error('   The Supabase pooler is not responding — no data was changed.');
      console.error('');
      console.error('   To diagnose:');
      console.error('     npm run check:prisma-connect');
      console.error('     npm run check:local');
      console.error('     bash ../../scripts/check-local-ready.sh');
      console.error('');
      console.error('   Common causes:');
      console.error('     - Supabase project paused (free tier hibernates after ~1 week of inactivity)');
      console.error('     - Wrong DATABASE_URL host/port');
      console.error('     - IP not in Supabase network allowlist');
      console.error('     - VPN, firewall, or local network blocking the pooler port (6543)');
      console.error('');
      console.error('   After restoring connectivity:');
      console.error('     1. npm run check:local');
      console.error('     2. npm run catalog:beta:hide-legacy -- --dry-run');
      console.error('     3. If dry-run looks correct: npm run catalog:beta:hide-legacy');
    } else {
      console.error('Catalog beta preparation failed:', e.message);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
