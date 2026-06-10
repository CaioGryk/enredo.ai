# Operational Rules — Enredo.ai

**Purpose:** Safe operational commands, admin procedures, and deployment guidelines.

---

## Documentation Rule

Every meaningful project change must be documented in the project docs before the work is considered complete.

Minimum expectation:
- Update `docs/context/CHANGELOG_STEPS.md` with what changed, why, files touched, validation performed, and any remaining follow-up.
- Update the focused context doc when applicable, such as `MOBILE_CONTEXT.md`, `BACKEND_CONTEXT.md`, `CURRENT_STATE.md`, deploy guides, beta guides, or operational docs.
- Never document real secrets. Use placeholders for environment variables and provider keys.
- Deployment, environment, Railway, Expo, EAS, database, billing, AI-provider, and beta-process changes are always documentation-worthy.

---

## Forbidden Commands (Destructive)

**NEVER run these without explicit authorization:**

| Command | Why Forbidden | Safe Alternative |
|---------|---------------|------------------|
| `prisma db push` | Can modify schema; staging-only with explicit approval | Run only after target verification, backup, and approval |
| `prisma migrate deploy` | Applies migrations | Run only in CI/CD or with approval |
| `prisma migrate reset` | Drops and recreates database | Never in production |
| `npm run seed:demo:reset` | Deletes and recreates demo data | Use `npm run seed` for safe admin seed |
| `npm run qa:reset-reading-sessions -- --apply` | Deletes reading sessions for QA reset | Always run `--dry-run` first; preserves catalog |
| SQL DELETE/UPDATE without WHERE | Data destruction | Always use transactions, test first |
| Database DROP commands | Complete data loss | Never |

---

## Safe Commands (Always Allowed)

### Validation Commands
```bash
# Schema validation - ALWAYS SAFE
npx prisma validate

# TypeScript validation - ALWAYS SAFE
npx tsc --noEmit
npx tsc --noEmit --incremental false

# Test execution - ALWAYS SAFE
npm test -- --runInBand
npm test -- path/to/specific.spec.ts
```

### Development Commands
```bash
# Build - READ-ONLY (may fail on EPERM, that's OK)
npm run build

# Generate Prisma client - SAFE
npx prisma generate
npm run prisma:generate

# Development server - SAFE
npm run dev

# Admin seed - SAFE (creates admin only if not exists, idempotent)
npm run seed
npm run seed:admin

# Linting - SAFE
npm run lint
```

### Git Commands
```bash
# Read-only git commands - SAFE
git status
git log
git diff
git show

# Local commits - SAFE (unpushed)
git add -p
git commit

# NEVER force push to main/master
git push --force # FORBIDDEN without approval
```

### Local Destructive Commands
```bash
# Demo reset seed - DESTRUCTIVE, local clean DB only
npm run seed:demo:reset

# Beta catalog cleanup - SAFE, marks legacy stories as hidden (dev only, requires reachable migrated DB)
npm run catalog:beta:hide-legacy

# Dry-run mode — shows what would be hidden without modifying DB
npm run catalog:beta:hide-legacy -- --dry-run

# Beta catalog refresh — dry-run first; apply creates/updates beta catalog records
npm run catalog:beta:refresh -- --dry-run
npm run catalog:beta:refresh -- --apply --resume

# Beta story cover backfill — copies first premise coverUrl into empty Story.coverUrl records
npm run catalog:beta:backfill-story-covers -- --dry-run
npm run catalog:beta:backfill-story-covers -- --apply

# Beta character readiness — read-only check and safe empty-premise backfill
npm run catalog:beta:readiness
npm run catalog:beta:backfill-characters -- --dry-run
npm run catalog:beta:backfill-characters -- --apply
npm run catalog:beta:backfill-characters -- --apply --resume

# Curated beta escape hatch — no provider calls, only known remaining local/dev beta gaps
npm run catalog:beta:curate-missing-characters -- --dry-run
npm run catalog:beta:curate-missing-characters -- --apply

# Beta character partial-cast replacement — destructive for partial premises; use only after review
npm run catalog:beta:backfill-characters -- --apply --force-partial-regenerate

# Stale image status cleanup - SAFE, converts PENDING+imageError to FAILED
npm run cleanup:stale-image-status -- --scope characters --dry-run
npm run cleanup:stale-image-status -- --scope premises --dry-run
npm run cleanup:stale-image-status -- --scope all --apply

# QA reading-session reset - preserves catalog/users/stories/premises/characters/images
npm run qa:reset-reading-sessions -- --dry-run
npm run qa:reset-reading-sessions -- --dry-run --user-email demo@example.com
npm run qa:reset-reading-sessions -- --apply
```

