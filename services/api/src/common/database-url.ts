export function normalizeRuntimeDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const isPostgres = url.protocol === 'postgresql:' || url.protocol === 'postgres:';
    const isSupabase = url.hostname.endsWith('.supabase.com') || url.hostname.includes('.pooler.supabase.com');
    const isSupabasePooler = url.hostname.includes('.pooler.supabase.com') || url.port === '6543';

    if (isPostgres && isSupabase && !url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }

    if (isPostgres && isSupabasePooler) {
      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '1');
      }
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}
