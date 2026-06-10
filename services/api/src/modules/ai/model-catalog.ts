import { SubscriptionType } from '@prisma/client';

export type ModelTier = 'FREE' | 'PREMIUM' | 'CREDITS';
export type PriceLevel = 'FREE' | 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH';
export type AIProvider = 'openai' | 'anthropic' | 'openrouter' | 'google' | 'groq' | 'together';
export type CostMode = 'FREE' | 'PAID' | 'CREDITS';

export interface AIModel {
  id: string;
  provider: AIProvider;
  displayName: string;
  description: string;
  tier: ModelTier;
  priceLevel: PriceLevel;
  costMode: CostMode;
  isDefaultFree?: boolean;
  isDefaultPremium?: boolean;
  creditCost?: number;
  maxTokens: number;
  supportsCinematic?: boolean;
  isActive: boolean;
}

export const AI_MODEL_CATALOG: AIModel[] = [
  {
    id: 'groq/free',
    provider: 'groq',
    displayName: 'Groq Free',
    description: 'Primary free MVP text model via Groq. The concrete model is configured with GROQ_MODEL.',
    tier: 'FREE',
    priceLevel: 'FREE',
    costMode: 'FREE',
    isDefaultFree: true,
    maxTokens: 1500,
    isActive: true,
  },
  {
    id: 'openrouter/free',
    provider: 'openrouter',
    displayName: 'Free Router',
    description: 'Free tier model via OpenRouter. Good for basic interactions.',
    tier: 'FREE',
    priceLevel: 'FREE',
    costMode: 'FREE',
    maxTokens: 500,
    isActive: true,
  },
  {
    id: 'deepseek/deepseek-v4-flash:free',
    provider: 'openrouter',
    displayName: 'DeepSeek V4 Flash Free',
    description: 'Explicit free DeepSeek model via OpenRouter. Preferred for MVP free generation because it returns normal content instead of router-dependent reasoning-only responses.',
    tier: 'FREE',
    priceLevel: 'FREE',
    costMode: 'FREE',
    maxTokens: 1500,
    isActive: true,
  },
  {
    id: 'gemini/free',
    provider: 'google',
    displayName: 'Gemini Free',
    description: 'Google Gemini free-tier fallback. The concrete model is configured with GOOGLE_TEXT_MODEL.',
    tier: 'FREE',
    priceLevel: 'FREE',
    costMode: 'FREE',
    maxTokens: 1500,
    isActive: true,
  },
  {
    id: 'gemini-2.5-flash-lite',
    provider: 'google',
    displayName: 'Gemini 2.5 Flash Lite',
    description: 'Very low cost Google model. Fast and efficient. TODO: implement Google provider.',
    tier: 'PREMIUM',
    priceLevel: 'VERY_LOW',
    costMode: 'PAID',
    maxTokens: 700,
    isActive: false,
  },
  {
    id: 'gpt-4.1-nano',
    provider: 'openai',
    displayName: 'GPT-4.1 Nano',
    description: 'Very cheap OpenAI model. Great for quick responses.',
    tier: 'PREMIUM',
    priceLevel: 'VERY_LOW',
    costMode: 'PAID',
    isDefaultPremium: true,
    maxTokens: 900,
    isActive: true,
  },
  {
    id: 'gpt-4.1-mini',
    provider: 'openai',
    displayName: 'GPT-4.1 Mini',
    description: 'Small but capable OpenAI model. Better quality than nano.',
    tier: 'PREMIUM',
    priceLevel: 'LOW',
    costMode: 'PAID',
    maxTokens: 1500,
    isActive: true,
  },
  {
    id: 'together/gpt-oss-120b',
    provider: 'together',
    displayName: 'GPT OSS 120B',
    description: 'Large open-source model via Together. Good balance of cost and quality. TODO: implement Together provider.',
    tier: 'PREMIUM',
    priceLevel: 'LOW',
    costMode: 'PAID',
    maxTokens: 1500,
    isActive: false,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    displayName: 'Claude 3.5 Sonnet',
    description: 'High quality Anthropic model. Best for cinematic and detailed scenes.',
    tier: 'CREDITS',
    priceLevel: 'HIGH',
    costMode: 'CREDITS',
    creditCost: 2,
    maxTokens: 3000,
    supportsCinematic: true,
    isActive: true,
  },
];

export function getModelById(modelId: string): AIModel | undefined {
  return AI_MODEL_CATALOG.find(m => m.id === modelId);
}

export function getDefaultFreeModel(): AIModel {
  return AI_MODEL_CATALOG.find(m => m.isDefaultFree && m.isActive) || AI_MODEL_CATALOG[0];
}

export function getDefaultPremiumModel(): AIModel {
  return AI_MODEL_CATALOG.find(m => m.isDefaultPremium && m.isActive) || AI_MODEL_CATALOG.find(m => m.tier === 'PREMIUM' && m.priceLevel === 'VERY_LOW' && m.isActive)!;
}

export function getDefaultUtilityModel(freeOnly?: boolean): AIModel {
  if (freeOnly) {
    const freeModel = AI_MODEL_CATALOG.find(m => m.isDefaultFree && m.costMode === 'FREE' && m.isActive)
      || AI_MODEL_CATALOG.find(m => m.costMode === 'FREE' && m.isActive);
    if (freeModel) return freeModel;
  }
  return AI_MODEL_CATALOG.find(m => m.isDefaultPremium && m.isActive) || AI_MODEL_CATALOG.find(m => m.tier === 'PREMIUM' && m.priceLevel === 'VERY_LOW' && m.isActive)!;
}

export function getDefaultCinematicModel(): AIModel {
  return AI_MODEL_CATALOG.find(m => m.supportsCinematic && m.tier === 'CREDITS' && m.isActive)!;
}

export function canUserAccessModel(
  model: AIModel,
  plan: SubscriptionType,
  walletBalance?: number,
  freeLlmOnly?: boolean,
): { allowed: boolean; reason?: string } {
  if (!model.isActive) {
    return { allowed: false, reason: 'Model is not available' };
  }

  // Explicit FREE_LLM_ONLY check - block ALL non-free models
  if (freeLlmOnly === true && model.costMode !== 'FREE') {
    return { allowed: false, reason: 'Paid models are disabled. FREE_LLM_ONLY=true restricts to free models only.' };
  }

  if (model.tier === 'FREE') {
    return { allowed: true };
  }

  if (model.tier === 'PREMIUM') {
    if (plan === SubscriptionType.PREMIUM) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Requires Premium' };
  }

  if (model.tier === 'CREDITS') {
    if (walletBalance !== undefined && walletBalance >= (model.creditCost || 0)) {
      return { allowed: true };
    }
    return { allowed: false, reason: `Requires ${model.creditCost} credits` };
  }

  return { allowed: false, reason: 'Unknown model tier' };
}

export function filterModelsForUser(plan: SubscriptionType, walletBalance?: number, freeLlmOnly?: boolean): AIModel[] {
  return AI_MODEL_CATALOG.filter(model => {
    if (!model.isActive) return false;
    const { allowed } = canUserAccessModel(model, plan, walletBalance, freeLlmOnly);
    return allowed;
  });
}

export function getProviderForModelId(modelId: string): AIProvider | undefined {
  const model = getModelById(modelId);
  return model?.provider;
}
