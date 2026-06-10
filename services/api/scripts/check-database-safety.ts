// Safe database environment check — no DB connection, no credentials in output.
// Usage: NODE_ENV=staging npx ts-node scripts/check-database-safety.ts

function mask(cnx: string | undefined): string {
  if (!cnx) return '(not set)';
  try {
    const url = new URL(cnx.replace('postgresql://', 'http://'));
    return `${url.protocol.replace('http:', 'postgresql://')}${url.username}:***@${url.hostname}:${url.port || 'N/A'}${url.pathname}`;
  } catch {
    return '(unparseable)';
  }
}

export function checkDatabaseSafety(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production' || nodeEnv === 'staging';

  if (!process.env.DATABASE_URL) issues.push('DATABASE_URL is not set.');
  if (isProd) {
    if (!process.env.DIRECT_URL) issues.push('DIRECT_URL is not set (required for migrations).');
    if (process.env.DATABASE_URL && process.env.DIRECT_URL && process.env.DATABASE_URL === process.env.DIRECT_URL) {
      issues.push('DATABASE_URL and DIRECT_URL should be different (pooled vs direct).');
    }
  }

  console.log('DB Safety Check');
  console.log(`  Environment: ${nodeEnv}`);
  console.log(`  DATABASE_URL: ${mask(process.env.DATABASE_URL)}`);
  console.log(`  DIRECT_URL:   ${mask(process.env.DIRECT_URL)}`);
  console.log(`  Issues: ${issues.length}`);

  issues.forEach((i) => console.log(`    - ${i}`));

  const ok = issues.length === 0 || nodeEnv === 'development';
  console.log(`  Result: ${ok ? 'OK' : 'ISSUES FOUND'}`);
  return { ok, issues };
}

if (require.main === module) {
  const { ok } = checkDatabaseSafety();
  process.exit(ok ? 0 : 1);
}
