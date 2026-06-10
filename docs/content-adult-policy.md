# Adult Narrative Content Policy — Enredo.ai

**Purpose:** Define the product, safety, store-positioning, backend, mobile, AI prompt, and moderation contract for optional adult narrative preferences.

**Status:** Backend foundation, mobile preferences UI, private reading prompt integration, and MVP public feed guardrails implemented.

---

## Product Positioning

Enredo.ai is an AI interactive storytelling app. Adult content must not become the public positioning, category, onboarding promise, or store-facing identity of the app.

Adult narrative content may exist only as a private user preference:

- Hidden from public category/tag systems.
- Disabled by default.
- Available only after explicit user opt-in.
- Available only after age confirmation.
- Applied only to the user's private reading experience.
- Never used as the main Play Store/App Store positioning.

The public product promise remains:

> Histórias interativas que mudam com você.

Not:

> Adult chat, erotic roleplay, or pornographic content app.

---

## Allowed Scope

When the user has completed age confirmation and explicit opt-in, Enredo.ai may allow:

- Romance-driven stories.
- Sensual tension.
- Adult romance in private reading sessions.
- Explicit adult text only when it is contextual, consent-based, and aligned with the story.
- AI-led romantic escalation when compatible with user preference and story tone.

The feature should support commercial romance genres without exposing them as public app categories:

- Romance.
- Romantasy.
- Dark romance, within safety boundaries.
- Drama/forbidden romance, within safety boundaries.
- Adult romance 18+, only as private preference.

---

## Always-Prohibited Scope

These are blocked regardless of user preference:

- Minors in sexual contexts.
- Incest or sexual family relationships.
- Sexual coercion, non-consent, rape, sexual assault, or forced sexual acts.
- Sexualized violence.
- Exploitation, trafficking, grooming, or abuse.
- Sexual content involving intoxication/incapacity.
- Sexualization of a real person without consent.
- Use of a user's real photo, likeness, or profile image in explicit sexual text, images, or video.
- Explicit adult image/video generation in the MVP.
- Public/feed publication of adult content without a future dedicated moderation and age-gated distribution policy.

Dark romance can include danger, obsession, rivalry, jealousy, secrecy, moral conflict, and emotional intensity. It must not cross into sexual violence, coercion, or non-consensual sexual content.

---

## User Preference Model

Implemented backend-owned preference contract:

```ts
enum RomanceIntensity {
  NONE
  SOFT
  INTENSE
  ADULT_18
}

model UserNarrativePreferences {
  userId               String   @id
  romanceIntensity     RomanceIntensity @default(SOFT)
  adultContentOptIn    Boolean  @default(false)
  ageVerifiedAt        DateTime?
  adultTermsAcceptedAt DateTime?
  updatedAt            DateTime @updatedAt
}
```

Rules:

- Backend is the source of truth.
- Mobile may request preferences, but backend computes the effective allowed level.
- `ADULT_18` requires `adultContentOptIn=true`, `ageVerifiedAt`, and `adultTermsAcceptedAt`.
- If any required gate is missing, backend must downgrade the effective level to `INTENSE` or lower.
- Preferences affect private reading generation only.

---

## Mobile UX Contract

The mobile app should place this feature under Profile/Settings, not as a public discovery category.

Recommended section:

```text
Preferências de narrativa
Ajuste o tom das histórias geradas para você.
```

Controls:

- Romance intensity selector:
  - Neutro
  - Romance leve
  - Romance intenso
  - Adulto 18+
- Age confirmation for adult level.
- Adult preference terms acceptance.
- Clear explanation that this affects only private stories.

Suggested user-facing copy:

```text
Conteúdo adulto 18+
Permite cenas de romance explícito em histórias privadas, quando fizer sentido narrativo.
```

Avoid aggressive public/store-facing labels in primary navigation, onboarding, screenshots, or category names.

---

## AI Prompt Contract

The AI scene generation layer must receive a backend-computed policy block.

When adult content is not allowed:

```text
Adult content allowed: false.
Keep romance emotional, suggestive, or fade-to-black. Do not describe explicit sexual acts.
```

When adult content is allowed:

```text
Adult content allowed: true.
Allowed intensity: ADULT_18.
Only consenting adult characters.
No minors.
No coercion, sexual violence, incest, exploitation, or incapacity.
Keep adult content contextual to the story and user preference.
Do not involve real user likeness, profile photos, image references, or video in explicit sexual content.
```

The AI may initiate romantic tension or sensual escalation only within the user's effective preference level and the story's tone.

---

## Media Boundary

Text and media have different risk profiles.

For the MVP:

- Adult private text: allowed only with opt-in and gates.
- Adult public text/feed: not allowed automatically.
- Adult image generation: blocked.
- Adult video generation: blocked.
- Adult use of user appearance/photo/likeness: blocked.

The existing profile appearance opt-in for video is separate and must never imply permission to create adult sexual media with the user's likeness.

---

## Moderation And Publication

Private reading and public/social feed must remain separate:

- Private reading can use the user's effective narrative preference.
- Public feed submission must not auto-publish adult content.
- Adult or borderline content should require a future age-gated moderation policy before public distribution.
- Scene/report moderation must be able to classify adult content separately from abuse/unsafe content.

For the MVP, the safest policy is:

```text
Adult content may remain private.
Adult content should not enter the public feed automatically.
```

---

## Store Readiness

To reduce store review risk:

- Do not market the app as pornographic or adult-first.
- Do not show adult content in store screenshots.
- Do not use adult tags/categories as public discovery.
- Keep age confirmation and explicit opt-in.
- Mention user-generated AI content and sensitive content controls in terms/privacy.
- Maintain a moderation/reporting path.

---

## Implementation Steps

Recommended phased implementation:

1. **Adult Policy Documentation** — ✅ Created this policy and aligned context docs.
2. **Backend Preference Model** — ✅ Added schema, DTOs, service, endpoints, and effective policy resolver (May 2026).
3. **Mobile Preferences UI** — ✅ Added Profile/Settings controls, age confirmation, and adult terms acceptance (May 2026).
4. **Prompt Integration** — ✅ Inject effective narrative policy into reading generation only. Both first scene and continuation supported (May 2026).
5. **Moderation/Public Safety** — ✅ Adult-generated scenes blocked from public feed via `adultContentGenerated` flag on `NarrativeEvent` and `SceneMedia` (May 2026).

All 4 steps complete.

---

**Last Updated:** May 2026 — backend preference foundation, mobile UI, private reading prompt integration, and MVP public feed guardrails implemented.
