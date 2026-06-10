# Backend Context — Enredo.ai

**Purpose:** Backend-specific information, modules, entities, and current implementation status.

---

## Database Schema (Prisma)

### Core Entities

**User**
- User accounts and profiles
- Relations: subscriptions, creditWallet, readingSessions, refreshTokens

**UserNarrativePreferences**
- Private narrative preference record per user.
- Fields: `romanceIntensity`, `adultContentOptIn`, `ageVerifiedAt`, `adultTermsAcceptedAt`.
- Backend computes effective allowed level for reading prompts.
- Adult 18+ requires opt-in, age confirmation, and terms acceptance.
- Adult preferences affect private text generation only; adult image/video and adult use of user likeness are blocked for MVP.

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
- Persistent narrative state — now acts as the **Story Codex** for long-running reading sessions
- Text fields: summary, worldState, characterState, importantChoices, openThreads, constraints, sceneCount
- **New: `codex Json?`** — structured Codex with canonical facts, character states, locations, important choices, open/resolved threads, timeline, `doNotContradict` constraints, and player intent (Step 98c)
- Migration: `20260601_add_narrative_memory_codex` adds the `codex` JSONB column to `narrative_memories`
- Codex is injected into AI prompts via `NarrativeContextBuilder.serializeCodexForPrompt()`
- Deterministic compiler updates codex each scene; LLM-assisted enrichment is a documented extension point
- Existing text fields remain backward-compatible; sessions without codex work unchanged
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
- Refresh tokens are stored at rest as SHA-256 digests, never as raw client tokens
- Refresh token rotation revokes the old stored digest and issues a new token
- Refresh tokens include a unique `jti` per issue to prevent same-second JWT/digest collisions
- `REFRESH_TOKEN_EXPIRES_IN` controls both JWT expiration and stored `expiresAt`
- Access validation resolves user role/subscription from the database, not stale token claims

### library
- Public story catalog
- Story listing and detail endpoints

### reading
**Architecture:**
- `ReadingService` → Thin facade (delegates only)
- `ReadingOrchestratorService` → Business logic
- `GenerationBudgetGuard` → Budget enforcement
- `NarrativeEngineService` → AI scene generation
- `NarrativeContextBuilder` → Context construction + Story Codex compilation/serialization (Step 98c)
- Effective narrative preference policy is injected into scene prompts after backend validation, never read directly from mobile request payloads.
- Reader prompt behavior is tuned for concise atmospheric narration plus active character interaction (Step 98d).
- Reader prompts explicitly anchor POV and player agency to the selected playable character. NPCs must remain active, but cannot become the "voce" character or steal the player character's goals/actions.
- Reader prompt context includes rich premise character traits (`personality`, `motivation`, `secret`, `relationshipToPlayer`, `initialGoal`, `startingSituation`, `conflictPotential`) for both first scenes and continuations. NPC dialogue/reactions should follow those traits, not generic archetypes.
- Reader session responses return only a recent-event scrollback window for mobile performance; Story Codex/Narrative Memory remains the long-term continuity source.
- Reading session summaries strip inline/base64 image data from `storyCoverUrl` and only expose external `http(s)` URLs. This prevents `/reading/sessions` from returning multi-megabyte JSON payloads; mobile uses fallback art when no external image URL is available.
- Controlled provider-failure QA harness: `QA_FORCE_READING_PROVIDER_FAILURE=true` forces reading scene generation to return the sanitized `AI_PROVIDER_UNAVAILABLE` path before real provider calls. The flag is dev/test-only and is blocked by env validation in staging/production.

**Features:**
- Session creation/reuse
- First scene generation
- Continuation scene generation
- Narrative memory persistence
- Story Codex production-safety fix: first generated scene is recorded in codex timeline; continuation generation resolves `session.selectedPremiseId` and `session.selectedCharacterId` instead of falling back to arbitrary first records
- Story Codex / initial memory now records rich premise character traits so supporting characters can preserve personality and relationship dynamics across sessions.
- Default/free reading scenes target ~90-170 words and 3-5 short visual blocks after the first scene; first scenes target ~110-190 words. Cinematic mode can be richer but must still avoid dense mobile paragraphs and keep characters active.
- Scene prompts require meaningful character reaction when characters are available, preserve atmospheric narration, and favor specific relational choices over generic actions.
- Open threads tracking
- Daily limit enforcement (FREE_DAILY_INTERACTION_LIMIT=10/day for Free, step 84 constant)
- 3 active session limit for Free (FREE_ACTIVE_SESSION_LIMIT=3, step 84 constant)
- Atomic credit spend for CREDITS-tier models

