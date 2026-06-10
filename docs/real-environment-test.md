# Real Environment Test — Enredo.ai

**Purpose:** Test plan and tooling for staging/production environment validation.

**Status:** Readiness prepared. **Real execution pending** — no deployed API URL has been configured yet.

---

## 1. Environment Levels

| Level | Status | API URL Required? |
|-------|--------|-------------------|
| Local validation | ✅ Active | `http://localhost:3001/api` |
| Local smoke (script) | ✅ Ready | `API_BASE_URL` env var |
| Staging real | ⏳ Pending deploy | Requires deployed staging API |
| Production smoke | ❌ Not ready | Requires production deploy |

---

## 2. Smoke Test Script

Run from `services/api`:

```bash
# Local test
API_BASE_URL=http://localhost:3001/api npm run smoke:real-env

# Staging test (when deployed)
API_BASE_URL=https://api-staging.enredo.ai/api npm run smoke:real-env
```

Checks performed (safe, no mutations):
- `GET /api/health` — health check with environment/version
- Health check returns `{"status":"ok"}`, `database` is `ok`
- Response includes `X-Request-Id` header
- `GET /api/library/stories` — public library returns a list payload
- `GET /api/scene-media/feed` — public approved-scene feed returns a list payload
- The script exits non-zero if any automated public check fails

---

## 3. Manual Smoke Checklist

### Public endpoints (no auth)

- [ ] `GET /api/health` → `200 OK`
- [ ] `GET /api/library/stories` → story list
- [ ] `GET /api/scene-media/feed` → approved public scenes

### Authenticated endpoints (requires test credentials)

- [ ] `POST /api/auth/login` → `200` with tokens
- [ ] `GET /api/auth/profile` → user profile
- [ ] `POST /api/reading/start` → session created
- [ ] `POST /api/reading/sessions/:id/action` → scene returned
- [ ] `GET /api/scene-media/my` → user's media
- [ ] `POST /api/scene-media/:id/like` → engagement works
- [ ] `POST /api/scene-media/:id/save` → save works
- [ ] `POST /api/scene-media/:id/comments` → comment created
- [ ] `GET /api/scene-media/saved` → saved scenes

### Admin endpoints (requires admin credentials)

- [ ] `GET /api/admin/scene-media/pending` → `200` for admin
- [ ] `GET /api/admin/scene-media/pending` → `403` for non-admin
- [ ] `GET /api/admin/scene-media/metrics` → metrics
- [ ] `GET /api/admin/scene-media/reports` → reports
- [ ] `GET /api/admin/scene-media/comments` → comments

### Mobile verification

- [ ] App builds with correct `EXPO_PUBLIC_API_URL`
- [ ] Login/register works
- [ ] Library loads
- [ ] Reading flow works
- [ ] Scenes feed shows content
- [ ] Engagement actions work
- [ ] Saved scenes shows bookmarks

---

## 4. Security Checks

- [ ] Admin routes require ADMIN role (403 for non-admin)
- [ ] Public feed excludes private/unapproved/unpublished
- [ ] Swagger disabled on staging/production
- [ ] CORS rejects unauthorized origins
- [ ] `X-Request-Id` header in responses
- [ ] No email/passwordHash in public DTOs
- [ ] No stack traces in error responses

---

## 5. Deferred (Cannot Test Yet)

| Feature | Status |
|---------|--------|
| Stripe payments | Deferred |
| Video generation | Deferred |
| Real provider LLM costs | Deferred (mock mode OK for dev) |

---

## 6. Go/No-Go After Smoke

| Result | Action |
|--------|--------|
| All public + authenticated checks pass | ✅ Staging ready |
| Any check fails | ❌ Fix before proceeding |
| Admin checks pass | ✅ Admin ready |
| Mobile builds + connects | ✅ Mobile ready |

---

**Last Updated:** After Step 79
