# Product Vision — Enredo.ai

**Purpose:** Product vision, business model, monetization strategy, and community features.

---

## Vision Statement

Enredo.ai must evolve into a **curated library + community creation engine + social audiovisual layer**.

In the extended MVP, the public library remains mostly curated/admin to ensure quality, predictable cost, and moderation. In future phases, users can create private stories via keywords, play those stories, generate media with AI, publish scenes to the social feed, and allow high-engagement stories to become candidates for the main app library after moderation.

**Community creation loop:**
1. User creates a private AI story.
2. User plays the story through the same premise → character → reader flow.
3. User generates images and short videos from scenes in that story.
4. User posts selected scene media to the app feed.
5. Feed engagement is measured through likes and other quality signals.
6. If a story reaches a configurable threshold of likes/engagement, it becomes eligible for admin/editorial review.
7. Approved stories can be promoted into the public library/catalog.

This creates a growth loop where the app starts with curated/admin stories, then gradually lets the community surface strong stories without letting unreviewed content enter the main library automatically.

**Reference Concept:** Emochi/AI character apps, but Enredo.ai focuses on:
- Library of stories (not just characters)
- Reading experience and narrative progress
- Story state and persistent context
- Open-ended choices (not branching paths)
- Social feed with audiovisual content
- Cinematic visual identity

---

## Beta ICP and Catalog Direction

**Product decision:** The closed beta should validate a female-leaning Brazilian ICP with emotionally charged interactive fiction, not a generic AI story catalog.

**Primary ICP:**
- Brazilian women, roughly 18-35, who already consume romance, dark romance, romantasy, webnovels, fanfic, doramas, and interactive story apps.
- The strongest initial promise is not "AI can generate anything", but "you can enter intense stories, choose who you are, and shape romance, mystery, power, betrayal, and fantasy through your actions."

**Commercial catalog direction for beta:**
- Use a focused 15-story catalog:
  - 10 stories centered on romance, dark romance soft, power dynamics, mystery, luxury, rivalry, revenge, secrets, and emotionally dangerous relationships.
  - 5 stories centered on fantasy/romantasy with romance, magic, curses, courts, pacts, and identity.
- This mix is intentionally more commercial and click-oriented than the previous broad catalog, while still preserving enough variety for validation.

**Dark romance / power-romance guardrails:**
- Public positioning must stay store-safe: romance, luxury, secrets, forbidden attraction, mystery, family empire, danger, and emotionally intense choices.
- Avoid making "hot", pornography, or explicit adult content a public category, public tag, onboarding promise, or store-facing theme.
- Avoid overtly store-risky labels in public discovery when softer wording works. Prefer "império familiar perigoso", "dono da cidade", "contrato", "herdeiro implacável", "luxo e perigo", "segredos de família" over explicit adult-first positioning.
- Adult intensity remains a private profile preference behind age/terms gates, as defined in the Adult Narrative Preferences section.

**Proposed 15-story beta catalog:**

