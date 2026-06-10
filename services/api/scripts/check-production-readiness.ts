import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();

const REQUIRED_VARS = [
  'DATABASE_URL', 'DIRECT_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET',
  'GOOGLE_CLIENT_IDS', 'OPENROUTER_API_KEY',
];

const OPTIONAL_VARS = [
  'REDIS_URL', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
  'LLM_MOCK_MODE', 'DEFAULT_FREE_MODEL', 'DEFAULT_PREMIUM_MODEL',
  'FREE_DAILY_INTERACTIONS', 'FREE_MAX_TOKENS_PER_RESPONSE', 'PORT', 'FRONTEND_URL',
];

function mask(value: string, varName: string): string {
  if (varName.includes('SECRET') || varName.includes('KEY') || varName.includes('URL')) {
    return value.substring(0, 8) + '...';
  }
  return value;
}

async function main() {
  console.log('Production Readiness Check\n');
  let hasErrors = false;

  console.log('Required vars:');
  for (const v of REQUIRED_VARS) {
    const val = process.env[v];
    if (!val) { console.log(`  ❌ ${v}: NOT SET`); hasErrors = true; }
    else console.log(`  ✅ ${v}: ${mask(val, v)}`);
  }

  console.log('\nOptional vars:');
  for (const v of OPTIONAL_VARS) {
    const val = process.env[v];
    if (!val) console.log(`  ⚠️  ${v}: not set`);
    else console.log(`  ✅ ${v}: ${mask(val, v)}`);
  }

  console.log(`\nMock mode: ${process.env.LLM_MOCK_MODE === 'true' ? '⚠️  ON' : '✅ OFF'}`);

  if (process.env.CHECK_DB === 'true') {
    console.log('\nTesting database connectivity...');
    const db = new PrismaClient();
    try {
      await db.$connect();
      const count = await db.user.count();
      console.log(`  ✅ Connected (${count} users)`);
      await db.$disconnect();
    } catch (e: any) {
      console.log(`  ❌ Failed: ${e.message}`);
      hasErrors = true;
    }
  } else {
    console.log('\nDB check skipped (set CHECK_DB=true to test connectivity).');
  }

  console.log(`\n${'='.repeat(50)}`);
  if (hasErrors) { console.log('❌ Issues found.'); process.exit(1); }
  console.log('✅ All required vars present.');
}

main().catch((e) => { console.error(e); process.exit(1); });
