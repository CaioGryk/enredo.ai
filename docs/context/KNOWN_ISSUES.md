# Known Issues — Enredo.ai

**Purpose:** Known risks, technical debt, limitations, and deferred work.

---

## P1 — Critical (Blocks Beta)

**Status:** All P1 issues resolved in Steps 32-42 ✅

Previously:
- ~~`LLM_MOCK_MODE=true` in `.env`~~ → Fixed in Step 33
- ~~Mobile status enum mismatch ('FINISHED' vs 'COMPLETED')~~ → Fixed in Step 33

---

## P2 — Should Fix Before Production

### Credit Spend Atomicity
**Status:** ✅ Fixed in Step 33
- Wrapped DB side effects in `$transaction()`
- AI generation stays OUTSIDE transaction (by design)
- Rollback on failure

### Action Text Sanitization
**Status:** ✅ Fixed in Step 33
- `ReadingService.sendAction()` now passes `moderationResult.sanitizedText`

### Free Token Limit
**Issue:** Free users capped at 500 tokens (very restrictive)
**Impact:** Responses may feel too short
**Decision:** May increase to 750-1000 for better UX
**Priority:** Lower (not blocking)

### Retry Logic for Rate Limits
**Issue:** No automatic retry for 429 or 500 errors from providers
**Status:** ✅ Partially addressed in Step 35
- Added `fetch-retry.helper.ts` with retry for transient errors
- Retries: 429, 500, 502, 503, 504
- No retry: 401, 403, validation errors

### Large Context Windows
**Issue:** Long sessions could exceed LLM context window
**Status:** ✅ Addressed in Step 35
- `NarrativeContextBuilder.trimPreviousScenes()` limits context
- Max 3 previous events, 1200 chars per scene, 4000 total

### User Action Injection
**Issue:** User actions injected into prompts without full sanitization
**Status:** Partially addressed
- Basic moderation in place
- Could harden further with structured escaping

---

## P3 — Cleanup/Hardening (Deferred)

### Hardcoded Values
**Locations:**
- `adInterval = 5` (interstitial every 5 interactions)
- `activeSessionLimit = 3` (Free tier)
- `dailyLimit = 10` (Free tier daily interactions)
- `chapterNumber = 1` (not used)
- `freeTokens = 500` (response length limit)

**Decision:** Move to configuration or database in future

### Memory Trimming
**Issue:** Aggressive trimming keeps only last important choice/thread
**Impact:** May lose earlier context in long sessions
**Decision:** Acceptable for MVP, revisit if users complain

### Ad Provider
**Issue:** Hardcoded to 'MOCK'
**Status:** Not yet integrated with real ad provider
**Decision:** Deferred to post-MVP

### Build EPERM Issue
**Issue:** `npm run build` fails locally with EPERM on `dist/tsconfig.tsbuildinfo`
**Impact:** Local development only, not CI/CD
**Workaround:** Not a TypeScript error, can ignore locally
**Decision:** Documented as known issue

---

## Technical Debt

### Code Cleanup
| Item | Location | Status |
|------|----------|--------|
| Dead code: `consumeUsage()` | reading.service.ts | Removed |
| Hardcoded choices in tests | Various | Acceptable |
| Inline credit spend | reading-orchestrator | Refactored to billing service |

### Schema Drift Tracking
**Known B Drift (Deferred):**
- `model_usages.costUsd` → May need precision adjustment
- `story_playable_characters.storyId` → ✅ Removed in Step 25B

**Status:** Migration executed successfully, no drift remaining

---

## Mobile Limitations

### Test Infrastructure
**Issue:** No practical mobile test setup exists
**Impact:** TypeScript validation only
**Decision:** Acceptable for beta, setup proper testing in future

### Feed Cenas
**Issue:** Still placeholder visual
**Current:** Structure with images/frames
**Future:** Real video integration
**Status:** Step 43+ target

### Scene Media Integration
**Issue:** Mobile not yet connected to scene media endpoints
**Status:** Target for Step 43

---

## Security Considerations

### Secrets Rotation
**Issue:** Some credentials may have been shared in development
**Action:** Rotate all credentials before production
**Priority:** High before launch

### Consent Management
**Issue:** User image consent for AI personalization not fully implemented
**Status:** UI exists, backend enforcement partial
**Priority:** Before enabling image personalization features

---

## Performance Limits

### Database
**Current:** Supabase Postgres
**Limits:**
- Connection pooling works for current load
- May need optimization at scale

### LLM Costs
**Monitoring:** Usage tracking in place
**Risk:** Unexpected costs if usage spikes
**Mitigation:** Budget guards, rate limiting, credit system

---

## Deferred Work Summary

| Item | Reason | Proposed Timeline |
|------|--------|-------------------|
| Real video credentials/staging validation | Kling provider boundary exists, but no real credentials/staging execution has been validated | Step 86+ |
| Persisted appearance opt-in/photo lookup | Provider boundary supports appearance reference, but User schema/mobile profile do not yet persist explicit video appearance consent | Step 87+ |
| Real purchase idempotency | Mock/dev metadata guard exists; production requires provider/webhook-backed uniqueness | Phase 2+ |
| Credit refunds | Flow not designed | Phase 3 |
| Social discovery/ranking | Feed, engagement, comments, reports, saved scenes, and moderation exist; deeper ranking/discovery remains future work | Phase 3 |
| Ad provider integration | Not priority | Post-MVP |
| Configuration from DB | Hardcoded fine for now | Phase 3 |
| Comprehensive mobile tests | Infrastructure needed | Post-MVP |

---

**Last Updated:** After Step 42 completion