### ai
**Features:**
- Multi-provider gateway (Groq, OpenRouter, Google Gemini, OpenAI, Anthropic)
- Model catalog with tier system (FREE, PREMIUM, CREDITS)
- Entitlement validation
- Prompt engineering
- Scene generation and parsing
- `SCENE_GENERATION_PROMPT`, `FIRST_SCENE_PROMPT`, and runtime `sceneInstruction` strings now encode the Step 98d reader behavior contract: concise narration, living character reactions, dialogue/subtext, and relational choices.
- Scene parser guard: escaped/double-encoded JSON scene responses are recovered, while malformed JSON leaked inside `sceneText` is rejected with a controlled gateway error so raw provider JSON is never rendered in the reader.
- Error sanitization (no raw content in logs)
- Provider retry logic with `fetch-retry.helper.ts`
- Default free LLM for MVP: `groq/free` via Groq, with OpenRouter DeepSeek (`deepseek/deepseek-v4-flash:free`) and Google Gemini (`gemini/free`) as fallbacks. Avoid `openrouter/free` as the primary default because router-selected reasoning models can return `content: null` under low token limits.
- Image provider chain for core covers/portraits: Cloudflare Workers AI / `@cf/black-forest-labs/flux-1-schnell` primary, Google image fallback, Replicate `black-forest-labs/flux-schnell` final optional fallback.
- Google image generation remains optional/fallback; local testing showed Gemini image free quota can be 0 for image models.
- Replicate is a paid fallback for beta resilience and requires `REPLICATE_API_TOKEN`.

- Scene text normalization: `normalizeSceneTextQuotes()` strips straight/smart/escaped external wrapper quotes and unescapes internal dialogue quotes after wrapper removal, preserving readable dialogue without `\"` artifacts (Steps 98f/98j)
- Second-person "você" narration enforced in scene prompts; first-person ("eu", "meu") blocked for protagonist voice (Step 98f)

**Model Tiers (Step 88 cost audit):**
| Tier | Default Model | Credit Cost | Fallback Chain |
|------|---------------|-------------|----------------|
| FREE | groq/free | 0 | Groq → OpenRouter DeepSeek → Gemini |
| PREMIUM | gpt-4.1-nano | 0 | — |
| CREDITS | claude-3-5-sonnet-20241022 | 2 per scene | — |

Free LLM fallback: When `FREE_LLM_ONLY=true` or model `costMode === 'FREE'`, `AiService.generateWithProviderFallback()` tries the explicitly requested free model first when one is provided, then Groq, OpenRouter DeepSeek, and Google Gemini. Provider failures are caught and next candidate tried. Last error thrown as `BadGatewayException`.

Cinematic mode no longer bypasses credit checks — the budget guard uses actual user balance for all modes.

### billing
**Features:**
- Credit wallet management
- Atomic credit spend with `updateMany` guard
- Credit transaction ledger (every change audited)
- Purchase flow (EARN transactions, mock in beta)
- Spend flow (SPEND transactions)
- Admin credit grants via `POST /admin/billing/users/:userId/credits/grant`
- Admin grants create auditable PROMO/EARN ledger entries with `ADMIN_GRANT` metadata
- Full monetization policy: see `docs/monetization-policy.md` (Step 89)

**Ledger Invariants:**
1. Every balance change has corresponding CreditTransaction
2. No negative balances (atomic guard)
3. Atomicity via Prisma `$transaction`

