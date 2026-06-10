# AI & Media Cost Audit — Enredo.ai

**Purpose:** Document the full AI and media credit cost model, backend enforcement points, mobile display points, and known risks.
**Last Updated:** Step 88 — May 2026.

---

## 1. Credit Costs — Summary

| Resource | Credit Cost | Backend Constant | Mobile Display |
|----------|-------------|-----------------|----------------|
| Image generation (scene) | **1** | `MEDIA_CREDIT_COSTS.IMAGE` (`scene-media.constants.ts:2`) | Badge: `1`, Alert: `"1 crédito"` |
| Video generation (scene) | **5** | `MEDIA_CREDIT_COSTS.VIDEO` (`scene-media.constants.ts:3`) | Badge: `5`, Alert: `"5 créditos"`, Error: `"São necessários 5 créditos"` |
| Claude 3.5 Sonnet (Cine) | **2** per scene | Model catalog `creditCost: 2` | Tab: `"Cine • X créditos"` (dynamic), Upgrade: `"a partir de 2 créditos"` |
| Free/Standard model | **0** | Catalog `creditCost: undefined` | Tab: `"Gratuito"` |
| Premium models | **0** | Catalog `creditCost: undefined` | Tab: `"Premium"` |

**Consistency:** Backend ↔ Mobile match for all current costs. Cine model cost is dynamic from the model catalog API. Image/video costs are still displayed as mobile literals (`1` and `5`) and must remain aligned with backend constants until a shared/API-exposed media-cost contract exists.

---

## 2. Backend Enforcement Points

### 2.1 Reading — Model Access (`canUserAccessModel`, `model-catalog.ts:121-155`)
- `tier === 'FREE'` → always allowed
- `tier === 'PREMIUM'` → requires `SubscriptionType.PREMIUM`
- `tier === 'CREDITS'` → requires `walletBalance >= creditCost`
- `isActive === false` → always blocked
- `freeLlmOnly === true` → blocks any `costMode !== 'FREE'`

### 2.2 Reading — Budget Guard (`generation-budget.guard.ts:29-125`)
- **Step 88 Fix:** Cinematic mode is no longer "sponsored." Credits are always required for CREDITS-tier models.
- Daily limit for FREE users (10 interactions, first scene exempt).
- Access check uses actual user balance.

### 2.3 Reading — Credit Spend (`reading-orchestrator.service.ts:254-276`)
- Checks `selectedModel.tier === 'CREDITS'` — unconditionally deducts.
- Atomic `updateMany` with `balance: { gte: creditCost }` guard.
- Transaction metadata: `{ modelId, mode, sessionId }`.

### 2.4 Image Generation (`scene-media.service.ts:176-224`)
- Pre-check: `wallet.balance < MEDIA_CREDIT_COSTS.IMAGE` → HTTP 402.
- Atomic `$transaction`: wallet decrement + `CreditTransaction` create + `SceneMedia` update.
- Transaction reason: `IMAGE_GENERATION`.

### 2.5 Video Generation (`scene-media.service.ts:226-328`)
- Pre-check: `wallet.balance < MEDIA_CREDIT_COSTS.VIDEO` → HTTP 402.
- Provider call happens BEFORE transaction.
- Provider failure (`success: false` or no `videoUrl`) → throws `BadRequestException`, no transaction.
- On success: atomic `$transaction` with wallet decrement, `CreditTransaction`, `SceneMedia` update.
- Transaction reason: `SCENE_GENERATION`.

### 2.6 Admin Grant (`billing.service.ts:307-353`)
- `POST /admin/billing/users/:userId/credits/grant`
- Amount must be positive integer.
- Reason: `PROMO`.
- Metadata: `{ source: 'ADMIN_GRANT', adminUserId, note }`.

---

## 3. Credit Packages

| ID | Name | Credits | Price (USD) | Price/Credit |
|----|------|---------|-------------|-------------|
| `starter` | Starter | 50 | $9.90 | $0.198 |
| `popular` | Popular | 150 | $24.90 | $0.166 |
| `colecionador` | Colecionador | 500 | $69.90 | $0.140 |

**Note:** Prices are mock/dev until Stripe integration. Mobile displays them with explicit mock labels.

---

## 4. Daily Free Limit

