# Operational Rules — Enredo.ai

**Purpose:** Safe operational commands, admin procedures, and deployment guidelines.

---

## Forbidden Commands (Destructive)

**NEVER run these without explicit authorization:**

| Command | Why Forbidden | Safe Alternative |
|---------|---------------|------------------|
| `prisma db push` | Can destroy data, change schema | Run only after approval, with backup |
| `prisma migrate deploy` | Applies migrations to production | Run only in CI/CD or with approval |
| `prisma migrate reset` | Drops and recreates database | Never in production |
| `prisma db seed` (on existing data) | Can duplicate data | Run only on fresh database |
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

---

## Database Operations

### Schema Changes Procedure

1. **Backup first**
   ```bash
   # Export current data
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
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

---

## Admin Seed Configuration

### Environment Variables
```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-random-password
```

### Seed Behavior
- Creates admin only if BOTH `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured
- If either is missing: skips admin creation, logs safe message, does NOT fail seed
- Never logs password, hash, or secrets
- Does NOT use hardcoded fallback credentials
- Does NOT silently promote existing users to ADMIN
- Idempotent: running multiple times is safe

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
- [ ] Swagger docs accessible
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

### Prisma Client Out of Sync
```
Invalid `prisma.xxx.findUnique()` invocation
```
**Fix:**
```bash
npx prisma generate
```

---

**Last Updated:** After Step 42 completion
