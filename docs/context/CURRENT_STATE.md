# Current State — Enredo.ai

**Purpose:** Current validation status, test coverage, and immediate next step priority.

---

## Validation Status

### Backend
| Check | Status | Command |
|-------|--------|---------|
| Tests | ✅ 907 tests / 53 suites passing | `npm test -- --runInBand` |
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
| Infra Fix | `normalizeRuntimeDatabaseUrl()` now preserves explicit Supabase pooler params such as `connection_limit=5`; Codex sandbox cannot be used as source of truth for external Supabase reachability |
| Step 98j | Escaped quote normalization hardened: external wrappers stripped and escaped internal dialogue quotes render as normal dialogue quotes |
| Step 98f | Beta QA Blocker Fixes (4 issues: characters, quotes, POV, images) |
| Step 98e | Reader Orphan Action / Missing Current Scene Recovery |
| Step 98d | Interactive Reader Narrative Behavior Tuning (prompts + sceneInstructions) |
| Step 98c | Narrative Memory Hardening / Story Codex |
| Steps 43-89 | Monetization, video, media cost, QA prep (see CHANGELOG) |
| Steps 90-96 | QA + Launch: Visual Review, Performance, Copy, Terms, New User Flow, QA, Final Fixes |
| Step 97 | Closed Beta Preparation |
| P1 Fix | Character Portraits + Cloudflare Provider + Free LLM Fallback |
| P1 Fix | Adult Narrative Preferences (Steps 1-4) |
| P1 Fix | Provider-Real QA: character JSON repair, currentScene.userAction |
| Fix | Beta Catalog Real Content: isBetaVisible, premise cover backfill, legacy hide script |
| Content Ops | Beta catalog populated with 10 AI-generated public stories |
| Step 98 | Reader V2 — Timeline de Mensagens (Chat-like) |
| Step 98 Fix | Reader V2 — Timeline Ordering, Image Preview, Progress, Icon |
| Step 99 | Library Redesign — Google AI Studio Reference |
| Fix | Library — Fallback Art, Honest Sections, Empty Search |
| Redesign | Story Detail + Premise + Character (Google AI Studio) |
| Beta Fix | DTO Sanitization, PT-BR Guard, Image Status Cleanup |
| Fix | Story Character — missing premiseId guard + portrait fallback label |
| Env Recovery | Supabase/Prisma connectivity verified in the real local shell: `check:prisma-connect` passes and `check:local` reports 14 passed / 1 warning / 0 failed |
| Fix | PT-BR Language Guard + Genre Filter + Regression Tests |
| Product Decision | Beta ICP aligned to romance/dark romance soft + romantasy catalog |
| QA Fix | PT-BR validation expanded to all user-facing fields; start flow 401 handling; image pending fallback verified |
| Beta Refresh | 📋 4 readiness gates (image, PT-BR, distribution, counts). PT-BR scan now covers genres, premise openingScene, character secret/relationship. Apply pending — blocks real-user QA |
| Beta Refresh Fix | Script Prisma client now uses Supabase pooler-safe PgBouncer params after preflight failed before mutation |
| Beta Refresh Fix | ADMIN story generation bypasses user creation cap for catalog ops; script aborts before Phase 2 if fewer than 15 draft stories exist |
| Infra Fix | Runtime Supabase pooler URLs now add PgBouncer-safe Prisma params to avoid prepared-statement conflicts |
| Beta Refresh Fix | Phase 2 now resumes incrementally, skips complete premises/characters, backfills missing images, and stops early on provider quota/rate-limit |
| AI Provider Fix | Admin catalog generation now routes through `ADMIN_CATALOG_TEXT_PROVIDER_CHAIN`; user-created stories route through `USER_STORY_TEXT_PROVIDER_CHAIN` |
| Image Provider Fix | Replicate image fallback added after Cloudflare and Google for beta catalog resilience |
| Beta Catalog | `catalog:beta:refresh -- --apply --resume` completed: 15 visible stories, 45 premises, 45 first-premise playable characters, all premise covers and character portraits present |
| Library UX | Added `Todas as histórias` so the full 15-story catalog is visible beyond the horizontal preview rails |
| Day 2 Visual QA | Story covers backfilled from first-premise covers; Library, Story Detail, Premise, and Character screens validated in preview with real images |
| Day 3 Functional QA | Main app flow validated end-to-end in preview: demo login, library, story detail, premise, character, reader start, 3 reading choices, profile, narrative preferences, upgrade/credits, scenes empty state |
| Fix | Profile logout now works in React Native Web preview by bypassing native `Alert.alert`; native mobile still keeps confirmation dialog |
| QA Fix | Mobile auth refresh now uses a single-flight lock plus proactive JWT expiry refresh; concurrent/expired-token calls no longer race and clear local tokens during `reading/start` or `reading/sessions` |
| QA Fix | Minhas Histórias now renders real session images; backend `storyCoverUrl` falls back from story cover to selected premise cover to selected character portrait |
| QA Fix | Minhas Histórias "ABANDONAR" works in React Native Web preview; native mobile still keeps the confirmation dialog |
| Documentation Cleanup | `BACKEND_CONTEXT.md` now records the Step 98d reader prompt behavior contract |
| QA Fix | Reader free-action input now has stable test/accessibility labels and keyboard submit support |
| QA Fix | Reader history now skips incomplete events so historical player actions cannot render without narrator text |
| QA Fix | Reader protected queries now wait for authenticated user state; missing/expired auth shows "Sessão expirada" with login CTA instead of a generic connection retry loop |
| Performance Fix | Reader returns a recent-event scrollback window instead of unbounded history; Story Codex remains the long-term memory source |
| Performance Fix | Reading session summaries no longer expose inline/base64 images; `/reading/sessions?status=ACTIVE&limit=20` payload dropped from ~7.3 MB to ~3.8 KB and mobile uses fallback art when only inline images exist |
| QA Fix | Reader prompts now enforce the selected playable character as the POV/agency anchor; NPCs stay active but cannot replace the player character |
| QA Fix | Reader now passes rich premise character personalities/motivations/secrets/relationships into first-scene and continuation prompts so NPCs respond according to their defined traits |
| QA Tooling | `npm run qa:reset-reading-sessions` added for dry-run/apply cleanup of reading sessions only; beta catalog remains preserved |
| QA Fix | Reader scene parser now recovers escaped JSON responses and blocks raw/malformed JSON from being rendered as narrative text |
| QA Pass | Clean provider-real reader flow passed after session reset: library, detail, premise, character, reader start, suggested choice, free-text action, continue, abandon |
| QA Pass | June 4 clean reader QA repeated after Supabase/env recovery: reset removed 4 sessions, new `Sabores em Conflito` session started, suggested choice and free-text action advanced through Groq, continue/abandon worked |
| QA Fix | Beta catalog playability closed: curated local backfill added 30 characters and `catalog:beta:readiness` now reports 45/45 playable premises |
| QA Fix | Reader continuation UI now uses explicit choice selection + `CONTINUAR`; preview QA advanced scene 0→1 via suggested choice and scene 1→2 via free text |
| UX Fix | Reader density adjusted: prompts now target shorter mobile scenes and the app segments narrator/dialogue blocks visually |
| QA Pass | Free-text reader QA passed as primary interaction path: empty send is inert, typed actions advance scenes, user actions persist, choices return, and escaped `\\n` provider artifacts are normalized |
| QA Fix | Library/catalog image payload sanitized: `/api/library/stories` now strips inline/base64 covers, `/library/stories/:id/characters` sanitizes character images, and runtime curl dropped the story list payload to ~10 KB with 0 `data:image` entries |
| QA Finding | `Minhas Histórias` image fallback is expected while catalog images are stored as inline/base64; real session images require external HTTP(S) storage/backfill |
| Beta Catalog Tooling | `catalog:beta:readiness`, provider backfill, and curated no-provider backfill are available; curated backfill is for known local/dev beta gaps only |
| Step 98m | Neon Postgres beta database preparation documented; follow-up cleanup moved `.env` backup guidance outside the repo and added env-backup ignore guardrails |
| Operational Decision | Supabase kept as the active beta database provider after Neon connection friction; June 9 local checks passed with `database: ok` |

