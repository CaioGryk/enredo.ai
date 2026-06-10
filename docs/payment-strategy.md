# Payment Strategy — Enredo.ai

**Purpose:** Define the payment monetization boundary for a mobile-first product.

---

## Verdict

| Channel | Status | Notes |
|---------|--------|-------|
| Dev/mock purchases | ✅ Active | `BillingService.purchaseCredits` mock path |
| Stripe Checkout (web/staging) | 🧪 Scaffolded, feature-flagged | `STRIPE_ENABLED=true` for testing only |
| Apple IAP / Google Play Billing | ❌ Deferred | Required for store-compliant mobile monetization |
| RevenueCat | ❌ Deferred | Recommended abstraction for mobile stores |

---

## Mobile-First Boundary

Enredo.ai is **initially 100% mobile app**. Monetization on mobile app stores (App Store, Google Play) requires:

- **Apple IAP** for iOS digital goods
- **Google Play Billing** for Android digital goods
- RevenueCat (or equivalent) as an abstraction layer

Stripe is NOT a replacement for Apple IAP / Google Play Billing. Stripe can serve:
- Web checkout (future admin/desktop)
- Staging/beta testing via web browser
- Server-side payment validation only

---

## Current Implementation (Step 81)

### Mock Purchases (Active)

```typescript
// BillingService.purchaseCredits()
// Dev path: credits granted immediately (no real payment)
// Labeled as "dev/mock" in UI and logs
```

### Stripe Scaffolding (Feature-Flagged)

**Env var:** `STRIPE_ENABLED=true` (default: `false`)

When disabled (default):
- All purchases go through mock path
- Mobile UI shows "ambiente de desenvolvimento"

When enabled (for future staging/web testing):
- Scaffolded endpoint ready for Stripe Checkout integration
- **No real Stripe API calls yet** — boundary only
- Credit grants remain blocked until checkout, webhook verification, and production-grade idempotency are complete

---

## Purchase Idempotency

Step 81 added a mock/dev idempotency guard:
- Mobile sends an `idempotencyKey` with mock credit purchases.
- Replaying the same user + key + package returns the existing wallet balance without granting credits again.
- Reusing the same key with a different package is rejected.
- Checks are scoped to the current user's wallet.

This is not a final production payment ledger. Production Stripe/IAP flows still require a durable purchase/payment-attempt model with database-level uniqueness before real webhook credit grants.

---

## Deferred Work

| Item | Step | Notes |
|------|------|-------|
| Stripe Checkout session creation | 80+ | Scaffolded, not implemented |
| Production payment idempotency model | Future | DB-level uniqueness required before real payment webhooks |
| Stripe webhook handling | Future | Verify payment before credit |
| Apple IAP integration | Future | Required for iOS App Store |
| Google Play Billing | Future | Required for Android Play Store |
| RevenueCat abstraction | Future | Recommended for mobile stores |

---

## Mobile UI Contract

The Upgrade/Credits screen must always be honest about the current payment state:

| State | Copy | CTA |
|-------|------|-----|
| Mock/dev | "ambiente de desenvolvimento" | "Ativar Premium (dev)" |
| Stripe beta | "Pagamento via Stripe (beta)" | "Comprar créditos" |
| Store IAP | Deferred | Deferred |

---

**Last Updated:** After Step 81
