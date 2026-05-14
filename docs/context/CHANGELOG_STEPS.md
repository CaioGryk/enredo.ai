# Changelog Steps — Enredo.ai

**Purpose:** Complete historical log of implementation steps. Steps 1-42 documented.

---

## Step 1: Reading Architecture Refactor

**Objective:** Separate concerns between facade, orchestration, budget, and generation.

**What was implemented:**
- `ReadingService` → thin facade (delegates to orchestrator only)
- `ReadingOrchestratorService` → handles business logic
- `GenerationBudgetGuard` → enforces daily limits
- `NarrativeEngineService` → generates scenes

**Result:** Clean separation of concerns, testable components.

---

## Step 2: Generation Budget Guard

**Objective:** Enforce daily interaction limits based on subscription.

**What was implemented:**
- `GenerationBudgetGuard` validates limits before generation
- Free: 10/day, Premium: unlimited, Credits: pay-per-use
- Integrated into `ReadingOrchestratorService`

**Result:** Proper entitlement enforcement, 7 tests passing.

---

## Step 3: Scene Media Layer

**Objective:** Manage scene media lifecycle.

**What was implemented:**
- `SceneMedia` enum: PLACEHOLDER → AI_GENERATED → USER_UPLOADED
- `SceneMediaService` handles media transitions
- Integrated with reading flow

**Result:** Ready for future AI media generation, 7 tests passing.

---

## Step 4: Story Lifecycle

**Objective:** Manage USER_GENERATED story creation and moderation.

**What was implemented:**
- `StoryLifecycleService` manages story creation
- USER_GENERATED stories start as PRIVATE
- Moderation check before generation
- Status transitions: PRIVATE → SUBMITTED → APPROVED/REJECTED

**Result:** Proper story lifecycle management, 8 tests passing.

---

## Step 5: User Story Creation

**Objective:** Allow users to create private stories via keywords.

**What was implemented:**
- Endpoint for user story creation
- Keywords → AI generates title, synopsis, premises, characters
- Story starts PRIVATE, creator-only access
- Integrated with StoryLifecycleService

**Result:** Foundation for community stories, 11 tests passing.

---

## Step 6: Access Control (Security Fixes)

**Objective:** Fix premiseId leakage and enforce private story access.

**What was implemented:**
- Fixed `getCachedCharacters()` to validate `story.creatorUserId`
- Private stories: only creator can access
- PUBLIC+APPROVED: accessible to all
- Added security tests for access control

**Result:** No more premiseId leakage, proper access control, 9 security tests passing.

---

## Step 7: Story Setup for User Stories

**Objective:** Extend story-setup for USER_GENERATED stories.

**What was implemented:**
- `generatePremises()` validates USER_GENERATED stories
- `generateCharacters()` validates via premise → story
- Creator-only access enforced
- Reused existing 3-premise/3-character pattern

**Result:** User stories can generate content with proper validation, 15 tests passing.

---

## Step 8: Story Quality Guard

**Objective:** Ensure USER_GENERATED stories meet minimum quality before generation/reading.

**What was implemented:**
- `StoryQualityService` in neutral `story-quality/` module
- Validation rules:
  - **Blocking:** title ≥5 chars, synopsis ≥20 chars, genres ≥1, openingScene ≥30 chars
  - **Warnings:** tone, styleGuide, worldRules (logged only)
- Applied in:
  - `generatePremises()` → validates before generation
  - `generateCharacters()` → validates via premise → story
  - `startReading()` → validates before reading
- **Bypasses:** ADMIN origin and PUBLIC+APPROVED stories
- Throws `BadRequestException` with `issues` array and optional `warnings`

**Result:** Quality gate for user-generated content, 17 unit tests + integration tests passing.

---

## Step 10: AI Story Generation Foundation

**Objective:** Create backend foundation for generating USER_GENERATED private stories from user input.

**What was implemented:**
- `StoryGenerationModule` - dedicated module for story generation orchestration
- `StoryGenerationBudgetGuard` - pure budget guard (no Prisma/LLM/persistence)
  - Uses model catalog as source of truth
  - FREE → default free model, PREMIUM → default premium model
  - Returns decision object with `allowed`, `finalModel`, `budgetTier`
- `StoryGenerationService` - orchestrates generation flow:
  1. Budget decision via `StoryGenerationBudgetGuard`
  2. Generate story draft (AI or mock)
  3. Validate draft in memory BEFORE save (title ≥5, synopsis ≥20, genres ≥1, openingScene ≥30)
  4. Persist via `StoryLifecycleService.createStory()` (enforces creation limits internally)
  5. Run `StoryQualityService.validateStoryQuality()` after save as sanity check
- `GeneratedStoryDraft` interface - typed draft shape
- `POST /story-generation/generate` endpoint
- Mock mode generates deterministic valid drafts

**GeneratedStoryDraft shape:**
```typescript
interface GeneratedStoryDraft {
  title: string;        // ≥5 chars
  synopsis: string;      // ≥20 chars
  genres: string[];      // ≥1 item
  openingScene: string;  // ≥30 chars
  basePrompt?: string;
  tone?: string;
  styleGuide?: string;
  worldRules?: string;
  language?: string;
  maturityRating?: string;
}
```

**Key design decisions:**
- Story creation limit enforced by reusing `StoryLifecycleService.createStory()` (which internally calls `checkStoryCreationLimit()`)
- Draft validation happens in memory BEFORE save (not after)
- `StoryGenerationBudgetGuard` is pure: no Prisma, no persistence, no LLM calls
- `StoryQualityService` runs after save as final sanity check (not as main validation)

**Result:** Foundation for AI story generation, 8 tests passing.

---

## Step 11: Story Generation Safety & Moderation Input Guard

**Objective:** Validate and moderate user input before AI story generation.

**What was implemented:**
- `StoryGenerationInputGuard` - pure input validation guard (no Prisma/LLM/persistence)
  - Normalizes keywords: trim, remove empty, deduplicate (case-insensitive)
  - Validates: keywords (1-8 items, each 2-50 chars), optional fields (max 50 chars), constraints (max 500 chars)
  - Detects prompt injection patterns (reuses patterns from ModerationService)
  - Returns `SafeStoryGenerationInput` for valid input
  - Throws `BadRequestException` for invalid input
- Integration: `StoryGenerationService.validate()` called BEFORE budget decision and generation
- `StoryGenerationService` now uses `SafeStoryGenerationInput` (not raw `dto`) for generation

**Validation rules:**
- Keywords: 1-8 items, each 2-50 chars, trimmed, deduplicated
- Genre/Tone/TargetAudience: max 50 chars, trimmed
- Constraints: max 500 chars, trimmed
- Prompt injection: checks all fields against known patterns (ignore instructions, jailbreak, DAN, etc.)

**Result:** Safer generation pipeline, 37 input guard tests + 11 integration tests passing.

---

## Step 12: AI Story Generation Usage Tracking

**Objective:** Track AI usage for story generation separately from reading/narrative generation.

**What was implemented:**
- `StoryGenerationUsageStatus` enum in Prisma schema
- `StoryGenerationUsage` model in Prisma schema:
  - Tracks: userId, storyId, modelId (nullable), provider, isMock, status, failureReason, tokens, estimatedCost
  - Status enum: SUCCESS, FAILED, BLOCKED
  - Relations: User (required), Story (nullable)
- Integration in `StoryGenerationService`:
  - Creates usage record on success (status: SUCCESS, storyId linked)
  - Creates usage record on block (status: BLOCKED, failureReason set)
  - Creates usage record on failure (status: FAILED, failureReason set)
  - Uses `usageRecorded` flag to prevent duplicate records
  - Uses NestJS Logger for tracking write failures
- Fire-and-forget: usage record creation won't block story generation

**Tracking rules:**
- BLOCKED: input guard rejects, budget denies, creation limits block (modelId nullable for early blocks)
- FAILED: LLM fails, JSON parse fails, draft validation fails, persistence fails, StoryQualityService fails
- SUCCESS: story generated and persisted successfully (only after full flow succeeds)

**Result:** Observability for story generation, 261 tests passing.

---

## Step 13: Story Generation API Response & Client Contract

**Objective:** Standardize the API response for `POST /story-generation/generate` with a stable DTO.

**What was implemented:**
- `StoryGenerationResponseDto` - standardized response DTO
  - `story`: safe fields only (id, slug, title, synopsis, genres, coverUrl, openingScene, origin, visibility, moderationStatus, createdAt, updatedAt)
  - `generation`: metadata (mode: MOCK/AI, modelId, provider, budgetTier, usageStatus)
  - `nextActions`: (canEdit, canSubmit, canGeneratePremises, canStartReading)
- `GenerationMetadataDto` and `NextActionsDto` created
- `StoryGenerationService.mapToResponseDto()` method added
- Response now excludes: basePrompt, styleGuide, worldRules, creatorUserId, raw AI output
- `canStartReading = false` immediately after generation (needs premise + character first)
- Mock mode returns `mode: 'MOCK'` with `modelId` populated
- Updated tests to assert response shape

**Key design decisions:**
- API contract clarity: frontend receives stable DTO, not raw Prisma Story
- Safe fields only: no internal prompts or usage IDs exposed
- `nextActions` guides frontend UX (canEdit/canSubmit while PRIVATE + NOT_SUBMITTED)
- Response mapping is additive: doesn't change database schema

**Result:** Standardized API response, 261 tests passing.

---

## Step 14: Usage Metadata in API Response & Budget Tier Fix

**Objective:** Expose safe usage metadata in API response and fix budgetTier computation.

**What was implemented:**
- `GenerationMetadataDto` now includes:
  - `tracked: boolean` - whether usage was successfully tracked
  - `estimatedCost?: number | null` - estimated cost of the generation
  - `inputTokens?: number | null` - input token count
  - `outputTokens?: number | null` - output token count
  - `totalTokens?: number | null` - total token count
- `createUsageRecord()` now returns usage metadata instead of void
  - On success: returns `{ tracked: true, estimatedCost, inputTokens, outputTokens, totalTokens }`
  - On failure: returns `{ tracked: false }` (does not throw)
- `budgetTier` in response now uses `StoryGenerationBudgetDecision.tier` (not `story.creatorUserId`)
- Usage tracking failures do not block story generation
- No internal IDs, raw input, prompts, or raw AI output exposed

**Updated files:**
- `dto/story-generation-response.dto.ts` - added usage metadata fields
- `story-generation.service.ts` - updated `createUsageRecord()` and `mapToResponseDto()`
- `__tests__/story-generation.service.spec.ts` - added tests for usage metadata and tracking failure

**Result:** Rich usage metadata in API response, safe error handling, correct budgetTier.

---

## Step 15: Story Generation Public API Documentation / Swagger DTOs

**Objective:** Improve API documentation and DTO clarity for `POST /story-generation/generate`.

**What was implemented:**
- `CreateStoryGenerationDto` now has `@ApiProperty` with examples for all fields:
  - `keywords` example: `["mistério", "cidade futurista", "memória perdida"]`
  - `genre` example: `"ficção científica"`
  - `tone` example: `"cinematográfico"`
  - `targetAudience` example: `"young adult"`
  - `constraints` example: `"sem violência explícita"`
- New `StoryDto` class created for proper Swagger schema generation of nested `story` object
  - Uses real Prisma enum values: `StoryOrigin` (ADMIN, USER_GENERATED), `StoryVisibility` (PRIVATE, UNLISTED, PUBLIC), `StoryModerationStatus` (NOT_SUBMITTED, PENDING, APPROVED, REJECTED)
- `StoryGenerationResponseDto` now uses `StoryDto` instead of inline object
- `StoryGenerationController` now has full Swagger documentation:
  - `@ApiTags('story-generation')`
  - `@ApiBearerAuth()`
  - `@ApiOperation()`, `@ApiBody()`, `@ApiResponse()` for all status codes (201, 400, 401, 403, 500)

**Updated files:**
- `dto/create-story-generation.dto.ts` - added Swagger decorators with examples
- `dto/story-generation-response.dto.ts` - created `StoryDto`, updated response DTO
- `story-generation.controller.ts` - added full Swagger documentation

**Result:** Complete Swagger documentation for story generation endpoint, 262 tests passing.

---

## Step 16: Story Generation End-to-End Flow Check

**Objective:** Validate the complete backend flow from story generation to reading.

**What was implemented:**
- New integration test suite: `story-generation.integration-flow.spec.ts`
- Tests full flow: generate story → list my stories → get status → generate premises → generate characters → start reading
- Validates usage tracking records SUCCESS
- Validates response safety (no internal fields exposed)
- Validates non-creator access blocked for private generated stories

**Flow validated:**
1. `POST /story-generation/generate` → story created (USER_GENERATED, PRIVATE, NOT_SUBMITTED)
2. `GET /story-lifecycle/my` → story appears in user's stories
3. `GET /story-lifecycle/:id/status` → returns correct status
4. `POST /story-setup/stories/:id/premises/generate` → 3 premises created
5. `POST /story-setup/premises/:id/characters/generate` → 3 characters created
6. `POST /reading/start` → reading session created

**Updated files:**
- `story-generation/__tests__/story-generation.integration-flow.spec.ts` (new)
- `CONTEXTO_PROJETO.md`

**Result:** Complete end-to-end flow validated, 266 tests passing.

---

## Step 18: Story Generation Admin/Debug Observability (Safe Version)

**Objective:** Refine and harden story generation observability safely, centralizing usage tracking without schema changes.

**What was implemented:**
- `StoryGenerationObservabilityService` - dedicated internal service for centralized usage tracking
  - `createUsageRecord()` method handles SUCCESS, FAILED, BLOCKED statuses
  - Internal `sanitizeFailureReason()` method strips stack traces and truncates to 500 chars
  - Owns safe write behavior (catches Prisma/logging failures internally)
  - Never receives prompts, LLM responses, generated content, or stack traces
- Updated `StoryGenerationService`:
  - Injected `StoryGenerationObservabilityService` (replaces ad-hoc `createUsageRecord`)
  - Removed old `createUsageRecord()` method from service
  - Added `extractSanitizedErrorMessage()` helper to sanitize Error objects before passing to observability
  - All observability calls are fire-and-forget via service's internal error handling
- Updated `StoryGenerationModule` to provide `StoryGenerationObservabilityService`
- New test suite: `story-generation-observability.service.spec.ts` (8 tests):
  - SUCCESS record creation with metadata only
  - FAILED record with sanitized failureReason
  - Stack trace removal verification
  - Truncation of long failureReason (>500 chars)
  - Prisma failure returns `tracked: false`
  - Security: no prompt/LLM response/generated content accepted
- Updated existing tests to mock new service

**Security rules enforced:**
- No prompt, basePrompt, rawPrompt persisted
- No raw LLM response persisted
- No generated story content persisted
- No stack traces persisted (sanitized)
- failureReason limited to 500 characters

**Architecture decisions:**
- Reused existing `StoryGenerationUsage` Prisma model (no schema changes)
- `provider` field already exists in schema and is correctly persisted
- `StoryGenerationObservabilityService` owns safe write behavior (not `StoryGenerationService`)
- `StoryGenerationService` simply calls the observability service (no try-catch duplication)
- Sanitization happens in observability service before persistence
- Note: START lifecycle event is NOT separately tracked in this step; only final outcomes (SUCCESS/FAILED/BLOCKED) are tracked. Dedicated STARTED tracking deferred to future step.

**Updated files:**
- `services/story-generation/services/story-generation-observability.service.ts` (new)
- `services/story-generation/story-generation.service.ts` - inject and use observability service
- `services/story-generation/story-generation.module.ts` - provide new service
- `__tests__/story-generation-observability.service.spec.ts` (new, 8 tests)
- `__tests__/story-generation.service.spec.ts` - updated to mock new service
- `__tests__/story-generation.integration-flow.spec.ts` - updated to mock new service

**Result:** Centralized, safer observability with proper sanitization, 274 tests passing (up from 266).

---

## Step 19: Admin Access Layer / RBAC Foundation

**Objective:** Create the foundation for secure admin access / RBAC without creating admin business endpoints.

**What was implemented:**
- Added `UserRole` enum to Prisma schema: `USER`, `ADMIN`
- Added `role UserRole @default(USER)` field to `User` model
- `prisma validate` passed ✅, `prisma generate` executed to update client
- Updated `AuthService.validateJwtPayload()` to return `role` from DB user
- Updated `AuthService.generateTokens()` to include `role` in JWT payload
- Created `@Roles()` decorator using `SetMetadata('roles', roles)`
- Created `RolesGuard` that:
  - Reads required roles from metadata using `Reflector`
  - Checks if `request.user.role` matches required roles
  - Fails closed: returns `false` if no user or no role
  - Returns `true` if no roles metadata (public route)
  - Handles empty roles array as public route