**QA reset note:** `qa:reset-reading-sessions` deletes only `ReadingSession` rows. By schema cascade, `NarrativeEvent` and `NarrativeMemory` for those sessions are removed too. `ModelUsage` and `AdEvent` are preserved with `sessionId = null`; catalog stories, premises, playable characters, covers, portraits, users, credits, subscriptions, and narrative preferences are preserved. Always run `--dry-run` first.

**Provider note:** Admin catalog generation uses `ADMIN_CATALOG_TEXT_PROVIDER_CHAIN`; user story creation uses `USER_STORY_TEXT_PROVIDER_CHAIN`. Keep these server-side and do not expose provider context in mobile/API request payloads.

**Migration note:** `Story.isBetaVisible` column was added via migration at `prisma/migrations/20260526_add_story_is_beta_visible/`. On staging/beta databases, run `prisma migrate deploy` or the equivalent `ALTER TABLE` SQL before deploying the updated library filter. The hide-legacy script should run only after that migration is present on the target DB.

---

## Database Operations

### Schema Changes Procedure

1. **Backup first**
   ```bash
   # Export current data
   # Documentation only. Run only with explicit approval.
   pg_dump "$DIRECT_URL" > backup-$(date +%Y%m%d).sql
   ```

2. **Validate schema locally**
   ```bash
   npx prisma validate
   npx prisma generate
   ```

3. **Test migrations locally**
   ```bash
   # On local/dev database only
   npx prisma migrate dev
   ```

4. **Apply to staging**
   ```bash
   # After approval
   npx prisma migrate deploy
   ```

5. **Apply to production**
   ```bash
   # Only in CI/CD or with explicit approval
   npx prisma migrate deploy
   ```

### Safe Data Queries

```bash
# Read-only queries - SAFE
psql $DATABASE_URL -c "SELECT COUNT(*) FROM stories;"
psql $DATABASE_URL -c "SELECT * FROM users WHERE email = 'test@example.com';"

# Count queries - SAFE
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM reading_sessions GROUP BY status;"
```

### Pre-Schema-Change Checklist

Before any `prisma db push` or migration on staging/production:

- [ ] Target database confirmed
- [ ] Recent backup created (see `docs/database-security-backup.md`)
- [ ] Schema reviewed and documented
- [ ] Rollback plan defined
- [ ] Explicit approval obtained
- [ ] `check:db-safety` passes

### Supabase Connection Checklist

Before provider-real QA or real-user testing, verify:

- [ ] `npm run check:prisma-connect` passes (Prisma `SELECT 1` succeeds)
- [ ] `npm run check:local` reports database as connected (`database: ok`)
- [ ] `DATABASE_URL` is the runtime connection string — points to Supabase Transaction Pooler (port 6543, pgBouncer)
- [ ] `DIRECT_URL` is the migration/admin connection string — Session Pooler (port 5432) or direct connection
- [ ] `sslmode=require` is present in DATABASE_URL (appended automatically by `normalizeRuntimeDatabaseUrl` at runtime, but having it explicitly avoids edge cases)
- [ ] Supabase project is active (not paused — free tier hibernates)
- [ ] Local IP is in Supabase project network allowlist (if enabled)
- [ ] Database password has not been rotated/changed
- [ ] Local network/VPN/firewall is not blocking port 6543
- [ ] pgBouncer connection limit is not exhausted
- [ ] `GET /api/health` returns `{ database: "ok" }` — `database: error` blocks QA and real-user testing