---

## Next Step Priority

**Step 98 — Real User Round** (pending Railway/Supabase beta cloud path and final provider-real QA pass)

**Also recently completed:** Step 98c — Narrative Memory Hardening / Story Codex (853 tests / 53 suites). `NarrativeMemory` now acts as persistent Story Codex with structured canonical facts, character tracking, location history, important choices, open/resolved threads, and `doNotContradict` constraints injected into AI prompts. Follow-up fix added the `codex` migration, persisted scene 0 into the codex timeline, and prevents continuation prompts from drifting to a non-selected premise/character.

**Daily Milestone Status:**
- **Dia 1 — Catálogo Beta e Providers:** ✅ Closed on June 1, 2026
- **Dia 2 — Imagens e Polimento Visual:** ✅ Closed on June 1, 2026
- **Dia 3 — QA Funcional Ponta a Ponta:** Main playable flow completed on June 1, 2026; active-session cover display fixed on June 2; controlled provider-error simulation added on June 4
- **Dia 4 — Provider Failure Harness / Beta Tester Prep:** Provider failure harness implemented; Supabase retained as the beta DB; Railway API deployment prep is the next active milestone

**Current blockers:**
- Migration baseline is aligned on the current Supabase real DB (`prisma migrate status` reports schema up to date when using the Supabase Session Pooler as `DIRECT_URL`). Keep staging discipline before external beta.
- Step 98 requires a successful full provider-real QA pass
- Local API preview must be running with `database: ok`, and fresh `check:prisma-connect` must pass from the same `.env`, before browser QA; this is now verified in the real local shell.
- Closed-beta catalog playability is now ready: latest readiness audit reports 15 stories, 45 premises, and 45/45 premises with ≥3 playable characters. Mobile still hides incomplete premises as a safety gate for future catalog changes.
- Reader continuation UI blocker is fixed in web preview: suggested choice + explicit `CONTINUAR` advanced scene 0→1, and free text advanced scene 1→2 in June 4 QA.
- Reader text density has been reduced in prompt rules and the mobile reader now renders narration/dialogue in smaller visual segments; run one more live provider QA pass to judge the cadence.
- Free-text interaction is validated in web preview as the likely primary user path; continue monitoring generated text quality, but the action submission path is no longer blocked.
- Library/catalog payload blocker is fixed at the API DTO boundary: inline/base64 covers and character images are stripped from library/story-setup responses. External image storage/backfill is still recommended so testers see real images instead of fallback art.
- Controlled provider-failure simulation for reading is now available through `QA_FORCE_READING_PROVIDER_FAILURE=true`, dev/test only, blocked in staging/production, and maps reading failures to `AI_PROVIDER_UNAVAILABLE` without persisting incomplete events.
- `catalog:beta:readiness` currently requires a reachable Supabase pooler; if `check:prisma-connect` fails, do not run apply scripts.
- QA follow-ups before external testers: run the controlled provider-failure preview pass with the harness enabled, verify all newly unhidden premises in preview, and keep watching live scene text for quote/POV regressions.
- Neon beta migration is documentation-ready but deferred. Supabase remains the active beta database provider; do not run Neon `db push` unless the database decision is reopened.