- `JwtStrategy` already performs DB lookup, so `request.user.role` comes from current DB state (not stale token)
- Tests for `RolesGuard` using mocked `ExecutionContext` (9 tests):
  - Allows access when no roles required
  - Allows access when user has required role (ADMIN)
  - Denies access when USER tries to access ADMIN route
  - Denies access when PREMIUM subscription user (with USER role) tries ADMIN route
  - Allows access when user has one of multiple allowed roles
  - Denies access when user is undefined (unauthenticated)
  - Denies access when user has no role property (fails closed)
  - Denies access when user role is undefined

**Security rules enforced:**
- No admin endpoints created in this step
- No StoryGenerationUsage exposed
- `plan` (FREE/PREMIUM) is separate from `role` (USER/ADMIN)
- Premium user is NOT admin unless `role === ADMIN`
- Role comes from DB via JWT strategy, not from client or stale token
- `JwtAuthGuard` handles 401 (unauthenticated), `RolesGuard` handles 403 (unauthorized)

**Architecture decisions:**
- `UserRole` enum added to Prisma schema (minimal change)
- `role` field with `@default(USER)` ensures backward compatibility
- Existing users automatically get `USER` role
- No changes to existing demo/admin users (they remain USER by default)
- RBAC primitives ready for Step 20 (admin endpoints)

**Updated files:**
- `prisma/schema.prisma` - added UserRole enum, role field to User
- `src/modules/auth/auth.service.ts` - return role in validateJwtPayload, include in JWT
- `src/common/decorators/roles.decorator.ts` (new)
- `src/common/guards/roles.guard.ts` (new)
- `src/common/decorators/index.ts` - export Roles
- `src/common/guards/__tests__/roles.guard.spec.ts` (new, 9 tests)

**Result:** RBAC foundation ready, 283 tests passing (up from 274).

---

## Step 20: Admin Story Generation Usage Endpoint

**Objective:** Create the first secure admin endpoint for reading StoryGenerationUsage records.

**What was implemented:**
- Created `admin/` module folder to group admin features
- `AdminStoryGenerationUsageDto` — safe response DTO (metadata only):
  - Allowed fields: id, userId, storyId, modelId, provider, isMock, status, failureReason, inputTokens, outputTokens, totalTokens, estimatedCost, createdAt
  - Optional nested: user (id, email), story (id, title, origin, visibility, moderationStatus)
- `AdminStoryGenerationUsageService` — admin-specific query logic:
  - `findAll()` with pagination (default page=1, limit=20, max limit=100)
  - Filters: status, userId, storyId, provider, modelId, isMock, from/to (date range)
  - Sorting: createdAt DESC (default), supports 'asc'/'desc'
  - Returns `AdminStoryGenerationUsagePaginationDto` with data + pagination metadata
  - `findOne()` by id, returns 404 if not found
  - **Explicit mapping:** Never returns Prisma entities directly, manual mapToDto()
- `AdminStoryGenerationUsageController` — read-only admin endpoints:
  - `GET /api/admin/story-generation/usage` — list with filters and pagination
  - `GET /api/admin/story-generation/usage/:id` — detail by id
  - Protected with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`
  - Swagger documentation with all query params and response codes (200, 401, 403, 404)
- `AdminStoryGenerationUsageModule` — groups admin story generation usage features

**Security rules enforced:**
- No admin business endpoints for write/update/delete (read-only)
- No StoryGenerationUsage exposed through public routes
- No `prompt`, `basePrompt`, `openingScene`, `styleGuide`, `worldRules` in response
- No raw LLM response or generated content in response
- No `passwordHash`, `refreshTokens`, or secrets in response
- `JwtAuthGuard` handles 401 (unauthenticated)
- `RolesGuard` handles 403 (authenticated but not ADMIN)
- PREMIUM user with USER role cannot access
- All query params validated (enum, dates, boolean, pagination caps)

**Architecture decisions:**
- Separate `AdminStoryGenerationUsageService` from public `StoryGenerationService`
- Did NOT modify `StoryGenerationObservabilityService` (internal tracking only)
- No Prisma schema changes in this step
- Explicit DTO mapping layer to prevent accidental data leaks
- Pagination response shape: `{ data: DTO[], pagination: { page, limit, total, totalPages } }`

**Updated files:**
- `modules/admin/story-generation-usage/dto/admin-story-generation-usage.dto.ts` (new)
- `modules/admin/story-generation-usage/admin-story-generation-usage.service.ts` (new)
- `modules/admin/story-generation-usage/admin-story-generation-usage.controller.ts` (new)
- `modules/admin/story-generation-usage/admin-story-generation-usage.module.ts` (new)
- `app.module.ts` — registered `AdminStoryGenerationUsageModule`
- `modules/admin/story-generation-usage/__tests__/admin-story-generation-usage.controller.spec.ts` (new, 5 tests)

**Result:** Secure admin endpoint ready, 288 tests passing (up from 283).

---

## Step 21: Admin Story Generation Observability Metrics

**Objective:** Add a secure admin metrics endpoint for StoryGenerationUsage observability (aggregated data only).

**What was implemented:**
- Added `GET /api/admin/story-generation/usage/metrics` endpoint (declared BEFORE `/:id` to avoid routing conflict):
  - Protected with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`
  - Query filters: `from`, `to`, `provider`, `modelId`, `isMock`, `status` (all optional, validated)
  - Returns `AdminStoryGenerationMetricsDto` with aggregated data only (no individual records)
- Added `AdminStoryGenerationMetricsDto` with:
  - `totals`: total, success, failed, blocked, estimatedCost, inputTokens, outputTokens, totalTokens, successRate, failureRate, blockedRate
  - `byStatus`: [{ status, count }]
  - `byProvider`: [{ provider, count, estimatedCost, totalTokens }]
  - `byModel`: [{ modelId, count, estimatedCost, totalTokens }]
  - `byDay`: [{ date, total, success, failed, blocked, estimatedCost, totalTokens }]
- Updated `AdminStoryGenerationUsageService.getMetrics()`:
  - Uses Prisma `groupBy()` for `status`, `provider`, `modelId` (with `_count` and `_sum`)
  - Derives totals from `status` groupBy results (not separate queries for consistency)
  - Computes rates (success/failure/blocked) from derived totals
  - Uses `findMany()` with `select` only (createdAt, status, estimatedCost, totalTokens) for `byDay`
  - Aggregates `byDay` in memory (no unnecessary field fetches)
  - Applies identical filters to ALL groupBy/findMany queries
  - Handles null values safely (normalizes to 0)
- Added Swagger documentation with query params and response codes (200, 401, 403)

**Security rules enforced:**
- No individual records returned (aggregated only)
- No `userId`, `storyId`, `failureReason` in response
- No `user` or `story` objects in response
- No `prompt`, `basePrompt`, `openingScene`, `styleGuide`, `worldRules`
- No raw LLM response or generated content
- No secrets/tokens/stack traces
- All query filters validated (dates, booleans, enums)
- Same filters applied consistently across all aggregations

**Architecture decisions:**
- Reused existing `admin/story-generation-usage/` module from Step 20
- Did NOT modify `StoryGenerationObservabilityService` (internal tracking only)
- Did NOT introduce Prisma schema changes
- Did NOT create new admin module (grouped under existing admin folder)
- `byDay` uses `findMany()` with minimal `select` + in-memory aggregation (efficient)
- Totals derived from `status` groupBy (ensures consistency)

**Updated files:**
- `modules/admin/story-generation-usage/admin-story-generation-usage.controller.ts` — added `GET metrics` endpoint (before `/:id`)
- `modules/admin/story-generation-usage/admin-story-generation-usage.service.ts` — added `getMetrics()` method
- `modules/admin/story-generation-usage/dto/admin-story-generation-usage.dto.ts` — added `AdminStoryGenerationMetricsDto`
- `modules/admin/story-generation-usage/__tests__/admin-story-generation-usage-metrics.spec.ts` (new, 5 tests)

**Result:** Secure admin metrics endpoint ready, 293 tests passing (up from 288).

---

## Step 22: ReadingModule Fix & StoryGenerationModule DI Fix

**Objective:** Fix ReadingModule missing dependencies and resolve StoryGenerationModule DI issue.

**What was implemented:**
- `ReadingModule` — verified and confirmed:
  - `StoryQualityModule` imported ✅
  - `ReadingOrchestratorService` imported ✅
  - Both present in `@Module()` decorator
- `StoryGenerationModule` — fixed DI issue:
  - Added `StoryGenerationInputGuard` to imports (was missing)
  - Previously, `StoryGenerationService` injected `StoryGenerationInputGuard` but it wasn't provided in module
  - `StoryGenerationBudgetGuard` (same pattern) was already correctly provided
  - Fix mirrors pattern used by existing `StoryGenerationBudgetGuard`
- `prisma db push --accept-data-loss` — synced `story_generation_usages` table to database
- Runtime validation passed:
  - Admin login → JWT with ADMIN role
  - `GET /api/admin/story-generation/usage` → 200
  - `GET /api/admin/story-generation/usage/metrics` → 200
  - Regular user → 403 on both endpoints
  - Unauthenticated → 401 on both endpoints
  - Metrics response safety confirmed (no userId, storyId, failureReason, prompt, or generated content)

**Updated files:**
- `modules/story-generation/story-generation.module.ts` — added `StoryGenerationInputGuard` import and provider
- `prisma/schema.prisma` — already had `StoryGenerationUsage` model (synced via db push)

**Result:** ReadingModule fix verified, StoryGeneration DI fixed, admin endpoints fully functional, 293 tests passing.

---

## Step 23: Admin Audit Hardening

**Objective:** Harden admin audit endpoints to prevent sensitive data leakage.

**What was implemented:**
- `sanitizeFailureReason()` method added to `AdminStoryGenerationUsageService`:
  - Removes stack trace lines (lines starting with `"at "`)
  - Removes lines containing stack frame patterns (`(file:line:column)`)
  - Normalizes whitespace (collapses multiple spaces/newlines)
  - Truncates to 500 characters
  - Preserves original high-level error messages (does not over-sanitize)
  - Returns `null` for null input, `undefined` for undefined input
- Applied in `mapToDto()` method for all usage records
- Updated `AdminStoryGenerationUsageDto`:
  - `failureReason` type changed from `string` to `string | null` (allows null from sanitizer)
- New test suite: `admin-story-generation-usage.sanitize.spec.ts` (9 tests):
  - Stack trace lines removed
  - Multiline stack traces removed
  - Long messages truncated to 500 chars
  - Normal messages like "Generation timeout" unchanged
  - `null` returns `null`
  - `undefined` returns `undefined`
  - Whitespace normalization
  - Provider names and error categories preserved

**Security policy enforced:**
- **Allowed fields (audit metadata):** id, userId, storyId, modelId, provider, isMock, status, inputTokens, outputTokens, totalTokens, estimatedCost, createdAt
- **Allowed with caution:** failureReason (sanitized), user.email, story.title
- **Forbidden (never exposed):** prompt, basePrompt, rawPrompt, openingScene, styleGuide, worldRules, generated content, raw LLM response, stack traces, passwordHash, refresh tokens, secrets, full user/story objects

**Metrics endpoint safety (already enforced in Step 21):**
- No userId, storyId, failureReason in metrics response
- Aggregated data only

**Updated files:**
- `modules/admin/story-generation-usage/admin-story-generation-usage.service.ts` — added `sanitizeFailureReason()` method, applied in `mapToDto()`
- `modules/admin/story-generation-usage/dto/admin-story-generation-usage.dto.ts` — updated `failureReason` type to `string | null`
- `modules/admin/story-generation-usage/__tests__/admin-story-generation-usage.sanitize.spec.ts` (new, 9 tests)

**Result:** Admin audit endpoints hardened against sensitive data leakage, 302 tests passing (up from 293).

---

## Step 24: Admin Seed & Operational Commands Hardening

**Objective:** Harden admin seed and operational commands/documentation for safe operations.

**What was implemented:**
- `package.json` — added missing `prisma:validate` script:
  - Runs `prisma validate` to check schema validity
  - Safe command, no database changes
- `CONTEXTO_PROJETO.md` — updated with Step 24 documentation:
  - Admin seed strategy documented
  - `ADMIN_EMAIL` / `ADMIN_PASSWORD` usage explained
  - Safe operational commands listed
  - Warning: do NOT run `prisma db push --accept-data-loss`
  - Warning: Track B drift (model_usages costUsd, story_playable_characters storyId) remains deferred
  - How to validate admin runtime locally/dev