If any check fails, `check:local` will report safe host/port diagnostics and recovery steps.

---

## Admin Seed Configuration

### Environment Variables
```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-random-password
```

### Seed Behavior
- Safe default command from `services/api`: `npm run seed` (same as `npm run seed:admin`)
- Default seed runs only the admin seed in `prisma/seed.ts`
- Creates admin only if BOTH `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured
- If either is missing: skips admin creation, logs safe message, does NOT fail seed
- Never logs password, hash, or secrets
- Does NOT use hardcoded fallback credentials
- Does NOT silently promote existing users to ADMIN
- Idempotent: running multiple times is safe
- Destructive demo reset is explicit only: `npm run seed:demo:reset`; do not run it against any database with data to preserve

### If `ADMIN_EMAIL` Already Exists
- If role is ADMIN → leaves unchanged
- If role is USER → reports safely, does NOT change role automatically
- Does NOT overwrite password automatically

---

## Local Development Setup

### Initial Setup (Safe)
```bash
cd /Users/mac/Documents/Projetos/enredo.ai/services/api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npx prisma generate

# Validate schema
npx prisma validate

# Run tests
npm test -- --runInBand

# Start development server
npm run dev
```

### Mobile Setup (Safe)
```bash
cd /Users/mac/Documents/Projetos/enredo.ai/apps/mobile

# Install dependencies
npm install

# TypeScript check
npx tsc --noEmit

# Start Expo
npx expo start

# Or export for web preview
npx expo export --platform web --output-dir dist-preview-v1
npx serve -s dist-preview-v1 -l 8099
```

---

## Production Deployment Checklist

### Pre-deployment
- [ ] All tests passing (`npm test -- --runInBand`)
- [ ] TypeScript compilation clean
- [ ] Prisma schema valid
- [ ] `.env` variables configured (not committed)
- [ ] Database credentials rotated
- [ ] LLM_MOCK_MODE=false
- [ ] FREE_LLM_ONLY=false (if allowing paid models)

### Deployment
- [ ] Database migrations applied via CI/CD
- [ ] Environment variables set in hosting platform
- [ ] Health check endpoint responding
- [ ] Swagger docs disabled or restricted in production
- [ ] Admin endpoints secured (ADMIN role only)

### Post-deployment
- [ ] Smoke tests passing
- [ ] Error monitoring active
- [ ] Usage tracking working
- [ ] Admin login working

---

## Monitoring and Observability

### Safe Monitoring Queries
```sql
-- Daily active users
SELECT DATE(created_at), COUNT(DISTINCT user_id) 
FROM reading_sessions 
GROUP BY DATE(created_at);

-- Credit usage by day
SELECT DATE(created_at), SUM(amount) 
FROM credit_transactions 
WHERE type = 'SPEND'
GROUP BY DATE(created_at);