### narrative-preferences
**Features (Steps 1-4 — Backend, Mobile, Prompt Integration, Public Feed Guardrails, May 2026):**
- **Model:** `UserNarrativePreferences` with `RomanceIntensity` enum (NONE, SOFT, INTENSE, ADULT_18).
- **Endpoints:** `GET /narrative-preferences/me`, `PATCH /narrative-preferences/me`, `GET /narrative-preferences/me/effective-policy` — all JWT-guarded.
- **Effective policy:** Backend-owned. `ADULT_18` requires `adultContentOptIn=true`, `ageVerifiedAt`, and `adultTermsAcceptedAt`. Missing any gate → downgrades to `INTENSE`.
- `mediaAdultContentAllowed` and `userLikenessAdultContentAllowed` permanently `false` in MVP.
- **Reading integration:** `ReadingOrchestratorService` resolves the effective policy server-side and passes it to `NarrativeEngine`; `AiService` appends content policy instructions to first-scene and continuation prompts.
- **Public/social guardrails:** adult-enabled narrative events are marked internally, `SceneMedia` inherits the flag, public moderation submission is blocked, public feed/saved/engagement/comment-report surfaces exclude adult-generated media.
- See `docs/content-adult-policy.md` for full product contract.

### moderation
- Content moderation for user actions
- Prompt injection pattern detection
- Safe/unsafe text classification
- Step 76 centralizes beta policy for reading actions, comments, report reasons, and story generation input
- Blocks empty input, length violations, prompt injection, and blocked content keywords
- Sanitizes URLs, emails, phones, and control characters before persistence where applicable
- Manual moderation remains for scene media approval/rejection and comment hide/remove/restore
- Provider-based text classification and image/video moderation remain deferred
- Adult-content policy: private adult text may be allowed only after opt-in/age gates; adult public feed distribution and adult image/video remain blocked in the MVP. See `docs/content-adult-policy.md`.

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
- Scene image generation with credit spend (1 credit)
- Base playable character portraits are core MVP and should not spend user credits
- Video generation via Kling (5 credits) — real provider boundary (Step 85)
- Atomic post-generation transaction
- Credit enforcement before generation
- Rollback safety via Prisma `$transaction`

**Character Portrait Provider Decision:**
- Primary no-cost MVP provider: Cloudflare Workers AI with `@cf/black-forest-labs/flux-1-schnell`.
- Fallback chain: Cloudflare → Google → Replicate.
- Portraits are generated from `StoryPlayableCharacter.visualPrompt` and persisted to `imageUrl`.
- Playable character generation must produce story-specific names, dramatic role labels, descriptions, secrets, initial goals, and `startingSituation`; visible labels must not be generic archetypes like "O Protagonista", "O Vilão", or "O Mentor".
- `StoryPlayableCharacter.startingSituation` is the character-specific opening hook and must be passed into first-scene generation so choosing a character changes both point of view and starting scene.
- Character generation receives story synopsis, premise synopsis, premise base prompt, tone, and world rules; descriptions must be character-specific and must not merely restate the premise.
- Story setup must persist provider `imageUrl` when available; raw base64 fallback must infer MIME instead of assuming PNG because Cloudflare JSON can return JPEG base64.
- Portrait generation is backend-owned and included in the core MVP experience; it is not a Premium or credit-gated feature.
- Google image generation is optional/fallback only until a reliable image quota/cost model exists.
- Replicate `black-forest-labs/flux-schnell` is available as a final optional fallback when `REPLICATE_API_TOKEN` is configured.
- Failed provider calls must not block text character selection; status should move through `PENDING` / `SUCCESS` / `FAILED`.

### story-generation

**AI contract:**
- When `LLM_MOCK_MODE=false`, user story creation must call real LLM draft generation through `AiService.generateStoryDraft()`.
- Mock story drafts are allowed only when `LLM_MOCK_MODE=true`.
- Real-mode provider/JSON failures must fail explicitly and must not persist template/mock stories as if they were AI-generated.
- Generated story drafts must include title, synopsis, genres, opening scene, base prompt, tone, style guide, world rules, language, and maturity rating.

