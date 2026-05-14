# Architecture — Enredo.ai

**Purpose:** Architecture principles, technology stack, and project structure.

---

## Core Architectural Principles

### 1. Separation of Concerns
| Component | Responsibility |
|-----------|---------------|
| `ReadingService` | Thin facade (delegation only) |
| `ReadingOrchestratorService` | Business logic |
| `GenerationBudgetGuard` | Budget enforcement |
| `StoryQualityService` | Validation (reusable across modules) |
| `StoryLifecycleService` | Story lifecycle management |

### 2. Fail Fast Validation
- Validate early, throw fast
- `StoryQualityService.validateStoryQuality()` blocks before generation/reading
- Clear error messages with `issues` array

### 3. Single Source of Truth
- Model catalog in `model-catalog.ts`
- Quality rules in `StoryQualityService`
- No duplication of validation logic

### 4. Additive Evolution
- No breaking changes to API contracts
- New modules (`story-quality/`, `story-lifecycle/`, `scene-media/`) added without disrupting existing flows
- Backward compatible

### 5. Strict Access Control
- Private stories: creator-only access
- premiseId leakage fixed: validates `story.creatorUserId`
- USER_GENERATED: validation before generation
- ADMIN/PUBLIC+APPROVED: bypass validation

### 6. Clean Architecture Dependency Rule
Outer layers depend on inner layers:
- UI frameworks (SwiftUI, Jetpack Compose, React Native) never contain business logic
- Domain models remain platform-agnostic
- Data layer dependencies never leak into ViewModels/ViewControllers

### 7. Dependency Injection
- Proper DI implementation (Hilt/Dagger pattern in NestJS)
- No circular dependencies between modules or features
- Use Cases/Interactors have no knowledge of UI or data implementation details

---

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| NestJS | Framework |
| TypeScript | Language |
| Prisma | ORM |
| Supabase Postgres | Database |
| JWT | Authentication |
| Swagger | API Documentation (`/api/docs`) |

### Database
- **Provider:** Supabase Postgres
- **Prisma Configuration:**
  - `DATABASE_URL` for runtime
  - `DIRECT_URL` for migrations/db push

### Infrastructure (Local)
- **Docker:** Optional, not required for MVP
- **Backend:** Run directly with `npm run dev` in `services/api`
- **Main DB:** Supabase Postgres
- Docker/compose may remain in repo as future option but is not a blocker

### AI / LLM
- **Gateway:** Custom LLM gateway in backend
- **Providers:**
  - OpenRouter
  - OpenAI
  - Anthropic
- **Model Tiers:**
  - `FREE`: OpenRouter/free or very low cost (default)
  - `PREMIUM`: gpt-4.1-nano (default)
  - `CREDITS`: claude-3-5-sonnet-20241022 (expensive)
- **Mock Mode:** `LLM_MOCK_MODE=true` for functional tests without real LLM calls

### Frontend (Mobile)
- **Framework:** Expo Router + React Native
- **State Management:** React Query
- **Web Preview:** `expo export --platform web`
- **Theme:** Dark cinematic, mobile-first, modern, lavender/purple accent

---

## Project Structure

```
/Users/mac/Documents/Projetos/enredo.ai
├── README.md
├── CONTEXTO_PROJETO.md (legacy - will become index)
├── docs/
│   ├── arquitetura-inicial.md
│   ├── decisoes-tecnicas.md
│   ├── modelo-dados-e-monetizacao.md
│   ├── prompts-agentes.md
│   ├── roadmap-mvp.md
│   ├── supabase-prisma.md
│   └── context/              # NEW: Modular context files
│       ├── PROJECT_CONTEXT.md
│       ├── CURRENT_STATE.md
│       ├── PRODUCT_VISION.md
│       ├── ARCHITECTURE.md
│       ├── BACKEND_CONTEXT.md
│       ├── MOBILE_CONTEXT.md
│       ├── ENGINEERING_RULES.md
│       ├── OPERATIONAL_RULES.md
│       ├── ROADMAP.md
│       ├── KNOWN_ISSUES.md
│       └── CHANGELOG_STEPS.md
├── services/
│   └── api/
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   └── modules/
│       │       ├── auth/
│       │       ├── library/
│       │       ├── reading/
│       │       ├── ai/
│       │       ├── billing/
│       │       ├── moderation/
│       │       ├── health/
│       │       ├── story-setup/
│       │       ├── story-lifecycle/
│       │       ├── story-quality/
│       │       ├── story-generation/
│       │       ├── scene-media/
│       │       └── admin/
│       ├── package.json
│       ├── jest.config.js
│       └── .env.example
├── apps/
│   ├── web/
│   └── mobile/               # React Native + Expo
├── packages/
├── infra/
└── scripts/
```

---

## Module Responsibilities

### auth
- JWT authentication
- Refresh tokens
- User identity validation

### library
- Public story catalog
- Story discovery and search

### reading
- Reading sessions (ACTIVE/COMPLETED/ABANDONED)
- Interactive scene generation
- Narrative memory management
- Reading orchestration

### ai
- LLM gateway
- Model catalog and tier management
- Provider abstraction (OpenRouter, OpenAI, Anthropic)
- Prompt engineering

### billing
- Credit wallet management
- Credit transactions (ledger)
- Subscription handling

### moderation
- Content moderation
- Prompt injection detection

### health
- Health checks
- Status endpoints

### story-setup
- Premise generation and caching
- Playable character generation
- Access validation

### story-lifecycle
- Story creation lifecycle
- Status transitions (PRIVATE → SUBMITTED → APPROVED/REJECTED)
- Moderation workflow

### story-quality
- Quality validation for USER_GENERATED stories
- Blocking: title ≥5, synopsis ≥20, genres ≥1, openingScene ≥30
- Warnings: tone, styleGuide, worldRules

### story-generation
- AI-powered story generation from keywords
- Budget guards for generation
- Input validation and sanitization
- Usage tracking

### scene-media
- Scene media lifecycle (PLACEHOLDER → AI_GENERATED → USER_UPLOADED)
- Image generation with credit spend
- Video generation scaffolding (deferred real provider)

### admin
- RBAC (Role-Based Access Control)
- Admin-only endpoints
- Usage observability and metrics
- Audit logs

---

## Key Services Reference

| Service | Location | Purpose |
|---------|----------|---------|
| ReadingService | `reading/reading.service.ts` | Facade for reading operations |
| ReadingOrchestratorService | `reading/reading-orchestrator.service.ts` | Core reading business logic |
| NarrativeEngineService | `reading/narrative/narrative-engine.service.ts` | AI scene generation |
| NarrativeContextBuilder | `reading/narrative/narrative-context.builder.ts` | Context construction |
| GenerationBudgetGuard | `reading/application/generation-budget.guard.ts` | Budget enforcement |
| AiService | `ai/ai.service.ts` | LLM gateway |
| BillingService | `billing/billing.service.ts` | Credit operations |
| StoryQualityService | `story-quality/story-quality.service.ts` | Quality validation |
| StoryLifecycleService | `story-lifecycle/story-lifecycle.service.ts` | Story lifecycle |
| StoryGenerationService | `story-generation/story-generation.service.ts` | AI story generation |
| SceneMediaService | `scene-media/scene-media.service.ts` | Media management |
| AdminSceneMediaService | `admin/scene-media-moderation/admin-scene-media.service.ts` | Moderation review (Step 46) |

### admin
- RBAC (Role-Based Access Control)
- Admin-only endpoints
- Usage observability and metrics
- Scene media moderation: list pending, approve, reject

---

**Last Updated:** After Step 47