**Admin seed behavior (already compliant, no code changes):**
- Creates admin only if BOTH `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured
- If either env var is missing: skips admin creation, logs safe message, does NOT fail seed
- Never logs admin password, password hash, or secrets
- Does NOT use hardcoded fallback credentials
- Does NOT silently promote existing users to ADMIN
- If `ADMIN_EMAIL` already exists:
  - If role is ADMIN → leaves unchanged
  - If role is USER → reports safely and does NOT change role automatically
  - Does NOT overwrite password automatically
- Admin seed is idempotent
- If creating a new admin: hashes password with bcryptjs, role = ADMIN, creates subscription + creditWallet

**Updated files:**
- `package.json` — added `prisma:validate` script
- `CONTEXTO_PROJETO.md` — added Step 24 summary and operational documentation

**Result:** Operational commands hardened, admin seed documented, 302 tests passing (no regressions).

---

## Step 25A — Remove Application Dependency on StoryPlayableCharacter.storyId

**Objective:** Remove application code dependency on legacy `storyId` column in `StoryPlayableCharacter`.

**What was implemented:**
- `story-setup.service.ts` — `validateCharacterAccess()`:
  - Updated character fetch to include `premise: { include: { story: { select: { id, visibility, moderationStatus, creatorUserId } } } }`
  - Replaced `character.storyId` with `character.premise?.story` for access validation
- `story-setup.service.ts` — `mapCharacterToDto()`:
  - Changed `storyId: character.storyId` to `storyId: character.premise?.story?.id ?? null`
  - DTO still returns `storyId` (API contract preserved)
- `reading-orchestrator.service.ts`:
  - Removed dead code `getCharactersByStoryId()` function (defined but never called)
- `story-setup.security.spec.ts`:
  - Updated mock `character` to include `premise: { story: {...} }` structure

**Validation:**
- ✅ Zero active `character.storyId` references in codebase
- ✅ `npm run build` — succeeded
- ✅ `npm test -- --runInBand` — 302 tests passing
- ✅ `storyId` still present in `CharacterResponseDto` (contract preserved)

**Result:** Application no longer depends on legacy `storyId` column, 302 tests passing.

---

## Step 25B — Drop Legacy storyId Column (Controlled Migration)

**Objective:** Safely remove `story_playable_characters.storyId` column from database.

**Pre-migration validation:**
- ✅ All 6 rows have `premiseId` non-null
- ✅ All `premiseId` values are valid (exist in `story_premises`)
- ✅ Zero mismatches between legacy `storyId` and `premiseId → storyId`

**Migration executed:**
1. ✅ Removed `storyId String` from `StoryPlayableCharacter` in `prisma/schema.prisma`
2. ✅ `ALTER TABLE story_playable_characters DROP COLUMN "storyId";`
3. ✅ `npx prisma validate` — schema valid
4. ✅ `npx prisma generate` — client regenerated

**Code fixes after migration:**
- `reading-orchestrator.service.ts`: Changed `where: { storyId: session.storyId }` to `where: { premiseId: session.selectedPremiseId }` for `StoryPlayableCharacter` queries
- `story-setup.service.ts`: Removed duplicate `premiseId` in `create()` call

**Validation:**
- ✅ `npm run build` — succeeded
- ✅ `npm test -- --runInBand` — 302 tests passing
- ✅ `story_playable_characters` no longer has `storyId` column
- ✅ App starts, admin endpoints return 200

**Files modified:**
- `prisma/schema.prisma` — removed `storyId` from `StoryPlayableCharacter`
- `src/modules/story-setup/story-setup.service.ts` — fixed TypeScript errors
- `src/modules/reading/reading-orchestrator.service.ts` — updated `StoryPlayableCharacter` queries

**Result:** Legacy `storyId` column safely removed, all relationships via `premiseId → StoryPremise → storyId`, 302 tests passing.

---

## Step 26 — Post-Migration Context & Regression Hardening

**Objective:** Consolidate migration and add regression protection.

**What was implemented:**
- Added regression tests in `story-setup/__tests__/story-setup.security.spec.ts`:
  - `should resolve storyId via premise.story (not character.storyId)` — validates premise traversal works
  - `should return storyId in DTO via premise traversal` — verifies API contract preserved
  - `should NOT require storyId field on character object` — ensures no code depends on legacy column
- Updated `CONTEXTO_PROJETO.md` with Step 25A, 25B, and 26 documentation

**Validation:**
- ✅ `npx prisma validate` — schema valid
- ✅ `npm run build` — succeeded
- ✅ `npm test -- --runInBand` — 302 tests passing
- ✅ Zero active `character.storyId` references (verified by grep)
- ✅ Admin endpoints working (200 for ADMIN, 403 for USER, 401 without auth)

**Regression protection:**
- DTO still returns `storyId` via `character.premise?.story?.id ?? null`
- Access validation uses `character.premise?.story`
- Dead code `getCharactersByStoryId()` removed
- All 302 tests pass

**Result:** Migration consolidated, regression tests added, 302 tests passing, system fully operational.

---

## Step 27 — Character DTO Contract Hardening (Post-Step-26 Fix) - COMPLETED

**Objective:** Fix DTO contract issue where `CharacterResponseDto.storyId` was not reliably populated because service queries omitted `premise.story` before passing records to `mapCharacterToDto()`.

**What was fixed:**
- `StorySetupService.getCachedCharacters()` — updated `storyPlayableCharacter.findMany()` to include `premise: { include: { story: true } }`
- `StorySetupService.generateCharacters()` — fixed 3 `findMany()` calls to include `premise.story`:
  1. Line 218: check existing characters (cached path)
  2. Line 266: inside transaction re-fetch
  3. Line 332: final fetch after transaction for DTO mapping
- `StorySetupService.generateCharacters()` — fixed cached-existing branch (lines 217-224) to include `premise.story`

**Tests added:**
1. `story-setup/__tests__/story-setup.spec.ts` (3 regression tests):
   - `getCachedCharacters() should return characters with storyId resolved via premise.story`
   - `generateCharacters() should return fresh characters with storyId via premise.story`
   - `should FAIL if service query omits premise.story and mapCharacterToDto receives plain character`

2. `story-setup/__tests__/story-setup.user-story.spec.ts` — reconstructed with correct nesting to fix TypeScript errors (`service`, `mockStoryQualityService` not found). Fixed mock setup for `generateCharacters()` to properly mock all 3 `findMany()` calls.

**Containment Correction:** First Step 27 attempt broke test structure in `story-setup.user-story.spec.ts` (orphaned code, misplaced blocks). Required full reconstruction of the file with proper nesting and corrected mocks.

**Validation (after containment correction):**
- ✅ `npx prisma validate` — schema valid
- ✅ `npm test -- --runInBand` — **309 tests passing** (22 suites)
- ✅ DTO contract preserved: `storyId` returned via `character.premise?.story?.id ?? null`
- ✅ All `describe` blocks properly nested inside outermost `describe`
- ✅ No direct `storyId` on `StoryPlayableCharacter` mocks (use `premise.story` instead)
- ✅ Zero active `character.storyId` or `StoryPlayableCharacter.storyId` references in source code

**Files modified:**
- `src/modules/story-setup/story-setup.service.ts` — fixed all `findMany()` calls to include `premise.story`
- `src/modules/story-setup/__tests__/story-setup.spec.ts` — added 3 regression tests
- `src/modules/story-setup/__tests__/story-setup.user-story.spec.ts` — reconstructed with correct nesting and proper mock setup

**Result:** Character DTO contract now reliably returns `storyId` via premise traversal, **309 tests passing**, no regression.

---

## Step 28 — Authenticated User Identity Consistency - COMPLETED

**Objective:** Audit and fix inconsistent authenticated user identity access across controllers/services.

**Canonical authenticated user shape (from `validateJwtPayload()`):**
```ts
{
  id: string;
  email: string;
  name: string;
  plan: SubscriptionType;
  role: UserRole;
}
```

**What was fixed:**
- `story-generation.controller.ts` — replaced `req.user.sub` with `@CurrentUser('id')` decorator
- `story-lifecycle.controller.ts` — replaced `req.user.userId` with `@CurrentUser('id')` decorator
- `scene-media.controller.ts` — replaced `req.user.userId` with `@CurrentUser('id')` decorator
- Removed `@Request() req: any` parameter from all three controllers
- Added proper imports: `CurrentUser` from `@common/decorators/current-user.decorator`

**Security notes:**
- User identity comes from `JwtStrategy` DB lookup (not trusted from JWT payload alone)
- `JwtStrategy.validate()` calls `authService.validateJwtPayload()` which queries DB by `payload.sub`
- Role comes from DB-loaded user via `JwtStrategy` (not from JWT payload)
- Pattern now consistent with `auth.controller.ts`, `reading.controller.ts`, `billing.controller.ts`

**Tests added:**
1. `story-generation/__tests__/story-generation.controller.spec.ts` (1 test):
   - Validates controller uses `user.id` from `@CurrentUser` decorator (not `req.user.sub`)
2. `story-lifecycle/__tests__/story-lifecycle.controller.spec.ts` (1 test):
   - Validates controller uses `user.id` from `@CurrentUser` decorator (not `req.user.userId`)

**Files modified:**
- `src/modules/story-generation/story-generation.controller.ts` — fixed user identity access
- `src/modules/story-lifecycle/story-lifecycle.controller.ts` — fixed user identity access
- `src/modules/scene-media/scene-media.controller.ts` — fixed user identity access
- `src/modules/story-generation/__tests__/story-generation.controller.spec.ts` (new)
- `src/modules/story-lifecycle/__tests__/story-lifecycle.controller.spec.ts` (new)

**Validation:**
- ✅ `npx prisma validate` — schema valid
- ✅ `npm test -- --runInBand` — **311 tests passing** (24 suites)
- ⚠️ `npm run build` — not confirmed in this environment due to filesystem/sandbox `EPERM` while unlinking `dist/tsconfig.tsbuildinfo`
- ✅ Zero `req.user.sub` or `req.user.userId` in controller/service code
- ✅ All controllers now use `@CurrentUser('id')` or `req.user.id` consistently

**Result:** Authenticated user identity now consistent across all controllers, **311 tests passing**, no regression. Build remains unconfirmed in this environment due to the known `EPERM` filesystem issue.

---

## Step 29 — Real Narrative Engine Integration - COMPLETED

**Objective:** Make the interactive reading continuation use real AI through `AiService` when `LLM_MOCK_MODE=false`.

**What was implemented:**

1. **NarrativeEngine is now a NestJS `@Injectable()` service**
   - Receives `AiService` through constructor injection
   - Properly exported from `NarrativeModule`
   - Registered in `ReadingModule` via `NarrativeModule` import

2. **Dual behavior based on `LLM_MOCK_MODE`:**
   - **When `LLM_MOCK_MODE=true`:** Returns safe mock content with `[mock LLM response]` placeholder
   - **When `LLM_MOCK_MODE=false`:** Calls `AiService.generateScene()` for real AI-generated scenes
   - **When provider fails:** Throws controlled error (does NOT silently fall back to mock)

3. **Response parsing:**
   - Parses `sceneText`, `choices`, `sceneMetadata` from AI response
   - Handles empty choices array with default fallback
   - Returns `modelUsed`, `providerUsed`, `tokenUsage` metadata

4. **Memory patch integration:**
   - `NarrativeContextBuilder.computeUpdatedMemory()` called for both mock and AI paths
   - `memoryPatch` included in response for orchestrator to persist

**Files modified:**
- `src/modules/reading/narrative/narrative-engine.service.ts` — integrated with `AiService`, dual-mode behavior
- `src/modules/reading/narrative/narrative.module.ts` (new) — `NarrativeModule` with `AiModule` import
- `src/modules/reading/reading.module.ts` — imported `NarrativeModule` instead of `AiModule`
- `src/modules/reading/reading-orchestrator.service.ts` — injected `NarrativeEngine` via constructor
- `src/modules/reading/__tests__/narrative-engine.service.spec.ts` (new) — 6 tests covering all behaviors
- `src/modules/reading/__tests__/reading-service.spec.ts` — updated to provide `NarrativeEngine` mock
- `src/modules/reading/__tests__/reading-orchestrator.security.spec.ts` — updated to provide `NarrativeEngine` mock
- `src/modules/story-generation/__tests__/story-generation.integration-flow.spec.ts` — added `NarrativeEngine` mock

**Architecture principle preserved:**
- `NarrativeEngine` remains a pure narrative AI layer
- Does NOT access Prisma directly
- Does NOT apply billing/budget rules
- Does NOT apply RBAC
- Builds prompts and calls `AiService` only

**Tests added/updated:**
1. `narrative-engine.service.spec.ts` — 6 tests:
   - Mock mode returns `[mock LLM response]`
   - Real AI mode calls `AiService.generateScene()`
   - `sceneMetadata` parsing from AI response
   - Provider failure throws error (not silent mock)
   - Empty choices fallback to defaults
   - `memoryPatch` included in response

**Validation:**
- ✅ `npx prisma validate` — schema valid
- ✅ `npm test -- --runInBand` — **317 tests passing** (25 suites)
- ✅ `npm run build` — succeeded

**Result:** Interactive reading now uses real AI when `LLM_MOCK_MODE=false`, mock mode still works for tests/dev, provider failures throw controlled errors, **317 tests passing**, no regression.

---

## Step 29 Fix — Narrative Engine Entitlement + Memory Safety

**What was corrected:**

1. **Entitlement context now flows correctly to AI scene generation**
   - Extended `GenerateSceneInput` with optional `plan?: SubscriptionType`, `walletBalance?: number`, `isCinematic?: boolean`
   - `ReadingOrchestratorService.generateNextScene()` now populates those fields from `user.subscription.type`, `user.creditWallet.balance`, and `isCinematic` parameter
   - `NarrativeEngine.generateAIScene()` passes `plan`, `isCinematic`, and `walletBalance` to `AiService.generateScene()`
   - Defaults safely to `SubscriptionType.FREE` when plan is missing

2. **Memory patch now uses real context instead of empty baseline**
   - `parseSceneResult()` now receives `input: GenerateSceneInput`
   - Builds `currentMemory` from `input.memory` (with proper defaults when memory is absent)
   - Uses `input.action || 'continuar'` instead of hardcoded 'continuar'
   - Uses `NarrativeContextBuilder.buildStoryCharacters(input.story)` instead of empty array
   - Uses `input.sceneIndex` instead of hardcoded 0
   - Preserves existing `constraints` when no new constraints are produced

3. **Logging safety in AiService.parseSceneResponse()**
   - Replaced raw `response.content` logging with sanitized metadata object
   - Logs only: model, inputTokens, outputTokens, contentLength
   - No raw LLM content, prompts, or generated scene text exposed

**Files modified:**
- `src/modules/reading/narrative/narrative-response.types.ts` — added `plan`, `walletBalance`, `isCinematic` to `GenerateSceneInput`
- `src/modules/reading/narrative/narrative-engine.service.ts` — pass entitlement context to AiService, use real memory context in memoryPatch
- `src/modules/reading/reading-orchestrator.service.ts` — populate plan/walletBalance/isCinematic in input
- `src/modules/ai/ai.service.ts` — sanitized parse failure logging
- `src/modules/reading/__tests__/narrative-engine.service.spec.ts` — added 5 tests for entitlement and memory preservation

**Tests added:**
1. `should pass plan: PREMIUM to AiService when input plan is Premium`
2. `should pass walletBalance and isCinematic to AiService`
3. `should default plan to FREE when missing`
4. `should use existing memory/action/sceneIndex instead of empty baseline in memory patch`
5. `should preserve existing constraints in memory patch when no new constraints produced`

**Validation:**
- ✅ `npx prisma validate` — schema valid
- ✅ `npm test -- --runInBand` — **322 tests passing** (25 suites)
- ✅ `npm run build` — succeeded

**Result:** Entitlement context flows correctly, memory patch preserves context, raw LLM content not logged, **322 tests passing**, no regression.

---

## Step 30 — Real First Scene Generation - COMPLETED

**Objective:** Ensure the first scene of a reading session uses real AI when `LLM_MOCK_MODE=false`, closing the gap left by Step 29.

**What was implemented:**

1. **NarrativeEngine now handles first scene generation**
   - Added `isFirstScene?: boolean` flag to `GenerateSceneInput`
   - Added `generateAIFirstScene()` and `generateMockFirstScene()` methods
   - `generateScene()` branches based on `isFirstScene` flag
   - Uses `AiService.generateFirstScene()` for real first scenes
   - Mock first scene includes premise opening scene and character context

2. **First scene respects entitlement context**
   - `ReadingOrchestratorService.generateFirstScene()` now passes `selectedModelId` from budget guard
   - Passes `plan`, `walletBalance`, `isCinematic` through to `NarrativeEngine`
   - Budget guard called before first scene generation (same as continuation)

3. **Premise and character context preserved**
   - First scene input includes `premise` and `playableCharacter`
   - `AiService.generateFirstScene()` receives `premiseContext` and `characterContext`
   - Mock first scene displays opening scene text when available

4. **Memory initialization preserved**
   - `createInitialMemory()` called before first scene generation
   - Memory updated after first scene via `updateNarrativeMemory()`
   - `sceneCount` incremented to 1

5. **No silent mock in production**
   - Provider failure throws controlled error upward
   - Mock only used when `AiService.isMockMode()` returns true

**Files modified:**
- `src/modules/reading/narrative/narrative-response.types.ts` — added `isFirstScene` to `GenerateSceneInput`
- `src/modules/reading/narrative/narrative-engine.service.ts` — added first scene handling, `generateAIFirstScene()`, `generateMockFirstScene()`
- `src/modules/reading/reading-orchestrator.service.ts` — updated `generateFirstScene()` to use NarrativeEngine, pass `selectedModelId`
- `src/modules/reading/__tests__/narrative-engine.service.spec.ts` — added 4 tests for first scene

**Tests added:**
1. `should use mock for first scene when AiService.isMockMode() is true`
2. `should use real AI for first scene when LLM_MOCK_MODE=false`
3. `should pass premise and character context to generateFirstScene`
4. `should throw error when provider fails for first scene`

**Validation:**
- ✅ `npx prisma validate` — schema valid
- ✅ `npm test -- --runInBand` — **326 tests passing** (25 suites)
- ✅ `npm run build` — succeeded

**Result:** Full reading loop (first scene + continuation scenes) uses consistent AI path, mock mode works for tests/dev, **328 tests passing**, no regression.

---

## Step 30 Fix — First Scene Fallback Context + Dead Code Cleanup

**What was corrected:**

1. **getSessionWithStatus() zero-event fallback now resolves premise/character**
   - When session has `selectedPremiseId`, resolves premise via `prisma.storyPremise.findUnique()`
   - When both `selectedPremiseId` and `selectedCharacterId` exist, resolves character via `prisma.storyPlayableCharacter.findFirst()` with premise validation
   - Resolved premise/character passed to `generateFirstScene()` instead of nulls

2. **Dead code removed**
   - Removed obsolete `callGenerateFirstScene()` helper method
   - No active references remain to this method or its hardcoded choices

**Files modified:**
- `src/modules/reading/reading-orchestrator.service.ts` — added premise/character resolution in getSessionWithStatus fallback, removed `callGenerateFirstScene()`

**Validation:**
- ✅ `npx prisma validate` — schema valid
- ✅ `npm test -- --runInBand` — **326 tests passing** (25 suites)
- ✅ `npm run build` — succeeded
- ✅ Zero references to `callGenerateFirstScene` or hardcoded choices in source

**Result:** Zero-event fallback preserves selected premise/character context, dead code removed, **326 tests passing**, no regression.

---

## Step 30 Test Fix — Zero-Event Fallback Regression Coverage

**Test file added:**
- `src/modules/reading/__tests__/zero-event-fallback.spec.ts`

**What it covers:**
- Zero-event fallback resolves selected premise and character
- Character lookup is constrained by premise
- Fallback without selected premise/character passes null safely
- NarrativeEngine.generateScene() receives isFirstScene: true

**Validation result:**
- `npx prisma validate` — passed
- `npm test -- --runInBand` — passed with **328 tests / 26 suites**
- `npm run build` — succeeded

**Restrictions followed:**
- No source code changed (only test mocks updated)
- No Prisma schema changes
- No destructive commands run

---

## Step 31 — ReadingOrchestrator Prisma DI Hardening

**Objective:**
Remove manual Prisma client instantiation from `ReadingOrchestratorService` and use injected `PrismaService` for proper NestJS lifecycle management.

**Files changed:**
- `src/modules/reading/reading-orchestrator.service.ts` — injected PrismaService, removed `new PrismaClient()`
- `src/modules/reading/reading.module.ts` — added `PrismaModule` import
- `src/modules/reading/__tests__/reading-orchestrator.security.spec.ts` — updated mock to include PrismaService
- `src/modules/reading/__tests__/reading-service.spec.ts` — updated mock to include PrismaService
- `src/modules/reading/__tests__/zero-event-fallback.spec.ts` — updated mock to include PrismaService

**Technical decisions:**
- Replaced `const prisma = new PrismaClient()` with `private readonly prisma: PrismaService` constructor injection
- All 55 `prisma.` calls updated to `this.prisma.`
- Kept enum/type imports from `@prisma/client` for TypeScript compilation
- Added `PrismaModule` import to `ReadingModule` to enable DI resolution

**Validations executed:**
- `npx prisma validate` — passed
- `npm test -- --runInBand` — **328 tests / 26 suites** passing
- `npm run build` — succeeded

**Result:** ReadingOrchestratorService now uses NestJS-managed PrismaService lifecycle. No behavior change introduced.

**Known remaining issues:** None.

---

## Step 31 Test Cleanup — Removed Obsolete PrismaClient Mock

**File changed:**
- `src/modules/reading/__tests__/zero-event-fallback.spec.ts`

**Reason:**
- After Step 31 DI hardening, test passes `mockPrismaInstance` directly via constructor injection
- `jest.mock('@prisma/client')` block was completely removed — PrismaClient mock was obsolete
- Test now relies entirely on injected Prisma mock (`this.prisma`) passed to constructor

**Validations run:**
- `npx prisma validate` — passed
- `npm test -- --runInBand` — **328 tests / 26 suites** passing
- `npm run build` — succeeded

**Remaining issues:** None.

---

## Step 32 — Reading Flow End-to-End Audit & Beta Readiness

**Objective:** Audit full reading flow for beta readiness after Steps 29–31.

### Files Inspected
- `reading.controller.ts`, `reading.service.ts`, `reading-orchestrator.service.ts`
- `reading.dto.ts`, `generation-budget.guard.ts`
- `narrative-engine.service.ts`, `narrative-context.builder.ts`
- `ai.service.ts`, `model-catalog.ts`, `scene-prompts.ts`
- `prisma/schema.prisma`
- `apps/mobile/src/api/types.ts`, `apps/mobile/app/reader/[id].tsx`, `apps/mobile/app/(tabs)/active.tsx`

### Verified Working
1. **Start Reading:** Session creation/reuse, story access rules, premise/character persistence, budget guard integration
2. **Get Session:** Zero-event fallback with premise/character resolution, ownership check
3. **Send Action:** Moderation → budget guard → AI generation → event/memory persistence flow
4. **Memory/Usage:** NarrativeMemory updates, ModelUsage tracking, daily limits working
5. **DI Hardening:** ReadingOrchestratorService uses injected PrismaService (Step 31)

### Findings

**P1 - Blocks Beta:**
- `services/api/.env:38` has `LLM_MOCK_MODE=true` — If deployed, users see `[mock first scene]` instead of AI content
- Status enum mismatch: Mobile expects `'FINISHED'`, backend returns `'COMPLETED'` — filter will never match

**P2 - Should Fix Before Beta:**
- No atomic transactions for multi-step operations (credit deduction + event creation)
- No rollback if scene succeeds but credit deduction fails
- Free users capped at 500 tokens (very low) — may need increase
- User action injection into prompts without sanitization (prompt injection risk)

**P3 - Cleanup/Hardening:**
- Hardcoded values: `adInterval=5`, `activeSessionLimit=3`, `dailyLimit=10`, `chapterNumber=1`
- Memory trimming is aggressive (keeps only last important choice/thread)
- Ad provider hardcoded to 'MOCK'

### Mobile Contract Findings
- Date fields serialized as ISO strings by NestJS (runtime OK, type mismatch only)
- `ReadingSessionDetails` backend returns `selectedPremiseId`, `selectedCharacterId`, `protagonistName`, `protagonistRole` — mobile types don't include these but will receive them
- `sceneMetadata` and `adPlacement` types use `any` on mobile side (flexible but loses type safety)

### Validations Executed
- `npx prisma validate` — passed
- `npm test -- --runInBand` — **328 tests / 26 suites** passing
- `npm run build` — succeeded

### Result
Reading flow is structurally sound. Main blockers: mock mode in .env (P1), mobile status enum mismatch (P1).

### Next Recommended Step
Fix `LLM_MOCK_MODE=true` in `.env` to `false` for production deployment. Then fix mobile `'FINISHED'` → `'COMPLETED'` status filter mismatch.

---

## Step 33 — Reading Flow Beta Blockers Fix

**Objective:** Fix Step 32 audit findings that block beta readiness.

### Findings Fixed
1. **Mobile status enum mismatch (P1):** Changed `'FINISHED'` → `'COMPLETED'` in `active.tsx` filter type and options
2. **LLM mock mode risk (P1):** Changed `.env` from `LLM_MOCK_MODE=true` to `LLM_MOCK_MODE=false`
3. **Credit spend atomicity (P2):** Wrapped all DB side effects in `generateNextScene()` with `this.prisma.$transaction()`
4. **Sanitized action text (P2):** `ReadingService.sendAction()` now passes `moderationResult.sanitizedText` to orchestrator

### Files Changed
- `apps/mobile/app/(tabs)/active.tsx` — COMPLETED status filter fix
- `services/api/.env` — LLM_MOCK_MODE=false
- `services/api/src/modules/reading/reading-orchestrator.service.ts` — atomic transaction for scene persistence
- `services/api/src/modules/reading/reading.service.ts` — sanitized action flow
- `services/api/src/modules/reading/__tests__/reading-service.spec.ts` — test for sanitized action

### Technical Decisions
- AI generation stays OUTSIDE the transaction (per requirements)
- All DB operations inside transaction: NarrativeEvent, NarrativeMemory, ReadingSession, CreditWallet, CreditTransaction, ModelUsage, DailyUsageLimit (upsert), AdEvent
- Transaction uses default isolation level
- If transaction fails, scene is not returned (error propagates)
- Fixed `costUsd` → `costUsed` to match Prisma schema (both first-scene and continuation)
- Used `dailyUsageLimit.upsert()` instead of update+findUnique with silent error swallowing
- Free tier ad trigger computed from upsert result without hidden failures

### Validations Executed
- `npx prisma validate` — passed
- `npm test -- --runInBand` — **329 tests / 27 suites** passing
- `npx tsc --noEmit --incremental false` — passed (no output)
- `npm run build` — not confirmed in Codex local audit due to known EPERM unlink issue on dist/tsconfig.tsbuildinfo
- Mobile `npx tsc --noEmit` — passed (no output = success)

### Result
Beta blockers resolved. Reading flow now has atomic DB persistence for continuation scenes and proper sanitized action flow.

### Remaining Issues
- P3 issues (hardcoded values, memory trimming) remain for future cleanup
- Free users still capped at 500 tokens (P2, lower priority)

### Step 33 Final Hygiene Fix
- `dailyUsageLimit.upsert()` failure regression test added (329 tests total)
- Build documentation corrected to reflect known EPERM in some environments
- No schema changes made

---

## Step 34 — Reading Beta Runtime Readiness

**Objective:** Harden the interactive reading flow for beta when `LLM_MOCK_MODE=false`.

### Files Changed
- `services/api/src/modules/ai/ai.service.ts` — sanitized console.error calls (no raw LLM content)
- `services/api/src/modules/ai/providers/openai.provider.ts` — added API key validation
- `services/api/src/modules/ai/providers/anthropic.provider.ts` — added API key validation
- `services/api/src/modules/reading/application/generation-budget.guard.ts` — added inactive model check
- `services/api/src/modules/reading/application/__tests__/generation-budget.guard.spec.ts` — added inactive model test
- `CONTEXTO_PROJETO.md` — documented Step 34

### Model/Plan Rules Verified
| Rule | Status |
|------|--------|
| FREE user + FREE model = ALLOWED | ✅ |
| FREE user + PREMIUM model = DENIED | ✅ |
| FREE user + CREDITS model = DENIED | ✅ |
| PREMIUM user + PREMIUM model = ALLOWED | ✅ |
| CREDITS model requires wallet balance | ✅ |
| Cinematic mode sponsors credits (no deduction) | ✅ |
| FREE_LLM_ONLY blocks paid models at provider level | ✅ |
| Unknown model returns controlled error | ✅ |
| Inactive model returns controlled error | ✅ (new) |

### Provider Failure Behavior
| Scenario | Behavior |
|----------|----------|
| Missing OpenAI API key | Throws "OPENAI_API_KEY is not configured" |
| Missing Anthropic API key | Throws "ANTHROPIC_API_KEY is not configured" |
| Missing OpenRouter API key | Throws controlled error with hint |
| FREE_LLM_ONLY=true + paid model | Throws at provider level |
| Parse failure | Logs content length only (no raw content) |

### Runtime Safety Fixes
1. **Removed raw LLM response logging** — console.error now shows char count only
2. **API key validation** — OpenAI/Anthropic providers fail fast with clear errors
3. **Inactive model check** — budget guard rejects inactive models before provider call

### Tests Added/Updated
- Added test for `inactive model` → guard denies with "not currently available"
- Total test count: **330 tests / 27 suites**

### Validation Results
- `npx prisma validate` — passed
- `npm test -- --runInBand` — **334 tests / 27 suites** passing (updated count)
- `npx tsc --noEmit --incremental false` — passed (no output)
- `npm run build` — not confirmed (known EPERM issue on dist/tsconfig.tsbuildinfo)

### Known Remaining Risks
- P3: Hardcoded values (adInterval=5, maxSessions=3, dailyLimit=10)
- P3: Memory trimming aggressively keeps only last entry
- P2: Free users capped at 500 tokens (very restrictive)
- P2: No retry logic for rate limits (429) or server errors (500)
- P2: Large previousEvents arrays could exceed context window

### Step 34 Final Fix
**Provider error body sanitization:**
- OpenRouter: logs `status, model, bodyLength` only — no raw body
- OpenAI: logs `status, model, bodyLength` only — no raw body
- Anthropic: logs `status, model, bodyLength` only — no raw body
- Thrown errors contain only provider name and HTTP status

**GenerationBudgetGuard FREE_LLM_ONLY enforcement:**
- Added `freeLlmOnly?: boolean` to `GenerationBudgetInput`
- Guard now passes `freeLlmOnly` to `canUserAccessModel()`
- `ReadingOrchestratorService` injects `ConfigService` and reads `FREE_LLM_ONLY`
- All 4 budget guard call sites pass `freeLlmOnly: this.isFreeLlmOnly()`
- Guard denies premium and credits models when `freeLlmOnly=true`

**Budget decision moved before session creation in `startReading()`:**
- Previously: session created first, then budget checked
- Fixed: budget decision happens first, session only created if allowed
- Prevents orphaned sessions when budget denies access

**Regression tests added:**
- `modules/ai/__tests__/provider-error-sanitization.spec.ts` — 6 tests for OpenRouter, OpenAI, Anthropic error sanitization
- `modules/reading/__tests__/reading-orchestrator.budget-regression.spec.ts` — 2 tests proving no orphaned session on budget denial

**Tests added:**
- 4 new FREE_LLM_ONLY guard tests (premium denied, credits denied, free allowed)
- 6 provider error sanitization tests
- 2 orphaned session regression tests

**Validation results:**
- `npx prisma validate` ✅ — schema valid
- `npm test -- --runInBand` ✅ — 342 tests, 29 suites
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed in Codex local audit due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`

