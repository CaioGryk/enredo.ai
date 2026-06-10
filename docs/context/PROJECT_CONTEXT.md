# Project Context — Enredo.ai

**Purpose:** This file serves as the living context for any AI agent working on the project. It provides a quick snapshot and points to detailed context files.

---

## Quick Snapshot for New Agents

**Project Status:** Backend progressing toward usable beta, focused on interactive reading, mobile/backend contract, credit billing, and scene media generation.

**Agent Workflow (Supervised Flow):**
- **Codex** acts as architect/supervisor/auditor
- **OpenCode/Antigravity/Gemini** acts as code executor
- Every executor must inspect real files before editing
- Every relevant change must update the appropriate context file in `docs/context/`
- After execution, Codex audits the repository directly

**Golden Rule for Executors:**
> Do NOT restart architecture from scratch. Work must continue from the current repository state.

Before implementing any new step:
1. Read this snapshot
2. Read the most recent step section in [CHANGELOG_STEPS.md](./CHANGELOG_STEPS.md)
3. Inspect related real files
4. Search for partial work with `rg`
5. Implement narrow scope
6. Run safe validations
7. Update the appropriate context file with real results

---

## Current State (High Level)

See [CURRENT_STATE.md](./CURRENT_STATE.md) for detailed validation status, test counts, and the current next-step priority.

**Quick Status:**
- **Backend Tests:** 907 tests / 53 suites passing
- **Backend TypeScript:** Passing (`npx tsc --noEmit --incremental false`)
- **Prisma Schema:** Valid (`npx prisma validate`)
- **Mobile TypeScript:** Passing (`npx tsc --noEmit` in `apps/mobile`)
- **Build:** Passing (`npm run build`)
- **Character Portrait Provider Decision:** Cloudflare Workers AI / `@cf/black-forest-labs/flux-1-schnell` is the planned primary no-cost MVP portrait provider; Google image generation is optional/fallback only.
- **Free LLM Provider Chain:** Groq primary (`groq/free`), OpenRouter DeepSeek fallback, Google Gemini fallback; explicit free model requests are respected first.
- **Adult Narrative Preferences:** Backend preferences, mobile Profile/Settings UI, private reading prompt integration, and MVP public feed/moderation guardrails implemented.
- **Beta Catalog:** Current Supabase beta catalog has 15 public/approved/visible ICP-aligned AI-generated stories for closed-beta QA: 10 romance/dark-romance-soft/power/mystery hooks + 5 fantasy/romantasy hooks. The published batch has 45 premises, 45 premise covers, 45 first-premise playable characters, 45 character portraits, and 15 direct story covers backfilled from first-premise covers.
- **Image Quota UX:** Cloudflare credentials were validated, and Replicate is available as an additional configured fallback. Mobile library/premise/character screens still render polished procedural fallback art when provider images are unavailable, keeping QA unblocked if future image generation fails.
- **Library Image Contract:** `/library/stories` maps the first premise cover as `coverUrl` fallback when a story has no direct cover, and the current beta batch also has persisted `Story.coverUrl` values for Story Detail and other direct story surfaces. Local preview/API expose the 15-story beta catalog with `database: ok`.
- **Day 3 Functional QA:** Main playable flow passed in preview: login, Library, Story Detail, Premise, Character, Reader start, and three real Groq-backed choices. Profile/preferences/upgrade/scenes empty states also loaded. Web preview logout was fixed.
- **Mobile Auth Stability:** The mobile API client serializes refresh-token renewal and proactively refreshes near-expired JWTs, so parallel/expired-token calls no longer race and clear local tokens during `reading/start` / `reading/sessions`.
- **Story Codex:** Narrative memory now has an explicit `codex` migration, records the generated first scene in the codex timeline, and continuation generation uses the session-selected premise and character to avoid context drift.
- **Real DB Alignment:** Supabase is the active beta database provider. The June 9 local shell check passed (`check:prisma-connect`, `check:local`, and `/api/health` with `database: ok`). `narrative_memories.codex` exists as `jsonb`, and Prisma migration history is aligned/up to date when using the Supabase Session Pooler for migration/admin operations. Neon was evaluated as a lower-cost alternative and deferred for now.