| # | Title | Lane | Core Hook |
|---|---|---|---|
| 1 | A Dívida do CEO | Romance / power | A young lawyer works for an implacable CEO to save her family and uncovers an old revenge hidden in the contract. |
| 2 | O Dono da Cidade | Dark romance soft / suspense | A photographer sees something she should not and is protected by the heir of a dangerous family empire. |
| 3 | Noiva por Contrato | Romance / luxury | A bankrupt socialite accepts a fake marriage with a cold businessman, but the agreement becomes emotional war. |
| 4 | Entre Luxo e Mentiras | Mystery / elite drama | An assistant enters a billionaire family's inner circle and discovers crimes, desire, and betrayals. |
| 5 | O Guarda-Costas da Herdeira | Romantic suspense | A threatened heiress lives under the protection of a mysterious guard who knows too much about her past. |
| 6 | Contrato de Sangue | Dark romance soft | A doctor saves a powerful man and is pulled into a dangerous debt involving love, fear, and loyalty. |
| 7 | A Ex Que Ele Nunca Esqueceu | Revenge romance | A woman returns powerful enough to ruin the man who broke her, but he still hides the truth. |
| 8 | Beijo em Território Inimigo | Rival families | Two powerful families control the city's elite, and the protagonist falls for the heir she should hate. |
| 9 | A Secretária do Inimigo | CEO mystery | A young woman takes a strategic job to investigate the CEO who ruined her family, but he notices the lie too quickly. |
| 10 | O Astro e a Garota Invisível | Fame / obsession | An ordinary fan saves a celebrity in crisis and enters a world of fame, control, and forbidden attraction. |
| 11 | A Rainha Sem Coroa | Romantasy | A young woman discovers she is heir to an occupied magical kingdom and must choose power, revenge, and love. |
| 12 | O Príncipe das Sombras | Romantasy / pact | A human makes a pact with a shadow prince to save her sister, but each choice brings them closer to war. |
| 13 | Academia dos Sete Selos | Fantasy academy | In a secret magical school, the protagonist discovers a forbidden gift that can free or destroy those she loves. |
| 14 | A Caçadora e o Deus Caído | Urban fantasy | A supernatural hunter finds a banished god who offers power in exchange for trust. |
| 15 | O Baile das Bruxas | Witch fantasy | An apprentice witch enters a masked ball where desires, alliances, and family curses are revealed. |

**Validation goal:** In beta QA, measure which hooks generate more taps, premise selections, character selections, first-session starts, and continued reader actions. The goal is to learn which emotional lanes convert, not to prove the app can support every genre.

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

### Character Portraits (Core MVP)
**Product decision:** Base playable character portraits are a core MVP feature, NOT a premium/paid feature.
- Character portraits for cached playable characters are generated automatically on first fetch via the GET characters endpoint.
- Portraits use the character's `visualPrompt` with editorial/cinematic styling.
- MVP provider decision: use Cloudflare Workers AI with `@cf/black-forest-labs/flux-1-schnell` as the primary no-cost portrait provider.
- Google image generation is optional/fallback only; it must not be treated as the primary no-cost MVP portrait provider because the tested free quota for Gemini image generation returned 0.
- Mobile shows the generated image when available, a loading state when pending, and a stylized fallback when unavailable.
- **Controlled monetized features remain:** video generation, active story count, premium LLM models, and advanced cinematic features.

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
- The profile already contains an explicit opt-in control for using the user's own photo/appearance in generated videos.
- This photo may be used for visual personalization of scenes and videos only when the opt-in is enabled.
- If opt-in is disabled or no profile photo exists, video generation must not send a user photo or appearance reference to the media provider.
- Step 85 product/provider decision: use Kling as the POC/MVP video provider for scene-based videos.
- Terminology: use "appearance reference" or "likeness reference" for the user's own consented photo. Avoid "face swap" terminology and non-consensual behavior.
- Consent management belongs in Profile / AI Settings, with a clear path to disable future use.

---

## Adult Narrative Preferences

**Product decision:** Adult romance must be treated as a private narrative preference, not as the public positioning of Enredo.ai.

- The app remains an AI interactive storytelling product, not an adult-first app.
- Adult/hot romance should not appear as a public category, public tag, onboarding promise, or store-facing screenshot theme.
- The preference belongs in Profile/Settings under narrative preferences.
- Adult 18+ requires explicit opt-in, age confirmation, and acceptance of specific terms before it can affect private reading generation.
- The backend must compute the effective allowed level; mobile cannot be trusted as the source of truth.
- Text and media are separate risk surfaces: adult private text can be planned with gates, but adult image/video and any adult use of user likeness remain blocked for the MVP.
- Public feed/social distribution of adult content is blocked in the MVP by backend guardrails. A future age-gated public distribution policy would require a separate product/security decision.

Reference policy: `docs/content-adult-policy.md`.

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
- Covers/images start simple: 1 main cover per base story in MVP, plus base playable character portraits as a core MVP feature

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

**Last Updated:** After Adult Narrative Preferences public feed guardrails — May 2026
