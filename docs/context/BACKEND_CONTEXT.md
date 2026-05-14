# Backend Context — Enredo.ai

**Purpose:** Backend-specific information, modules, entities, and current implementation status.

---

## Database Schema (Prisma)

### Core Entities

**User**
- User accounts and profiles
- Relations: subscriptions, creditWallet, readingSessions, refreshTokens

**RefreshToken**
- JWT refresh tokens
- Relation: user

**Subscription**
- FREE/PREMIUM plans
- Relation: user

**CreditWallet**
- Credit balance per user (`balance: Int`)
- Relation: user, transactions

**CreditTransaction**
- Audit trail for all credit movements
- Types: EARN, SPEND, REFUND, EXPIRE
- Reasons: PURCHASE, SUBSCRIPTION_BONUS, PROMO, SCENE_GENERATION, MEMORY_SUMMARY, IMAGE_GENERATION, REFERRAL, REFUND, EXPIRATION
- Relation: wallet

**Story**
- Stories in the library
- Fields: slug, language, maturityRating, basePrompt, tone, styleGuide, worldRules, openingScene
- Future fields for community: origin, visibility, moderationStatus, creatorUserId, etc.

**StoryPremise**
- Cached premises/synopses (3 per base story)
- Relation: story

**StoryPlayableCharacter**
- Playable characters per premise (3 per premise)
- Fields: name, label, narrativeFunction, personality, motivation, secret, relationships, objective, conflict
- Relation: premise

**ReadingSession**
- User reading sessions
- Status: ACTIVE, COMPLETED, ABANDONED
- Fields: selectedPremiseId, selectedCharacterId, protagonistName, protagonistRole, protagonistContext
- Relations: user, story, events, memory

**NarrativeEvent**
- Generated scenes
- Unique constraint: `[sessionId, sceneIndex]`
- Fields: sceneText, choices, sceneMetadata, modelUsed, providerUsed
- Relations: session

**NarrativeMemory**
- Persistent narrative state
- Fields: summary, worldState, characterState, importantChoices, openThreads, constraints, sceneCount
- Relation: session

**ModelUsage**
- AI model usage tracking
- Fields: modelId, provider, tokens, costUsd
- Relations: user, session

**DailyUsageLimit**
- Free user daily interaction limits
- Fields: date, count, userId
- Relation: user

**AdEvent**
- Ad impression/click tracking
- Relation: user

**StoryGenerationUsage**
- AI story generation usage tracking
- Status: SUCCESS, FAILED, BLOCKED
- Fields: modelId, provider, isMock, tokens, estimatedCost, failureReason
- Relations: user, story

---

## Implemented Modules

### auth
- JWT authentication with refresh tokens
- Password hashing with bcryptjs
- Role-based access control (RBAC) with UserRole enum

### library
- Public story catalog
- Story listing and detail endpoints

### reading
**Architecture:**
- `ReadingService` → Thin facade (delegates only)
- `ReadingOrchestratorService` → Business logic
- `GenerationBudgetGuard` → Budget enforcement
- `NarrativeEngineService` → AI scene generation
- `NarrativeContextBuilder` → Context construction

**Features:**
- Session creation/reuse
- First scene generation
- Continuation scene generation
- Narrative memory persistence
- Open threads tracking
- Daily limit enforcement (10/day for Free)
- 3 active session limit for Free (Serializable transaction + retry)
- Atomic credit spend for CREDITS-tier models

### ai
**Features:**
- Multi-provider gateway (OpenRouter, OpenAI, Anthropic)
- Model catalog with tier system (FREE, PREMIUM, CREDITS)
- Entitlement validation
- Prompt engineering
- Scene generation and parsing
- Error sanitization (no raw content in logs)
- Provider retry logic with `fetch-retry.helper.ts`

**Model Tiers:**
| Tier | Default Model | Cost |
|------|---------------|------|
| FREE | openrouter/free | Free |
| PREMIUM | gpt-4.1-nano | Included in subscription |
| CREDITS | claude-3-5-sonnet-20241022 | 1-2 credits per use |

