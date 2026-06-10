# Monetization Policy — Enredo.ai (Beta)

**Purpose:** Definitive beta monetization contract. All monetization surfaces (backend enforcement, mobile copy, admin tools) must align with this document.
**Status:** Local/Dev Private Beta — NOT production-ready for real payments.
**Last Updated:** Step 89 — May 2026.

---

## 1. Plans

### 1.1 Free Tier

| Feature | Limit |
|---------|-------|
| Daily interactions | **10** per day (first scene of new story exempt) |
| Active reading sessions | **3** concurrent |
| AI models | `openrouter/free` only (500 max tokens) |
| Ads | INTERSTITIAL every 5 interactions (mock) |
| Premium stories | Blocked (`PREMIUM_REQUIRED`) |
| CREDITS-tier models | Allowed with sufficient credits; blocked with `INSUFFICIENT_CREDITS` when balance is insufficient |
| Image generation | Available (1 credit) |
| Video generation | Available (5 credits) |

**Enforcement:** Backend-only. Budget guard + orchestrator. Mobile never gates limits.

### 1.2 Premium Tier

| Feature | Behavior |
|---------|----------|
| Daily interactions | Unlimited |
| Active sessions | Unlimited |
| AI models | `gpt-4.1-nano` (default), `gpt-4.1-mini` |
| Ads | None |
| Premium stories | Allowed |
| Image/video generation | Same credit costs as Free (1 / 5) |
| Token limit | Up to 2000 |

**Enforcement:** `canUserAccessModel()` with `SubscriptionType.PREMIUM`. Guard checks plan before generation.

**Important:** Premium does NOT grant free credits. Upgrading to Premium does not create a `SUBSCRIPTION_BONUS` credit transaction. Credits are purchased separately.

### 1.3 Premium Activation (Beta/Dev)

- **Endpoint:** `POST /billing/subscription/upgrade` (mock)
- **Behavior:** Immediately sets subscription to PREMIUM with 30-day period.
- **No payment:** Mobile UI explicitly states "ambiente de desenvolvimento. Nenhuma cobrança real foi feita."
- **Cancellation:** `POST /billing/subscription/cancel` sets status to `CANCELLED`. Does not refund credits or prorate.

---

## 2. Credits System

### 2.1 Credit Costs (Backend Enforced)

| Resource | Credits | Constant |
|----------|---------|----------|
| Scene image generation | **1** | `MEDIA_CREDIT_COSTS.IMAGE` |
| Scene video generation (Kling) | **5** | `MEDIA_CREDIT_COSTS.VIDEO` |
| Claude 3.5 Sonnet (Cine mode) | **2** per scene | Model catalog `creditCost: 2` |

### 2.2 Credit Purchase (Mock/Dev)

- **Endpoint:** `POST /billing/credits/purchase`
- **Packages:** Starter (50 credits / $9.90), Popular (150 / $24.90), Colecionador (500 / $69.90)
- **Payment:** Mock only. No real charge. Mobile UI explicitly states "mock/dev."
- **Idempotency:** Client sends `idempotencyKey`. Replay returns existing balance without re-granting.

### 2.3 Credit Spending

All credit deductions are backend-enforced with atomic `$transaction`:
- **Reading:** `reading-orchestrator.service.ts` — checks `selectedModel.tier === 'CREDITS'`, atomic `updateMany` with `balance: { gte: creditCost }`.
- **Image:** `scene-media.service.ts` — pre-check then atomic `$transaction`.
- **Video:** `scene-media.service.ts` — pre-check then provider call then atomic `$transaction` only on success.

**Inviolable rules:**
1. Every balance change creates a `CreditTransaction` (ledger audit).
2. `updateMany` with `balance: { gte: cost }` prevents negative balances.
3. Provider failure before transaction → no credits spent.
4. Transaction failure → Prisma rolls back wallet decrement.

### 2.4 Admin Credit Grants

- **Endpoint:** `POST /admin/billing/users/:userId/credits/grant` (ADMIN only)
- **Reason:** `PROMO` (Prisma `CreditTransactionReason.PROMO`)
- **Metadata:** `{ source: 'ADMIN_GRANT', adminUserId, note }`
- **Validation:** Amount must be a positive integer. RBAC enforced via `JwtAuthGuard` + `RolesGuard`.

---

## 3. Payment State

### 3.1 Current Status

