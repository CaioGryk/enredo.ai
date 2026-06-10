# Neon Postgres — Beta/Staging Database Setup

This guide documents how to use [Neon](https://neon.tech) as the PostgreSQL provider for Enredo.ai beta/staging environments. Supabase remains the primary documented provider; Neon is a supported alternative for lower-cost beta paths.

## Prerequisites

- A Neon account and project with a created database.
- The Neon project's connection strings (available in the Neon Dashboard → Connection Details).
- The Enredo.ai backend running locally or on Railway.

## Environment Variables

Set these in your `.env` (local) or Railway environment variables (staging):

```env
# Neon pooled connection — for runtime API requests.
# Use the pooled endpoint from Neon Dashboard (pgBouncer on port 5432).
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-xxxx-XXXX.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=1

# Neon direct/session connection — for Prisma CLI, migrations, and db push.
# Use the direct endpoint from Neon Dashboard.
DIRECT_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-xxxx-XXXX.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Important:**
- `DATABASE_URL` should use the **pooled** connection string from Neon.
- `DIRECT_URL` should use the **direct** connection string.
- Always include `?sslmode=require` in both URLs.
- Neon's pooled connection already routes through pgBouncer — include `?pgbouncer=true&connection_limit=1` for Prisma compatibility.
- Never commit these values. `.env` is in `.gitignore`.

## Local Validation Commands

Run these from `services/api/` after setting Neon env values:

```bash
# 1. Validate Prisma schema
npx prisma validate

# 2. Check database connectivity (read-only SELECT 1)
npm run check:prisma-connect

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to a new empty Neon beta database.
# This is schema-altering and requires target verification.
npx prisma db push

# 5. Seed admin user
npm run seed:admin

# 6. Full local readiness check
npm run check:local

# 7. Start the backend
npm run dev

# 8. Health check
curl http://localhost:3001/api/health
# Expected: {"status":"ok","database":"ok"}
```

## Migration Procedure (from Supabase to Neon)

Follow these steps in order:

### 1. Back up Supabase .env values

```bash
# Save your current Supabase credentials somewhere safe outside the repo.
# Do NOT commit them. Prefer a folder outside /Users/mac/Documents/Projetos/enredo.ai.
mkdir -p ~/enredo-env-backups
cp services/api/.env ~/enredo-env-backups/services-api.env.supabase.backup
```

### 2. Create Neon project and database

- Create a Neon project in the Neon Dashboard.
- Note the pooled and direct connection strings.

### 3. Update .env with Neon URLs

Replace `DATABASE_URL` and `DIRECT_URL` with the Neon connection strings from the Dashboard.

### 4. Validate connectivity

```bash
cd services/api
npm run check:prisma-connect
# Should print: ✅ PrismaClient connected successfully
```

### 5. Push schema and seed

```bash
# Only run against the new empty Neon beta database after target verification.
# This command mutates schema and is forbidden for production/public data.
npx prisma db push
npm run seed:admin
```

### 6. Run validations

```bash
npx tsc --noEmit --incremental false
npm test -- --runInBand
npm run check:local
```

### 7. Start the backend

```bash
npm run dev
curl http://localhost:3001/api/health
```

## Rollback to Supabase

To revert to Supabase:

```bash
# Restore Supabase .env values
cp ~/enredo-env-backups/services-api.env.supabase.backup services/api/.env

# Re-verify connectivity
npm run check:prisma-connect

# Restart backend
npm run dev
```

Keep the external `~/enredo-env-backups/services-api.env.supabase.backup` file until Neon is fully validated in beta. Do not store real `.env` backups inside the repository.

## Neon-Specific Notes

- **No Supabase-specific features are used** by Enredo.ai in the beta path. The app uses Prisma with plain PostgreSQL — no RLS, no Supabase Auth, no Supabase Storage, no Supabase Realtime.
- **The API gateway, JWT auth, and Prisma ORM are provider-agnostic.**
- Neon's free tier has a **1 GB storage limit** and **compute auto-suspend after inactivity**. For beta testing, this is sufficient.
- The `normalizeRuntimeDatabaseUrl()` helper (in `src/common/database-url.ts`) auto-adds `sslmode=require` and `pgbouncer` params for Supabase URLs. For Neon, include these params explicitly in your env values as shown above.
- For production, continue using Supabase or evaluate Neon's paid tiers.

## Railway API Deployment (Optional)

If deploying the NestJS API to Railway alongside Neon:

1. Create a Railway project.
2. Add the NestJS service pointing to this repo.
3. Set the build command: `cd services/api && npm install && npm run build`.
4. Set the start command: `cd services/api && node dist/main`.
5. Set environment variables in Railway (same as above, no `.env` file).
6. Railway auto-provisions a `PORT` env var — NestJS reads it from `ConfigService`.

## Related Documentation

- `docs/supabase-prisma.md` — Supabase + Prisma setup (primary provider)
- `docs/context/OPERATIONAL_RULES.md` — Database provider checklist and safe commands
- `docs/context/BACKEND_CONTEXT.md` — Backend architecture and configuration
- `docs/deploy-staging.md` — Staging deployment guide