### billing
**Features:**
- Credit wallet management
- Atomic credit spend with `updateMany` guard
- Credit transaction ledger (every change audited)
- Purchase flow (EARN transactions)
- Spend flow (SPEND transactions)

**Ledger Invariants:**
1. Every balance change has corresponding CreditTransaction
2. No negative balances (atomic guard)
3. Atomicity via Prisma `$transaction`

### moderation
- Content moderation for user actions
- Prompt injection pattern detection
- Safe/unsafe text classification

### story-setup
**Endpoints:**
- `GET /story-setup/stories/:storyId/premises` - Get cached or generate 3 premises
- `POST /story-setup/stories/:storyId/premises/generate` - Regenerate premises (admin/dev)
- `GET /story-setup/premises/:premiseId/characters` - Get cached or generate 3 characters
- `POST /story-setup/premises/:premiseId/characters/generate` - Regenerate characters (admin/dev)

**Validation:**
- Premium premises/characters block Free users (402)
- User story access enforced (creator-only for PRIVATE)

### story-lifecycle
**Features:**
- Story creation with lifecycle management
- USER_GENERATED stories start as PRIVATE
- Moderation before generation
- Status transitions: PRIVATE → SUBMITTED → APPROVED/REJECTED

### story-quality
**Validation Rules:**
- **Blocking:** title ≥5 chars, synopsis ≥20 chars, genres ≥1, openingScene ≥30 chars
- **Warnings:** tone, styleGuide, worldRules (logged only)
- Applied in: `generatePremises()`, `generateCharacters()`, `startReading()`
- Bypasses: ADMIN origin and PUBLIC+APPROVED stories

### story-generation
**Architecture:**
- `StoryGenerationService` - Orchestrates generation flow
- `StoryGenerationBudgetGuard` - Pure budget decision (no Prisma/LLM)
- `StoryGenerationInputGuard` - Input validation and sanitization
- `StoryGenerationObservabilityService` - Usage tracking

**Flow:**
1. Input validation (guard)
2. Budget decision (guard)
3. Generate story draft (AI or mock)
4. Validate draft in memory BEFORE save
5. Persist via `StoryLifecycleService`
6. Run `StoryQualityService` after save as sanity check

### scene-media
**Media Lifecycle:**
```
PLACEHOLDER → AI_GENERATED → USER_UPLOADED
```

**Features:**
- Image generation with credit spend (1 credit)
- Video generation scaffolding (5 credits) - real provider deferred
- Atomic post-generation transaction
- Credit enforcement before generation
- Rollback safety via Prisma `$transaction`

### admin
**RBAC:**
- `UserRole` enum: USER, ADMIN
- `@Roles()` decorator
- `RolesGuard` for endpoint protection
- Role comes from DB via JWT strategy (not stale token)

**Endpoints:**
- `GET /api/admin/story-generation/usage` - List usage with filters/pagination
- `GET /api/admin/story-generation/usage/metrics` - Aggregated metrics
- `GET /api/admin/story-generation/usage/:id` - Detail by ID

**Security:**
- Read-only (no write/update/delete)
- No sensitive data exposed (no prompts, no generated content, no stack traces)
- Sanitized failure reasons

---

## Error Contract

**Standardized Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `READING_SESSION_NOT_FOUND` | 404 | Session missing or not owned |
| `STORY_NOT_FOUND` | 404 | Story missing |
| `PREMIUM_REQUIRED` | 402 | Premium story on free account |
| `DAILY_LIMIT_REACHED` | 402 | Free user exceeds daily limit |
| `INSUFFICIENT_CREDITS` | 402 | User lacks credits |
| `MODEL_ACCESS_DENIED` | 403 | Model not available |
| `AI_PROVIDER_UNAVAILABLE` | 503 | LLM provider transient failure |
| `READING_GENERATION_FAILED` | 500 | Internal generation failure |
| `INVALID_READING_ACTION` | 400 | Action blocked by moderation |

**Helper:** `reading-errors.ts` provides `throwReadingError()` and `throwBudgetDenied()`

---

## Key Configuration