**Day 3 QA Results:**
- New account creation validated through the real `/auth/register` API.
- Login/logout validated in preview; web logout bug fixed and retested.
- Library loaded 15 stories with images.
- Story Detail → Premise → Character → Reader flow passed.
- Reader started a real Groq-backed session and advanced from scene 0 to scene 3 through three choices.
- Profile and narrative preferences loaded without errors.
- Upgrade/credits screen clearly showed dev/mock purchase status and current credit balance.
- Scenes/feed and generated-media gallery empty states loaded without error.
- Active sessions now display the best available real session image: story cover, selected premise cover, then selected character portrait.
- Active sessions abandon action now works in the web preview without relying on `Alert.alert`.
- June 4 repeat QA confirmed active-session fallback art is expected when story/premise/character images are inline/base64 only; `/reading/sessions` intentionally strips inline data for performance.
- Current catalog images are inline/base64 for the tested story/premise/character; active-session image cards need an external image URL strategy such as Replicate URLs or object storage upload after Cloudflare/Google base64 generation.
- June 4 full QA validated 3-premise exposure after curated backfill using `Sabores em Conflito` → `O Ingrediente Secreto` → `Helena Duarte`; follow-up reader UI fix then advanced through suggested-choice and free-text actions in the web preview.
- `/api/library/stories` previously returned a very large inline-image payload (~11.7 MB); Step 98k now strips inline images and the local runtime response is ~10 KB with no `data:image` entries.

