import { SubscriptionType } from '@prisma/client';
import { AIModel, getDefaultFreeModel, getDefaultPremiumModel } from '@modules/ai/model-catalog';

export type StoryGenerationBudgetDecision = {
  allowed: boolean;
  finalModel: AIModel;
  maxOutputTokens: number;
  budgetTier: 'FREE' | 'PREMIUM';
  blockReason?: string;
};

export class StoryGenerationBudgetGuard {
  decide(subscriptionType: SubscriptionType): StoryGenerationBudgetDecision {
    // 1. Get default model based on subscription
    const model = subscriptionType === SubscriptionType.PREMIUM
      ? getDefaultPremiumModel()
      : getDefaultFreeModel();

    // 2. Fail if no default model available
    if (!model) {
      return {
        allowed: false,
        finalModel: {} as AIModel,
        maxOutputTokens: 500,
        budgetTier: subscriptionType === SubscriptionType.PREMIUM ? 'PREMIUM' : 'FREE',
        blockReason: `No default model available for ${subscriptionType} users`,
      };
    }

    // 3. Allowed
    return {
      allowed: true,
      finalModel: model,
      maxOutputTokens: model.maxTokens,
      budgetTier: subscriptionType === SubscriptionType.PREMIUM ? 'PREMIUM' : 'FREE',
    };
  }
}
