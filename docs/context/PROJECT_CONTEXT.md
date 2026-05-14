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
- **Backend Tests:** 559 tests / 38 suites passing
- **Backend TypeScript:** Passing (`npx tsc --noEmit --incremental false`)
- **Prisma Schema:** Valid (`npx prisma validate`)
- **Mobile TypeScript:** Passing (`npx tsc --noEmit` in `apps/mobile`)
- **Build:** Passing (`npm run build`)

**Next Probable Step:** **Step 56 — Saved Scenes Screen/Tab**
- Focus: saved/bookmarked scenes tab or screen.
- Step 55 is closed after final social feed state polish.

---

## Project Overview

**Product Name:** Enredo.ai  
**Domain:** enredo.ai  
**Category:** AI interactive storytelling  
**Tagline:** Histórias que mudam com você.

**Core Concept:** Enredo is a web/mobile platform for AI-guided interactive stories. The experience should feel like a **library of living stories**, not a generic chatbot. Users choose a story, read scenes in narrative format, and steer the plot through AI-suggested choices or free-form actions.

**Product Vision Evolution:** Enredo.ai should evolve into a **curated library + community creation engine + social audiovisual layer**. MVP focuses on curated/admin library for quality, predictable cost, and moderation. Future phases allow users to create private stories via keywords, generate media with AI, publish scenes to social feed, and submit stories for community/library after moderation.

**Reference Concept:** Emochi/AI character apps, but Enredo.ai focuses on library, reading, narrative progress, story state, open choices, persistent context, social feed, and cinematic visual identity.

---

## Where to Find Details

| Topic | File |
|-------|------|
| Current validation status, test counts, next step priority | [CURRENT_STATE.md](./CURRENT_STATE.md) |
| Product vision, business model, monetization, roadmap | [PRODUCT_VISION.md](./PRODUCT_VISION.md) |
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
