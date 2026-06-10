// Safe HTTP smoke test — no DB connection, no mutations.
// Usage: API_BASE_URL=http://localhost:3001/api npx ts-node scripts/smoke-real-env.ts

const BASE = process.env.API_BASE_URL;
if (!BASE) {
  console.error('ERROR: API_BASE_URL is required.');
  console.error('Usage: API_BASE_URL=http://localhost:3001/api npx ts-node scripts/smoke-real-env.ts');
  process.exit(1);
}

async function get(path: string): Promise<{ status: number; body: any; requestId?: string }> {
  const res = await fetch(`${BASE}${path}`);
  const body = await res.json().catch(() => null);
  return { status: res.status, body, requestId: res.headers.get('x-request-id') || undefined };
}

function hasArrayPayload(body: any): boolean {
  if (Array.isArray(body)) return true;
  if (Array.isArray(body?.data)) return true;
  if (Array.isArray(body?.items)) return true;
  return false;
}

async function main() {
  let failed = false;

  console.log(`Real Environment Smoke Test`);
  console.log(`  API: ${(BASE!).replace(/\/\/.*@/, '//***@')}\n`);

  // Health check
  const health = await get('/health');
  console.log(`GET /health → ${health.status} ${health.status === 200 ? '✅' : '❌'}`);
  if (health.body?.status !== 'ok') { console.log(`  ⚠️  status=${health.body?.status}`); failed = true; }
  if (!health.requestId) console.log('  ⚠️  No X-Request-Id header');
  console.log(`  environment: ${health.body?.environment || 'N/A'}`);
  console.log(`  version: ${health.body?.version || 'N/A'}`);
  console.log(`  database: ${health.body?.database || 'N/A'}`);
  console.log(`  requestId: ${health.requestId || 'N/A'}\n`);

  // Public library
  const library = await get('/library/stories');
  const libraryOk = library.status === 200 && hasArrayPayload(library.body);
  console.log(`GET /library/stories → ${library.status} ${libraryOk ? '✅' : '❌'}`);
  if (!libraryOk) failed = true;
  console.log(`  items: ${library.body?.data?.length ?? library.body?.items?.length ?? (Array.isArray(library.body) ? library.body.length : 0)}\n`);

  // Public feed
  const feed = await get('/scene-media/feed');
  const feedOk = feed.status === 200 && hasArrayPayload(feed.body);
  console.log(`GET /scene-media/feed → ${feed.status} ${feedOk ? '✅' : '❌'}`);
  if (!feedOk) failed = true;
  console.log(`  items: ${feed.body?.data?.length ?? 0}\n`);

  console.log(failed ? '❌ Some checks failed.' : '✅ All checks passed.');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
