# Backend Staging Deployment Guide — Enredo.ai

**Purpose:** Prepare and validate the backend for staging deployment.

---

## 1. Required Environment Variables

All values below are examples. Replace with real values for your staging environment.

```bash
# Environment
NODE_ENV=staging
APP_VERSION=0.1.0

# Database (Supabase Postgres — use staging credentials)
DATABASE_URL=postgresql://postgres.XXXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.XXXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres

# Auth (generate with: openssl rand -hex 64)
JWT_SECRET=<64-char-hex>
REFRESH_TOKEN_SECRET=<64-char-hex>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Social Login
GOOGLE_CLIENT_IDS=<comma-separated>
APPLE_CLIENT_ID=ai.enredo.app

# Mode (MUST be false on staging)
LLM_MOCK_MODE=false
FREE_LLM_ONLY=false

# Feature Flags
ENABLE_IMAGE_GENERATION=true
ENABLE_VIDEO_GENERATION=false

# CORS (staging domain)
ALLOWED_ORIGINS=https://staging.enredo.ai

# Swagger (disable on staging)
SWAGGER_ENABLED=false

# Port
PORT=3001

# Admin Seed (set both to create admin on first deploy)
ADMIN_EMAIL=admin@enredo.ai
ADMIN_PASSWORD=<strong-password>
```

---

## 2. Pre-Deploy Validation

Run these checks locally with staging env vars loaded:

```bash
cd services/api

# Validate everything without deploying
NODE_ENV=staging npm run check:staging

# Or run individual checks:
npx prisma validate          # Schema valid?
npx tsc --noEmit             # TypeScript clean?
npm test -- --runInBand       # All tests passing?
npm run build                 # Build succeeds?
```

---

## 3. Database Setup (Manual)

**⚠️ Do NOT automate migrations.** Run these manually with caution, and always backup first.

**Pre-requisite:** Review `docs/database-security-backup.md` and run `npm run check:db-safety`.

```bash
# Documentation only. Run only with explicit authorization:
# pg_dump "$DIRECT_URL" > backup-pre-push-$(date +%Y%m%d).sql

# On first deploy or schema change, only after backup + approval:
# npx prisma db push

# To generate the Prisma client:
npx prisma generate

# To seed admin user (idempotent):
npm run seed:admin
```

Prefer a dedicated disposable staging database while the project still uses `prisma db push`. Production must move to reviewed migrations before public launch.

---

## 4. Health Check

After deploy, verify the staging server is alive:

```bash
curl https://staging.enredo.ai/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "enredo-api",
  "environment": "staging",
  "version": "0.1.0",
  "timestamp": "2026-...",
  "database": "ok"
}
```

If `database` is `error` or `status` is `degraded`, check DATABASE_URL and network connectivity.

---

## 5. Post-Deploy Smoke Checklist

- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] `POST /api/auth/login` returns 200 with valid credentials
- [ ] `GET /api/library/stories` returns stories
- [ ] `GET /api/ai/models` returns model list
- [ ] `POST /api/reading/start` creates a session
- [ ] `GET /api/scene-media/feed` returns approved public media
- [ ] Admin endpoints require ADMIN role (403 for regular users)
- [ ] Swagger NOT accessible (`SWAGGER_ENABLED=false`)
- [ ] CORS rejects unauthorized origins
- [ ] Database migrations applied correctly

---

## 6. Forbidden Commands

**NEVER run on staging/production without explicit approval:**

- `prisma db push` (can modify schema; staging-only with backup/approval)
- `prisma migrate deploy` (applies pending migrations)
- `prisma migrate reset` (destroys all data)
- `npm run seed:demo:reset` (wipes demo data)
- `SQL DELETE / DROP / TRUNCATE`

---

## 7. Rollback / Stop

To stop the staging server:

```bash
# If using Docker:
docker compose down

# If using a process manager:
pm2 stop enredo-api
```

Database state is NOT rolled back by these commands. Schema changes must be handled manually.

---

## 8. Environment Startup Check

On startup, `validateEnv()` (from Step 70) will:

- Exit with code 1 if:
  - `DATABASE_URL` is missing
  - `JWT_SECRET` is < 32 chars or contains a placeholder
  - `REFRESH_TOKEN_SECRET` is < 32 chars or contains a placeholder
  - `LLM_MOCK_MODE=true`
- Warn if:
  - No CORS origins configured
  - `SWAGGER_ENABLED=true`
  - `FREE_LLM_ONLY=true`

Check server logs for validation messages after deploy.

---

## 9. Docker Notes

The backend Dockerfile defaults to `APP_ENV=production`, which sets `NODE_ENV=production`.

For staging container builds, pass:

```bash
docker build --build-arg APP_ENV=staging -t enredo-api:staging services/api
```

If the hosting platform overrides environment variables at runtime, set `NODE_ENV=staging` there as the source of truth.

---

**Last Updated:** After Step 77
