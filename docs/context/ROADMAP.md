# Roadmap — Enredo.ai

**Purpose:** Product roadmap from MVP through future phases.

---

## MVP (Current Focus)

**Core Features:**
- ✅ Curated/admin library
- ✅ Story Setup with 3 premises per base story
- ✅ 3 playable characters per premise
- ✅ Characters with narrative function, motivation, secret, conflict, visual prompt
- ✅ Interactive reading with suggested choices and free text
- ✅ Free with ads, unlimited narrative interactions, 3 active sessions limit, and Free LLM only
- ✅ Premium with better models and premium stories
- ✅ Mobile-first frontend with real flow:
  - Library → Detail → Premise → Character → Reader
- ✅ Profile, Premium, My Stories, and Scenes as base

**Status:** Local/dev private beta readiness reached. Steps 43-97 closed and audited. Current focus is Step 98 — Real User Round in the QA + Launch block.

---

## Phase 2 (Steps 9-13 + Implemented Steps 1-8)

### Already Implemented (Steps 1-8)
| Step | Feature | Status |
|------|---------|--------|
| Step 1 | Reading Architecture Refactor | ✅ |
| Step 2 | Generation Budget Guard | ✅ |
| Step 3 | Scene Media Layer | ✅ |
| Step 4 | Story Lifecycle | ✅ |
| Step 5 | User Story Creation | ✅ |
| Step 6 | Access Control (Security) | ✅ |
| Step 7 | Story Setup for User Stories | ✅ |
| Step 8 | Story Quality Guard | ✅ |

### Steps 9-13 (Future or Partial)
| Step | Feature | Status |
|------|---------|--------|
| Step 9 | Story Creation Limits (by plan/credits) | Deferred |
| Step 10 | AI Story Generation (keywords → story) | ✅ Implemented |
| Step 11 | Scene Media Generation (AI images, covers) | ✅ Partial (image with credits) |
| Step 12 | Social Feed (vertical video, likes, comments) | Partial (feed structure) |
| Step 13 | Moderation Pipeline (automated + manual) | Partial (input moderation) |

**Phase 2 Goals:**
- User creates private stories via keywords
- Stories born private by default
- AI generates title, synopsis, premises, characters, cover prompt
- Moderation before generation
- Limits by plan and/or credits
- User photo upload/capture
- AI consent for image personalization
- Scene/cover/character image generation

---

## Phase 3 (Community)

**Features:**
- User can create and play private AI stories
- User can generate images and short videos from scenes in those stories
- User can publish selected scene media to the social feed
- Feed engagement can make the underlying story eligible for library promotion
- User can submit private story for publication
- Publication states: PRIVATE → SUBMITTED → APPROVED → PUBLIC (or REJECTED)
- Other users can play, favorite, and rate stories
- Ranking by niche/genre
- Video scene feed
- Likes, comments, save, share
- CTA to enter story from feed

**Requirements:**
- Community moderation system
- Quality scoring algorithm
- Configurable engagement threshold for promotion eligibility (`likes` count to be defined)
- Admin/editorial review before any user story enters the main public library
- Content flagging
- Creator profiles and reputations

---

## Phase 4 (Ecosystem)

**Features:**
- Library retrofed by usage data
- Popular stories become featured
- Popular niches guide new curated stories
- Community stories with strong feed traction can graduate into the official library after review
- Creators receive badge/ranking
- Premium can create series, universes, larger campaigns
- Community stories can become candidates for main library
- Editorial curation approves featured stories
- Generated videos and stories fuel organic growth

**Vision:**
Enredo.ai becomes a self-sustaining ecosystem where:
- Players discover stories matched to their tastes
- Creators build audiences and reputations
- Quality content rises through engagement
- AI-generated content enriches the platform
- Community and curated content coexist

---

## Feature Dependency Graph

```
MVP Foundation
├── Reading Experience ✅
├── Billing/Credits ✅
├── Basic Mobile App ✅
└── Admin Library ✅

    ↓

AI Generation (Phase 2)
├── Story Generation ✅
├── Quality Validation ✅
├── Credit Spend ✅
└── User Private Stories ✅

    ↓

Media & Social (Phase 2-3)
├── Scene Images ✅
├── Character Portraits ✅ Core MVP; Cloudflare Workers AI provider planned
├── Scene Videos ✅ Backend provider boundary / UX deferred
├── Social Feed Structure ✅
└── Feed Publication ✅

    ↓

Community (Phase 3)
├── Story Submission
├── Moderation Pipeline
├── Ratings & Reviews
└── Creator Profiles

    ↓

Ecosystem (Phase 4)
├── Discovery Algorithms
├── Featured Content
├── Series/Campaigns
└── Cross-promotion
```

---

## Immediate Priorities

### Step 98 (Next)
**Real User Round**
- Run the controlled closed beta round with a small set of real testers.
- Collect structured feedback, bug reports, and go/no-go notes using the Step 97 beta package.
- Keep the scope limited to observation and feedback capture; do not perform public launch, store submission, or production deploy.
- Preserve the QA + Launch sequence for Steps 90-100.
- Defer broad staging, Stripe/IAP, CI/CD, and production infrastructure until the QA + Launch plan explicitly reaches those steps.

### Deferred Work
| Item | Reason | Proposed Step |
|------|--------|---------------|
| Real Kling credential/staging validation | Provider boundary exists, but no real credential execution has been validated | Step 86+ |
| Persisted appearance opt-in/photo lookup | Provider boundary supports it, but schema/mobile persistence is deferred | Step 87+ |
| Real purchase idempotency | Mock/dev metadata guard exists; production requires provider/webhook-backed uniqueness | Phase 2+ |
| CreditTransaction refund | Flow not designed | Phase 3+ |
| Full social features | Feed, engagement, comments, reports, saved scenes, moderation implemented; deeper discovery/ranking deferred | Phase 3 |

---

**Last Updated:** After Step 97 (Closed Beta Preparation)