-- Model usage counts
SELECT model_id, COUNT(*) 
FROM model_usages 
GROUP BY model_id;
```

### Alerts
- Failed login attempts > threshold
- Error rate > threshold
- Credit balance anomalies
- LLM provider failures

---

## Troubleshooting

### EPERM Error on Build
```
Error: EPERM: operation not permitted, unlink 'dist/tsconfig.tsbuildinfo'
```
**Cause:** Local filesystem issue (Windows/macOS file locking)
**Solution:** This is a known local issue, NOT a TypeScript error. Ignore in local dev.

### Database Connection Issues
```
Can't reach database server at `...`
```
**Check:**
- DATABASE_URL is correct
- Supabase project is active
- IP allowlist includes your IP

### Prisma P1001 — Database Unreachable at Startup

```
PrismaClientInitializationError: Can't reach database server (errorCode: P1001)
```

**Root cause:** Supabase pooler is unreachable from the local machine. This is an
**infrastructure/network issue**, not an application bug.

**Behavior:** P1001 blocks backend startup — the API server cannot start without a working
database connection. Prisma `$connect()` in `onModuleInit()` fails, and the NestJS bootstrap
process stops. No endpoints (including health) respond.

**Diagnostic steps:**
1. Run the readiness check: `bash scripts/check-local-ready.sh`
2. Verify DATABASE_URL in `.env` matches your Supabase project's pooler URL
3. Check Supabase project status — free-tier projects pause after inactivity
4. Verify your IP is in the Supabase project's network allowlist
5. Test pooler connectivity: `nc -zv <pooler-host> <port>`
6. Check for VPN or firewall blocking ports 5432/6543

**Recovery:** Fix the connectivity issue (project status, IP allowlist, network), then
restart the backend.

### Mobile Preview Login Failure — "Não foi possível conectar"

```
"Não foi possível conectar ao servidor do Enredo.ai."
```

**Check order:**
1. Backend is running on port 3001: `curl http://localhost:3001/api/health`
2. Backend health returns 200 (DB must be connected for backend to start)
3. Mobile API client targets the correct URL:
   - Web preview: `http://localhost:3001/api`
   - Android emulator: `http://10.0.2.2:3001/api`
   - Physical device: set `EXPO_PUBLIC_API_URL` to your LAN IP
4. If backend health returns database=error, see Prisma P1001 section above
5. Check CORS: the backend allows `localhost`, `127.0.0.1`, and `10.0.2.2` origins in development

### Local Runtime Readiness Script

A non-destructive check script verifies environment readiness:
```bash
bash scripts/check-local-ready.sh
```

This script checks:
- `.env` file existence and critical variables (presence only, never prints values)
- Safe TCP reachability to the configured database host/port
- Read-only PrismaClient connectivity with `SELECT 1` via `npm run check:prisma-connect`
- Prisma schema validity
- Backend and mobile TypeScript cleanliness
- Backend health endpoint response (HTTP 200)
- Database connectivity status via health endpoint

The script does NOT mutate data, run migrations, or expose secrets. It may perform read-only connectivity checks.

---

## Database Provider Support

### Supabase Postgres (Primary)
- Currently supported and documented as the primary provider.
- Active provider for the closed beta path as of June 9, 2026.
- Connection: Supabase Transaction Pooler (port 6543) for `DATABASE_URL`, Session Pooler (port 5432) for `DIRECT_URL`.
- Guide: `docs/supabase-prisma.md`

### Neon Postgres (Beta/Staging)
- Supported as an evaluated alternative for beta/staging environments, but deferred for the current closed beta.
- Uses plain PostgreSQL through Prisma — no Supabase-specific features needed.
- Connection: Neon pooled endpoint for `DATABASE_URL`, direct endpoint for `DIRECT_URL`.
- Guide: `docs/deploy-neon.md`
- Lower cost than Supabase for beta workloads.
- Auto-suspend after inactivity (free tier) — first request may have cold-start delay.
- Do not switch the active beta database back to Neon without explicit decision, fresh env backup outside the repo, successful `check:prisma-connect`, and target verification before any `prisma db push`.

### Not Supported for Beta
- SQLite — schema uses PostgreSQL-specific features (enums, arrays, JSON, Prisma Postgres provider).
- Self-hosted Postgres — only use if explicitly approved.
- MongoDB, MySQL, or other non-PostgreSQL databases — Prisma datasource is `postgresql`.

### Provider Selection
- The Prisma datasource block in `schema.prisma` reads `DATABASE_URL` and `DIRECT_URL` from environment. Switching providers only requires changing env values.
- No code changes needed for provider migration — the app uses Prisma ORM which abstracts the underlying Postgres host.
- JWT auth, reading flow, billing, and all business logic are provider-agnostic.

---

**Last Updated:** After Supabase beta database decision reaffirmed — June 9, 2026
