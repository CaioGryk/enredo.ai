# Production Readiness Checklist — Enredo.ai

**Purpose:** Go/no-go checklist for staging and production deployment.

---

## Verdict

| Environment | Status | Notes |
|-------------|--------|-------|
| Local/Dev Private Beta | ✅ READY | Steps 42-82 audited, 648 tests |
| Staging | ⚠️ CONDITIONAL | Manual deploy/env validation and real-environment smoke test required |
| Production | ❌ NOT READY | Stripe, video, CI/CD, observability deferred |

---

## 1. Environment & Secrets

- [ ] `NODE_ENV=production` (or `staging`)
- [ ] `JWT_SECRET` ≥ 32 chars, no placeholder
- [ ] `REFRESH_TOKEN_SECRET` ≥ 32 chars, no placeholder
- [ ] `DATABASE_URL` set (pooled, pgBouncer)
- [ ] `DIRECT_URL` set (direct, for migrations)
- [ ] `LLM_MOCK_MODE=false`
- [ ] `FREE_LLM_ONLY=false` (unless intentional)
- [ ] `ALLOWED_ORIGINS` includes staging/production domain
- [ ] `SWAGGER_ENABLED=false`
- [ ] Required provider keys configured for enabled features (`OPENROUTER_API_KEY` for text; `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_AI_API_KEY` only when those providers/features are enabled)
- [ ] Google OAuth `GOOGLE_CLIENT_IDS` configured
- [ ] `APPLE_CLIENT_ID` configured only if Apple Sign-In is enabled
- [ ] `ADMIN_EMAIL` / `ADMIN_PASSWORD` set for seed

## 2. Database Safety

- [ ] Backup created before any schema change
- [ ] `DATABASE_URL` ≠ `DIRECT_URL` (pooled vs direct)
- [ ] No `seed:demo:reset` on staging/production
- [ ] No `prisma db push` on production (use migrations)
- [ ] Reviewed migrations ready for CI/CD
- [ ] `check:db-safety` passes
- [ ] Pre-schema-change checklist completed

## 3. Backend Validation

- [ ] `npx prisma validate` passes
- [ ] `npm test -- --runInBand` passes (648 tests)
- [ ] `npx tsc --noEmit --incremental false` passes
- [ ] `npm run build` succeeds
- [ ] `npm run check:staging` passes
- [ ] `npm run check:prod` passes in env-only mode before DB connectivity is explicitly approved
- [ ] Rate limits configured
- [ ] Global exception filter active
- [ ] Request ID middleware active
- [ ] Health check returns `{"status":"ok"}`

## 4. Auth & Session

- [ ] Refresh tokens hashed at rest (SHA-256)
- [ ] Token rotation on refresh
- [ ] DB-backed role/plan in JWT validation
- [ ] Configurable expiry via `REFRESH_TOKEN_EXPIRES_IN`

## 5. Content Moderation

- [ ] Reading actions moderated
- [ ] Comments moderated (block unsafe, sanitize PII)
- [ ] Report reasons moderated
- [ ] Story generation input guard active
- [ ] Prompt injection patterns shared between services

## 6. Security

- [ ] Admin routes protected (JWT + ADMIN role)
- [ ] Public feed filters `PUBLIC + APPROVED + publishedAt`
- [ ] No email, passwordHash, or prompts in public DTOs
- [ ] No raw secrets in committed files
- [ ] No backup files in repo
- [ ] `.env` in `.gitignore`

## 7. Mobile Readiness

- [ ] `EXPO_PUBLIC_API_URL` set for production
- [ ] EAS production profile configured
- [ ] Android `app-bundle` / iOS IPA builds functional
- [ ] Deep links working
- [ ] No hardcoded local API URLs in production builds

## 8. Deferred (Blockers)

- [ ] ❌ Stripe real payment integration
- [ ] ❌ Real video provider
- [ ] ❌ CI/CD pipeline
- [ ] ❌ Production observability (Sentry/DataDog/etc.)
- [ ] ❌ Credential rotation from dev to production keys
- [ ] ❌ Load testing
- [ ] ❌ DNS/SSL for production domain
- [ ] ❌ Store submission/release process

## 9. Post-Deploy Smoke

- [ ] `GET /api/health` → `{"status":"ok"}`
- [ ] `POST /api/auth/login` → 200
- [ ] `GET /api/library/stories` → stories
- [ ] `GET /api/scene-media/feed` → feed
- [ ] `POST /api/reading/start` → session
- [ ] Admin endpoints return 403 for non-admin
- [ ] Mobile app connects to production API
- [ ] Swagger/OpenAPI is disabled or access-restricted outside local development

## 10. Rollback Plan

- [ ] Previous app version deployable
- [ ] Database backup available for restore
- [ ] Migration rollback tested
- [ ] Incident response contact identified

---

**Last Updated:** After Step 82 Fix