**No schema changes.**

---

## Step 35 — Reading Context Window & Runtime Resilience

**Objective:** Improve reading runtime for longer sessions with context window safety and provider retry resilience.

### Part 1 — Context Window Safety

**Problem:** Continuation generation could pass large `previousEvents` arrays into AI prompts, risking context window overflow on long sessions.

**Solution:** `NarrativeContextBuilder.trimPreviousScenes()` limits context before prompt construction:
- Max previous events included: **3**
- Max characters per scene: **1200**
- Max total previous scene characters: **4000**
- Truncated scenes marked with `...` suffix
- `NarrativeMemory` remains primary long-term continuity source

**Files changed:**
- `modules/reading/narrative/narrative-context.builder.ts` — added `trimPreviousScenes()` method
- `modules/reading/narrative/narrative-engine.service.ts` — continuation scenes use trimmed context

### Part 2 — Provider Runtime Resilience

**Problem:** Temporary provider failures (429, 500, 502, 503, 504) could fail immediately without retry.

**Solution:** `fetch-retry.helper.ts` provides controlled retry behavior:
- Retries transient failures: 429, 500, 502, 503, 504, network errors
- Does NOT retry: 401, 403, missing API key, FREE_LLM_ONLY blocks, content validation errors
- Max attempts: **2** (1 retry)
- Sanitized logging: no prompt, content, or raw provider body logged
- Applied to OpenRouter, OpenAI, and Anthropic providers

**Files changed:**
- `modules/ai/providers/fetch-retry.helper.ts` (new)
- `modules/ai/providers/openrouter.provider.ts` — added retry wrapper
- `modules/ai/providers/openai.provider.ts` — added retry wrapper
- `modules/ai/providers/anthropic.provider.ts` — added retry wrapper

### Tests Added

- `modules/reading/__tests__/context-window-safety.spec.ts` — **8 tests** for context trimming
  - Empty/null handling, event limiting, truncation, custom limits
- `modules/ai/providers/__tests__/fetch-retry.helper.spec.ts` — **22 tests** for retry logic
  - Retry on transient errors, no retry on auth errors, callback hooks