**Provider-Real QA Status:**
- Groq ✅, Gemini ✅, Cloudflare ✅
- Reading flow works (start + continue through GroqProvider)
- June 3 functional QA caught and fixed playable-character POV drift: DB session was correct (`Luna`), but prompt now explicitly prevents generated scenes from shifting "voce" agency to another character.
- June 3 follow-up fixed NPC personality continuity: premise characters now reach first-scene and continuation prompts with personality, motivation, relationship, secret, and conflict potential.
- June 3 provider-real preview QA caught and fixed raw JSON leakage in reader scenes. New `O Legado de Fogo e Sangue` session started cleanly, rendered narrative text, and advanced from Scene 0 to Scene 1 through a suggested choice.
- June 4 provider-real QA on `Sabores em Conflito` passed: Luna remained the selected playable POV, Marco reacted with personality, suggested choice and typed action generated clean continuation scenes, and no escaped quote/JSON leakage appeared.
- June 3 clean QA after reset passed on `Sombras do Acordo`: second-premise character generation, reader start, suggested choice, typed action, active-session continue, and abandon all worked.
- Story generation, premise generation, character generation pass
- Character JSON repair + bounded retry applied
- currentScene.userAction contract complete
- OpenRouter 429 on DeepSeek — fallback to Groq works

**Beta Catalog Status:**
- Legacy seed stories are controlled by the `isBetaVisible` flag.
- `catalog:beta:refresh -- --dry-run` passed against the current Supabase DB.
- `catalog:beta:refresh -- --apply --resume` completed and published the new `beta-icp-refresh-*` catalog.
- Published catalog count: 15 visible/public/approved stories.
- Published asset count: 45 premises, 45 premise covers, 45 first-premise playable characters, 45 character portraits.
- Full beta premise playability is now met. Provider backfill created 57 characters, then curated no-provider backfill added the final 30 characters; `catalog:beta:readiness` now reports 45/45 playable premises.
- PT-BR gate passed during script readiness.
- API audit confirmed `/api/library/stories` returns `total: 15`.
- Mobile Library now exposes all loaded stories through the `Todas as histórias` section; `Destaques` and `Tendências` remain preview rails.
- Direct Supabase audit confirmed no missing story covers, premise covers, or character portraits after `catalog:beta:backfill-story-covers -- --apply`.
- Library, Story Detail, Premise, and Character screens were validated in the Codex browser preview with real generated images and no broken-image/empty-card states.
- Mobile still keeps procedural fallback art for provider/image failures.
- Admin catalog story generation uses server-side `ADMIN_CATALOG` context; mobile/user requests cannot choose provider context.
- User-created stories use `USER_STORY` context and continue to respect budget and lifecycle guards.

**Real DB Alignment Status:**
- `npm run check:prisma-connect` passed against the current Supabase runtime `DATABASE_URL`.
- June 9 local shell validation passed against Supabase: `check:prisma-connect` ✅, `check:local` ✅ with 13 passed / 1 warning / 0 failed, and `GET /api/health` returned `database: ok`.
- `npm run check:local` passed with 15 checks, 0 warnings, and 0 failed checks after `.env` alignment.
- `narrative_memories.codex` exists in the real database as `jsonb`.
- All 8 local Prisma migrations are marked applied in the real Supabase migration history.
- Runtime `DATABASE_URL` and `DIRECT_URL` are aligned for the current local Supabase setup; keep using the Session Pooler for migration/admin operations when the direct host is unreachable locally.

---

## Test Coverage Summary

### Backend Test Suites (53 suites, 907 tests)

Key modules tested: AI providers, story setup, reading orchestration, scene media, billing, moderation, narrative preferences, admin, library, health, narrative memory/codex, prompt guidance.

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
- **Migrations:** Schema valid locally; beta catalog visibility cleanup applied to current Supabase DB

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

**Last Updated:** After Supabase beta database decision reaffirmed — June 9, 2026
