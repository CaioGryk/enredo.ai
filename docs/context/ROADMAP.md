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
- ✅ Free with ads, daily limit, 3 active sessions limit
- ✅ Premium with better models and premium stories
- ✅ Mobile-first frontend with real flow:
  - Library → Detail → Premise → Character → Reader
- ✅ Profile, Premium, My Stories, and Scenes as base

**Status:** Beta readiness in progress. Backend structurally sound. Main blockers resolved in Steps 32-42.

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
- Content flagging
- Creator profiles and reputations

---

## Phase 4 (Ecosystem)

**Features:**
- Library retrofed by usage data
- Popular stories become featured
- Popular niches guide new curated stories
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
├── Scene Videos (deferred)
├── Social Feed Structure ✅
└── Feed Publication (deferred)

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

### Step 43 (Next)
**Scene Media Mobile Contract & UX**
- Connect mobile to scene media endpoints
- Show image/video cost before generating
- Handle `INSUFFICIENT_CREDITS`
- Prevent duplicate generation during loading
- Don't present video as ready if provider not implemented

### Deferred Work
| Item | Reason | Proposed Step |
|------|--------|---------------|
| Real video provider | Not yet implemented | Phase 2+ |
| Purchase idempotency | Mock payment for now | Phase 2+ |
| CreditTransaction refund | Flow not designed | Phase 3+ |
| Admin grant credits | No scaffold exists | Step 42+ |
| Full social features | Backend partial | Phase 3 |

---

**Last Updated:** After Step 42 completion
