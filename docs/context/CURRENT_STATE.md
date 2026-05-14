# Current State — Enredo.ai

**Purpose:** Current validation status, test coverage, and immediate next step priority.

---

## Validation Status

### Backend
| Check | Status | Command |
|-------|--------|---------|
| Tests | ✅ 559 tests / 38 suites passing | `npm test -- --runInBand` |
| TypeScript | ✅ Passing | `npx tsc --noEmit --incremental false` |
| Prisma Schema | ✅ Valid | `npx prisma validate` |
| Build | ✅ Passed | `npm run build` |

### Mobile
| Check | Status | Command |
|-------|--------|---------|
| TypeScript | ✅ Passing | `npx tsc --noEmit` in `apps/mobile` |

---

## Recent Closed Blocks

| Step | Description |
|------|-------------|
| Step 36B | Mobile/backend reading contract fixed |
| Step 37 | Reading error contract and mobile UX states stabilized |
| Step 38 | Reading runtime scenario test suite added |
| Step 39 | Mobile reading beta polish |
| Step 40 | Active sessions/library mobile contract |
| Step 41 | Credits and ledger hardening |
| Step 42 | Scene media credit spend contract, with protected image/video generation, auditable debit, and atomic persistence post-provider |
| Step 43 | Scene media mobile contract & UX — image generation, video placeholder, credit error handling |
| Step 44 | Scene media gallery/history + reader credit visibility |
| Step 45 | Social feed publication flow from scene media — submit for moderation |
| Step 46 | Moderator review interface — admin approve/reject submitted scene media |
| Step 47 | Real feed backend + mobile Scenes tab using approved public media |
| Step 48 | Social engagement foundation — like/save/share for scene media |
| Step 49 | Comments foundation — list, create, real commentCount, mobile overlay |
| Step 50 | Admin review metadata — enriched moderation DTO with social counts, story, narrative context |
| Step 51 | Admin moderation filters/search — status, mediaType, storyId, userId, q |
| Step 52 | Admin moderation metrics — aggregated counts by status/type, pending queue |
| Step 53 | Reports for scenes and comments — report flow + admin listing |
| Step 54 | Basic comment moderation — VISIBLE/HIDDEN/REMOVED status + admin endpoints |
| Step 55 | Final social feed states — mutation errors, image fallback, pull-to-refresh |

---

## Next Step Priority: Step 56 — Saved Scenes Screen/Tab

**Options for next step:**
- Saved/bookmarked scenes tab or screen
- Per-item skeleton loading states

---

## Test Coverage Summary

### Backend Test Suites (38 suites, 559 tests)

| Module | Test File | Coverage |
|--------|-----------|----------|
| AI Provider | `ai-provider.spec.ts` | Provider selection, model tracking, catalog, entitlement |
| Narrative Memory | `narrative-memory.spec.ts` | Memory, update logic, prompt injection |
| Reading Service | `reading-service.spec.ts` | Session limits, openThreads, business rules |
| Reading Orchestrator | `reading-orchestrator.security.spec.ts` | Private story access control |
| Story Setup | `story-setup.spec.ts` | Premises, characters, validation |
| Story Setup Security | `story-setup.security.spec.ts` | PremiseId leakage fix |
| User Story | `story-setup.user-story.spec.ts` | USER_GENERATED story setup |
| Story Quality | `story-quality.service.spec.ts` | Quality validation rules |
| Story Lifecycle | `story-lifecycle.service.spec.ts` | Story creation lifecycle |
| Scene Media | `scene-media.service.spec.ts` | Media lifecycle, credit spend, feed, engagement, comments, reports |
| Scene Media Controller | `scene-media.controller.spec.ts` | Report endpoint delegation |
| Generation Budget | `generation-budget.guard.spec.ts` | Budget enforcement |
| Story Generation | `story-generation.service.spec.ts` | Generation flow |
| Story Generation Integration | `story-generation.integration-flow.spec.ts` | End-to-end flow |
| Story Generation Input Guard | `story-generation.input-guard.spec.ts` | Input validation |
| Admin Usage | `admin-story-generation-usage.controller.spec.ts` | Admin endpoints |
| Admin Metrics | `admin-story-generation-usage-metrics.spec.ts` | Metrics aggregation |
| Admin Sanitization | `admin-story-generation-usage.sanitize.spec.ts` | Data sanitization |
| Roles Guard | `roles.guard.spec.ts` | RBAC authorization |
| Narrative Engine | `narrative-engine.service.spec.ts` | AI scene generation |
| Reading Contract | `reading-contract.spec.ts` | API contract validation |
| Reading Error Contract | `reading-error-contract.spec.ts` | Error handling |
| Budget Regression | `reading-orchestrator.budget-regression.spec.ts` | Budget edge cases |
| Context Window | `context-window-safety.spec.ts` | Context trimming |
| Fetch Retry | `fetch-retry.helper.spec.ts` | Provider retry logic |
| Runtime Scenarios | `reading-runtime-scenarios.spec.ts` | Beta journey scenarios |
| Zero Event Fallback | `zero-event-fallback.spec.ts` | Fallback behavior |
| Billing | `billing.service.spec.ts` | Credit operations |
| Provider Error | `provider-error-sanitization.spec.ts` | Error sanitization |

---

## Type Safety Status

### Backend TypeScript
- **Strict mode:** Enabled
- **Incremental compilation:** Working
- **Prisma client generation:** Synchronized with schema
- **No implicit any:** Enforced

### Mobile TypeScript
- **Expo SDK:** Latest stable
- **React Native types:** Configured
- **API type contracts:** Synced with backend DTOs

---

## Environment Configuration

### Backend (.env)
```
LLM_MOCK_MODE=false  # Production: real AI
FREE_LLM_ONLY=false  # Production: allow paid models
```

### Database
- **Provider:** Supabase Postgres
- **Prisma Client:** Generated and validated
- **Migrations:** Applied via `prisma db push`

---

## Quality Gates

Before any PR is considered ready:

1. ✅ All tests passing (`npm test -- --runInBand`)
2. ✅ TypeScript compilation clean (`npx tsc --noEmit`)
3. ✅ Prisma schema valid (`npx prisma validate`)
4. ✅ No sensitive data in logs or responses
5. ✅ Error codes follow established contract
6. ✅ Mobile types updated if API changed

---

**Last Updated:** After Step 55 (Final Social Feed States)