**Next Probable Step:** Prepare the closed-beta cloud path with Railway API + Supabase database, then run final provider-real QA before **Step 98 — Real User Round**.

**Step 89 Status:** Final beta monetization policy is documented. Premium, credits, mock/dev purchases, admin grants, refunds/expiration deferrals, and heavy media costs are explicit; real Stripe/IAP and production billing remain deferred.

---

## Project Overview

**Product Name:** Enredo.ai  
**Domain:** enredo.ai  
**Category:** AI interactive storytelling  
**Tagline:** Histórias que mudam com você.

**Core Concept:** Enredo is a web/mobile platform for AI-guided interactive stories. The experience should feel like a **library of living stories**, not a generic chatbot. Users choose a story, read scenes in narrative format, and steer the plot through AI-suggested choices or free-form actions.

**Product Vision Evolution:** Enredo.ai should evolve into a **curated library + community creation engine + social audiovisual layer**. MVP focuses on curated/admin library for quality, predictable cost, and moderation. Future phases allow users to create private stories via keywords, play them, generate scene images/videos, publish selected scene media to the social feed, and have high-engagement stories become candidates for the public library after admin/editorial review. The required like/engagement threshold is intentionally still to be defined.

**Reference Concept:** Emochi/AI character apps, but Enredo.ai focuses on library, reading, narrative progress, story state, open choices, persistent context, social feed, and cinematic visual identity.

---

## Where to Find Details

| Topic | File |
|-------|------|
| Current validation status, test counts, next step priority | [CURRENT_STATE.md](./CURRENT_STATE.md) |
| Product vision, business model, monetization, roadmap | [PRODUCT_VISION.md](./PRODUCT_VISION.md) |
| Adult narrative policy and implementation boundaries | [../content-adult-policy.md](../content-adult-policy.md) |
| Architecture principles, stack, project structure | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Backend modules, APIs, entities, current state | [BACKEND_CONTEXT.md](./BACKEND_CONTEXT.md) |
| Mobile stack, screens, UI/UX, flows | [MOBILE_CONTEXT.md](./MOBILE_CONTEXT.md) |
| Engineering rules, code patterns, SOLID | [ENGINEERING_RULES.md](./ENGINEERING_RULES.md) |
| Safe vs destructive commands, operations, admin seed | [OPERATIONAL_RULES.md](./OPERATIONAL_RULES.md) |
| Product roadmap (MVP → Fase 4) | [ROADMAP.md](./ROADMAP.md) |
| Known risks, technical debt, limitations | [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) |
| Complete historical step log (Steps 1-42+) | [CHANGELOG_STEPS.md](./CHANGELOG_STEPS.md) |

---

## Central Principles

Every decision must preserve this idea:

> The Enredo.ai must feel like a library of living interactive stories, not a character chat.

If an implementation moves the product toward a generic chatbot, it must be revised.

Also applies:

> User-created stories are private first, moderated before generation/publication, and only enter the community after approval.

> Premise and character are initial context for an open narrative, not fixed "paths."

> The product visual identity should look like a modern AI + narrative + social app, not an old library or medievalized app by default.

---

## Useful Commands

**Backend:**
```sh
cd /Users/mac/Documents/Projetos/enredo.ai/services/api
npm run build
npm run prisma:generate
npx prisma validate
npm run dev
npm test -- --runInBand
```

**Swagger:**
```
http://localhost:3001/api/docs
```

**Mobile:**
```sh
cd /Users/mac/Documents/Projetos/enredo.ai/apps/mobile
npx tsc --noEmit
npx expo export --platform web --output-dir dist-preview-vX
npx serve -s dist-preview-vX -l 8099
```

---

**Last Updated:** See individual context files for their specific update timestamps.