| Channel | Status | Details |
|---------|--------|---------|
| Mock/dev purchases | ✅ Active | No real payment. Mock honesty everywhere. |
| Stripe (web/staging) | 🧪 Scaffolded | `STRIPE_ENABLED=true` gated. No real Stripe API calls. |
| Apple IAP | ❌ Deferred | Required for iOS App Store compliance. |
| Google Play Billing | ❌ Deferred | Required for Android Play Store compliance. |
| RevenueCat | ❌ Deferred | Recommended abstraction layer. |

### 3.2 Mock Honesty Contract

Every monetization surface MUST clearly indicate mock/dev status:
- Upgrade screen: "Pagamentos reais ainda não estão ativos."
- Purchase button: "Ativar Premium dev"
- Credit cards: "mock/dev até a integração Stripe"
- Success alerts: "nenhuma cobrança real foi feita"
- Transaction history: shows real ledger entries (not fake)

**Rule:** Never imply real purchases are active. Never show "Buy" or "Purchase" without dev/mock qualifier in beta.

---

## 4. Refunds & Expiration

### 4.1 Refunds

- **Status:** ❌ Not implemented.
- `CreditTransactionReason.REFUND` exists in Prisma schema but has no service logic.
- No `refundCredits()` method in `BillingService`.
- Mobile `TransactionHistory` has a `REFUND: 'Reembolso'` label — will be shown if a REFUND transaction exists, but none are currently created.
- **Beta policy:** No refunds. All credit movements in beta are mock/dev or admin grants.

### 4.2 Expiration

- **Status:** ❌ Not implemented.
- `CreditTransactionType.EXPIRE` and `CreditTransactionReason.EXPIRATION` exist in Prisma schema but have no service logic.
- No `expireCredits()` method. No cron job. No expiration date on `CreditWallet`.
- Credits do not currently expire.
- **Beta policy:** Credits do not expire. This will be addressed before production with a `CreditWallet.expiresAt` field and background job.

---

## 5. Heavy Media Policy

### 5.1 Scene Image (1 credit)
- Available to all users (Free and Premium).
- Provider: Google Imagen via `ImageGenerationService`.
- Disabled when `ENABLE_IMAGE_GENERATION=false` or `GOOGLE_AI_API_KEY` is missing.

### 5.2 Scene Video (5 credits)
- Available to all users with sufficient credits.
- Provider: Kling via `KlingVideoProvider`.
- Async task flow: 60s task creation + polling (12 attempts × 5s delay = ~5 min max).
- Disabled when `ENABLE_VIDEO_GENERATION=false` or Kling not configured (`KLING_ENABLED=false` or empty `KLING_API_KEY`).
- **Risk:** 5-minute max blocking HTTP request is impractical for mobile. Needs pending/async UX before production.

### 5.3 Provider Cost Risk
- No per-request provider cost tracking in `ModelUsage` for media generation.
- No credit-to-USD cost correlation in real time.
- Per-video Kling API cost unknown without real credentials.

---

## 6. What Is Safe for Local/Dev Beta

- ✅ Mock credit purchases and Premium activation
- ✅ Credit wallet with full audit ledger
- ✅ Admin credit grants (PROMO)
- ✅ All Free/Premium/credit enforcement from backend
- ✅ Image/video generation with credit spend
- ✅ Purchase idempotency (mock only)
- ✅ Transaction history display

## 7. What Is NOT Production-Ready

- ❌ Real Stripe processing (API calls, webhooks, payment verification)
- ❌ Apple IAP / Google Play Billing (required for app store distribution)
- ❌ RevenueCat or equivalent mobile IAP abstraction
- ❌ Credit expiration logic
- ❌ Refund processing
- ❌ Production credit pricing (mock prices only)
- ❌ Kling production API keys and cost monitoring
- ❌ Video generation async UX (5-min blocking call)
- ❌ Per-request provider cost tracking for media
- ❌ Subscription renewal/recurring billing

---

## 8. Deferred Monetization Work

| Item | Priority | Notes |
|------|----------|-------|
| Stripe Checkout integration | High | Before web/staging launch |
| Apple IAP + Google Play Billing | High | Required for mobile store distribution |
| RevenueCat abstraction | Medium | Simplifies multi-store mobile IAP |
| Credit expiration | Medium | Add `expiresAt` to `CreditWallet` + background job |
| Refund processing | Medium | Admin-triggered refund flow |
| Production price review | High | Real USD costs from OpenAI/Anthropic/Kling |
| Video async UX | High | Replace 5-min blocking call with task status poll or webhook |
| Per-request cost tracking | Medium | Record provider cost in `ModelUsage` for media |
| Subscription renewal | High | Before recurring Premium billing goes live |
