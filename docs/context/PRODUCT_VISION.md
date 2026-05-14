# Product Vision — Enredo.ai

**Purpose:** Product vision, business model, monetization strategy, and community features.

---

## Vision Statement

Enredo.ai must evolve into a **curated library + community creation engine + social audiovisual layer**.

In the extended MVP, the public library remains mostly curated/admin to ensure quality, predictable cost, and moderation. In future phases, users can create private stories via keywords, play those stories, generate media with AI, publish scenes to the social feed, and submit stories for the community/library after moderation.

**Reference Concept:** Emochi/AI character apps, but Enredo.ai focuses on:
- Library of stories (not just characters)
- Reading experience and narrative progress
- Story state and persistent context
- Open-ended choices (not branching paths)
- Social feed with audiovisual content
- Cinematic visual identity

---

## Business Model

### Free Tier
- Public library access
- Limited daily interactions (10/day)
- Economic AI model (openrouter/free)
- Shorter responses (up to 500 tokens)
- Basic/summarized narrative memory
- Ads (INTERSTITIAL every 5 interactions)
- **Maximum 3 active reading sessions** (ABANDONED and COMPLETED don't count)
- Session creation uses `Serializable` transaction + retry to reduce race conditions

### Premium Tier
- No ads
- Better AI models (gpt-4.1-nano as default)
- Longer, more literary responses (up to 2000 tokens)
- Expanded narrative memory
- More daily interactions (unlimited)
- Access to premium stories
- **No 3 active session limit**

### AI Model Access Rules
**Architectural decision:** Final model choice must always be decided and validated by backend, never trusted from app/mobile.

- Free users: Only `FREE` models (OpenRouter/free or explicitly free/low-cost)
- Premium users: `PREMIUM` models (gpt-4.1-nano or equivalent)
- Expensive/top-tier models: `CREDITS` tier requiring sufficient balance
- App can request a `modelId`, but backend validates plan, balance, feature flags, provider config, `FREE_LLM_ONLY`, and cost/tier
- `NarrativeEngine` must NOT decide billing or entitlement; it receives authorized context and calls AI layer

---

## Credits System

Credits are used for expensive features:
- Cinematic mode (long, literary scenes)
- Top-tier models (claude-3-5-sonnet-20241022)
- Image/cover/character generation
- Creating/regenerating custom stories, alternative covers, extra characters, universe expansion
- Video generation per scene
- Audiovisual personalization with user image
- Publishing premium audiovisual scenes to feed

Credits are also engagement and growth tools, not just direct purchases. Backend must allow auditable grant/donation of credits for:
- Campaigns
- Onboarding
- Retention
- Referrals
- Recurring usage bonuses
- Promotional actions

**Consolidated Rules:**
- Every credit entry/exit must generate auditable `CreditTransaction`
- Feature costs decided in backend, never in app
- Images cost fewer credits than short videos
- Short videos/cinematic cost more credits (computationally expensive)
- Promotional credits can encourage media creation to populate adventure feeds
- Generated media remains private by default, only goes to public feed with opt-in and moderation

**Credit Costs:**
- `IMAGE`: 1 credit
- `VIDEO`: 5 credits

---

## User Story Creation (Roadmap)

**Product Decision:** Allowing keyword-based creation is desirable because it helps the app self-feed, reveals real user niches, and creates a foundation for community. However, this must NOT publish directly to the public library.

**Recommended Future Flow:**
1. User provides keywords, genre, tone, and constraints
2. Backend moderates input before generation
3. AI generates a private story: title, synopsis, premises, playable characters, initial context, and cover prompt
4. User plays/saves the story as private
5. User can submit for community
6. Story only becomes public after automatic/manual approval

**Commercial Rules:**
- Free: Very limited private creations per month, no generated images or placeholders only
- Premium: More private creations, better models, more characters, option to submit/publish
- Credits: Generate cover, regenerate synopsis, create extra character, expand to series/campaign, or use cinematic mode

---

## Social Layer and Feed

**Consolidated Product Decisions:**
- Must have a **Scenes** tab with vertical TikTok/Reels-style feed
- Feed shows **AI-generated animated scenes**, not static posters
- Each feed item may have:
  - Story title
  - Creator user
  - Like
  - Comments
  - Save/share
  - CTA to enter the story
- Videos must be **private by default**
- Feed publication requires user opt-in and moderation
- Likes and engagement help community stories become candidates for the main library

---

## Profile Photo / Personalization

**Decisions Defined:**
- User photo can come from 3 sources:
  1. Google SSO
  2. Camera on first access
  3. Manual edit in Profile tab
- This photo will be used in the future for visual personalization of scenes and videos
- Using user image requires explicit consent
- Consent management must appear in Profile / AI Settings

---

## Branding and Terminology

**Consolidated Rules:**
- Main written name: **Enredo.ai**
- `E.ai` is only an informal monogram, not main application name
- Avoid "path" language as fixed branching
- Prefer:
  - `premise`
  - `starting point`
  - `playable synopsis`
  - `playable character`
  - `action`
  - `scene`

---

## Story Setup Flow (Before Reader)

**Product Decision:**
- Each base story offers **3 cached premises/synopses**
- Each premise offers **3 playable characters**
- Each character has clear narrative function: playable protagonist, ally, rival, antagonist, mentor, guardian, catalyst, etc.
- User chooses premise + character before starting session
- `ReadingSession` loads this context for AI to generate first and subsequent scenes
- Covers/images start simple: 1 main cover per base story in MVP; character images are future or paid feature

---

## Visual Identity

**Current Theme (Consolidated):**
- Background: `#0D0D0F`
- Surfaces: `#15131B` / `#1B1824`
- Main text: `#F5F1FF`
- Muted text: `#8B839E`
- Primary accent: `#CEBDFF`
- Secondary (monetization): Gold/amber (intentional for Premium blocks)

**Evolution:**
The app migrated from old editorial/gold visual to:
- Dark cinematic
- Mobile-first
- Modern
- Lavender/purple as main accent
- Less "antique/old library"
- More AI + social product app

---

**Last Updated:** After Step 42 completion