**Video Provider Boundary (Step 85/85 Fix/86):**
- `KlingVideoProvider` (`ai/providers/kling-video.provider.ts`) — real Kling API client, gated by `KLING_ENABLED` + `KLING_API_KEY`.
- **Async task flow:** `POST /v1/videos/text2video` → extracts `task_id` → polls `GET /v1/videos/{task_id}` (max 12 attempts, 5s delay) → extracts `videoUrl` on completion.
- **Credit contract (Step 86):** Credits (5) are spent only when final `videoUrl` exists and atomic persistence succeeds inside Prisma `$transaction`. Provider failure, polling timeout, missing videoUrl, wallet race, or media update failure all prevent credit spend.
- Ledger metadata includes `cost`, `provider`, `model`, `taskId`, `durationSeconds`, `sceneMediaId`, `narrativeEventId`, `storyId` — no raw prompts, API keys, or reference URLs.
- `resolveAppearanceReference()` accepts opt-in flag but always returns null until profile-photo/opt-in persistence contract is implemented.
- Env vars: `KLING_ENABLED`, `KLING_API_KEY`, `KLING_API_BASE_URL=https://api.klingapi.com`, `KLING_MODEL`.
- User appearance reference for videos is allowed only when the user has explicitly opted in on profile and has a usable profile photo; otherwise provider calls must not include user photo/reference input
- Generated media remains private by default and public feed visibility requires opt-in submission plus moderation

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
- `POST /api/admin/billing/users/:userId/credits/grant` - Grant credits to a user wallet

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
NODE_ENV=development|staging|production
JWT_SECRET=...
REFRESH_TOKEN_SECRET=...
OPENROUTER_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
KLING_ENABLED=false
KLING_API_KEY=...
KLING_API_BASE_URL=...
KLING_MODEL=...
LLM_MOCK_MODE=false
FREE_LLM_ONLY=false
RATE_LIMIT_TTL_MS=60000
RATE_LIMIT_DEFAULT=100
ALLOWED_ORIGINS=https://staging.enredo.ai
SWAGGER_ENABLED=false
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=...
```

**Staging/Production Env Validation (Step 70):**
- `validateEnv()` runs on backend bootstrap.
- In `staging` and `production`, startup is blocked if `DATABASE_URL` is missing, `LLM_MOCK_MODE=true`, or JWT/refresh secrets are missing, shorter than 32 characters, or placeholder-like.
- Local development remains permissive.
- CORS allows local dev origins only in `development`/`test`; staging/production require explicit `ALLOWED_ORIGINS`.
- Swagger can be disabled with `SWAGGER_ENABLED=false`.
- **Backend Startup:** Prisma `onModuleInit()` must connect to the database successfully. If `DATABASE_URL` is unreachable (P1001), the backend will NOT start. The P1001 error is a clear infrastructure/runtime blocker — check Supabase status, pooler URL, IP allowlist, and network. Use `bash scripts/check-local-ready.sh` to diagnose.

**Video Provider Decision (Step 85 planning):**
- Kling is the selected POC/MVP provider for scene-based video generation.
- Safe defaults should keep video provider calls disabled unless explicitly configured.
- Provider requests must never include API keys, raw private prompts, or user photo references in client responses/logs.
- Video generation cost remains backend-owned (`VIDEO = 5 credits`), and credits must be spent only after provider success and successful media persistence.
- Use "appearance reference" / "likeness reference" terminology for consented use of the user's own profile photo; do not model this as non-consensual face swap.

**Local Admin Seed (Step 66):**
- Safe default command: `npm run seed` or `npm run seed:admin` in `services/api`
- Both commands run `prisma/seed.ts`, which delegates to the real tested `runAdminSeed()` helper
- Requires both `ADMIN_EMAIL` and `ADMIN_PASSWORD`; missing values skip admin creation safely
- Existing ADMIN is left unchanged
- Existing USER with the same email is not promoted automatically
- Passwords and hashes are never logged
- Destructive demo reset is explicit only: `npm run seed:demo:reset`

**Main Flow Contract Tests (Step 67):**
- Test file: `src/__tests__/main-flow-contracts.spec.ts`
- Covers real service contracts for reading `currentScene.id` on start and continuation, numeric credits usage, budget denial before provider generation, feed/saved privacy filters, engagement privacy, and admin moderation DTO/status behavior
- Uses mocked Prisma/providers only; no real database, no real LLM calls

**Minimal Observability (Step 73):**
- Every request receives an `X-Request-Id` response header.
- Incoming `X-Request-Id` values are reused only if they are safe (`A-Z`, `a-z`, `0-9`, `_`, `-`, max 64 chars); otherwise the backend generates a UUID.
- Request logs include request id, method, path without query string, status, duration, and environment-safe metadata only.
- Global exception handling preserves existing `HttpException` response shapes and returns generic `INTERNAL_ERROR` for unhandled 500s.
- Logs must not include authorization headers, cookies, passwords, refresh tokens, request bodies, raw prompts, raw LLM responses, generated private content, or stack traces.

**Rate Limits (Step 74):**
- `ThrottlerGuard` is registered globally, so default limits are enforced across API routes.
- Global defaults are configurable with `RATE_LIMIT_TTL_MS` (default `60000`) and `RATE_LIMIT_DEFAULT` (default `100`), parsed as positive integers with safe fallback.
- Stricter endpoint limits:
  - Auth register/login/SSO: 5/min
  - Auth refresh: 20/min
  - Reading start: 20/min
  - Reading action: 30/min
  - Story generation: 3/min
  - Story setup premise/character generation: 5/min
  - Scene media image generation: 5/min
  - Scene media video generation: 3/min

**Database Backup/Security (Step 77):**
- Runtime API uses `DATABASE_URL`; Prisma CLI/schema operations and backups must use `DIRECT_URL` where required.
- Supabase pooler URLs are normalized at runtime to include PgBouncer-safe params only when absent; explicit `.env` params such as `connection_limit=5` must be preserved for local QA and scripts.
- `prisma db push`, migrations, restores, and destructive SQL require target verification, recent backup, rollback plan, and explicit approval.
- Backup examples are documentation only; do not run `pg_dump` or restore commands without authorization.
- Backup files, database URLs, dumps, and Supabase service role keys must never be committed.
- `npm run check:db-safety` is env-only/read-only and does not connect to the database.
- Production must move from `prisma db push` to reviewed migrations/CI-CD before public launch.

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

### Content Moderation (Step 76)

**Covered surfaces:** Reading actions, comments, report reasons, story generation input.

**Blocked:** Prompt injection, blocked words, LENGTH_EXCEEDED, EMPTY.

**Sanitized:** URLs, emails, phones (stored as placeholders), control characters.

**Manual moderation:** Admin approve/reject for scene media, comment hide/remove/restore.

**Deferred:** AI-based content classification, image/video moderation.

### Beta Catalog Visibility

- `Story.isBetaVisible` gates library exposure for beta catalog cleanup.
- Migration artifact: `prisma/migrations/20260526_add_story_is_beta_visible/`.
- `GET /library/stories` filters `isBetaVisible: true`.
- Library/catalog DTOs expose only external `http(s)` image URLs. Inline/base64 `coverUrl` and `imageUrl` values are stripped by `safeImageUrl()` in story list, story detail, story characters, premise list, and premise character responses; mobile renders fallback art when the backend omits the URL.
- `npm run catalog:beta:hide-legacy` hides known legacy seed stories without deleting data; use `-- --dry-run` first.
- The script requires the target DB to be reachable and migrated before execution.
- `npm run catalog:beta:backfill-story-covers -- --apply` is a local/dev beta helper that copies each visible beta story's first premise `coverUrl` into empty `Story.coverUrl` records, preventing detail screens from depending only on API-level fallback mapping.
- `npm run catalog:beta:readiness` is the read-only beta catalog gate: 15 visible stories, 45 premises, and every premise with at least 3 playable characters.
- `npm run catalog:beta:backfill-characters -- --apply` safely fills empty beta premises with playable characters and stops on provider quota/rate-limit.
- `npm run catalog:beta:curate-missing-characters -- --apply` is a local/dev beta escape hatch for known provider-blocked catalog gaps. It does not call AI providers; it inserts curated PT-BR characters only for the known remaining beta premises and is idempotent once those premises reach 3 characters.
- Partial premises with 1-2 characters are skipped by default to avoid deleting valid characters; `--force-partial-regenerate` intentionally replaces the partial cast and should be used only after review.

### Provider Context Routing

- `AiGenerationContext` separates provider chains by use case: `ADMIN_CATALOG`, `USER_STORY`, `USER_READING`, and `UTILITY`.
- Chain priority is `<CONTEXT>_TEXT_PROVIDER_CHAIN` → `FREE_TEXT_PROVIDER_CHAIN` → `TEXT_PROVIDER_CHAIN` → default Groq/OpenRouter/Gemini fallback.
- Admin catalog story generation is selected server-side from `UserRole.ADMIN` and uses `ADMIN_CATALOG_TEXT_PROVIDER_CHAIN`.
- User-created story generation uses `USER_STORY_TEXT_PROVIDER_CHAIN` and still respects subscription budget and story lifecycle limits.
- The provider context is not accepted from the public request DTO.

**Last Updated:** After Step 98l (QA Provider Failure Harness cleanup) — June 4, 2026
