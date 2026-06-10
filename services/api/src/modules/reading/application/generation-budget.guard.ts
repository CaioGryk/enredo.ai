import { getModelById, getDefaultFreeModel, getDefaultPremiumModel, canUserAccessModel, AIModel } from '@modules/ai/model-catalog';
import { SubscriptionType } from '@prisma/client';
import { FREE_DAILY_INTERACTION_LIMIT } from './reading.constants';

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
    } else if (input.freeLlmOnly) {
      model = getDefaultFreeModel();
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
      const limit = input.dailyUsageLimit ?? FREE_DAILY_INTERACTION_LIMIT;
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

    // 4. Check catalog-based access using actual user balance.
    // Cinematic mode is not "sponsored" — credits are always required for CREDITS-tier models.
    const isCinematic = input.isCinematicMode && model.tier === 'CREDITS';

    const { allowed, reason } = canUserAccessModel(
      model,
      input.subscriptionType,
      input.creditBalance ?? 0,
      input.freeLlmOnly ?? false,
    );

    if (!allowed) {
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

    // 5. Allowed — cost is always real, never zero for CREDITS models
    return {
      allowed: true,
      finalModel: model,
      maxOutputTokens: model.maxTokens,
      budgetTier: model.tier,
      requiresCredits: model.tier === 'CREDITS',
      estimatedCreditCost: isCinematic ? (model.creditCost || 0) : (model.creditCost || 0),
      fallbackApplied: false,
    };
  }
}
