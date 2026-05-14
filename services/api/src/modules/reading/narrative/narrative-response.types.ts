import { SubscriptionType } from '@prisma/client';

export type GenerateSceneInput = {
  userId: string;
  sessionId: string;
  story: any;
  session: any;
  action?: string;
  selectedModelId?: string;
  sceneIndex: number;
  memory?: any;
  previousEvents?: any[];
  premise?: any;
  playableCharacter?: any;
  plan?: SubscriptionType;
  walletBalance?: number;
  isCinematic?: boolean;
  isFirstScene?: boolean;
};

export type GenerateSceneResult = {
  sceneText: string;
  suggestedActions: string[];
  modelUsed: string;
  providerUsed?: string;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  sceneMetadata?: {
    emotion?: string;
    pacing?: string;
  };
  memoryPatch?: {
    summary?: string;
    worldState?: string;
    characterState?: string;
    importantChoices?: string[];
    openThreads?: string[];
    constraints?: string;
  };
};
