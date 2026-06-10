# Content Moderation Policy — Enredo.ai (Beta)

**Purpose:** Define the content moderation policy for the beta phase using local pattern-based moderation.

---

## Scope

This policy applies to user-generated content across these surfaces:

| Surface | Moderated? | Policy |
|---------|-----------|--------|
| Reading actions (free text) | ✅ Yes | `moderateUserAction()` — blocks prompt injection, blocked words; sanitizes PII/URLs |
| Scene media comments | ✅ Yes | `moderateComment()` — blocks unsafe, sanitizes PII, enforces 1-500 chars |
| Report reasons | ✅ Yes | `moderateReportReason()` — blocks unsafe, sanitizes PII, enforces 3-500 chars |
| Story generation input | ✅ Yes | `StoryGenerationInputGuard` (existing, unchanged) |
| AI-generated content | ❌ Not moderated yet | Deferred to future provider-based moderation |
| Media images/videos | ❌ Not moderated yet | Deferred |

---

## Policy Categories

| Flag | Meaning | Action |
|------|---------|--------|
| `EMPTY` | Input is empty or whitespace-only | Blocked |
| `LENGTH_EXCEEDED` | Input exceeds surface limit | Blocked |
| `PROMPT_INJECTION` | Matches injection/Jailbreak patterns | Blocked |
| `BLOCKED_CONTENT` | Contains blocked words (hack, malware, etc.) | Blocked |
| `CONTAINS_URLS` | Contains URLs | Sanitized (`[LINK_REMOVED]`) |
| `CONTAINS_EMAIL` | Contains email addresses | Sanitized (`[EMAIL_REMOVED]`) |
| `CONTAINS_PHONE` | Contains phone-like numbers (10-14 digits) | Sanitized (`[PHONE_REMOVED]`) |
| `CONTROL_CHARS_REMOVED` | Control characters were stripped from the input | Sanitized + flagged |

---

## What is Blocked

- Empty or whitespace-only input after sanitization
- Text exceeding per-surface length limits
- Prompt injection / jailbreak patterns
- Malicious/exploit keywords (hack, malware, phishing, spam, warez, crack, keygen)

## What is Sanitized

- URLs → `[LINK_REMOVED]`
- Email addresses → `[EMAIL_REMOVED]`
- Phone numbers (10-14 digits) → `[PHONE_REMOVED]`
- Control characters → silently removed
- Repeated whitespace → normalized to single space

---

## What is Deferred

- AI-based content classification (toxicity, hate speech, NSFW)
- Image/video moderation
- User reputation / trust scoring
- Automated content removal based on report volume

---

## Privacy/Logging Rule

The moderation service does NOT log:
- Raw prompts or generated content
- User passwords, tokens, or auth headers
- Refresh tokens
- Private story content
- Raw provider responses

---

**Last Updated:** After Step 76