**Environment Variables:**
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
LLM_MOCK_MODE=false
FREE_LLM_ONLY=false
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=...
```

**Important:** `.env` is NOT committed (in `.gitignore`). Rotate credentials before production.

---

## API Documentation

Swagger UI available at: `http://localhost:3001/api/docs`

**Key Endpoints:**
- `POST /api/auth/login` - Authentication
- `GET /api/library/stories` - Story catalog
- `GET /api/ai/models` - Available models
- `POST /api/reading/start` - Start reading session
- `POST /api/reading/sessions/:id/action` - Send action

---

**Historical note:** Step 43 fixed the reading response contract.

### Step 43 Fix — Reading Response Contract

The `currentScene` in reading responses now includes `id` (the `NarrativeEvent.id`), allowing the mobile app to reference the current event for scene media operations.

**Files updated:**
- `reading.dto.ts` — `SceneResponseDto.id?: string`
- `reading-orchestrator.service.ts` — `generateFirstScene()` return includes `narrativeEvent.id`; `sendAction()` manual `currentScene` includes `events[0]?.id` (newest event, not oldest)

### Step 43 Final Fix — currentScene.id

**Bug fix:** `sendAction()` was using `events[events.length - 1]?.id` (oldest event) for `currentScene.id`. Fixed to `events[0]?.id` (newest event from desc ordering by `generatedAt`).

**Regression tests (2 new):** `reading-contract.spec.ts` verifies first-scene and continuation response `currentScene.id` contract.

### Step 45 — Scene Media Submit Hardening

**`submitForModeration()` contract updates:**
- Added content eligibility: TEXT-only media without `imageUrl` or `videoUrl` cannot be submitted (`BadRequestException`)
- Existing checks: ownership (`ForbiddenException`), visibility + status (`BadRequestException`)
- Sets `moderationStatus` to `PENDING`, keeps `visibility` as `PRIVATE`
- No automatic publishing

**Tests:** 2 new (text-only rejection, non-owner rejection), 1 updated (submit test now includes imageUrl and asserts no visibility change)

### Admin Moderation (Step 46)

**Module:** `admin/scene-media-moderation/`

