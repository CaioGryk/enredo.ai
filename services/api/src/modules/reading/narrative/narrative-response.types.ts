import { SubscriptionType, UserActionType } from '@prisma/client';
import { StoryCodex } from './narrative-context.builder';

export type GenerateSceneInput = {
  userId: string;
  sessionId: string;
  story: any;
  session: any;
  action?: string;
  actionType?: UserActionType;
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
  narrativePolicy?: {
    effectiveRomanceIntensity: string;
    adultContentAllowed: boolean;
    mediaAdultContentAllowed: boolean;
    userLikenessAdultContentAllowed: boolean;
  };
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
    codex?: StoryCodex;
  };
};
