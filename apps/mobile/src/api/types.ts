export interface Story {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  genres: string[];
  isPremium: boolean;
  maturityRating: string;
  coverUrl?: string;
  coverImageUrl?: string;
  totalChapters?: number;
  publishedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  plan?: string;
  imageUrl?: string | null;
}

export interface StoryListResponse {
  stories: Story[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  description?: string;
  imageUrl?: string | null;
}

export interface StoryCharactersResponse {
  storyId: string;
  storyTitle: string;
  characters: Character[];
}

export interface StoryPremise {
  id: string;
  title: string;
  synopsis: string;
  tone?: string | null;
  coverUrl?: string | null;
  coverGenerationStatus?: string;
  coverError?: string | null;
  coverFallback?: {
    palette?: string[];
    symbol?: string;
    title?: string;
    subtitle?: string;
  } | null;
  playableCharacterCount: number;
  isPremium: boolean;
  sortOrder: number;
}

export interface StoryPlayableCharacter {
  id: string;
  name: string;
  roleLabel: string;
  narrativeFunction: string;
  description?: string | null;
  personality?: string | null;
  initialGoal?: string | null;
  startingSituation?: string | null;
  imageUrl?: string | null;
  imageGenerationStatus?: string;
  imageError?: string | null;
  imageFallback?: {
    palette?: string[];
    symbol?: string;
    title?: string;
    subtitle?: string;
  } | null;
  isPremium: boolean;
}

export interface NarrativeEvent {
  id: string;
  chapterNumber: number;
  sceneIndex: number;
  sceneText: string;
  choices: string[];
  userAction?: string;
  userActionType?: string;
  generatedAt: string;
}

export interface SceneResponse {
  id?: string;
  chapterNumber: number;
  sceneIndex: number;
  sceneText: string;
  choices: string[];
  userAction?: string;
  userActionType?: string;
  sceneMetadata?: any;
  adPlacement?: any;
}

export interface ReadingSessionDetails {
  id: string;
  storyId: string;
  selectedPremiseId?: string | null;
  selectedCharacterId?: string | null;
  protagonistName?: string | null;
  protagonistRole?: string | null;
  currentChapter: number;
  currentSceneIndex: number;
  status: string;
  startedAt: string;
  lastSceneAt: string;
  currentScene?: SceneResponse | null;
  history: NarrativeEvent[];
  isPreparing?: boolean;
}

export interface UsageInfo {
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  isLimited: boolean;
  creditsRemaining: number;
}

export interface ReadingStatusResponse {
  session: ReadingSessionDetails;
  usage: UsageInfo;
}

export interface StartReadingResponse {
  session: ReadingSessionDetails;
  usage: UsageInfo;
}

export interface ReadingSessionSummary {
  id: string;
  storyId: string;
  storyTitle: string;
  storyCoverUrl?: string | null;
  selectedPremiseTitle?: string | null;
  selectedPremiseCoverUrl?: string | null;
  selectedCharacterName?: string | null;
  selectedCharacterImageUrl?: string | null;
  currentChapter: number;
  currentSceneIndex: number;
  status: string;
  startedAt: string;
  lastSceneAt: string;
}

export interface SessionListResponse {
  sessions: ReadingSessionSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubscriptionResponse {
  hasActiveSubscription: boolean;
  type: 'FREE' | 'PREMIUM';
  status: string;
  currentPeriodEnd?: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
}

export interface CreditWalletResponse {
  balance: number;
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    reason: string;
    createdAt: string;
  }[];
}

export interface AIModel {
  id: string;
  displayName: string;
  description: string;
  tier: string;
  priceLevel: string;
  maxTokens: number;
  supportsCinematic: boolean;
  creditCost: number;
  available: boolean;
  lockedReason?: string;
  isDefault: boolean;
}

export interface AIModelsResponse {
  models: AIModel[];
  defaultModelId: string;
  userPlan: string;
}

export interface NarrativePreferencesResponse {
  romanceIntensity: 'NONE' | 'SOFT' | 'INTENSE' | 'ADULT_18';
  adultContentOptIn: boolean;
  ageVerifiedAt?: string | null;
  adultTermsAcceptedAt?: string | null;
  effectiveRomanceIntensity: 'NONE' | 'SOFT' | 'INTENSE' | 'ADULT_18';
  adultContentAllowed: boolean;
  mediaAdultContentAllowed: boolean;
  userLikenessAdultContentAllowed: boolean;
}

export interface SSOResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface SSOPayload {
  provider: 'GOOGLE';
  idToken: string;
  name?: string;
}

export interface LLMTestResponse {
  ok: boolean;
  provider: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  content: string;
}

export interface LLMTestPayload {
  modelId?: string;
}

export interface SceneMedia {
  id: string;
  userId: string;
  narrativeEventId?: string | null;
  storyId?: string | null;
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'ANIMATED';
  imageUrl?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  visibility: string;
  moderationStatus: string;
  title?: string | null;
  caption?: string | null;
  textExcerpt?: string | null;
  createdAt: string;
}
