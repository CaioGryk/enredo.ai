import { getModelById, getDefaultFreeModel, getDefaultPremiumModel, canUserAccessModel, AIModel } from '@modules/ai/model-catalog';
import { SubscriptionType } from '@prisma/client';

export type GenerationBudgetInput = {
  userId: string;
  subscriptionType: SubscriptionType;
  requestedModelId?: string;
  dailyUsageCount?: number;
  dailyUsageLimit?: number;
  creditBalance?: number;
  isCinematicMode?: boolean;
  isFirstScene?: boolean;
  freeLlmOnly?: boolean;
};

export type GenerationBudgetDecision = {
  allowed: boolean;
  finalModel: AIModel;
  maxOutputTokens: number;
  budgetTier: 'FREE' | 'PREMIUM' | 'CREDITS';
  requiresCredits: boolean;
  estimatedCreditCost: number;
  fallbackApplied: boolean;
  blockReason?: string;
};

export class GenerationBudgetGuard {
  decide(input: GenerationBudgetInput): GenerationBudgetDecision {
    // 1. Resolve model from catalog
    let model: AIModel | undefined;
    if (input.requestedModelId) {
      model = getModelById(input.requestedModelId);
    } else if (input.subscriptionType === SubscriptionType.FREE) {
      model = getDefaultFreeModel();
    } else {
      model = getDefaultPremiumModel();
    }

    // 2. Unknown model → block
    if (!model) {
      return {
        allowed: false,
        finalModel: {} as AIModel,
        maxOutputTokens: 500,
        budgetTier: 'FREE',
        requiresCredits: false,
        estimatedCreditCost: 0,
        fallbackApplied: false,
        blockReason: `Model ${input.requestedModelId || 'unknown'} not found in catalog`,
      };
    }

    // 3. Validate model is active before proceeding
    if (!model.isActive) {
      return {
        allowed: false,
        finalModel: model,
        maxOutputTokens: model.maxTokens,
        budgetTier: model.tier,
        requiresCredits: model.tier === 'CREDITS',
        estimatedCreditCost: model.creditCost || 0,
        fallbackApplied: false,
        blockReason: `Model ${model.id} is not currently available`,
      };
    }

    // 3. Check daily limit for FREE users (PRESERVE current behavior)
    // First scene is EXEMPT from daily limit (requirement from task)
    // Daily limit of 0 means "no limit"
    if (input.subscriptionType === SubscriptionType.FREE && !input.isFirstScene) {
      const count = input.dailyUsageCount ?? 0;
      const limit = input.dailyUsageLimit ?? 10;
      if (limit > 0 && count >= limit) {
        return {
          allowed: false,
          finalModel: model,
          maxOutputTokens: model.maxTokens,
          budgetTier: 'FREE',
          requiresCredits: false,
          estimatedCreditCost: 0,
          fallbackApplied: false,
          blockReason: 'Daily interaction limit reached',
        };
      }
    }

    // 4. Check catalog-based access (PRESERVE current behavior: FREE users DENIED premium models)
    // For CINEMATIC mode: allow even with insufficient credits (system sponsors the generation)
    const isCinematicSponsored = input.isCinematicMode && model.tier === 'CREDITS';
    const creditBalanceForCheck = isCinematicSponsored ? (model.creditCost || 0) : input.creditBalance;

    const { allowed, reason } = canUserAccessModel(
      model,
      input.subscriptionType,
      creditBalanceForCheck,
      input.freeLlmOnly ?? false,
    );

    if (!allowed && !isCinematicSponsored) {
      // Current behavior: FREE users are DENIED (not silently downgraded)
      // CREDITS model with insufficient credits: DENIED (unless cinematic mode)
      return {
        allowed: false,
        finalModel: model,
        maxOutputTokens: model.maxTokens,
        budgetTier: model.tier,
        requiresCredits: model.tier === 'CREDITS',
        estimatedCreditCost: model.creditCost || 0,
        fallbackApplied: false,
        blockReason: reason || 'Access denied',
      };
    }

    // 5. Allowed (including cinematic mode with sponsored credits)
    return {
      allowed: true,
      finalModel: model,
      maxOutputTokens: model.maxTokens,
      budgetTier: model.tier,
      requiresCredits: model.tier === 'CREDITS' && !isCinematicSponsored,
      estimatedCreditCost: isCinematicSponsored ? 0 : (model.creditCost || 0),
      fallbackApplied: false,
    };
  }
}