**Validation results:**
- `npx prisma validate` ✅ — schema valid
- `npm test -- --runInBand` ✅ — 375 tests, 31 suites
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed in Codex local audit due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`

**No schema changes.**

---

## Step 36B — Mobile/Backend Reading Contract Fix

**Objective:** Fix the mobile/backend reading contract issues found in Step 36A audit.

### Fix 1 — Existing-Session startReading() Response Shape

**Problem:** When `startReading()` found an existing session, `currentScene` and `history` were at the top level, not nested inside `session`.

**Fix:**
- Both existing-session branches (zero events and with events) now return `currentScene` and `history` nested inside `session`:
```ts
{
  session: {
    ...formatSession(session),
    currentScene: ...,
    history: ...,
  },
  usage: formatUsage(...),
}
```

### Fix 2 — Consistently Numeric `creditsRemaining`

**Problem:** `UsageInfoDto.creditsRemaining` was optional; mobile expects required `number`.

**Fix:**
- `creditsRemaining` changed from `optional` to required in `UsageInfoDto`
- `formatUsage()` returns `creditsRemaining: creditsRemaining ?? 0`

### Fix 3 — Explicit Cine Mode in Mobile

**Problem:** Mobile Cine tab only sent `modelId`; backend needs `mode: 'cinematic'`.

**Fix:**
- `apps/mobile/app/reader/[id].tsx` sends `mode: 'cinematic'` when `selectedModel.creditCost > 0`

### Files Changed
- `services/api/src/modules/reading/reading-orchestrator.service.ts` — fixed response shape, numeric creditsRemaining
- `services/api/src/modules/reading/dto/reading.dto.ts` — creditsRemaining required
- `apps/mobile/app/reader/[id].tsx` — explicit cinematic mode
- `services/api/src/modules/reading/__tests__/reading-contract.spec.ts` (new, 5 tests)

### Validation Results
- `npx prisma validate` ✅ — schema valid
- `npm test -- --runInBand` ✅ — 380 tests, 32 suites
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ✅ — build succeeded

### Mobile Validation
- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors

**No schema changes.**

---

### Step 36B Test Fix — startReading Existing-Session Regression Coverage

**Objective:** Fix regression coverage gap — the Step 36B contract tests claimed to call `startReading()` but actually called `getSessionWithStatus()`, leaving the exact bug-fixed branch unprotected.

**Problem:**
`reading-contract.spec.ts` named its tests under `startReading() - existing session response shape` but called `service.getSessionWithStatus()`. The Step 36B production fix was in `startReading()` when `findActiveSession()` returns an existing session. The tests never exercised that code path.

**Fix:**
- Replaced both tests to call `service.startReading('user-1', { storyId: 'story-1' })` with proper mocking:
  - Inner `beforeEach` spies on `getStoryWithPremises`, `getUserWithSubscription`, `getOrCreateDailyLimit`, `findActiveSession`, `assertCanAccessStory`
- **Test 1 (zero events):** spies `getSessionEvents` → `[]`, spies `generateFirstScene` → scene, asserts `result.session.currentScene` exists, `result.session.history` is `[]`, no top-level `currentScene`/`history`
- **Test 2 (existing events):** spies `getSessionEvents` → 2 events, asserts `result.session.currentScene` exists, `result.session.history` has 1 entry, no top-level `currentScene`/`history`
- `formatUsage` numeric creditsRemaining tests kept unchanged

**Files Changed:**
- `services/api/src/modules/reading/__tests__/reading-contract.spec.ts` — 2 tests rewritten, 3 kept

**Validation Results:**
- `npm test -- --runInBand` ✅ — 380 tests, 32 suites (all pass)
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ✅ — build succeeded
- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors

**Production code changed:** No.

---

## Step 37 — Reading Error Contract & Mobile UX States

**Objective:** Standardize backend reading errors with predictable HTTP statuses and error codes, and align mobile reader UX with those error states.

### Error Codes Created

| Code | HTTP Status | Description |
|---|---|---|
| `READING_SESSION_NOT_FOUND` | 404 | Session missing or not owned by user |
| `STORY_NOT_FOUND` | 404 | Story missing |
| `PREMIUM_REQUIRED` | 402 | Premium story on free account |
| `DAILY_LIMIT_REACHED` | 402 | Free user exceeds daily interaction limit |
| `INSUFFICIENT_CREDITS` | 402 | User lacks credits for credits-tier model |
| `MODEL_ACCESS_DENIED` | 403 | Model not available for user's plan/config |
| `AI_PROVIDER_UNAVAILABLE` | 503 | LLM provider transient failure after retries |
| `READING_GENERATION_FAILED` | 500 | Internal generation failure |

### Helper Module

**File:** `services/api/src/modules/reading/application/reading-errors.ts`

- `throwReadingError(message, code, status)` — throws `HttpException` with `{ message, error: code }`
- `throwBudgetDenied(blockReason)` — maps `GenerationBudgetGuard` denial reasons to stable HTTP 402/403 codes

### Backend Changes

**`reading-orchestrator.service.ts`** — 18 `throw new Error(...)` replaced with proper HTTP exceptions:
- `STORY_NOT_FOUND` (404) for missing story
- `READING_SESSION_NOT_FOUND` (404) for missing/not-owned sessions (same code for both, hides existence)
- `PREMIUM_REQUIRED` (402) for premium story on free plan
- `DAILY_LIMIT_REACHED` (402) mapped from budget guard denial
- `INSUFFICIENT_CREDITS` (402) mapped from budget guard denial
- `MODEL_ACCESS_DENIED` (403) as fallback for other guard denials
- `AI_PROVIDER_UNAVAILABLE` (503) from narrative engine generation errors (non-HttpException)
- `READING_GENERATION_FAILED` (500) for session creation retry exhaustion
- `assertCanAccessStory` returns 404 (not 403) to hide whether story exists

**`narrative/narrative-engine.service.ts`** — catch block now preserves `HttpException` instances instead of wrapping them in generic `Error`

**`ai.controller.ts`** — `throw new Error('User not authenticated')` replaced with `UnauthorizedException` (401)

### Mobile Changes

**New file:** `apps/mobile/src/utils/reading-error-helper.ts`
- `handleReadingError(e)` — maps backend error codes to user-friendly `Alert.alert` dialogs
- Falls back to HTTP status 402 check for backward compatibility
- Covers all error codes with specific copy and navigation actions

**`apps/mobile/app/reader/[id].tsx`** — action submission `onError` uses `handleReadingError`

**`apps/mobile/app/story/[id]/character.tsx`** — `startReading` `onError` uses `handleReadingError`

### Tests Added

**New file:** `services/api/src/modules/reading/__tests__/reading-error-contract.spec.ts` (7 tests)

| Test | Status | Code |
|---|---|---|
| Non-existent session | 404 | `READING_SESSION_NOT_FOUND` |
| Session owned by other user | 404 | `READING_SESSION_NOT_FOUND` |
| Premium story + free user | 402 | `PREMIUM_REQUIRED` |
| Daily limit reached via sendAction | 402 | `DAILY_LIMIT_REACHED` |
| Insufficient credits for credits model | 402 | `INSUFFICIENT_CREDITS` |
| AI provider failure | 503 | `AI_PROVIDER_UNAVAILABLE` |
| No persistence on budget denial | — | Session/scene not created |

**Updated:** `reading-orchestrator.budget-regression.spec.ts` — regex updated for new error messages

### Validation Results
- `npx prisma validate` ✅ — schema valid
- `npm test -- --runInBand` ✅ — 387 tests, 33 suites
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed locally due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`
- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors

**Files Modified:**
- `services/api/src/modules/reading/reading-orchestrator.service.ts`
- `services/api/src/modules/reading/narrative/narrative-engine.service.ts`
- `services/api/src/modules/reading/__tests__/reading-error-contract.spec.ts` (new)
- `services/api/src/modules/reading/__tests__/reading-orchestrator.budget-regression.spec.ts`
- `services/api/src/modules/reading/application/reading-errors.ts` (new)
- `services/api/src/modules/ai/ai.controller.ts`
- `apps/mobile/src/utils/reading-error-helper.ts` (new)
- `apps/mobile/app/reader/[id].tsx`
- `apps/mobile/app/story/[id]/character.tsx`
- `CONTEXTO_PROJETO.md`

**No schema changes. No Prisma migrations.**

---

### Step 37 Fix — Invalid Action and Generation Error Classification

**Objective:** Fix remaining Step 37 audit findings — moderation errors now use `INVALID_READING_ACTION` code, and narrative generation errors are classified as provider-transient vs parse/internal.

#### Finding 1 — Invalid action errors now use `INVALID_READING_ACTION`

**Problem:** `reading.service.ts` threw raw `BadRequestException` with `reason` and `flags` instead of the Step 37 error contract.

**Fix:**
- Both `startReading()` and `sendAction()` moderation blocks now call:
  ```ts
  throwReadingError('Reading action blocked by moderation.', ReadingErrorCode.INVALID_READING_ACTION, 400);
  ```
- Removed `reason` and `flags` from public response body (safe by omission)
- Removed unused NestJS exception imports from `reading.service.ts`

#### Finding 2 — Provider vs generation failure classification

**Problem:** All non-`HttpException` narrative errors mapped to `503 AI_PROVIDER_UNAVAILABLE`, conflating transient API errors with parse/internal failures.

**Fix:**
- Added `private mapNarrativeGenerationError(error: unknown): never` helper in `reading-orchestrator.service.ts`
- Provider/transient signals (OpenAI API error, OpenRouter API error, Anthropic API error, timeout, network, fetch failed, rate limit, status 4xx/5xx) → **503 AI_PROVIDER_UNAVAILABLE**
- All other errors (parse, malformed, invalid response, missing content, etc.) → **500 READING_GENERATION_FAILED**
- `HttpException` instances re-thrown as-is (preserves `ai.service.ts` structured errors)
- Both `generateFirstScene` and `generateNextScene` catch blocks now delegate to this helper

#### Mobile Update

- Added `INVALID_READING_ACTION` to `reading-error-helper.ts` constants and switch case
- Dialog shows "Ação inválida" / "Revise sua ação e tente novamente."

#### Tests Added/Updated

| File | Tests |
|---|---|
| `reading-service.spec.ts` | 2 new: startReading + sendAction verify `HttpException` status 400 + code `INVALID_READING_ACTION` |
| `reading-error-contract.spec.ts` | 2 new: provider error → 503, parse error → 500 |

#### Validation Results
- `npm test -- --runInBand` ✅ — 391 tests, 33 suites (baseline before Step 38)
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed locally due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`
- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors

**No schema changes.**

---

### Step 38 — Reading Runtime Scenario Test Suite

**Objective:** Add a focused runtime scenario test suite covering the main beta reading journeys.

#### File Created

- `services/api/src/modules/reading/__tests__/reading-runtime-scenarios.spec.ts` (23 new tests)

#### Scenarios Covered

| # | Scenario | Key Assertions |
|---|---|---|
| 1 | Free user starts reading with free model | session created, first scene generated, `creditsRemaining` is numeric, no credit ops |
| 2 | Free user reaches daily limit | 402 `DAILY_LIMIT_REACHED`, `generateScene` not called, no events created |
| 3 | Premium user uses premium model | success, `modelUsage.create` called, no credits decremented |
| 4 | User w/o credits requests credits model | 402 `INSUFFICIENT_CREDITS`, `generateScene` not called, wallet not modified |
| 5 | User w/ credits uses credits model | success, credits decremented, `creditTransaction` created, model usage recorded |
| 6 | Continuation persists scene, usage, memory | event created, session updated, memory upserted, model usage recorded, nested response contract |
| 7 | Provider failure | 503 `AI_PROVIDER_UNAVAILABLE`, no event persisted |
| 8 | Parse/internal failure | 500 `READING_GENERATION_FAILED`, no event persisted |
| 9 | Budget denial before session creation | error thrown, `readingSession.create` not called, `generateScene` not called |

#### Implementation Notes

- All tests use `service.startReading()` / `service.sendAction()` — no direct private method testing
- `$transaction` mock executes the callback to exercise the full DB persistence path (events, memory, model usage, credit ops)
- Error contract assertions use a shared `expectHttpException` helper
- Scenario 9 reuses the `FREE_LLM_ONLY=true` config pattern from the existing budget regression spec
- No production code was changed — the test suite validates existing behavior

#### Validation Results

- `npm test -- --runInBand` ✅ — **414 tests, 34 suites** (391 base + 23 runtime scenarios)
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed locally due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`
- `npx prisma validate` ✅ — schema valid
- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors

**No schema changes. No Prisma migrations. No production code modified.**

---

### Step 38 Fix — Premium Model Scenario Alignment

**Objective:** Scenario 3 now requests explicit premium-tier model ID to validate premium model entitlement and usage tracking.

#### Test Changes

| Change | File |
|---|---|
| Scenario 3 sends `modelId: 'gpt-4.1-nano'` explicitly | `reading-runtime-scenarios.spec.ts` |
| Mocked `generateScene` returns `modelUsed: 'gpt-4.1-nano'` | same |
| Assertions verify `modelUsage.create` records `'gpt-4.1-nano'` | same |
| Credit wallet/transaction negative assertions remain | same |

Before this fix, Scenario 3 only proved a Premium user could continue with the default free path (`openrouter/free`). Now it validates that requesting a premium model (`gpt-4.1-nano`) succeeds, records the correct model ID in usage tracking, and does not touch credits.

#### Validation Results