**Endpoints:**
| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/admin/scene-media/pending` | List pending submissions (paginated) |
| `POST` | `/admin/scene-media/:id/approve` | Approve → APPROVED + PUBLIC + publishedAt |
| `POST` | `/admin/scene-media/:id/reject` | Reject → REJECTED + PRIVATE + optional note |

**RBAC:** `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`

**Constraints:**
- Only `PENDING` media can be approved/rejected
- Approval sets `publishedAt`, clears `moderationNote`
- Rejection keeps media private, accepts optional note
- Safe DTO mapping: no passwords, tokens, or raw content exposed

**Tests:** 15 new in `admin-scene-media-moderation.service.spec.ts`

### Scene Media Public Feed (Step 47)

**Endpoint:** `GET /scene-media/feed` — public, no auth required

**Feed rules:** Only `PUBLIC` + `APPROVED` + `publishedAt != null`. Paginated (default 20, max 100), ordered by `publishedAt desc`.

**Safe DTO:** Includes id, storyId, mediaType, imageUrl, textExcerpt, caption, title, publishedAt, story { id, title, coverUrl, genres }, user { id, name }. Excludes prompts, passwords, email, wallet, credits.

**Tests:** 6 new in `scene-media.service.spec.ts`

**Route safety (Step 47 Fix):** `SceneMediaFeedController` registered before `SceneMediaController` to prevent `/scene-media/feed` being shadowed by `/:id`.

### Scene Media Engagement (Step 48)

**New models:** `SceneMediaLike`, `SceneMediaSave`, `SceneMediaShare` with unique constraints and cascade deletes.

**Endpoints:** `POST/DELETE /scene-media/:id/like`, `/save`; `POST /scene-media/:id/share`

**Rules:** Only `PUBLIC + APPROVED + publishedAt != null` media is engageable. Feed DTO includes aggregate counts.

**Tests:** 9 new in `scene-media.service.spec.ts`

**Migration (Step 48 Fix):** `prisma/migrations/20260513_add_scene_media_engagement/`

### Comments (Step 49)

**Model:** `SceneMediaComment` with body validation (trim, 1-500 chars). Only engageable media can receive comments.

**Endpoints:** `GET /scene-media/:id/comments` (list, paginated), `POST /scene-media/:id/comments` (create). Both require JWT auth. Feed `commentCount` now real.

**Visibility (Step 49 Fix):** Both list and create enforce `PUBLIC + APPROVED + publishedAt` via `assertMediaIsEngageable()`.

**Tests:** 8 new in `scene-media.service.spec.ts`

### Admin Review Metadata (Step 50)

Admin scene media moderation responses now expose review-safe metadata for better approval/rejection decisions:
- Social counts: `likeCount`, `saveCount`, `shareCount`, `commentCount`
- Helpers: `hasImage`, `hasVideo`
- Story context: `id`, `title`, `slug`, `genres`, `maturityRating`
- Submitter context: `id`, `name`
- Narrative event context: `id`, `sceneIndex`

Sensitive fields remain excluded: story prompts/rules/style guide, user email/password/hash, wallet/credits, provider/model internals.

**Tests:** 4 new DTO safety/metadata tests in `admin-scene-media-moderation.service.spec.ts`

### Admin Moderation Filters/Search (Step 51)

`GET /admin/scene-media/pending` now supports moderation triage filters while preserving the enriched safe DTO from Step 50.

**Filters:** `status` (defaults to `PENDING`), `mediaType`, `storyId`, `userId`, `q`.

**Search:** `q` trims whitespace and searches safe content-preview fields only: `title`, `caption`, `textExcerpt`.

**Validation:** Invalid `status` or `mediaType` returns `BadRequestException`. Pagination remains default 20, max 100, sorted by `createdAt desc`.

**Tests:** 8 net new admin moderation tests; focused admin moderation suite now has 34 tests.

### Admin Moderation Metrics (Step 52)

`GET /admin/scene-media/metrics` exposes review-safe moderation metrics for the admin queue.

**Metrics:** total media, counts by moderation status, counts by media type, pending total with oldest/newest timestamps, published total, rejected total, withImage, withVideo.

**Rules:** Endpoint is admin-only via `JwtAuthGuard`, `RolesGuard`, and `@Roles(UserRole.ADMIN)`.

**Tests:** Admin moderation service and controller suites cover metrics aggregation and controller delegation.

### Reports for Scenes and Comments (Step 53)

**Model:** `SceneMediaReport` stores reports for either scene media or comments.

**Enums:** `SceneMediaReportTargetType` (`SCENE_MEDIA`, `COMMENT`) and `SceneMediaReportStatus` (`OPEN`, `REVIEWED`, `DISMISSED`).

**Endpoints:**
| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/scene-media/:id/report` | Authenticated user reports approved public scene media |
| `POST` | `/scene-media/comments/:commentId/report` | Authenticated user reports a comment whose parent scene is engageable |
| `GET` | `/admin/scene-media/reports` | Admin lists reports with optional `status`, `targetType`, `page`, `limit` filters |

**Rules:** Report reasons are trimmed and constrained to 3-500 chars; duplicate reports by the same user for the same target return `ConflictException`; reports only apply to public/approved/published scene media contexts.

**Tests:** Service coverage for scene reports, comment reports, duplicate handling, filters, invalid status, limit capping; controller coverage for scene/comment report delegation and admin report listing delegation.

### Comment Moderation (Step 54)

**Enum:** `CommentModerationStatus` (VISIBLE, HIDDEN, REMOVED)

**Public behavior:** `listComments()` returns only VISIBLE comments. Feed/engagement/admin moderation `commentCount` counts only VISIBLE comments. New comments are explicitly created as VISIBLE.

**Admin endpoints:** `GET /admin/scene-media/comments` (filters: status/sceneMediaId/userId/q), `POST /admin/scene-media/comments/:id/hide|remove|restore`. All return 404 for missing comments.

**DTO safety:** No email, wallet, prompts, provider internals exposed.

**Last Updated:** After Step 54 Final Cleanup