| Limit | Value | Source |
|-------|-------|--------|
| Daily interactions (Free) | **10** | `FREE_DAILY_INTERACTION_LIMIT` (`reading.constants.ts:9`) |
| Active sessions (Free) | **3** | `FREE_ACTIVE_SESSION_LIMIT` (`reading.constants.ts:12`) |
| Premium daily limit | Unlimited (0 = no limit) | `getUsageStats()` returns `0` for Premium |
| First scene exemption | Yes | Guard skips limit check for first scene |

---

## 5. Model Catalog — All Active Models

| Model ID | Tier | Default | Max Tokens | Credit Cost | Cinematic |
|----------|------|---------|-----------|-------------|-----------|
| `openrouter/free` | FREE | Default Free | 500 | — | — |
| `gpt-4.1-nano` | PREMIUM | Default Premium | 900 | — | — |
| `gpt-4.1-mini` | PREMIUM | — | 1500 | — | — |
| `claude-3-5-sonnet-20241022` | CREDITS | Default Cine | 3000 | **2** | Yes |

**Inactive:** `gemini-2.5-flash-lite`, `together/gpt-oss-120b` — `isActive: false`.

---

## 6. Kling Video Generation — Time/Cost Risk

| Parameter | Value |
|-----------|-------|
| Task creation timeout | 60 seconds |
| Poll attempts | 12 |
| Poll delay | 5 seconds |
| Poll timeout per attempt | 15 seconds |
| **Total max wall clock** | **~5 minutes** |
| Credit cost | 5 credits (spent only on final video URL) |
| Credits spent on failure | **None** |

**Risk:** A 5-minute blocking HTTP request is impractical for mobile. Consider:
- Returning a pending response after task creation (deferred)
- Webhook/background job for async completion (deferred)
- Mobile timeout handling (currently shows spinner for up to 5 min)

---

## 7. Known Issues

### 7.1 Cinematic Mode Guard — Fixed (Step 88)
The guard used to advertise `estimatedCreditCost: 0` and `requiresCredits: false` for cinematic mode while the orchestrator still deducted credits. **Fixed:** guard now uses actual user balance for all modes.

### 7.2 Monthly Usage Incomplete
`UserUsageDto.totalInteractions` returns 0 or 1 (boolean-like). `totalCostUsd` always 0. These fields need proper aggregation from `ModelUsage` records.

### 7.3 Credit Spending Duplication
Reading orchestrator directly manipulates `creditWallet` (lines 258-274) instead of calling `BillingService.spendCredits()`. Two separate code paths for credit deduction.

### 7.4 Benefits Text Model Names
`getBenefits()` in billing returns Portuguese strings mentioning "OpenRouter Free" / "GPT-4.1 Nano" — these match the catalog but may need updating if models change.

### 7.5 Credit Package Pricing
All prices are mock. No real Stripe integration. Mobile explicitly labels purchases as "mock/dev".

---

## 8. Beta Recommendations

1. **Monitor Kling costs**: At $0.XX per video, 5 credits = effective cost depends on credit package pricing. Strongly consider dynamic pricing per model/provider before production.
2. **Add video cost/timeout UX**: 5-minute max wall time is too long. Implement pending/task-status pattern or webhook completion before production.
3. **Complete monthly usage aggregation**: Fix `totalInteractions` and `totalCostUsd` for real usage tracking.
4. **Unify credit spending**: Route all credit deductions through `BillingService.spendCredits()`.
5. **Add cost observability**: Track per-model credit spend, per-media-type credit spend, and total credit revenue/cost in admin metrics.
6. **Production pricing review**: Current prices ($0.14-$0.20/credit) may need adjustment based on real provider costs (OpenAI, Anthropic, Kling).

---

## 9. Deferred

| Item | Reason |
|------|--------|
| Stripe real integration | Mock payments only until Stripe is configured |
| Video async completion (webhook/background job) | Currently in-process blocking polling |
| Monthly usage real aggregation | Requires schema/query work for `ModelUsage` aggregation |
| Credit spending architectural unification | Low-risk debt, not a bug |
| Kling production credentials | No real API keys configured |
| Dynamic model catalog pricing | Current catalog is static; prices may change per-model/per-provider |
