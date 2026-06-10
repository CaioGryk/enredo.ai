# Database Security & Backup — Enredo.ai

**Purpose:** Define safe database security and backup practices for staging and production preparation.

---

## 1. Database Architecture

Enredo.ai uses **Supabase Postgres** with two connection modes:

| Variable | Purpose | Connection |
|----------|---------|------------|
| `DATABASE_URL` | Runtime API queries | Pooled (pgBouncer, port 6543) |
| `DIRECT_URL` | Prisma CLI / schema operations and backups | Direct (port 5432) |

**Rule:** Never mix them. The runtime API always uses `DATABASE_URL`. Prisma CLI operations (`prisma db push`, `prisma migrate`, `prisma generate`) use `DIRECT_URL` when available.

---

## 2. Environment Separation

| Environment | Database | Destroyable? | Backup Required? |
|-------------|----------|-------------|------------------|
| `development` | Local Supabase project | Yes (seeded data only) | No (seedable) |
| `staging` | Staging Supabase project | No | Yes (always) |
| `production` | Production Supabase project | Never | Yes (always) |

---

## 3. Backup Procedure

**⚠️ These are documented commands only. Do not execute them unless explicitly authorized.**

### Create a backup

```bash
# Export from Supabase using pg_dump
# Replace placeholders with real values
pg_dump "$DIRECT_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Verify backup integrity

```bash
# Check backup file size and line count
wc -l backup-*.sql

# Verify it contains expected tables
grep "CREATE TABLE" backup-*.sql | wc -l
```

### Backup naming convention

```
backup-YYYYMMDD-HHMMSS.sql
backup-pre-migration-YYYYMMDD.sql
backup-post-deploy-YYYYMMDD.sql
```

---

## 4. Backup Storage Rules

- **Never** store backup files inside the repository.
- **Never** commit backup files to Git.
- Store backups in an encrypted, access-controlled location (e.g., encrypted cloud storage, secure file server).
- Backups older than 30 days should be rotated (deleted) unless explicitly retained.
- Retain at least the last 3 successful backups.

---

## 5. Pre-Schema-Change Checklist

Before running `prisma db push`, `prisma migrate deploy`, or any schema-altering command against staging/production:

- [ ] I have confirmed which database I am targeting (staging or production?).
- [ ] I have a recent backup (less than 1 hour old).
- [ ] I have verified the backup integrity (file size, table count).
- [ ] I have reviewed the Prisma migration/SQL that will be applied.
- [ ] I understand the rollback/recovery plan.
- [ ] I have explicit approval from Codex/project owner.
- [ ] No one else is currently running schema operations on the same database.
- [ ] I am running from the correct branch with the correct `.env`.

---

## 6. Production Migration Strategy

For production launch (not yet active), the strategy is:

- **Current (beta/dev):** `prisma db push` (acceptable for early development).
- **Before public launch:** Switch to reviewed Prisma migrations (`prisma migrate dev` → `prisma migrate deploy`).
- **CI/CD:** Migrations should be applied via CI/CD pipeline, not manually.
- **Rollback:** Revert migrations are supported by Prisma (generate and apply down migration).

---

## 7. Incident: Credential Leak

If database credentials are suspected leaked:

1. **Immediately** rotate the database password via Supabase dashboard.
2. **Revoke** any compromised service role keys.
3. **Rotate** all `.env` variables that were stored alongside the leaked credentials.
4. **Audit** recent database access logs (`pg_stat_activity` or Supabase dashboard).
5. **Take a fresh backup** before making any changes.
6. **Notify** the project owner/Codex.

---

## 8. What Must Never Be Committed

| Item | Reason |
|------|--------|
| `.env` files | Contains all secrets and credentials |
| `DATABASE_URL` / `DIRECT_URL` | Full database connection strings |
| Backup SQL dumps | Contains all data including user PII |
| Supabase service role keys | Full database admin access |
| Migration files with hardcoded credentials | Security risk |

---

## 9. Validation Commands

These are SAFE to run at any time:

```bash
# Validate Prisma schema (no DB connection)
npx prisma validate

# Read-only DB safety check (env-only, no connection)
npm run check:db-safety

# Full backend validation
npm test -- --runInBand
npm run build
```

**NEVER run without explicit approval:**
- `prisma db push`, `prisma migrate deploy`, `prisma migrate reset`
- `seed:demo:reset`
- `DROP`, `DELETE`, `TRUNCATE`
- Backup restore against a live database
- Schema changes

---

**Last Updated:** After Step 77
