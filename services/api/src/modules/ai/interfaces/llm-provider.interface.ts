import { SubscriptionType } from '@prisma/client';

export interface GenerateConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  maxAttempts?: number;
  requestTimeoutMs?: number;
}

export interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface SceneGenerationResult {
  sceneText: string;
  choices: string[];
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  sceneMetadata?: {
    emotion?: string;
    pacing?: string;
  };
}

export interface LLMProvider {
  name: string;
  generate(prompt: string, config: GenerateConfig): Promise<LLMResponse>;
  estimateCost(inputTokens: number, outputTokens: number): number;
  getModelForPlan(plan: SubscriptionType): string;
}

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.000015, output: 0.00006 },
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
  'claude-3-5-sonnet-20241022': { input: 0.000003, output: 0.000015 },
  'claude-3-opus': { input: 0.000015, output: 0.000075 },
  'gemini-pro': { input: 0.00000125, output: 0.000005 },
};