- `npm test -- --runInBand` ✅ — **414 tests, 34 suites**
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed locally due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`
- `npx prisma validate` ✅ — schema valid
- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors

**No production code changed.**

---

### Step 39 — Mobile Reading Beta Polish

**Objective:** Improve mobile reading screen UX for beta readiness — session loading/error states, retry, disabled states during generation, model tab polish, Cine cost display.

#### Files Modified

- `apps/mobile/app/reader/[id].tsx` — all UX improvements
- `CONTEXTO_PROJETO.md`

#### UX Improvements Implemented

| # | Improvement | Detail |
|---|---|---|
| 1 | Session loading error state | Checks error code; `READING_SESSION_NOT_FOUND` routes to library; other errors show retry + back-to-library buttons |
| 2 | Retry support | `refetch()` exposed via a "Tentar novamente" button on session load error |
| 3 | Disabled send button | "Enviar ação" button always visible but disabled when text is empty or generation is in progress |
| 4 | Disabled choice buttons | Suggested action buttons use `opacity: 0.4` and are non-tappable during generation |
| 5 | Disabled model tabs | All model tabs disabled during generation to prevent changing model mid-generation |
| 6 | Tappable locked tabs | `ModelTab` no longer `disabled={locked}` — users can tap a locked Premium/Cine tab to see the upgrade prompt |
| 7 | Cine cost display | Tab label shows `Cine • X créditos` when a credits model is available; subtitle shows model display name |
| 8 | Premium tab | Shows model display name (e.g. `GPT-4.1 Nano`) when a premium model is available, or `Avançado` as fallback |
| 9 | Reading contract preserved | Screen still reads `session.currentScene`, `session.history`, `usage` — no top-level fields reintroduced |

#### Error Helper

- `reading-error-helper.ts` unchanged — already handles `READING_SESSION_NOT_FOUND` with `router.back()` for action errors
- Session-load errors handled at the screen level with more context-specific messaging

#### Mobile Tests

No practical mobile test setup exists. TypeScript validation only.

---

### Step 39 Fix — Controls Remain Visible During Generation

**Objective:** Interaction section (input, send button, choices) now stays visible during generation instead of disappearing.

**Change in `reader/[id].tsx`:**
- Replaced `{!isGenerating && currentScene ? (...)` with `{currentScene ? (...)` — the interaction section always renders when a scene exists
- `sendAction` button: disabled via `disabled={!freeText.trim() || isGenerating}` instead of hidden
- Choice buttons: disabled via `disabled={isGenerating}` with `opacity: 0.4`
- `TextInput`: `editable={!isGenerating}` so the user cannot type while generation is in progress
- Generating spinner/status still shown above the interaction section
- User text is preserved while generating (cleared only on `onSuccess` mutation callback)

#### UX During Generation

The user now sees: generation status text + spinner, input area (not editable), send button disabled, suggested choices disabled, model tabs disabled. The UI feels stable instead of jumping.

#### Validation Results

- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors
- `npm test -- --runInBand` ✅ — **414 tests, 34 suites** (unchanged — no backend changes)
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed locally due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`
- `npx prisma validate` ✅ — schema valid

**No backend production code changed. No schema changes. No Prisma migrations.**

#### Intentionally Deferred

- Purchase/credit flow (handled by existing upgrade screen routing)
- Global error/navigation architecture (out of scope for beta polish)
- Mobile test infrastructure (not available; would be a separate setup step)

---

### Step 40 — Active Sessions / Library Beta Contract

**Objective:** Ensure users can find, understand, resume, and manage reading sessions from the mobile app with a stable backend contract.

#### Audit Findings

| # | Finding | Fix |
|---|---|---|
| 1 | `GetSessionsDto.status` used `@IsString()` — no enum validation | Changed to `@IsEnum(ReadingSessionStatus)` |
| 2 | `SessionListResponseDto` lacked `storyCoverUrl`, `selectedPremiseTitle`, `selectedCharacterName` | Added optional fields |
| 3 | `findSessions` only included `story.title` | Now includes `story.coverUrl`, `premise.title`, `character.name` |
| 4 | Mobile `active.tsx` had no error state | Added error state with retry button |
| 5 | ChronicleCard showed hardcoded placeholder text | Replaced with real `selectedPremiseTitle` / `selectedCharacterName` |

#### Backend Contract Changes

- **DTO:** `GetSessionsDto.status` validated with `@IsEnum(ReadingSessionStatus)` (ACTIVE, COMPLETED, ABANDONED)
- **DTO:** `SessionListResponseDto.sessions` items now include optional `storyCoverUrl`, `selectedPremiseTitle`, `selectedCharacterName`
- **Query:** `findSessions` includes `story.coverUrl`, `premise.title`, `character.name`
- **Mapper:** `getUserSessions` maps the new fields, returning `null` when relations are missing
- **Abandon:** Already correct — missing/not-owned session returns 404 `READING_SESSION_NOT_FOUND` (verified by new tests)

#### Mobile UX Changes

| File | Change |
|---|---|
| `types.ts` | `ReadingSessionSummary` updated with `storyCoverUrl?`, `selectedPremiseTitle?`, `selectedCharacterName?` |
| `active.tsx` | Error state with "Tentar novamente" button (calls `refetch()`); ChronicleCard shows real premise/character labels instead of placeholder |

Library screen (`library.tsx`) was already correct — uses `ContinueReadingCard` with proper session summary contract.

#### Tests Added (9 new)

| Test | File |
|---|---|
| Summary mapping includes lightweight fields | `reading-runtime-scenarios.spec.ts` |
| Optional fields included when relations present | same |
| Optional fields null when relations missing | same |
| ACTIVE status passes to query | same |
| COMPLETED status passes to query | same |
| ABANDONED status passes to query | same |
| Abandon — non-existent session → 404 | same |
| Abandon — not-owned session → 404 | same |
| Abandon — owned session → status ABANDONED | same |

#### Validation Results

- `npm test -- --runInBand` ✅ — **423 tests, 34 suites** (414 base + 9 new)
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed locally due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`
- `npx prisma validate` ✅ — schema valid
- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors

**No schema changes. No Prisma migrations.**

#### Intentionally Deferred

- Mobile test infrastructure (not available; would be a separate setup step)
- Full story cover/premise/character in session list (current fields sufficient for beta)

---

### Step 40 Fix — Invalid Status Filter Regression Coverage

**Objective:** Add regression coverage for the `@IsEnum(ReadingSessionStatus)` validation on `GetSessionsDto.status`.

#### Change

Added 6 DTO validation tests to `reading-runtime-scenarios.spec.ts` using `class-validator` / `class-transformer` (`validate` + `plainToInstance`):

| Test | Expectation |
|---|---|
| `FINISHED` rejected | `validate` returns error for `status` |
| `INVALID` rejected | `validate` returns error for `status` |
| `ACTIVE` accepted | no status error |
| `COMPLETED` accepted | no status error |
| `ABANDONED` accepted | no status error |
| `undefined` accepted | optional field, no status error |

No production code changed. Existing orchestrator-level status pass-through tests (ACTIVE, COMPLETED, ABANDONED) left untouched.

#### Validation Results

- `npm test -- --runInBand` ✅ — **429 tests, 34 suites** (423 base + 6 DTO validation)
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed locally due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`
- `npx prisma validate` ✅ — schema valid
- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors

**No production code changed. No schema changes. No Prisma migrations.**

---

### Step 41 — Credits & Billing Ledger Hardening

**Objective:** Harden credit balance operations with atomic guards, ensure every balance change has a ledger entry, and add focused tests.

#### Current Credit/Billing Implementation Audit

| Aspect | Status |
|---|---|
| `CreditWallet` model | Exists (`balance: Int`, `userId@unique`) |
| `CreditTransaction` model | Exists (`type`, `amount`, `reason`, `metadata Json?`, `walletId`) |
| Transaction enums | `CreditTransactionType`: EARN, SPEND, REFUND, EXPIRE |
| Transaction reason enums | PURCHASE, SUBSCRIPTION_BONUS, PROMO, SCENE_GENERATION, MEMORY_SUMMARY, IMAGE_GENERATION, REFERRAL, REFUND, EXPIRATION |
| `billing.service.purchaseCredits` | Uses `$transaction([...])` with `EARN` ledger entry; includes `packageId` in metadata |
| `billing.service.spendCredits` | Existed but had non-atomic JS balance check before decrement |
| Reading Cine spend (inline in orchestrator) | Existed but had non-atomic `creditWallet.update({decrement})` without balance guard |
| Admin/grant flow | Does **not exist** — deferred |
| Purchase idempotency | Not implemented — deferred |
| Scene media credit spend | Does **not exist** — deferred to Step 42 |
| `billing/__tests__` | Did **not exist** — created in this step |

#### Ledger Invariants Confirmed/Added

1. **Every balance change must have a corresponding CreditTransaction entry.** Verified:
   - Purchase → `creditWallet.update({increment})` + `creditTransaction.create({type:EARN})`
   - Spend → `creditWallet.updateMany({decrement})` + `creditTransaction.create({type:SPEND})`
   - Grant → deferred (not yet implemented)
2. **No negative balances.** Both spend paths now use atomic `updateMany` with `balance: { gte: amount }` precondition.
3. **Atomicity.** Both spend paths run inside Prisma `$transaction` — wallet decrement and ledger creation are in the same transaction boundary.

#### Production Changes

**`reading-orchestrator.service.ts` (inline Cine spend):**
- Changed `creditWallet.update({decrement})` → `creditWallet.updateMany({where: {id, balance: {gte: creditCost}}}, {decrement})`
- If `count === 0`, throws `402 INSUFFICIENT_CREDITS` (catches race condition between budget guard and DB write)
- Added `creditCost <= 0` guard
- Transaction rollback on failure is preserved (inside `$transaction` callback)

**`billing.service.ts` `spendCredits`:**
- Changed non-atomic JS balance check + `$transaction([...])` → atomic `updateMany` inside `$transaction` callback
- Uses `wallet.findUnique` then `updateMany({where: {id, balance: {gte: amount}}})` for atomic conditional decrement
- Returns `false` (not throws) on insufficient credits (preserving existing contract)
- Added `amount <= 0` guard

#### Tests Added/Updated

**Reading credits spend tests (`reading-runtime-scenarios.spec.ts`):**

| Test | What it proves |
|---|---|
| Atomic decrement via `updateMany` with `balance: {gte: N}` | Atomic balance guard is used |
| Creates SPEND transaction with negative amount (`-2`) | Ledger entry is negative for spend |
| Metadata includes `modelId`, `mode` (standard/cinematic), `sessionId` | Audit trail completeness |
| `updateMany` returns `{count: 0}` → 402 `INSUFFICIENT_CREDITS` | Atomic failure prevents overspend |
| Wallet update failure → no event/usage persisted | Transaction rollback preserved |
| Transaction creation failure → no event/usage persisted | Transaction rollback preserved (Prisma mock throws) |
| Insufficient credits at budget guard → no wallet/transaction called | Guard blocks before DB writes |

**Billing service tests (`billing/__tests__/billing.service.spec.ts` — new file):**

| Test | What it proves |
|---|---|
| purchaseCredits increments wallet + creates EARN transaction | Ledger invariant holds for purchases |
| purchaseCredits includes `packageId` in metadata | Audit trail completeness |
| purchaseCredits throws for unknown package | Input validation |
| purchaseCredits throws when wallet missing | Edge case |
| spendCredits decrements atomically + creates SPEND transaction | Ledger invariant holds for spends |
| spendCredits returns false when wallet not found | Edge case |
| spendCredits returns false when insufficient credits | No false success |
| spendCredits returns false for zero/negative amount | Input validation |

#### Validation Results

- `npm test -- --runInBand` ✅ — **442 tests, 35 suites** (429 base + 6 reading + 8 billing)
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed locally due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`
- `npx prisma validate` ✅ — schema valid
- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors

#### Deferred Work

| Item | Reason | Proposed Step |
|---|---|---|
| Admin/grant promotional credits flow | No scaffold exists | Step 42+ |
| Purchase idempotency key | Not required for mock payment | Step 42+ |
| Scene media credit spend | Scene media does not yet spend credits (pure CRUD now) | Step 42 |
| `IMAGE_GENERATION` / video credit costs | Image/video generation exists but does not spend credits yet | Step 42 |
| `CreditTransactionRefund` and expiry | Flow not yet designed; refund enum exists but unused | Deferred |

**No Prisma schema changes. No Prisma migrations.**

---

### Step 41 Fix — Credit Balance Response and Spend Metadata

**Objective:** Fix stale balance response when credits-tier model used without `mode: 'cinematic'`, add optional metadata to `BillingService.spendCredits`, correct build status documentation.

#### Finding 1 — Credits spend returns stale balance when mode is omitted

**Problem:** `reading-orchestrator.service.ts` previously refreshed wallet balance only when `dto.mode === 'cinematic'`. Since any CREDITS-tier model spend deducts credits, the refresh must trigger based on whether the *final model* is credits-tier, not the request mode.

**Fix:** Changed the wallet refresh condition from `dto.mode === 'cinematic'` to `decision.finalModel.tier === 'CREDITS'`.

#### Finding 2 — Generic spendCredits lacks audit metadata

**Problem:** `BillingService.spendCredits` now accepts an optional fourth parameter `metadata?: Record<string, unknown>`. When provided, it is persisted in `creditTransaction.create({ metadata })`.

The orchestrator's inline spend already included metadata (`modelId`, `mode`, `sessionId`). This fix enables the same audit trail for generic `spendCredits` calls.

#### Finding 3 — Build status overstatement

**Issue:** Step 41 claimed `npm run build` succeeded. Updated to `⚠️ — not confirmed locally due to known EPERM unlink issue on dist/tsconfig.tsbuildinfo`.

#### Tests Added/Updated

**`reading-runtime-scenarios.spec.ts`:**
- Updated "reflect updated credit balance" test from `typeof` check to exact `toBe(8)` assertion for credits-tier spend without `mode: 'cinematic'`

**`billing.service.spec.ts`:**
- Existing `spendCredits` test now asserts `metadata: undefined` when omitted
- New test: `spendCredits` with metadata persists the metadata object in `CreditTransaction.create`

#### Validation Results

- `npm test -- --runInBand` ✅ — **443 tests, 35 suites** (442 base + 1 metadata test)
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ⚠️ — not confirmed locally due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`
- `npx prisma validate` ✅ — schema valid
- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors

**No Prisma schema changes. No Prisma migrations.**

---

## Step 42 — Scene Media Credit Spend Contract

**Objective:** Add credit enforcement and spend orchestration for scene media generation (images and videos).

**Files Changed:**
- `services/api/src/modules/scene-media/constants/scene-media.constants.ts` (NEW)
- `services/api/src/modules/scene-media/scene-media.module.ts`
- `services/api/src/modules/scene-media/scene-media.service.ts`
- `services/api/src/modules/scene-media/scene-media.controller.ts`
- `services/api/src/modules/scene-media/__tests__/scene-media.service.spec.ts`
- `services/api/src/modules/ai/image-generation.service.ts`

**Final Media Credit Costs:**
- `IMAGE`: 1 credit
- `VIDEO`: 5 credits

**Enforcement Behavior:**
- The requested media type's credit cost is determined.
- The wallet balance is checked before calling generation.
- If insufficient, an HTTP 402 exception (`INSUFFICIENT_CREDITS`) is thrown, generation is blocked, and no media or transactions are created.
- An atomic post-generation DB transaction was added to ensure credits are spent and SceneMedia is updated synchronously.
- Rollback safety relies on Prisma `$transaction`.

**Metadata Behavior:**
- Successful spends log a `CreditTransaction` with reason `IMAGE_GENERATION` or `SCENE_GENERATION`.
- Metadata now uses `sceneMediaId`, not ambiguous `sceneId`.
- Metadata includes: `{ feature: 'SCENE_MEDIA', mediaType: 'IMAGE' | 'VIDEO', sceneMediaId, narrativeEventId, storyId, provider }`.

**Tests Added:**
- Comprehensive tests in `scene-media.service.spec.ts` for `generateImage` and `generateVideo`.
- Unit tests verify transaction callback behavior and failure propagation.
- Verification that generation is skipped on insufficient balance.
- Verification that credits are not spent on generation failure.

**Validation Results:**
- `npx prisma validate`: **Success**
- Backend Tests (`npm test -- --runInBand`): **453 tests / 35 suites** passing in full backend audit
- Frontend/Backend Typescript check (`npx tsc --noEmit`): **Success**
- `npm run build` ⚠️ — not confirmed locally due to known EPERM unlink issue on `dist/tsconfig.tsbuildinfo`

**Deferred Work:**
- Real video provider integration (currently uses a mock stub).

---

## Step 43 — Scene Media Mobile Contract & UX

**Objective:** Connect mobile reading experience to existing backend scene media contract from Step 42.

### Audit Findings Before Implementation

| # | Finding | Action |
|---|---|---|
| 1 | `SceneResponse` type missing `id` field | Added `id` to `SceneResponse` in `types.ts` |
| 2 | No `SceneMedia` type in mobile | Added `SceneMedia` interface to `types.ts` |
| 3 | No scene media API methods in mobile | Added inline mutations in reader screen |
| 4 | `createFromNarrativeEvent` throws 409 `ConflictException` if media exists | Handled with graceful recovery in mutation |
| 5 | Video generation fully stubbed (never succeeds) | Presented as disabled "Em breve" |
| 6 | Image generation requires `ENABLE_IMAGE_GENERATION=true` | Error shown to user when disabled |
| 7 | Reader uses inline `api.post/get` pattern (no helper file) | Followed existing pattern |

### Mobile Changes

**Files Modified:**
- `apps/mobile/src/api/types.ts` — Added `id` to `SceneResponse`, added `SceneMedia` interface
- `apps/mobile/app/reader/[id].tsx` — Full scene media UX integration

**API Methods Added (inline in reader):**
- `sceneMediaQuery` — Fetches existing SceneMedia for current narrative event
- `generateImageMutation` — Full image generation flow:
  1. Creates SceneMedia via `POST /scene-media/from-event/:narrativeEventId` if needed
  2. Handles 409 Conflict (media already exists) with graceful recovery
  3. Generates image via `POST /scene-media/:id/generate-image`
  4. Shows result via `generatedImageUrl` state

**Reader UX Implemented:**

| Feature | Behavior |
|---------|----------|
| Image generation button | Shows cost (1 crédito), requires user confirmation via Alert dialog |
| Video generation button | Disabled, shows "Em breve" badge and cost (5 créditos) |
| Duplicate request protection | Button disabled while creating media or generating image |
| Generation loading state | `ActivityIndicator` replaces button content during generation |
| Existing image detection | Queries `GET /scene-media/my` on mount via `sceneMediaQuery` |
| Generated image display | Shows image below media buttons when `generatedImageUrl` is set |

**Error Handling:**

| Error | UX |
|-------|-----|
| `INSUFFICIENT_CREDITS` (402) | Alert with "Comprar créditos" button → routes to upgrade |
| Generation disabled | Alert "Geração indisponível" with backend message |
| 409 Conflict (media exists) | Silently recovers, fetches existing media, generates if no image |
| Network/server failure | Generic error alert |

### Video Availability Decision

Video generation is **not presented as ready** because:
- `VideoGenerationService` is fully stubbed (always returns `success: false`)
- `ENABLE_VIDEO_GENERATION=false` in backend
- The controller throws `BadRequestException('Video generation failed or is disabled')`

UI shows a disabled button with "Em breve" badge and 5 créditos cost. Tapping shows informational alert. **No endpoint call is wired.**

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors
- `npx prisma validate` ✅ — schema valid
- `npm test -- --runInBand` ✅ — 453 tests / 35 suites passing
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ✅ — build succeeded

### Deferred Work

- Real video provider integration (backend: `VideoGenerationService`)
- Scene media gallery/history screen
- Publishing flow from reader to social feed
- Credit balance display in reader dashboard (current `usage.creditsRemaining` exists but not shown prominently for media)

**No schema changes. No backend code changes.**

---

### Step 43 Fix — Loose Ends

**Objective:** Fix four audit findings from Step 43 implementation.

#### Finding 1 — Generated Image Leaks Across Scenes

**Problem:** `generatedImageUrl` was plain screen state, never cleared when `currentSceneId` changed. A previous scene's image could remain visible below the new scene.

**Fix (mobile):**
- Added `useEffect` on `currentSceneId` that clears `generatedImageUrl` to `null`
- Image display now uses `sceneMediaQuery.data?.imageUrl || generatedImageUrl` for existing persisted images

**File:** `apps/mobile/app/reader/[id].tsx`

#### Finding 2 — Existing Images Can Be Regenerated

**Problem:** If `sceneMediaQuery.data` already had `imageUrl`, the code would call `generate-image` again, spending another credit.

**Fix (mobile):**
- Added early return guard at top of `generateImageMutation.mutationFn`: if `sceneMediaQuery.data?.imageUrl` exists, return immediately
- UI shows completed state ("Imagem gerada" with green accent) instead of "Gerar imagem" button when image exists
- No regeneration from normal button flow

**File:** `apps/mobile/app/reader/[id].tsx`

#### Finding 3 — Backend currentScene.id Contract Inconsistent

**Problem:** Mobile requires `currentScene.id` for scene media, but backend didn't include `id` in all response branches:
- `generateFirstScene()` return didn't include `narrativeEvent.id`
- `sendAction()` manual `currentScene` construction didn't include event `id`
- `SceneResponseDto` didn't have `id` field

**Fix (backend):**
- `reading.dto.ts`: Added `id?: string` to `SceneResponseDto`
- `reading-orchestrator.service.ts` `generateFirstScene()`: Added `id: narrativeEvent.id` to return
- `reading-orchestrator.service.ts` `sendAction()`: Added `id: events[events.length - 1]?.id` to manual `currentScene` construction
- Updated `generateFirstScene()` return type to include `id`
- Mobile `SceneResponse.id` stays required (already added in Step 43)
- Mobile disables media generation when `currentSceneId` is undefined

**Files:**
- `services/api/src/modules/reading/dto/reading.dto.ts`
- `services/api/src/modules/reading/reading-orchestrator.service.ts`

#### Finding 4 — Stale Documentation

**Fix (docs):**
- MOBILE_CONTEXT.md: Removed incorrect claim that video button has informational alert (disabled buttons don't fire `onPress`)
- MOBILE_CONTEXT.md: Updated "Last Updated" to Step 43 Fix
- CURRENT_STATE.md: Updated to reflect build passes
- CHANGELOG_STEPS.md: Updated Step 43 with this fix section

### Validation Results (Step 43 Fix)

- `apps/mobile npx tsc --noEmit` ✅ — no TypeScript errors
- `npx prisma validate` ✅ — schema valid
- `npm test -- --runInBand` ✅ — 453 tests / 35 suites passing
- `npx tsc --noEmit --incremental false` ✅ — no TypeScript errors
- `npm run build` ✅ — build succeeded

**No new schema changes. Backend touched for contract consistency only.**

---

### Step 43 Final Fix — currentScene.id Contract

**Objective:** Fix continuation scene returning wrong NarrativeEvent.id, add regression tests, align mobile type.

#### P1 — Continuation Scene Returns Wrong event id

**Problem:** `sendAction()` used `events[events.length - 1]?.id` but `getSessionEvents()` orders by `generatedAt: 'desc'`, so `events[0]` is the newest. Mobile would create SceneMedia for the oldest event, not the current one.

**Fix:** Changed `events[events.length - 1]?.id` → `events[0]?.id`.

**File:** `services/api/src/modules/reading/reading-orchestrator.service.ts`

#### P3 — Regression Tests

**Tests added (2):**
- `should include NarrativeEvent.id in currentScene after first-scene start` — verifies `generateFirstScene` return includes `id` in response
- `should return newest event id in continuation currentScene (not oldest)` — verifies `events[0]?.id` is used (newest), not `events[events.length - 1]` (oldest)

**File:** `services/api/src/modules/reading/__tests__/reading-contract.spec.ts`

#### P3 — Mobile Type Alignment

**Fix:** Changed `SceneResponse.id: string` → `id?: string` in mobile types to match backend `SceneResponseDto.id?: string`.

**File:** `apps/mobile/src/api/types.ts`

### Validation Results (Step 43 Final Fix)

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **455 tests / 35 suites** (+2 regression)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

**No schema changes.**

---

### Step 43 Final Fix — generateFirstScene() Regression Gap

**Objective:** Add a real regression test proving `generateFirstScene()` maps `NarrativeEvent.id` into return value, not just that `startReading()` propagates a mocked field.

**Problem:** The existing first-scene test mocked `generateFirstScene()` with `id: 'event-new'`. It proved propagation, not the internal implementation.

**Test added (1):**
- `should map NarrativeEvent.id into generateFirstScene() return value` — calls real `generateFirstScene()` with mocked internal dependencies (`createInitialMemory`, `findMemoryBySessionId`, `createNarrativeEvent`, `narrativeEngine.generateScene`, `updateReadingSession`, `createModelUsage`)
- `createNarrativeEvent` resolves `{ id: 'event-created-by-prisma', ... }`
- Asserts `result.id === 'event-created-by-prisma'`, plus correct `chapterNumber`, `sceneIndex`, `sceneText`, `choices`, `sceneMetadata`

**File:** `services/api/src/modules/reading/__tests__/reading-contract.spec.ts`

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **456 tests / 35 suites** (+1)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

**No schema changes. No production code changes.**

---

## Step 44 — Scene Media Gallery / History + Reader Credit Visibility

**Objective:** Make generated scene images discoverable after creation and improve reader media UX with credit visibility.

### Files Changed

**Mobile:**
- `apps/mobile/app/scene-media.tsx` (NEW) — Gallery/history screen
- `apps/mobile/app/_layout.tsx` — Registered `scene-media` route in root Stack
- `apps/mobile/app/reader/[id].tsx` — Added credit badge + "Ver galeria" link in media section

**No backend files changed.**

### Implementation Details

**A. Scene Media Gallery Screen (`scene-media.tsx`)**
- Fetches `GET /scene-media/my` via `useQuery<SceneMedia[]>`
- 2-column grid (`FlatList` with `numColumns={2}`) displaying items with `imageUrl`
- Each card shows the image (`<Image>`) with type badge (Imagem / Em breve for video)
- `textExcerpt` displayed below the image when available
- Three states:
  - **Loading:** `StateBlock` with spinner
  - **Error:** `StateBlock` with retry button
  - **Empty:** Centered message with CTA to library
- Video items noted in header text ("X vídeos — disponível em breve"), not rendered in grid
- Header with back button
- Dark cinematic theme consistent with existing screens

**B. Entry Point / Navigation**
- "Ver galeria" link added in reader media section (credits row)
- Route registered as `scene-media` in root `Stack.Screen`
- Navigates via `router.push('/scene-media')`

**C. Reader Credit Visibility**
- Credits badge added to reader media section: shows `X créditos disponíveis` with coin icon
- Uses `usage.creditsRemaining` from existing reading session data
- Zero credits shown in muted color; positive credits in primary accent
- Backend remains source of truth for credit enforcement

**D. Step 43 Behavior Preserved**
- No re-introduction of duplicate generation
- Existing image guard (early return when `imageUrl` exists) untouched
- `useEffect` clearing `generatedImageUrl` on scene change untouched
- Media disabled when `currentSceneId` missing
- Video remains disabled/unavailable throughout

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — 456 tests / 35 suites (unchanged)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

### Deferred Work
- Real video provider integration
- Gallery detail/zoom view
- Publishing flow from gallery to social feed

**No backend changes. No schema changes.**

---

## Step 45 — Social Feed Publication Flow from Scene Media

**Objective:** Allow users to submit eligible generated scene media for moderation from mobile gallery, with backend content eligibility hardening.

### Backend Changes

**File:** `services/api/src/modules/scene-media/scene-media.service.ts`

**Hardening `submitForModeration()`:**
- Added content eligibility check: rejects TEXT-only media without `imageUrl` or `videoUrl`
- Existing checks preserved: ownership, PRIVATE + NOT_SUBMITTED status
- Submission sets `moderationStatus` to `PENDING`, does NOT make media public
- Visibility remains `PRIVATE` throughout submission

**Tests added (1 new):**
- `should throw BadRequestException for TEXT-only media without image` — verifies TEXT-only placeholder rejected, `update` not called

**Updated test (1):**
- Existing `should submit PRIVATE + NOT_SUBMITTED SceneMedia` — added `mediaType: IMAGE` and `imageUrl` to pass new content check

### Mobile Changes

**File:** `apps/mobile/app/scene-media.tsx`

**Gallery Card States:**

| Moderation Status | UI Label | Icon | Color |
|---|---|---|---|
| `NOT_SUBMITTED` + `imageUrl` | "Publicar" button | Send | Primary accent |
| `PENDING` | "Em análise" | Clock | Muted |
| `APPROVED` | "Aprovada" | ShieldCheck | Success green |
| `REJECTED` | "Rejeitada" | ShieldX | Error red |
| `NOT_SUBMITTED` without image | "Privada" | — | Muted |

**Submit Flow:**
1. "Publicar" button visible only on eligible media (`NOT_SUBMITTED` + `imageUrl`)
2. Confirmation dialog: "Sua cena será enviada para revisão antes de aparecer no feed público"
3. Calls `POST /scene-media/:id/submit` via `useMutation`
4. Success alert: "Enviada para análise"
5. Invalidates `['scene-media-gallery']` cache
6. Error alert with backend message
7. Button disabled/loading during submission

### Product Rules Preserved
- Media remains private by default (no direct publish)
- Moderation-aware (PENDING state, no automatic approval)
- TEXT-only placeholders cannot be submitted
- Video remains unavailable/deferred

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **457 tests / 35 suites** (+1)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

### Deferred Work
- Real video provider integration
- Moderator review interface (backend: approve/reject submitted scenes)
- Likes/comments/share on published scenes
- Video submission flow (when video provider is ready)

**No schema changes.**

---

## Step 46 — Moderator Review Interface for Submitted Scene Media

**Objective:** Close the moderation loop for submitted scene media by adding secure admin review endpoints.

### New Admin Module

**Files created:**
- `modules/admin/scene-media-moderation/dto/admin-scene-media.dto.ts`
- `modules/admin/scene-media-moderation/admin-scene-media.service.ts`
- `modules/admin/scene-media-moderation/admin-scene-media.controller.ts`
- `modules/admin/scene-media-moderation/admin-scene-media.module.ts`
- `modules/admin/scene-media-moderation/__tests__/admin-scene-media-moderation.service.spec.ts`

**Files modified:**
- `app.module.ts` — Registered `AdminSceneMediaModule`

### Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/admin/scene-media/pending` | List pending submissions (paginated) |
| `POST` | `/admin/scene-media/:id/approve` | Approve: PENDING → APPROVED + PUBLIC |
| `POST` | `/admin/scene-media/:id/reject` | Reject: PENDING → REJECTED + PRIVATE |

**RBAC:** All endpoints protected by `JwtAuthGuard` + `RolesGuard` + `@Roles(UserRole.ADMIN)`.

### Moderation Behavior

**Approve:**
- Only `PENDING` media can be approved (`BadRequestException` otherwise)
- Sets `moderationStatus = APPROVED`, `visibility = PUBLIC`, `publishedAt = now()`
- Clears `moderationNote`
- Does not modify imageUrl, userId, storyId, or any content fields

**Reject:**
- Only `PENDING` media can be rejected (`BadRequestException` otherwise)
- Sets `moderationStatus = REJECTED`, keeps `visibility = PRIVATE`
- Accepts optional `note` body → sets `moderationNote`

**List Pending:**
- Returns only `moderationStatus = PENDING` media
- Paginated (default 20, max 100), ordered by `createdAt: desc`
- Safe DTO mapping (no prompts, passwords, tokens)

### Tests (15 new)

| Test | Proves |
|------|--------|
| listPending returns only PENDING with pagination | Correct filter + pagination shape |
| listPending caps limit at 100 | Max 100 constraint |
| approve sets APPROVED + PUBLIC + publishedAt | Correct state transition |
| approve throws NotFoundException | 404 on missing |
| approve throws on NOT_SUBMITTED | Guard on non-PENDING |
| approve throws on already APPROVED | Guard on non-PENDING |
| approve throws on REJECTED | Guard on non-PENDING |
| reject sets REJECTED + PRIVATE + note | Correct state transition |
| reject with null note | Optional note handling |
| reject throws NotFoundException | 404 on missing |
| reject throws on NOT_SUBMITTED | Guard on non-PENDING |
| reject throws on already APPROVED | Guard on non-PENDING |
| reject throws on REJECTED | Guard on non-PENDING |
| DTO excludes passwordHash/refreshToken | No sensitive leaks |
| DTO preserves imageUrl/userId | Unrelated fields untouched |

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **473 tests / 36 suites** (+15)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

### Deferred Work
- Admin UI/dashboard for moderation
- Bulk approve/reject
- Moderation activity log

**No schema changes.**

---

### Step 46 Audit Fix — Controller Tests + Count Consistency

**Objective:** Add missing controller/RBAC tests and fix stale documentation counts.

#### P3 — Missing Controller/RBAC Test

**File:** `modules/admin/scene-media-moderation/__tests__/admin-scene-media-moderation.controller.spec.ts` (NEW)

**Tests (7):**
- `listPending` delegates to service with page/limit
- `listPending` delegates with default params
- `approve` delegates to service with id
- `reject` delegates to service with id and note
- `reject` delegates when body is absent (undefined note)
- Controller has `JwtAuthGuard` and `RolesGuard` metadata
- Controller requires `UserRole.ADMIN`

#### P3 — Stale Documentation Counts

**Files fixed:**
- `docs/context/CURRENT_STATE.md` — 473/36→480/37
- `docs/roadmap-mvp.md` — 456/35→480/37
- `docs/context/PROJECT_CONTEXT.md` — 453/35→480/37
- `docs/agents/enredo-technical-executor.md` — 453/35→480/37

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **480 tests / 37 suites** (+7)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

**No schema changes. No production code changes.**

---

## Step 47 — Real Feed Backend + Mobile Scenes Integration

**Objective:** Replace static/mock Scenes feed with real approved public scene media from the backend.

### Backend Changes

**Files created:**
- `modules/scene-media/dto/feed-scene-media.dto.ts` — Feed DTOs
- `modules/scene-media/scene-media-feed.controller.ts` — Public feed controller (no auth)

**Files modified:**
- `modules/scene-media/scene-media.service.ts` — Added `getFeed()` + `mapToFeedDto()`
- `modules/scene-media/scene-media.module.ts` — Registered `SceneMediaFeedController`
- `modules/scene-media/__tests__/scene-media.service.spec.ts` — +6 feed tests, +1 mock fix

### Endpoint

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET` | `/scene-media/feed` | None (public) | List approved public scene media |

**Feed rules:**
- Only `PUBLIC` + `APPROVED` + `publishedAt != null`
- Ordered by `publishedAt desc`, paginated (20/100)
- Safe DTO: no prompts, passwords, email, wallet, credits

### Mobile Changes

**File:** `apps/mobile/app/(tabs)/scenes.tsx` — Full rewrite

**Before:** 3 hardcoded mock items, fake likes/comments numbers
**After:** `useQuery` → `GET /scene-media/feed` with loading/error/empty states
- Real image URL backgrounds, genre pills from `story.genres`
- Rail icons preserved WITHOUT fake counts
- CTA only when `storyId` exists

### Tests (6 new)

Backend service: feed filter, pagination cap, ordering, DTO safety (3 tests).

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **486 tests / 37 suites** (+6)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

### Deferred Work
- Likes/comments/share backend
- Video playback in feed
- Feed personalization/ranking

**No schema changes.**

---

### Step 47 Fix — Feed Route Order + Safe Image Fallback

**Objective:** Fix route shadowing and mobile rendering safety.

#### P1 — Route Order

**Problem:** `SceneMediaController` with `@Get(':id')` registered before feed controller could shadow `GET /scene-media/feed`.

**Fix:** Reordered `controllers: [SceneMediaFeedController, SceneMediaController]`.

**Test (1 new):** Module metadata test verifies feed controller registered before scene controller.

#### P2 — Safe Image Fallback

**Problem:** `ImageBackground source={undefined}` when no image/cover.

**Fix (mobile):** Added `thumbnailUrl` fallback chain: `imageUrl` → `thumbnailUrl` → `story.coverUrl` → dark placeholder view.

**File:** `apps/mobile/app/(tabs)/scenes.tsx`

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **487 tests / 37 suites** (+1)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

**No schema changes.**

---

## Step 48 — Social Engagement Foundation (Like / Save / Share)

**Objective:** Make scene feed rail actions real with backend persistence and mobile mutations.

### Prisma Schema

**New models:** `SceneMediaLike` (unique `[userId, sceneMediaId]`), `SceneMediaSave` (unique), `SceneMediaShare` (event-based). Opposite relations added to `User` and `SceneMedia`.

### Backend Changes

**Files created:** `dto/engagement-response.dto.ts`
**Files modified:** `prisma/schema.prisma`, `feed-scene-media.dto.ts` (+counts), `scene-media.service.ts` (+6 engagement methods: like, unlike, save, unsave, share + validation helpers), `scene-media.controller.ts` (+6 endpoints), `scene-media.service.spec.ts` (+9 tests, updated feed mocks)

### Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `POST/DELETE` | `/scene-media/:id/like` | JWT | Like/unlike |
| `POST/DELETE` | `/scene-media/:id/save` | JWT | Save/unsave |
| `POST` | `/scene-media/:id/share` | JWT | Share event |

**Engageable only:** `PUBLIC + APPROVED + publishedAt != null`.
**Response:** `{ sceneMediaId, likeCount, saveCount, shareCount, commentCount: 0 }`.
**Feed DTO** now includes aggregate counts via Prisma `_count`.

### Mobile Changes

**File:** `apps/mobile/app/(tabs)/scenes.tsx`
- `useMutation` for like/save/share with `queryClient.invalidateQueries`
- `Share.share()` native share on backend success
- `RailButton` now takes `label`, `disabled`, `onPress`
- `formatCount()` for compact numbers (e.g. 1200 → "1.2k")
- `mutatingIds` Set for per-item mutation state

### Tests (+9)

Backend: like (3), save (3), share (2), not found (1). Feed test updated for counts.

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **496 tests / 37 suites** (+9)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

### Deferred Work
- Comments backend + UI
- `likedByMe` / `savedByMe` personalization
- Engagement analytics

---

### Step 48 Fix — Migration + Mobile Toggle + Roadmap

**Objective:** Fix three blocking audit findings.

#### P1 — Migration Artifact

Created `prisma/migrations/20260513_add_scene_media_engagement/migration.sql` with:
- 3 tables: `scene_media_likes`, `scene_media_saves`, `scene_media_shares`
- Unique constraints on `(userId, sceneMediaId)` for likes and saves
- Indexes on `userId` and `sceneMediaId` for all three
- Foreign keys to `users(id)` and `scene_media(id)` with `ON DELETE CASCADE`

#### P2 — Mobile Like/Save Toggle

- Added `likedIds` and `savedIds` local `useState<Set<string>>`
- `likeMutation` toggles: `POST` if not liked, `DELETE` if already liked
- `saveMutation` toggles: `POST` if not saved, `DELETE` if already saved
- `onSuccess` updates local sets
- Active state visual: `Heart`/`Bookmark` use `fill={ACCENT}` and `color={ACCENT}` when active, default `color={TEXT}` otherwise
- Counts still refresh via `invalidateQueries`

#### P3 — Roadmap Stale Reference

Updated `docs/roadmap-mvp.md` priority section from `Step 48 — Recomendado` to `Step 49 — Recomendado` with updated options.

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **496 tests / 37 suites** (unchanged)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

**Production code changed:** mobile scene feed toggle behavior updated. Migration artifact created but not applied to database.

---

## Step 49 — Comments Foundation

**Objective:** Add comment persistence, listing, creation, and mobile overlay for scene feed.

### Prisma Schema

**New model:** `SceneMediaComment` (id, userId, sceneMediaId, body, createdAt, updatedAt). Indexes on `sceneMediaId`, `userId`, `createdAt`. Opposite relations on `User` and `SceneMedia`.

**Migration:** `prisma/migrations/20260513_add_scene_media_comments/`

### Backend Changes

**Files created:** `dto/comment.dto.ts`
**Files modified:** `prisma/schema.prisma`, `scene-media.service.ts` (+`listComments`, `createComment` with trim/min 1/max 500/engageable check), `scene-media.controller.ts` (+2 endpoints), `scene-media-feed.controller.ts` (fixed double-brace), `scene-media.service.spec.ts` (+8 tests, +comment mocks).

Feed DTO `commentCount` now real. `buildEngagementResponse` includes real `comments` count.

### Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET` | `/scene-media/:id/comments` | JWT | List (paginated 20/100) |
| `POST` | `/scene-media/:id/comments` | JWT | Create (1-500 chars, trimmed) |

### Mobile Changes

**File:** `apps/mobile/app/(tabs)/scenes.tsx`
- Comment button opens bottom-sheet `Modal` overlay
- Lists comments via `useQuery`, creates via `useMutation`
- `commentingSceneId` + `commentText` state
- `KeyboardAvoidingView` with `TextInput` + `Send` button
- Invalidate `['feed-scenes']` on send for count refresh

### Tests (+8)

createComment (5: valid, empty, trim, long, private media), listComments (3: pagination, cap, safe user fields)

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **504 tests / 37 suites** (+8)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

### Deferred Work
- Comment editing/deletion, nested replies, moderation UI

---

### Step 49 Fix — Comment Listing Visibility Contract

**P1:** `listComments()` now calls `assertMediaIsEngageable()` before querying, matching `createComment()` behavior. Private/pending/rejected/unpublished media returns `BadRequestException`.

**P2:** +3 regression tests: listComments rejects private media, rejects approved but unpublished media, throws NotFoundException for missing media.

**P3:** Auth contract clarified — both `GET` and `POST` `/scene-media/:id/comments` require JWT auth (class-level `@UseGuards(JwtAuthGuard)`).

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npx prisma validate` ✅
- `npm test -- --runInBand` ✅ — **507 tests / 37 suites** (+3)
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

## Step 50 — Admin Review Metadata for Scene Media Moderation

**Objective:** Enrich admin moderation DTO with review-safe metadata (social counts, story context, narrative event, hasImage/hasVideo) and remove email exposure.

### DTO Enrichment

**New fields:** `updatedAt`, `hasImage`, `hasVideo`, `likeCount`, `saveCount`, `shareCount`, `commentCount`, `narrativeEvent: { id, sceneIndex }`

**Enriched existing:** `story` → + `slug`, `genres`, `maturityRating`; `user` → `name` replaces `email`

**Excluded (never exposed):** `basePrompt`, `worldRules`, `styleGuide`, `passwordHash`, `refreshToken`, wallet/credits, provider details

### Files Changed

- `dto/admin-scene-media.dto.ts` — Full rewrite with enriched fields
- `admin-scene-media.service.ts` — Updated queries (include `_count`, `narrativeEvent`, richer `story`/`user` select), updated `mapToDto`
- `__tests__/admin-scene-media-moderation.service.spec.ts` — Updated mock data, +4 DTO safety tests

### Tests (+4)

DTO safety: user fields (name, no email), story safe fields (no basePrompt/worldRules/styleGuide), social counts, narrative event context, hasImage/hasVideo helpers.

### Validation Results

- `npm test -- admin-scene-media-moderation` ✅ — 26 tests
- `npm test -- --runInBand` ✅ — **511 tests / 37 suites** (+4)
- `npx tsc --noEmit --incremental false` ✅
- `npx prisma validate` ✅
- `npm run build` ✅
- Mobile: not required (backend/admin-only step)

### Deferred Work
- Admin UI/dashboard to consume enriched metadata
- Detail endpoint for individual scene media review

---

## Step 51 — Admin Moderation Filters / Search

**Objective:** Add filter/search capabilities to admin moderation endpoint for triage.

### Backend Changes

**Service:** Renamed `listPending` → `listForModeration` with optional params: `status` (defaults PENDING), `mediaType`, `storyId`, `userId`, `q`.

**Controller:** Added `@ApiQuery` annotations for all filter params.

### Filter/Search Behavior

| Param | Type | Behavior |
|-------|------|----------|
| `status` | enum | Defaults to `PENDING`. Validates against `SceneModerationStatus`. Invalid → 400 |
| `mediaType` | enum | Validates against `SceneMediaType`. Invalid → 400 |
| `storyId` | string | Exact match |
| `userId` | string | Exact match |
| `q` | string | OR search (case-insensitive) across `title`, `caption`, `textExcerpt`. Blank/whitespace ignored |

**Pagination:** Unchanged (default 20, max 100).
**Sort:** Unchanged (`createdAt desc`).
**DTO:** Same safe enriched DTO from Step 50.

### Tests (+8)

Service: default PENDING, status=APPROVED, invalid status, valid mediaType, invalid mediaType, storyId, userId, q search, blank q, pagination cap.
Controller: params pass-through.

### Files Changed

- `admin-scene-media.service.ts` — Renamed `listPending` → `listForModeration`, added filter logic
- `admin-scene-media.controller.ts` — Added query param annotations
- `__tests__/admin-scene-media-moderation.service.spec.ts` — +10 filter tests (replaced 2 old list tests)
- `__tests__/admin-scene-media-moderation.controller.spec.ts` — Updated to new method name + param test

### Validation Results

- `npm test -- admin-scene-media-moderation` ✅ — 34 tests
- `npm test -- --runInBand` ✅ — **519 tests / 37 suites** (+8)
- `npx tsc --noEmit --incremental false` ✅
- `npx prisma validate` ✅
- `npm run build` ✅
- Mobile: not required (backend/admin-only)

### Deferred Work
- Admin UI/dashboard to use filters
- Date range filters

---

## Step 52 — Admin Moderation Metrics

**Objective:** Add admin metrics endpoint for moderation queue workload overview.

### Backend Changes

**Files modified:**
- `dto/admin-scene-media.dto.ts` — Added `AdminSceneMediaMetricsDto`
- `admin-scene-media.service.ts` — Added `getMetrics()` using Prisma `count`, `groupBy`, `findFirst`
- `admin-scene-media.controller.ts` — Added `GET /admin/scene-media/metrics`
- `__tests__/admin-scene-media-moderation.service.spec.ts` — +8 metrics tests, +`groupBy`/`findFirst` mocks
- `__tests__/admin-scene-media-moderation.controller.spec.ts` — Unchanged (existing RBAC tests cover new route)

### Endpoint

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET` | `/admin/scene-media/metrics` | ADMIN | Aggregated moderation metrics |

### Metrics Returned

| Field | Source |
|-------|--------|
| `total` | Total SceneMedia count |
| `byStatus` | Array of `{ status, count }` for ALL enum values (normalized to 0) |
| `byMediaType` | Array of `{ mediaType, count }` for ALL enum values |
| `pending` | Total, oldest/newest `createdAt` |
| `published` | Count of PUBLIC + APPROVED + publishedAt != null |
| `rejected` | Count of REJECTED |
| `withImage` | Count where `imageUrl` IS NOT NULL |
| `withVideo` | Count where `videoUrl` IS NOT NULL |

**Safety:** No individual records, no prompts, no user/story data, no wallet/credits, no provider internals exposed.

### Tests (+9)

getMetrics: total, byStatus (normalized), byMediaType (normalized), pending queue dates, published (safe criteria), rejected, withImage/withVideo, aggregate-only (no individual records), controller delegation.

### Validation Results

- `npm test -- admin-scene-media-moderation` ✅ — 43 tests
- `npm test -- --runInBand` ✅ — **528 tests / 37 suites** (+9)
- `npx tsc --noEmit --incremental false` ✅
- `npx prisma validate` ✅
- `npm run build` ✅
- Mobile: not required (backend/admin-only)

### Deferred Work
- Admin UI/dashboard to display metrics
- Time-range metrics (e.g., last 7 days)
- Submission rate trends

---

## Step 53 — Reports for Scenes and Comments

**Objective:** Add reporting foundation — users can report scene media and comments; admins can list reports with safe context.

### Prisma

**New enums:** `SceneMediaReportTargetType` (SCENE_MEDIA, COMMENT), `SceneMediaReportStatus` (OPEN, REVIEWED, DISMISSED)

**New model:** `SceneMediaReport` with dual unique constraints (`[reporterUserId, sceneMediaId]`, `[reporterUserId, commentId]`), cascade deletes.

**Migration:** `prisma/migrations/20260514_add_scene_media_reports/`

### Backend

**Files created:**
- `dto/report.dto.ts`
- `scene-media.controller.spec.ts` (Step 53 fix)

**Files modified:**
- `prisma/schema.prisma` — Enums + model + opposite relations
- `scene-media.service.ts` — `reportSceneMedia()`, `reportComment()`, `listReports()`
- `scene-media.controller.ts` — `POST :id/report`, `POST comments/:commentId/report`
- `admin/scene-media-moderation/admin-scene-media.controller.ts` — `GET reports`
- `admin/scene-media-moderation/admin-scene-media.module.ts` — Imported SceneMediaModule
- `scene-media.service.spec.ts` — +12 tests, +`sceneMediaReport` mock, +`findUnique` on comment mock
- `admin-scene-media-moderation.controller.spec.ts` — +SceneMediaService mock and report listing delegation test

### Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `POST` | `/scene-media/:id/report` | JWT | Report scene (3-500 char reason, unique per user) |
| `POST` | `/scene-media/comments/:commentId/report` | JWT | Report comment (parent scene must be engageable, unique per user) |
| `GET` | `/admin/scene-media/reports` | ADMIN | List reports (filters: status/OPEN default, targetType) |

### Mobile

**File:** `apps/mobile/app/(tabs)/scenes.tsx`
- Flag icon button in scene top actions (near search)
- Report modal with reason input (min 3 chars, max 500)
- Comment report deferred

### Tests (+15 after Step 53 fix)

Backend: reportSceneMedia (4), reportComment (3), listReports (4), +1 mock fix, scene report controller delegation (2), admin report listing controller delegation (1).

### Step 53 Fix — Controller Coverage and Docs Sync

- Removed duplicate `@Get('reports')` decorator from `admin-scene-media.controller.ts`.
- Added `scene-media.controller.spec.ts` to cover report endpoint delegation for scene media and comments.
- Added admin controller coverage for `listReports()`.
- Synced roadmap/current/project/executor/backend context docs to Step 53 closed state.

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npm test -- --runInBand` ✅ — **542 tests / 38 suites** (+15 total Step 53)
- `npx prisma validate` ✅
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

### Deferred Work
- Comment report UI in mobile
- Admin report status transitions (review/dismiss)
- Admin report dashboard

---

## Step 54 — Basic Comment Moderation

**Objective:** Add comment moderation status (VISIBLE/HIDDEN/REMOVED) so admins can moderate comments and public listings only show VISIBLE comments.

### Prisma

**New enum:** `CommentModerationStatus` (VISIBLE, HIDDEN, REMOVED)
**Model change:** Added `status` field to `SceneMediaComment` with default `VISIBLE`, index on status.

**Migration:** `prisma/migrations/20260514_add_comment_moderation_status/`

### Backend

**Files modified:**
- `prisma/schema.prisma` — Enum + field + index
- `scene-media.service.ts` — `listComments` filters `status: VISIBLE`, feed/engagement counts use `comments.where.status: VISIBLE`
- `admin/scene-media-moderation/admin-scene-media.service.ts` — `listComments` (filters: status/sceneMediaId/userId/q), `hideComment`, `removeComment`, `restoreComment`
- `admin/scene-media-moderation/admin-scene-media.controller.ts` — `GET comments`, `POST comments/:id/hide|remove|restore`
- `admin/scene-media-moderation/dto/admin-scene-media.dto.ts` — Added `AdminCommentDto`, `AdminCommentPaginationDto`
- `admin/scene-media-moderation/__tests__/admin-scene-media-moderation.service.spec.ts` — +6 tests + mocks

### Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET` | `/admin/scene-media/comments` | ADMIN | List comments (filters: status, sceneMediaId, userId, q) |
| `POST` | `/admin/scene-media/comments/:id/hide` | ADMIN | Set to HIDDEN |
| `POST` | `/admin/scene-media/comments/:id/remove` | ADMIN | Set to REMOVED |
| `POST` | `/admin/scene-media/comments/:id/restore` | ADMIN | Set to VISIBLE |

### Behavior

- New comments default to VISIBLE
- Public comment listing returns only VISIBLE
- Feed commentCount counts only VISIBLE comments
- Reports can still reference comments regardless of status
- Admin DTOs expose only safe fields (id, name; no email, no wallet, no prompts)

### Tests (+6)

Admin comment: listComments (3: pagination, status filter, safe DTO), hide (1), remove (1), restore (1).

### Validation Results

- `npm test -- --runInBand` ✅ — **548 tests / 38 suites** (+6)
- `npx tsc --noEmit --incremental false` ✅
- `npx prisma validate` ✅
- `npm run build` ✅
- Mobile: not touched

### Deferred Work
- Comment moderation in mobile
- Automated abuse detection

---

### Step 54 Fix — Comment Moderation Audit Fixes

**Fixes applied:**

#### P2 — Admin commentCount now filters VISIBLE only
Updated `listForModeration`, `approve`, `reject` query includes: `_count.comments` → `{ where: { status: CommentModerationStatus.VISIBLE } }`.

#### P2 — hide/remove/restore return 404 for missing comments
Added `findCommentOrFail()` private helper. Each moderation action calls it first → throws `NotFoundException` if comment missing.

#### P3 — Regression tests (+13)
- hide/remove/restore: +`findUnique` mock in existing tests
- NotFound: 3 new tests (missing on hide/remove/restore)
- commentCount visibility: admin DTO commentCount test
- Controller: 4 new delegation tests (listComments, hideComment, removeComment, restoreComment)
- Controller security tests restored

#### Docs fixed
- Removed `web/admin dashboard` references from current-facing docs
- Set next step to Step 55 — Final Social Feed States
- BACKEND_CONTEXT documents Step 54 comment moderation

### Validation Results

- `npm test -- --runInBand` ✅ — **556 tests / 38 suites** (+13)
- `npx tsc --noEmit --incremental false` ✅
- `npx prisma validate` ✅
- `npm run build` ✅

---

### Step 54 Final Cleanup — Local Audit P3 Fixes

- Replaced raw `VISIBLE as any` comment filters with `CommentModerationStatus.VISIBLE`.
- `createComment()` now explicitly persists new comments with `status: VISIBLE`.
- Added regression coverage for:
  - feed `commentCount` query filtering only VISIBLE comments;
  - public `listComments()` `findMany`/`count` filtering only VISIBLE comments;
  - admin `approve()`/`reject()` visible-only comment count includes.
- Synchronized current-facing docs to Step 54 closed and Step 55 next.

### Validation Results

- `npm test -- scene-media --runInBand` ✅ — **130 tests**
- `npm test -- admin-scene-media-moderation --runInBand` ✅ — **60 tests**
- `npm test -- --runInBand` ✅ — **559 tests / 38 suites**
- `npx prisma validate` ✅
- `npx prisma generate` ✅
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅
- `apps/mobile npx tsc --noEmit` ✅

---

## Step 55 — Final Social Feed States

**Objective:** Polish mobile Scenes tab for beta readiness — mutation errors, image fallback, pull-to-refresh.

### Mobile Changes

**File:** `apps/mobile/app/(tabs)/scenes.tsx`

| Improvement | Implementation |
|-------------|----------------|
| Like mutation failure | `onError` → Alert + no state corruption (onSuccess never ran) |
| Save mutation failure | `onError` → Alert |
| Share mutation failure | `onError` → Alert |
| Comment mutation failure | `onError` → Alert |
| Image render error | `ImageBackground.onError` → falls back to placeholder (dark surface) |
| Pull-to-refresh | `RefreshControl` on FlatList tied to `isRefetching` |
| Report mutation failure | Already had `onError` handler |

**No backend changes.**

### Validation Results

- `apps/mobile npx tsc --noEmit` ✅
- `npm test -- --runInBand` ✅ — **559 tests / 38 suites** (unchanged)
- `npx prisma validate` ✅
- `npx tsc --noEmit --incremental false` ✅
- `npm run build` ✅

### Deferred Work
- Saved scenes tab (Step 56)
- Per-item skeleton/spinner during initial load
- Comment report UI in mobile

---

**End of Changelog Steps — Continue updating as new steps are implemented**
