import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { normalizeRuntimeDatabaseUrl } from '../src/common/database-url';

dotenv.config();

function safeUrlDiagnostics(rawUrl?: string): { host: string; port: string; hasSslMode: boolean; isPooler: boolean; provider: string } {
  const url = rawUrl || '';
  const masked = url.replace(/\/\/[^@]+@/, '//***:***@');
  let host = 'unknown';
  let port = 'unknown';
  let hasSslMode = false;
  let isPooler = false;
  let provider = 'unknown';

  try {
    const u = new URL(url);
    host = u.hostname;
    port = u.port || '5432';
    hasSslMode = u.searchParams.has('sslmode') || u.searchParams.has('sslmode');
    hasSslMode = hasSslMode || url.toLowerCase().includes('sslmode=require');
    isPooler = u.searchParams.has('pgbouncer') || url.toLowerCase().includes('pooler') || url.toLowerCase().includes('pgbouncer=true');
    if (host.includes('supabase.com')) provider = 'Supabase';
    else if (host.includes('neon.tech')) provider = 'Neon';
    else if (host.includes('rds.amazonaws.com')) provider = 'AWS RDS';
    else if (host.includes('railway.app')) provider = 'Railway';
    else provider = 'PostgreSQL';
  } catch {
    // unparseable URL, leave defaults
  }

  return { host, port, hasSslMode, isPooler, provider };
}

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  const databaseUrl = normalizeRuntimeDatabaseUrl(rawUrl);
  const diag = safeUrlDiagnostics(databaseUrl || rawUrl);

  console.log('Database Connectivity Check');
  console.log(`   Provider:   ${diag.provider}`);
  console.log(`   Host:       ${diag.host}`);
  console.log(`   Port:       ${diag.port}`);
  console.log(`   sslmode:    ${diag.hasSslMode ? 'present' : 'MISSING ⚠️'}`);
  console.log(`   Pooled:     ${diag.isPooler ? 'yes (pgBouncer / pooler)' : 'no (direct connection)'}`);
  console.log('');

  const prisma = databaseUrl
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : new PrismaClient();

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PrismaClient connected successfully.');
    console.log('   Read-only SELECT 1 query passed — database is reachable.');
  } catch (error: any) {
    if (error?.errorCode === 'P1001' || error?.message?.includes("Can't reach")) {
      console.error('❌ PrismaClient cannot connect.');
      console.error('');
      console.error('   Likely causes:');
      if (diag.provider === 'Supabase') {
        console.error('     - Supabase project paused (free tier hibernates)');
      } else if (diag.provider === 'Neon') {
        console.error('     - Neon compute auto-suspended (inactive project)');
      }
      console.error('     - Wrong DATABASE_URL host/port');
      console.error('     - IP not in database provider network allowlist');
      console.error('     - VPN, firewall, or network blocking the port');
      console.error('     - Stale/rotated database password');
      console.error('     - sslmode=require missing for cloud providers');
      console.error('');
      console.error('   Diagnostics:');
      console.error('     npm run check:local');
      console.error('');
      console.error('   No data was changed.');
    } else {
      console.error('❌ PrismaClient read-only connectivity check failed.');
      console.error('   The raw provider error was intentionally hidden to avoid leaking connection details.');
      console.error('   Run npm run check:local for safe host/port diagnostics.');
      console.error('   No data was changed.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
