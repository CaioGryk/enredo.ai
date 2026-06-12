import { Injectable, ForbiddenException, BadRequestException, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionType, UserActionType } from '@prisma/client';
import { GenerateConfig, LLMProvider, LLMResponse, SceneGenerationResult, MODEL_COSTS } from './interfaces/llm-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { GroqProvider } from './providers/groq.provider';
import { GoogleTextProvider } from './providers/google-text.provider';
import { MockProvider } from './providers/mock.provider';
import { ProviderExhaustionTracker, isQuotaExhaustedError } from './provider-exhaustion-tracker';

export type AiGenerationContext = 'ADMIN_CATALOG' | 'USER_STORY' | 'USER_READING' | 'UTILITY';
import { SCENE_GENERATION_PROMPT, FIRST_SCENE_PROMPT, MEMORY_SUMMARY_PROMPT } from './prompts';
import {
  AI_MODEL_CATALOG,
  AIModel,
  getModelById,
  getDefaultFreeModel,
  getDefaultPremiumModel,
  getDefaultUtilityModel,
  getDefaultCinematicModel,
  canUserAccessModel,
  getProviderForModelId as getProviderByModelId,
} from './model-catalog';

interface StoryCharacter {
  name: string;
  role: string;
  description?: string;
  personality?: string;
  motivation?: string;
  secret?: string;
  relationshipToPlayer?: string;
  initialGoal?: string;
  startingSituation?: string;
  conflictPotential?: string;
}

interface NarrativePreferencePolicy {
  effectiveRomanceIntensity: string;
  adultContentAllowed: boolean;
  mediaAdultContentAllowed: boolean;
  userLikenessAdultContentAllowed: boolean;
}

/** Common English words/phrases that indicate non-pt-BR content in narrative generation. */
const ENGLISH_MARKERS: RegExp[] = [
  /\bthe\b/i, /\bis\b/i, /\bare\b/i, /\bwas\b/i, /\bwere\b/i,
  /\bthey\b/i, /\btheir\b/i, /\bthem\b/i, /\bthis\b/i, /\bthat\b/i,
  /\byou\b/i, /\byour\b/i, /\bwith\b/i, /\bfrom\b/i, /\bhave\b/i,
  /\bit\b/i, /\bhas\b/i, /\bbeen\b/i, /\bwill\b/i, /\bcan\b/i,
  /\bwho\b/i, /\bwhich\b/i, /\bwhere\b/i, /\bwhen\b/i, /\bwhat\b/i,
  /\bhow\b/i, /\ball\b/i, /\bmust\b/i, /\bshould\b/i, /\bcould\b/i,
  /\band\b/i,
  /\ba\b/i, /\ban\b/i,
  /\bin\b/i, /\bof\b/i, /\bto\b/i, /\bfor\b/i,
  /\bhe\b/i, /\bshe\b/i, /\bhis\b/i, /\bher\b/i, /\bhim\b/i,
  /\bbut\b/i, /\bnot\b/i, /\bjust\b/i, /\bonly\b/i, /\bstill\b/i,
  /\bvery\b/i, /\breally\b/i, /\balways\b/i, /\bnever\b/i,
  /\bthere\b/i, /\bhere\b/i, /\bthen\b/i, /\bnow\b/i, /\bever\b/i,
  /\babout\b/i, /\binto\b/i, /\bout\b/i, /\bup\b/i, /\bdown\b/i,
  /\bover\b/i, /\bunder\b/i, /\bbetween\b/i, /\bthrough\b/i,
  /\balso\b/i, /\btoo\b/i, /\bmore\b/i, /\bmuch\b/i, /\bmany\b/i,
  /\bthese\b/i, /\bthose\b/i, /\bother\b/i,
  /\bdoes\b/i, /\bdid\b/i, /\bdone\b/i, /\bdoing\b/i,
  /\boccur\b/i, /\boccurs\b/i, /\boccurred\b/i,
];

export function containsTooMuchEnglish(...texts: (string | undefined | null)[]): boolean {
  const combined = texts.filter(Boolean).join(' ').toLowerCase();
  if (combined.length < 30) return false;
  const matchCount = ENGLISH_MARKERS.filter((r) => r.test(combined)).length;
  return matchCount >= 4;
}

@Injectable()
export class AiService {
  private providers: Map<string, LLMProvider>;
  private readonly logger = new Logger(AiService.name);
  private readonly exhaustionTracker: ProviderExhaustionTracker;

  constructor(
    private readonly configService: ConfigService,
    private readonly openAIProvider: OpenAIProvider,
    private readonly anthropicProvider: AnthropicProvider,
    private readonly openRouterProvider: OpenRouterProvider,
    private readonly mockProvider: MockProvider,
    private readonly groqProvider?: GroqProvider,
    private readonly googleTextProvider?: GoogleTextProvider,
  ) {
    this.providers = new Map();
    this.providers.set('openai', this.openAIProvider);
    this.providers.set('anthropic', this.anthropicProvider);
    this.providers.set('openrouter', this.openRouterProvider);
    if (this.groqProvider) this.providers.set('groq', this.groqProvider);
    if (this.googleTextProvider) {
      this.providers.set('google', this.googleTextProvider);
      this.providers.set('gemini', this.googleTextProvider);
    }

    const cooldown = parseInt(this.configService.get<string>('PROVIDER_COOLDOWN_MINUTES') || '30', 10);
    this.exhaustionTracker = new ProviderExhaustionTracker(cooldown);
  }

  isMockMode(): boolean {
    const value = this.configService.get<boolean | string>('LLM_MOCK_MODE');
    return value === true || value === 'true';
  }

  isReadingProviderFailureEnabled(): boolean {
    const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase().trim();
    if (nodeEnv === 'production' || nodeEnv === 'staging') return false;
    const value = this.configService.get<boolean | string>('QA_FORCE_READING_PROVIDER_FAILURE');
    return value === true || value === 'true';
  }

  isFreeLlmOnly(): boolean {
    const value = this.configService.get<boolean | string>('FREE_LLM_ONLY');
    // Explicit boolean parsing - only true (case-insensitive) enables free-only mode
    // Never rely on truthy strings like "false"
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase().trim() === 'true';
    return false;
  }

  isImageGenerationEnabled(): boolean {
    const value = this.configService.get<boolean | string>('ENABLE_IMAGE_GENERATION');
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase().trim() === 'true';
    return false;
  }

  isVideoGenerationEnabled(): boolean {
    const value = this.configService.get<boolean | string>('ENABLE_VIDEO_GENERATION');
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase().trim() === 'true';
    return false;
  }

  getProviderForModelId(modelId: string): LLMProvider {
    if (this.isMockMode()) {
      return this.mockProvider;
    }
    const provider = getProviderByModelId(modelId);
    if (!provider) {
      throw new BadRequestException(`Unknown model: ${modelId}`);
    }

    const llmProvider = this.providers.get(provider);
    if (!llmProvider) {
      throw new BadRequestException(`Provider not configured for model '${modelId}' (provider: ${provider})`);
    }
    return llmProvider;
  }

  getModelForRequest(params: {
    plan: SubscriptionType;
    isCinematic?: boolean;
    modelId?: string;
    walletBalance?: number;
  }): AIModel {
    const { plan, isCinematic, modelId, walletBalance } = params;
    const freeOnly = this.isFreeLlmOnly();

    if (modelId) {
      const model = getModelById(modelId);
      if (model && model.isActive) {
        const { allowed, reason } = canUserAccessModel(model, plan, walletBalance, freeOnly);
        if (!allowed) {
          if (reason?.includes('Paid models are disabled')) {
            throw new ForbiddenException(reason);
          }
          throw new BadRequestException(`Model not available: ${reason}`);
        }
        return model;
      }
    }

    if (isCinematic) {
      const cinematicModel = getDefaultCinematicModel();
      const { allowed, reason } = canUserAccessModel(cinematicModel, plan, walletBalance, freeOnly);
      if (allowed) {
        return cinematicModel;
      }
      if (reason?.includes('Paid models are disabled')) {
        throw new ForbiddenException(reason);
      }
      throw new BadRequestException(`Model not available: ${reason}`);
    }

    if (plan === SubscriptionType.PREMIUM && !freeOnly) {
      return getDefaultPremiumModel();
    }

    return getDefaultFreeModel();
  }

  getCatalog(): AIModel[] {
    const freeOnly = this.isFreeLlmOnly();
    return AI_MODEL_CATALOG.filter(m => {
      if (!m.isActive) return false;
      if (freeOnly && m.costMode !== 'FREE') return false;
      return true;
    });
  }

  getModelEntitlement(modelId: string, plan: SubscriptionType, walletBalance?: number): { available: boolean; lockedReason?: string; creditCost?: number } {
    const model = getModelById(modelId);
    if (!model) {
      return { available: false, lockedReason: 'Model not found' };
    }

    if (!model.isActive) {
      return { available: false, lockedReason: 'Model is not available' };
    }

    const freeOnly = this.isFreeLlmOnly();
    const { allowed, reason } = canUserAccessModel(model, plan, walletBalance, freeOnly);
    return {
      available: allowed,
      lockedReason: reason,
      creditCost: model.tier === 'CREDITS' ? model.creditCost : undefined,
    };
  }

  getDefaultModelIdForPlan(plan: SubscriptionType): string {
    const freeOnly = this.isFreeLlmOnly();
    if (freeOnly) {
      const freeModel = getDefaultFreeModel();
      if (freeModel) return freeModel.id;
    }
    if (plan === SubscriptionType.PREMIUM) {
      return getDefaultPremiumModel().id;
    }
    return getDefaultFreeModel().id;
  }

  private shouldUseFreeFallback(modelId: string): boolean {
    const model = getModelById(modelId);
    return this.isFreeLlmOnly() || model?.costMode === 'FREE';
  }

  private async generateWithProviderFallback(prompt: string, config: GenerateConfig, context?: AiGenerationContext): Promise<LLMResponse> {
    const requestedModelId = config.model || getDefaultFreeModel().id;

    if (this.isMockMode()) {
      return this.mockProvider.generate(prompt, config);
    }

    if (!this.shouldUseFreeFallback(requestedModelId)) {
      const provider = this.getProviderForModelId(requestedModelId);
      return provider.generate(prompt, config);
    }

    const fallbackChain = this.buildFreeProviderFallbackChain(requestedModelId, context);

    let lastError: unknown;
    for (const candidate of fallbackChain) {
      const providerKey = candidate.provider.name.toLowerCase();

      // Skip exhausted providers (quota/rate-limit)
      if (this.exhaustionTracker.isExhausted(candidate.provider.name)) {
        this.logger.warn(
          `Provider ${candidate.provider.name} skipped — exhausted (cooldown ${this.exhaustionTracker.getCooldownRemaining(candidate.provider.name)}).`,
        );
        continue;
      }

      try {
        this.logger.log(
          `Attempting provider: ${candidate.provider.name}, model: ${candidate.modelId}`,
        );
        return await candidate.provider.generate(prompt, {
          ...config,
          model: candidate.modelId,
        });
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);

        if (isQuotaExhaustedError(message)) {
          this.exhaustionTracker.markExhausted(candidate.provider.name, message);
          this.logger.warn(
            `Provider ${candidate.provider.name} exhausted (quota/rate-limit) — will skip for the rest of this run.`
          );
        } else {
          this.logger.warn(
            `Provider ${candidate.provider.name} failed (model=${candidate.modelId}): ${message.substring(0, 120)}`,
          );
        }
      }
    }

    const message = lastError instanceof Error ? lastError.message : 'Unknown free LLM provider failure';
    throw new BadGatewayException(`All free LLM providers failed. Last error: ${message}`);
  }

  private async generateWithSpecificProvider(
    provider: LLMProvider,
    prompt: string,
    config: GenerateConfig,
    modelId: string,
  ): Promise<LLMResponse> {
    const providerName = provider.name;

    if (this.exhaustionTracker.isExhausted(providerName)) {
      throw new Error(
        `Provider ${providerName} skipped — exhausted (cooldown ${this.exhaustionTracker.getCooldownRemaining(providerName)}).`,
      );
    }

    try {
      this.logger.log(`Attempting provider: ${providerName}, model: ${modelId}`);
      return await provider.generate(prompt, {
        ...config,
        model: modelId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isQuotaExhaustedError(message)) {
        this.exhaustionTracker.markExhausted(providerName, message);
        this.logger.warn(
          `Provider ${providerName} exhausted (quota/rate-limit) — will skip for the rest of this run.`
        );
      }
      throw error;
    }
  }

  private buildFreeProviderFallbackChain(requestedModelId: string, context?: AiGenerationContext): Array<{ modelId: string; provider: LLMProvider }> {
    const candidates: Array<{ modelId: string; provider: LLMProvider }> = [];
    const addCandidate = (modelId: string, provider?: LLMProvider) => {
      if (!provider) return;
      if (candidates.some(candidate => candidate.modelId === modelId)) return;
      candidates.push({ modelId, provider });
    };

    // Context-aware env chain lookup
    // Priority: context-specific → FREE_TEXT_PROVIDER_CHAIN → TEXT_PROVIDER_CHAIN → default
    const chainEnvVars: string[] = [];
    if (context) chainEnvVars.push(`${context}_TEXT_PROVIDER_CHAIN`);
    chainEnvVars.push('FREE_TEXT_PROVIDER_CHAIN', 'TEXT_PROVIDER_CHAIN');

    let chainEnv: string | undefined;
    for (const varName of chainEnvVars) {
      chainEnv = this.configService.get<string>(varName);
      if (chainEnv) break;
    }

    if (chainEnv) {
      const chainIds = chainEnv.split(',').map((s) => s.trim()).filter(Boolean);
      const modelToId: Record<string, string> = {
        groq: context === 'USER_READING' ? 'groq/reading' : 'groq/free',
        openrouter: 'deepseek/deepseek-v4-flash:free',
        gemini: 'gemini/free',
        google: 'gemini/free',
      };
      for (const providerKey of chainIds) {
        const modelId = modelToId[providerKey] || `${providerKey}/free`;
        const provider = this.providers.get(providerKey);
        if (provider) {
          addCandidate(modelId, provider);
        } else {
          this.logger.warn(`Provider chain references unknown provider: ${providerKey}`);
        }
      }
      if (candidates.length > 0) {
        const ctxLabel = context ? `[${context}] ` : '';
        this.logger.log(`Using env-driven${ctxLabel ? ' ' + ctxLabel.trim() : ''}chain: ${chainIds.join(' → ')}`);
        return candidates;
      }
    }

    // Default chain
    if (requestedModelId !== 'groq/free' && getModelById(requestedModelId)?.costMode === 'FREE') {
      addCandidate(requestedModelId, this.getProviderForModelId(requestedModelId));
    }

    addCandidate(context === 'USER_READING' ? 'groq/reading' : 'groq/free', this.groqProvider);
    addCandidate('deepseek/deepseek-v4-flash:free', this.openRouterProvider);
    addCandidate('gemini/free', this.googleTextProvider);

    return candidates;
  }

  private getProviderNameFromResponse(responseModel: string, requestedModelId: string): string {
    if (
      responseModel === 'groq/free' ||
      responseModel.includes('llama') ||
      responseModel.includes('qwen') ||
      responseModel.includes('gpt-oss')
    ) {
      return 'groq';
    }
    if (responseModel === 'gemini/free' || responseModel.includes('gemini')) {
      return 'google';
    }
    return getProviderByModelId(responseModel) || getProviderByModelId(requestedModelId) || 'unknown';
  }

  async testModel(params: {
    plan: SubscriptionType;
    walletBalance?: number;
    modelId?: string;
  }): Promise<{
    ok: boolean;
    modelId: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    content: string;
  }> {
    const model = this.getModelForRequest({
      plan: params.plan,
      modelId: params.modelId,
      walletBalance: params.walletBalance,
    });
    const response = await this.generateWithProviderFallback(
      'Responda em português, em uma frase curta, confirmando que o modelo de IA do Enredo.ai está configurado.',
      {
        model: model.id,
        maxTokens: 80,
        temperature: 0.2,
      },
    );

    return {
      ok: true,
      modelId: response.model || model.id,
      provider: this.getProviderNameFromResponse(response.model, model.id),
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      content: response.content,
    };
  }

  private buildStoryContext(params: {
    title: string;
    synopsis?: string;
    basePrompt?: string;
    tone?: string;
    styleGuide?: string;
    worldRules?: string;
    genre: string;
    characters?: StoryCharacter[];
  }): string {
    const { title, synopsis, basePrompt, tone, styleGuide, worldRules, genre, characters } = params;

    const parts: string[] = [];
    
    if (basePrompt?.trim()) {
      parts.push(basePrompt.trim());
    } else {
      parts.push(`História: ${title}`);
      if (synopsis?.trim()) {
        parts.push(`Sinopse: ${synopsis.trim()}`);
      }
    }

    parts.push(`Gênero: ${genre}`);

    if (tone?.trim()) {
      parts.push(`Tom narrativo: ${tone.trim()}`);
    }

    if (styleGuide?.trim()) {
      parts.push(`Guia de Estilo: ${styleGuide.trim()}`);
    }

    if (worldRules?.trim()) {
      parts.push(`Regras do Mundo: ${worldRules.trim()}`);
    }

    if (characters && characters.length > 0) {
      const charactersList = characters
        .map((c) => {
          const traits = [
            c.description || 'personagem secundário',
            c.personality ? `Personalidade: ${c.personality}` : '',
            c.motivation ? `Motivacao: ${c.motivation}` : '',
            c.secret ? `Segredo: ${c.secret}` : '',
            c.relationshipToPlayer ? `Relacao com protagonista/jogador: ${c.relationshipToPlayer}` : '',
            c.initialGoal ? `Objetivo inicial: ${c.initialGoal}` : '',
            c.startingSituation ? `Ponto de partida: ${c.startingSituation}` : '',
            c.conflictPotential ? `Potencial de conflito: ${c.conflictPotential}` : '',
          ].filter(Boolean).join('; ');
          return `- ${c.name} (${c.role}): ${traits}`;
        })
        .join('\n');
      parts.push(`PERSONAGENS E PERSONALIDADES:\n${charactersList}`);
    }

    return parts.join('\n\n');
  }

  async generateScene(params: {
    storyTitle: string;
    synopsis?: string;
    basePrompt?: string;
    tone?: string;
    styleGuide?: string;
    worldRules?: string;
    genre: string;
    characters?: StoryCharacter[];
    premiseContext?: {
      title?: string;
      synopsis?: string;
      basePrompt?: string;
      openingScene?: string;
      tone?: string;
      styleGuide?: string;
      worldRules?: string;
    } | null;
    characterContext?: {
      name?: string;
      roleLabel?: string;
      narrativeFunction?: string;
      personality?: string;
      motivation?: string;
      secret?: string;
      relationshipToPlayer?: string;
      initialGoal?: string;
      startingSituation?: string;
      conflictPotential?: string;
    } | null;
    memorySummary?: string | null;
    narrativeMemory?: {
      summary: string;
      worldState: string;
      characterState: string;
      importantChoices: string;
      openThreads: string;
      constraints: string;
    } | null;
    previousSceneText?: string;
    previousChoices?: string[];
    userAction: string;
    userActionType: UserActionType;
    plan: SubscriptionType;
    isCinematic?: boolean;
    modelId?: string;
    walletBalance?: number;
    narrativePolicy?: NarrativePreferencePolicy;
    codexContext?: string;
  }): Promise<SceneGenerationResult> {
    const { 
      storyTitle, synopsis, basePrompt, tone, styleGuide, worldRules, genre, 
      characters, premiseContext, characterContext, memorySummary, narrativeMemory, previousSceneText, previousChoices, 
      userAction, plan, isCinematic, modelId, walletBalance, codexContext,
    } = params;

    const model = this.getModelForRequest({ plan, isCinematic, modelId, walletBalance });
    const maxTokens = isCinematic ? 3000 : Math.min(model.maxTokens, plan === SubscriptionType.PREMIUM ? 2000 : 500);

    const context = this.buildStoryContext({
      title: storyTitle,
      synopsis: premiseContext?.synopsis || synopsis,
      basePrompt: premiseContext?.basePrompt || basePrompt,
      tone: premiseContext?.tone || tone,
      styleGuide: premiseContext?.styleGuide || styleGuide,
      worldRules: premiseContext?.worldRules || worldRules,
      genre,
      characters,
    });

    const premiseNote = premiseContext
      ? `\n\nPREMISSA SELECIONADA:\nTitulo: ${premiseContext.title || 'N/A'}\nSinopse: ${premiseContext.synopsis || 'N/A'}\nCena de abertura: ${premiseContext.openingScene || 'N/A'}`
      : '';

    let characterNote = '';
    if (characterContext) {
      characterNote = `\n\nPERSONAGEM JOGAVEL SELECIONADO:\n`;
      characterNote += `Nome: ${characterContext.name || 'N/A'}\n`;
      characterNote += `Papel: ${characterContext.roleLabel || 'N/A'}\n`;
      characterNote += `Função Narrativa: ${characterContext.narrativeFunction || 'N/A'}\n`;
      if (characterContext.personality) characterNote += `Personalidade: ${characterContext.personality}\n`;
      if (characterContext.motivation) characterNote += `Motivação: ${characterContext.motivation}\n`;
      if (characterContext.secret) characterNote += `Segredo: ${characterContext.secret}\n`;
      if (characterContext.relationshipToPlayer) characterNote += `Relacionamento com o Jogador: ${characterContext.relationshipToPlayer}\n`;
      if (characterContext.initialGoal) characterNote += `Objetivo Inicial: ${characterContext.initialGoal}\n`;
      if (characterContext.startingSituation) characterNote += `Ponto de Partida: ${characterContext.startingSituation}\n`;
      if (characterContext.conflictPotential) characterNote += `Potencial de Conflito: ${characterContext.conflictPotential}\n`;
    }

    let memoryContext = '';
    if (narrativeMemory) {
      memoryContext = `\n\n--- MEMORIA PERSISTENTE ---\n`;
      if (narrativeMemory.constraints) {
        memoryContext += `Restricoes: ${narrativeMemory.constraints}\n`;
      }
      if (narrativeMemory.worldState) {
        memoryContext += `Estado do Mundo: ${narrativeMemory.worldState}\n`;
      }
      if (narrativeMemory.characterState) {
        memoryContext += `Personagens: ${narrativeMemory.characterState}\n`;
      }
      if (narrativeMemory.summary) {
        memoryContext += `Historico: ${narrativeMemory.summary}\n`;
      }
      if (narrativeMemory.importantChoices) {
        memoryContext += `Escolhas Importantes: ${narrativeMemory.importantChoices}\n`;
      }
      if (narrativeMemory.openThreads) {
        memoryContext += `Trilhas em Aberto: ${narrativeMemory.openThreads}\n`;
      }
      if (codexContext) {
        memoryContext += `\n${codexContext}\n`;
      }
      memoryContext += `--- FIM MEMORIA ---\n\n`;
    }

    const history = memorySummary || 'Nenhum resumo disponível ainda. Esta é uma nova sessão.';

    const previousScene = previousSceneText
      ? `Cena anterior:\n${previousSceneText}\nEscolhas oferecidas: ${previousChoices?.join(', ') || 'nenhuma'}`
      : 'Esta é a primeira cena da história.';

    const sceneInstruction = isCinematic 
      ? 'Esta é uma cena CINEMÁTICA. Escreva com prosa literária rica e atmosfera intensa (8-12 parágrafos). IMPORTANTE: mesmo no modo cinematográfico, mantenha personagens ativos que reagem ao leitor, diálogos com subtexto, e evite exposição descritiva excessiva. A cena deve sentir-se viva, não um bloco de narração.'
      : 'Esta é uma cena narrativa interativa. Cena padrão: ~180-350 palavras, 2-4 blocos. Foco em personagens que reagem à ação do leitor, com diálogo, subtexto e tensão. Narração atmosférica concisa — apenas o suficiente para ambientar. Termine com um ponto de decisão natural. Escolhas devem ser relacionais e específicas da cena.';

    const prompt = memoryContext + premiseNote + characterNote + SCENE_GENERATION_PROMPT
      .replace('{context}', context)
      .replace('{history}', history)
      .replace('{previousScene}', previousScene)
      .replace('{userAction}', userAction)
      .replace('{instruction}', sceneInstruction)
      + this.buildNarrativePolicyInstruction(params.narrativePolicy);

    const response = await this.generateWithProviderFallback(prompt, {
      model: model.id,
      maxTokens,
      temperature: isCinematic ? 0.75 : 0.7,
    }, 'USER_READING');

    return this.parseSceneResponse(response, model.id);
  }

  async generateFirstScene(params: {
    title: string;
    synopsis?: string;
    basePrompt?: string;
    tone?: string;
    styleGuide?: string;
    worldRules?: string;
    openingScene?: string;
    genre: string;
    characters?: StoryCharacter[];
    plan: SubscriptionType;
    isCinematic?: boolean;
    modelId?: string;
    walletBalance?: number;
    narrativeMemory?: {
      summary: string;
      worldState: string;
      characterState: string;
      importantChoices: string;
      openThreads: string;
      constraints: string;
    } | null;
    premiseContext?: {
      title?: string;
      synopsis?: string;
      basePrompt?: string;
      openingScene?: string;
      tone?: string;
      styleGuide?: string;
      worldRules?: string;
    } | null;
    characterContext?: {
      name?: string;
      roleLabel?: string;
      narrativeFunction?: string;
      personality?: string;
      motivation?: string;
      secret?: string;
      relationshipToPlayer?: string;
      initialGoal?: string;
      startingSituation?: string;
      conflictPotential?: string;
    } | null;
    narrativePolicy?: NarrativePreferencePolicy;
    codexContext?: string;
  }): Promise<SceneGenerationResult> {
    const {
      title, synopsis, basePrompt, tone, styleGuide, worldRules, openingScene, genre, characters,
      plan, isCinematic, modelId, walletBalance, narrativeMemory,
      premiseContext, characterContext, codexContext,
    } = params;

    const model = this.getModelForRequest({ plan, isCinematic, modelId, walletBalance });
    const maxTokens = isCinematic ? 3000 : Math.min(model.maxTokens, plan === SubscriptionType.PREMIUM ? 2000 : 500);

    const context = this.buildStoryContext({
      title,
      synopsis: premiseContext?.synopsis || synopsis,
      basePrompt: premiseContext?.basePrompt || basePrompt,
      tone: premiseContext?.tone || tone,
      styleGuide: premiseContext?.styleGuide || styleGuide,
      worldRules: premiseContext?.worldRules || worldRules,
      genre,
      characters,
    });

    const openingNote = (premiseContext?.openingScene || openingScene)?.trim()
      ? `\n\nCena de abertura sugerida: ${premiseContext?.openingScene || openingScene?.trim()}`
      : '';

    let characterNote = '';
    if (characterContext) {
      characterNote = `\n\nPERSONAGEM JOGAVEL SELECIONADO:\n`;
      characterNote += `Nome: ${characterContext.name || 'N/A'}\n`;
      characterNote += `Papel: ${characterContext.roleLabel || 'N/A'}\n`;
      characterNote += `Função Narrativa: ${characterContext.narrativeFunction || 'N/A'}\n`;
      if (characterContext.personality) characterNote += `Personalidade: ${characterContext.personality}\n`;
      if (characterContext.motivation) characterNote += `Motivação: ${characterContext.motivation}\n`;
      if (characterContext.secret) characterNote += `Segredo: ${characterContext.secret}\n`;
      if (characterContext.relationshipToPlayer) characterNote += `Relacionamento com o Jogador: ${characterContext.relationshipToPlayer}\n`;
      if (characterContext.initialGoal) characterNote += `Objetivo Inicial: ${characterContext.initialGoal}\n`;
      if (characterContext.startingSituation) characterNote += `Ponto de Partida: ${characterContext.startingSituation}\n`;
      if (characterContext.conflictPotential) characterNote += `Potencial de Conflito: ${characterContext.conflictPotential}\n`;
    }

    const sceneInstruction = isCinematic
      ? 'Esta é a PRIMEIRA cena CINEMÁTICA. Ela deve ser épica e envolvente com um hook poderoso, estabelecer cenário e personagens com riqueza literária, e criar curiosidade intensa no leitor. IMPORTANTE: mesmo no modo cinematográfico, inclua personagens ativos, diálogo com subtexto, e evite exposição descritiva excessiva. A cena deve sentir-se viva desde a primeira linha.'
      : 'Esta é a primeira cena da história interativa. ~180-350 palavras. Comece no ponto de partida específico do personagem selecionado. Hook na primeira ou segunda frase. Atmosfera concisa + presença ativa de ao menos um personagem + curiosidade imediata. Escolhas devem ser relacionais e específicas do momento inicial.';

    let memoryContext = '';
    if (narrativeMemory) {
      memoryContext = `\n\n--- MEMORIA PERSISTENTE ---\n`;
      if (narrativeMemory.constraints) {
        memoryContext += `Restricoes: ${narrativeMemory.constraints}\n`;
      }
      if (narrativeMemory.worldState) {
        memoryContext += `Estado do Mundo: ${narrativeMemory.worldState}\n`;
      }
      if (narrativeMemory.characterState) {
        memoryContext += `Personagens: ${narrativeMemory.characterState}\n`;
      }
      if (narrativeMemory.summary) {
        memoryContext += `Historico: ${narrativeMemory.summary}\n`;
      }
      if (narrativeMemory.importantChoices) {
        memoryContext += `Escolhas Importantes: ${narrativeMemory.importantChoices}\n`;
      }
      if (narrativeMemory.openThreads) {
        memoryContext += `Trilhas em Aberto: ${narrativeMemory.openThreads}\n`;
      }
      if (codexContext) {
        memoryContext += `\n${codexContext}\n`;
      }
      memoryContext += `--- FIM MEMORIA ---\n\n`;
    }

    const prompt = memoryContext + characterNote + FIRST_SCENE_PROMPT
      .replace('{title}', title)
      .replace('{context}', context + openingNote)
      .replace('{genre}', genre)
      .replace('{instruction}', sceneInstruction)
      + this.buildNarrativePolicyInstruction(params.narrativePolicy);

    const response = await this.generateWithProviderFallback(prompt, {
      model: model.id,
      maxTokens,
      temperature: isCinematic ? 0.85 : 0.8,
    }, 'USER_READING');

    return this.parseSceneResponse(response, model.id);
  }

  async summarizeMemory(scenes: string[]): Promise<string> {
    const scenesText = scenes.join('\n\n---\n\n');

    const prompt = MEMORY_SUMMARY_PROMPT.replace('{scenes}', scenesText);

    const freeOnly = this.isFreeLlmOnly();
    const model = getDefaultUtilityModel(freeOnly);
    const response = await this.generateWithProviderFallback(prompt, {
      model: model.id,
      maxTokens: 500,
      temperature: 0.3,
    }, 'UTILITY');

    return response.content.trim();
  }

  async generatePremises(params: {
    storyTitle: string;
    storySynopsis: string;
    genre: string;
    count?: number;
    context?: AiGenerationContext;
  }): Promise<Array<{
    title: string;
    synopsis: string;
    basePrompt: string;
    openingScene?: string;
    tone?: string;
    styleGuide?: string;
    worldRules?: string;
    coverPrompt?: string;
  }>> {
    const count = params.count || 3;
    const mockMode = this.isMockMode();

    if (mockMode) {
      return this.generateMockPremises(params.storyTitle, count);
    }

    const prompt = `Você é um roteirista criativo especializado em histórias interativas.
Gere ${count} premissas abertas (starting setups) para a história "${params.storyTitle}".
Sinopse original: ${params.storySynopsis}
Gênero: ${params.genre}

Responda em português do Brasil. Todos os campos devem estar em pt-BR.

Para cada premissa, forneça:
- Um título curto e envolvente
- Uma situação inicial (starting situation)
- Uma pergunta dramática (dramatic question) que impulsiona a história
- Um base prompt detalhado para a IA gerar cenas continuamente
- Uma cena de abertura sugerida (opcional)
- Tom narrativo (opcional)
- Guia de estilo (opcional)
- Regras do mundo (opcional)
- Um prompt visual para capa/hero image, sem texto ou logo

IMPORTANTE: Cada premissa é um ponto de partida aberto.
- NÃO defina um final fixo
- NÃO defina uma sequência de capítulos
- NÃO defina caminhos ou ramificações predeterminadas
- A história deve continuar organicamente baseada nas ações em texto livre do usuário
- A IA deve gerar situações dinamicamente a cada interação

FORMATO DE RESPOSTA:
Sua resposta deve ser EXCLUSIVAMENTE um JSON array válido. Nenhum texto antes ou depois. Nenhum markdown. Nenhuma explicação. Apenas o JSON puro:
[
  {
    "title": "string",
    "synopsis": "string",
    "basePrompt": "string",
    "openingScene": "string",
    "tone": "string",
    "styleGuide": "string",
    "worldRules": "string",
    "coverPrompt": "string"
  }
]`;

    const freeOnly = this.isFreeLlmOnly();
    const model = getDefaultUtilityModel(freeOnly);

    const result = await this.tryGenerateJson(prompt, model.id, 'premises', (parsed) => {
      if (!Array.isArray(parsed) || parsed.length < count) return false;
      if (!parsed.every((p: any) => p.title && p.synopsis && p.basePrompt)) return false;
      if (containsTooMuchEnglish(
        ...parsed.map((p: any) =>
          `${p.title} ${p.synopsis} ${p.basePrompt} ${p.openingScene || ''} ${p.tone || ''} ${p.styleGuide || ''} ${p.worldRules || ''} ${p.coverPrompt || ''}`,
        ),
      )) {
        this.logger.warn('Premise generation returned English content. Retrying with stronger pt-BR instruction.');
        return false;
      }
      return true;
    }, params.context || 'UTILITY');

    return result;
  }

  async generatePlayableCharacters(params: {
    storyTitle: string;
    storySynopsis?: string;
    premiseTitle: string;
    premiseSynopsis: string;
    premiseBasePrompt?: string | null;
    premiseTone?: string | null;
    premiseWorldRules?: string | null;
    count?: number;
    context?: AiGenerationContext;
  }): Promise<Array<{
    name: string;
    roleLabel: string;
    narrativeFunction: string;
    description?: string;
    personality?: string;
    motivation?: string;
    secret?: string;
    relationshipToPlayer?: string;
    initialGoal?: string;
    startingSituation?: string;
    conflictPotential?: string;
    visualPrompt?: string;
  }>> {
    const count = params.count || 3;
    const mockMode = this.isMockMode();

    if (mockMode) {
      return this.generateMockCharacters(params.storyTitle, params.premiseTitle, params.premiseSynopsis, count);
    }

    const prompt = `Você é um criador de personagens para histórias interativas.
Gere ${count} personagens jogáveis para a história "${params.storyTitle}".
Sinopse da história: ${params.storySynopsis || 'Não informada'}
Premissa: ${params.premiseTitle}
Sinopse da premissa: ${params.premiseSynopsis}
Base narrativa da premissa: ${params.premiseBasePrompt || 'Não informada'}
Tom: ${params.premiseTone || 'Não informado'}
Regras do mundo: ${params.premiseWorldRules || 'Não informadas'}

Responda em português do Brasil. Todos os campos (name, roleLabel, description, personality, motivation, startingSituation) devem estar em pt-BR.

OBJETIVO DE PRODUTO:
Cada personagem deve ser uma porta diferente para a MESMA premissa. O usuário precisa sentir que está escolhendo uma versão diferente da história, com ponto de vista, informação inicial, conflito e primeira cena próprios.

REGRAS OBRIGATÓRIAS:
- Todos os nomes, papéis e descrições devem fazer sentido para a história e para a premissa acima.
- A descrição do personagem NÃO pode repetir a sinopse da premissa. Ela deve explicar quem esta pessoa é, qual ferida/desejo carrega, o que ela sabe que os outros não sabem e por que jogar com ela muda a experiência.
- NÃO use rótulos genéricos visíveis como "O Protagonista", "A Protagonista", "O Herói", "A Heroína", "O Vilão", "A Vilã", "O Mentor", "A Mentora", "Aliado", "Rival" ou traduções diretas de arquétipos.
- A função narrativa pode usar o enum interno, mas o roleLabel deve ser específico e dramático, por exemplo "A irmã que voltou depois da meia-noite" ou "O vigia que trancou o portão cedo demais".
- Cada personagem deve ter um ponto de partida próprio, concreto e jogável dentro da premissa.
- Os três pontos de partida devem mudar o que o jogador sabe, quer e teme na primeira cena.
- Não crie personagens intercambiáveis. Cada escolha precisa prometer uma experiência diferente.
- Não descreva todos como "presos à premissa", "ponto de vista diferente" ou frases equivalentes. Isso é metatexto de produto, não descrição narrativa.

Para cada personagem, forneça:
- Nome
- Rótulo de papel específico da história, não arquétipo genérico
- Função narrativa (HERO, MENTOR, ALLY, SKEPTIC, RIVAL, VILLAIN, TRICKSTER, SHADOW, HARBINGER, GUARDIAN)
- Descrição breve conectada à premissa
- Personalidade
- Motivação
- Segredo
- Relacionamento com o jogador
- Objetivo inicial
- Ponto de partida inicial específico do personagem
- Potencial de conflito
- Um prompt visual do retrato do personagem, sem texto ou logo

FORMATO DE RESPOSTA:
Responda APENAS com um JSON array (sem markdown, sem código, apenas o JSON puro):
[
  {
    "name": "Nome do Personagem 1",
    "roleLabel": "Rótulo do Papel",
    "narrativeFunction": "HERO",
    "description": "Descrição...",
    "personality": "Personalidade...",
    "motivation": "Motivação...",
    "secret": "Segredo...",
    "relationshipToPlayer": "Relacionamento...",
    "initialGoal": "Objetivo inicial...",
    "startingSituation": "Onde e como esta versão da história começa para este personagem...",
    "conflictPotential": "Potencial de conflito...",
    "visualPrompt": "prompt visual do retrato do personagem"
  }
]`;

    const freeOnly = this.isFreeLlmOnly();
    const model = getDefaultUtilityModel(freeOnly);

    return this.tryGenerateJson(prompt, model.id, 'characters', (parsed) => {
      if (!Array.isArray(parsed) || parsed.length < count) return false;
      if (!parsed.every((c: any) =>
        c.name && c.roleLabel && c.narrativeFunction
        && c.description && c.personality
        && c.startingSituation
      )) return false;
      if (containsTooMuchEnglish(
        ...parsed.map((c: any) =>
          `${c.roleLabel} ${c.description} ${c.personality} ${c.motivation || ''} ${c.secret || ''} ${c.relationshipToPlayer || ''} ${c.initialGoal || ''} ${c.startingSituation || ''} ${c.conflictPotential || ''} ${c.visualPrompt || ''}`,
        ),
      )) {
        this.logger.warn('Character generation returned English content. Retrying with stronger pt-BR instruction.');
        return false;
      }
      return true;
    }, params.context || 'UTILITY');
  }

  async generateStoryDraft(params: {
    keywords: string[];
    genre?: string;
    tone?: string;
    targetAudience?: string;
    constraints?: string;
    modelId: string;
    maxTokens?: number;
    context?: AiGenerationContext;
  }): Promise<{
    title: string;
    synopsis: string;
    genres: string[];
    openingScene: string;
    basePrompt?: string;
    tone?: string;
    styleGuide?: string;
    worldRules?: string;
    language?: string;
    maturityRating?: string;
  }> {
    if (this.isMockMode()) {
      throw new BadRequestException('generateStoryDraft should not be called in mock mode.');
    }

    const prompt = `Você é o roteirista principal do Enredo.ai, um app de histórias interativas.
Crie UMA história-base original em português do Brasil para depois ser jogada com premissas e personagens gerados por IA.

Entradas do usuário:
- Palavras-chave: ${params.keywords.join(', ')}
- Gênero desejado: ${params.genre || 'livre'}
- Tom desejado: ${params.tone || 'cinematográfico'}
- Público-alvo: ${params.targetAudience || 'jovem adulto/adulto'}
- Restrições: ${params.constraints || 'nenhuma restrição adicional'}

Regras:
- A história deve ser aberta e interativa, não um conto fechado.
- Não escreva final fixo.
- Crie um conflito central forte, um mundo legível e segredos suficientes para várias cenas.
- A sinopse deve vender a fantasia do jogo, não explicar mecânica.
- O openingScene deve ser uma primeira cena jogável, sensorial e com gancho imediato.
- basePrompt, styleGuide e worldRules serão usados por outros agentes de IA; escreva com precisão operacional.

Responda APENAS com um JSON object:
{
  "title": "Título curto e memorável",
  "synopsis": "Sinopse de 2 a 4 frases, específica e dramática",
  "genres": ["gênero principal", "subgênero"],
  "openingScene": "Cena inicial jogável com no mínimo 80 palavras",
  "basePrompt": "Contrato narrativo para continuar esta história interativa",
  "tone": "tom narrativo",
  "styleGuide": "guia de estilo prático para novas cenas",
  "worldRules": "regras do mundo, limites e verdades ocultas",
  "language": "pt-BR",
  "maturityRating": "12+"
}`;

    const response = await this.generateWithProviderFallback(prompt, {
      model: params.modelId,
      maxTokens: params.maxTokens || 1500,
      temperature: 0.85,
    }, params.context || 'USER_STORY');

    const parsed = this.parseAndValidateStoryDraft(response.content);

    if (!parsed || typeof parsed !== 'object') {
      this.logger.warn(
        `First story-draft generation produced invalid JSON (${response.content.length} chars). Attempting repair.`,
      );

      const repairPrompt = `A sua resposta anterior para geração de história não estava no formato correto.

Sua resposta anterior foi:
${response.content.substring(0, 2000)}

IMPORTANTE: Todos os campos de texto (title, synopsis, openingScene, basePrompt, tone, styleGuide, worldRules) devem estar em português do Brasil. NÃO use inglês em nenhum campo.

Por favor, retorne EXCLUSIVAMENTE um JSON object válido com TODOS os campos obrigatórios. Nenhum texto antes ou depois do JSON. Nenhum markdown. Apenas o JSON puro.`;

      const repairResponse = await this.generateWithProviderFallback(repairPrompt, {
        model: params.modelId,
        maxTokens: params.maxTokens || 1500,
        temperature: 0.3,
      }, params.context || 'USER_STORY');

      const repaired = this.parseAndValidateStoryDraft(repairResponse.content);

      if (!repaired || typeof repaired !== 'object') {
        throw new BadGatewayException(
          'AI story generation returned invalid JSON after 2 attempts. No mock story was persisted.',
        );
      }

      return repaired as any;
    }

    return parsed as any;
  }

  private parseAndValidateStoryDraft(content: string): Record<string, any> | null {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

      if (
        !parsed.title ||
        !parsed.synopsis ||
        !Array.isArray(parsed.genres) ||
        parsed.genres.length === 0 ||
        !parsed.openingScene ||
        !parsed.basePrompt ||
        !parsed.tone ||
        !parsed.styleGuide ||
        !parsed.worldRules ||
        !parsed.language ||
        !parsed.maturityRating
      ) {
        return null;
      }

      if (containsTooMuchEnglish(
        parsed.title,
        parsed.synopsis,
        parsed.openingScene,
        parsed.basePrompt,
        parsed.tone,
        parsed.styleGuide,
        parsed.worldRules,
      )) {
        this.logger.warn('Story draft generation returned English content. Retrying with stronger pt-BR instruction.');
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private async tryGenerateJson(
    prompt: string,
    modelId: string,
    label: string,
    validate: (parsed: any) => boolean,
    context?: AiGenerationContext,
  ): Promise<any> {
    const firstConfig: GenerateConfig = {
      model: modelId,
      maxTokens: 3000,
      temperature: 0.8,
    };

    if (context === 'ADMIN_CATALOG' && this.shouldUseFreeFallback(modelId) && !this.isMockMode()) {
      const fallbackChain = this.buildFreeProviderFallbackChain(modelId, context);
      let lastError: unknown;

      for (const candidate of fallbackChain) {
        try {
          return await this.tryGenerateJsonWithProvider(
            prompt,
            firstConfig,
            label,
            validate,
            candidate.provider,
            candidate.modelId,
          );
        } catch (error) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error);
          if (isQuotaExhaustedError(message)) {
            continue;
          }
          this.logger.warn(
            `Provider ${candidate.provider.name} returned invalid ${label} JSON after repair. Trying next provider if available.`,
          );
        }
      }

      const message = lastError instanceof Error ? lastError.message : `AI ${label} generation returned invalid JSON`;
      throw new BadGatewayException(message);
    }

    return this.tryGenerateJsonWithResponses(
      prompt,
      label,
      validate,
      () => this.generateWithProviderFallback(prompt, firstConfig, context),
      (repairPrompt) => this.generateWithProviderFallback(repairPrompt, {
        model: modelId,
        maxTokens: 3000,
        temperature: 0.3,
      }, context),
    );
  }

  private async tryGenerateJsonWithProvider(
    prompt: string,
    firstConfig: GenerateConfig,
    label: string,
    validate: (parsed: any) => boolean,
    provider: LLMProvider,
    modelId: string,
  ): Promise<any> {
    return this.tryGenerateJsonWithResponses(
      prompt,
      label,
      validate,
      () => this.generateWithSpecificProvider(provider, prompt, firstConfig, modelId),
      (repairPrompt) => this.generateWithSpecificProvider(provider, repairPrompt, {
        model: modelId,
        maxTokens: 3000,
        temperature: 0.3,
      }, modelId),
    );
  }

  private async tryGenerateJsonWithResponses(
    prompt: string,
    label: string,
    validate: (parsed: any) => boolean,
    generateFirst: () => Promise<LLMResponse>,
    generateRepair: (repairPrompt: string) => Promise<LLMResponse>,
  ): Promise<any> {
    const firstResponse = await generateFirst();

    try {
      const extracted = this.extractJsonArray(firstResponse.content, label);
      const parsed = JSON.parse(extracted);
      if (validate(parsed)) return parsed;
      throw new Error('Validation failed');
    } catch {
      this.logger.warn(
        `First ${label} generation produced invalid JSON (${firstResponse.content.length} chars). Attempting repair.`,
      );
    }

    const languageInstruction = (label === 'premises' || label === 'characters' || label === 'story')
      ? '\n\nIMPORTANTE: Todos os campos de texto devem estar em português do Brasil. NÃO use inglês em nenhum campo.'
      : '';

    const repairPrompt = `A sua resposta anterior para geração de ${label} não estava no formato correto ou estava incompleta.

Sua resposta anterior foi:
${firstResponse.content.substring(0, 2000)}

Por favor, retorne EXCLUSIVAMENTE um JSON array válido com TODOS os campos obrigatórios. Nenhum texto antes ou depois do JSON. Nenhum markdown. Apenas o JSON puro.${languageInstruction}`;

    const repairResponse = await generateRepair(repairPrompt);

    try {
      const extracted = this.extractJsonArray(repairResponse.content, label);
      const parsed = JSON.parse(extracted);
      if (validate(parsed)) return parsed;
    } catch {
      // both attempts failed — fall through
    }

    throw new BadGatewayException(
      `AI ${label} generation returned invalid JSON after 2 attempts. No mock data was persisted.`,
    );
  }

  private extractJsonArray(content: string, label: string): string {
    let cleaned = content.trim();

    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return arrayMatch[0];
    }

    throw new Error(`No JSON array found in ${label} response`);
  }

  private buildNarrativePolicyInstruction(policy?: NarrativePreferencePolicy): string {
    if (!policy) {
      return '\n\n--- DIRETRIZES DE CONTEÚDO ---\n' +
        'Romance permitido: apenas sugestivo e emocional.\n' +
        'Conteúdo adulto explícito: NÃO permitido.\n' +
        'Personagens devem ser adultos. Sem menores em contexto sexual.\n' +
        'Sem coerção, violência sexual, incesto, exploração ou incapacidade.\n' +
        'Sem uso de imagem real, foto de perfil ou aparência do usuário em contexto sexual.\n' +
        'Mantenha o tom adequado ao público geral. Use fade-to-black se necessário.\n' +
        '--- FIM DIRETRIZES ---\n';
    }

    const level = policy.effectiveRomanceIntensity;

    if (level === 'NONE') {
      return '\n\n--- DIRETRIZES DE CONTEÚDO ---\n' +
        'Romance e tensão sensual: NÃO permitidos.\n' +
        'Conteúdo adulto explícito: NÃO permitido.\n' +
        'Sem coerção, violência sexual, incesto, exploração ou incapacidade.\n' +
        'Sem uso de imagem real, foto de perfil ou aparência do usuário em contexto sexual.\n' +
        '--- FIM DIRETRIZES ---\n';
    }

    if (level === 'SOFT') {
      return '\n\n--- DIRETRIZES DE CONTEÚDO ---\n' +
        'Romance permitido: sugestivo e emocional, sem conteúdo explícito.\n' +
        'Conteúdo adulto explícito: NÃO permitido.\n' +
        'Personagens devem ser adultos. Sem menores em contexto sexual.\n' +
        'Sem coerção, violência sexual, incesto, exploração ou incapacidade.\n' +
        'Sem uso de imagem real, foto de perfil ou aparência do usuário em contexto sexual.\n' +
        'Use fade-to-black se a cena se aproximar de intimidade física.\n' +
        '--- FIM DIRETRIZES ---\n';
    }

    if (level === 'INTENSE') {
      return '\n\n--- DIRETRIZES DE CONTEÚDO ---\n' +
        'Romance permitido: tensão e conflito romântico fortes.\n' +
        'Conteúdo adulto explícito: NÃO permitido.\n' +
        'Personagens devem ser adultos. Sem menores em contexto sexual.\n' +
        'Sem coerção, violência sexual, incesto, exploração ou incapacidade.\n' +
        'Sem uso de imagem real, foto de perfil ou aparência do usuário em contexto sexual.\n' +
        'Use fade-to-black se a cena se aproximar de intimidade física.\n' +
        '--- FIM DIRETRIZES ---\n';
    }

    if (level === 'ADULT_18' && policy.adultContentAllowed) {
      return '\n\n--- DIRETRIZES DE CONTEÚDO ---\n' +
        'Conteúdo adulto permitido: SIM.\n' +
        'Intensidade permitida: ADULT_18.\n' +
        'Apenas personagens adultos e consentimento.\n' +
        'Sem menores em qualquer contexto sexual.\n' +
        'Sem coerção, violência sexual, incesto, exploração ou incapacidade.\n' +
        'Sem uso de imagem real, foto de perfil ou aparência do usuário em conteúdo sexual explícito.\n' +
        'Mantenha o conteúdo adulto contextual à história e às ações do usuário.\n' +
        '--- FIM DIRETRIZES ---\n';
    }

    if (level === 'ADULT_18' && !policy.adultContentAllowed) {
      return '\n\n--- DIRETRIZES DE CONTEÚDO ---\n' +
        'Romance permitido: tensão e conflito romântico fortes.\n' +
        'Conteúdo adulto explícito: NÃO permitido (confirmações pendentes).\n' +
        'Personagens devem ser adultos. Sem menores em contexto sexual.\n' +
        'Sem coerção, violência sexual, incesto, exploração ou incapacidade.\n' +
        'Sem uso de imagem real, foto de perfil ou aparência do usuário em contexto sexual.\n' +
        'Use fade-to-black se a cena se aproximar de intimidade física.\n' +
        '--- FIM DIRETRIZES ---\n';
    }

    return '';
  }

  private generateMockPremises(storyTitle: string, count: number): Array<{
    title: string;
    synopsis: string;
    basePrompt: string;
    openingScene?: string;
    tone?: string;
    styleGuide?: string;
    worldRules?: string;
    coverPrompt?: string;
  }> {
    const prefixes = ['Aventura', 'Mistério', 'Drama'];
    return Array.from({ length: count }, (_, i) => ({
      title: `${prefixes[i]} em ${storyTitle}`,
      synopsis: `Uma versão ${prefixes[i].toLowerCase()} de ${storyTitle} com desafios únicos.`,
      basePrompt: `Você é o protagonista nesta versão de ${storyTitle}. ${prefixes[i]} aguarda.`,
      openingScene: `Você acorda em ${storyTitle} pronto para ${prefixes[i].toLowerCase()}.`,
      tone: 'dramático',
      styleGuide: 'narrativo',
      worldRules: 'Mundo consistente',
      coverPrompt: `Capa cinematográfica de ${storyTitle}, atmosfera ${prefixes[i].toLowerCase()}, sem texto, sem logo`,
    }));
  }

  private generateMockCharacters(storyTitle: string, premiseTitle: string, premiseSynopsis: string, count: number): Array<{
    name: string;
    roleLabel: string;
    narrativeFunction: string;
    description?: string;
    personality?: string;
    motivation?: string;
    secret?: string;
    relationshipToPlayer?: string;
    initialGoal?: string;
    startingSituation?: string;
    conflictPotential?: string;
    visualPrompt?: string;
  }> {
    const templates = [
      {
        name: 'Lia',
        roleLabel: 'A pessoa que acordou fora do próprio destino',
        narrativeFunction: 'HERO',
        motivation: 'Descobrir por que a noite começou antes dela lembrar',
        startingSituation: `Você desperta dentro de "${premiseTitle}" com uma pista ligada a ${storyTitle} que ninguém mais deveria possuir.`,
      },
      {
        name: 'Caio',
        roleLabel: 'Quem conhece a porta que nunca devia abrir',
        narrativeFunction: 'GUARDIAN',
        motivation: 'Impedir que uma antiga culpa volte a machucar alguém',
        startingSituation: `Você está no limite de "${premiseTitle}" quando percebe que alguém atravessou uma passagem impossível ligada ao conflito de ${storyTitle}.`,
      },
      {
        name: 'Mara',
        roleLabel: 'A lembrança que todos tentaram apagar',
        narrativeFunction: 'SHADOW',
        motivation: 'Entender se é vítima, testemunha ou causa do que está acontecendo',
        startingSituation: `Você surge dentro da versão mais perigosa de "${premiseTitle}", vendo uma verdade de ${storyTitle} por um ângulo que os outros jamais aceitariam.`,
      },
    ];
    return templates.slice(0, count).map(t => ({
      ...t,
      description: `${t.name} carrega uma culpa, desejo ou pista própria dentro desta história: ${premiseSynopsis}`,
      personality: 'Intenso, atento aos detalhes e movido por uma tensão pessoal',
      secret: 'Sabe uma parte da verdade que ainda não consegue admitir',
      relationshipToPlayer: 'Ponto de vista jogável com informação própria',
      initialGoal: t.motivation,
      conflictPotential: 'Pode esconder informações, desconfiar de aliados e transformar uma pista em conflito',
      visualPrompt: `Retrato editorial cinematográfico de ${t.name}, ${t.roleLabel}, conectado a ${premiseTitle}, atmosfera dramática, expressão ambígua, sem texto, sem logo`,
    }));
  }

  private parseSceneResponse(response: { content: string; inputTokens: number; outputTokens: number; model: string }, model: string): SceneGenerationResult {
    const parsed = this.parseSceneJson(response);
    const normalized = this.normalizeParsedScene(parsed);
    const sceneText = normalized.sceneText || normalized.scene_text;

    if (!this.isValidSceneText(sceneText)) {
      this.logger.error('LLM scene response had invalid sceneText', {
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        contentLength: response.content?.length ?? 0,
        sceneTextPreview: typeof sceneText === 'string' ? sceneText.substring(0, 120) : typeof sceneText,
      });
      throw new BadGatewayException('AI scene generation returned invalid scene text.');
    }

    const choices = Array.isArray(normalized.choices)
      ? normalized.choices
          .filter((choice: unknown): choice is string => typeof choice === 'string' && choice.trim().length > 0)
          .map((choice: string) => this.normalizeChoiceQuotes(choice.trim()).substring(0, 120))
          .slice(0, 3)
      : [];

    return {
      sceneText: this.normalizeSceneTextQuotes(sceneText.trim()),
      choices: choices.length > 0 ? choices : ['Continuar', 'Explorar', 'Voltar'],
      modelUsed: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      costUsd: this.calculateCost(response.inputTokens, response.outputTokens, response.model),
      sceneMetadata: normalized.sceneMetadata || { emotion: 'neutra', pacing: 'media' },
    };
  }

  private parseSceneJson(response: { content: string; inputTokens: number; outputTokens: number; model: string }): any {
    const parsed = this.tryParseJsonObject(response.content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }

    this.logger.error('Failed to parse LLM scene response', {
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      contentLength: response.content?.length ?? 0,
    });
    throw new BadGatewayException('AI scene generation returned invalid JSON.');
  }

  private normalizeSceneTextQuotes(text: string): string {
    if (text.length < 4) return text;

    // Step 1: convert smart/curly quotes to straight quotes
    let normalized = text
      .replace(/^[\u201C\u2018\u201D\u2019]/, '"')
      .replace(/[\u201D\u2019\u201C\u2018]$/, '"');

    // Step 2: handle escaped wrapper quotes \"text\" -> "text"
    if (normalized.startsWith('\\"') && normalized.endsWith('\\"')) {
      normalized = '"' + normalized.substring(2, normalized.length - 2) + '"';
    }

    // Step 3: strip one pair of external straight quotes
    const startsWithQuote = normalized.startsWith('"');
    const endsWithQuote = normalized.endsWith('"');
    if (startsWithQuote && endsWithQuote) {
      const inner = normalized.substring(1, normalized.length - 1);
      const innerQuoteCount = (inner.match(/"/g) || []).length;
      if (innerQuoteCount % 2 === 0 && inner.length > 20) {
        return this.unescapeDialogueQuotes(inner.trim());
      }
    }

    return text;
  }

  private normalizeChoiceQuotes(text: string): string {
    if (text.length < 2) return text;

    // Step 1: convert smart/curly quotes to straight quotes
    let normalized = text
      .replace(/^[\u201C\u2018\u201D\u2019]/, '"')
      .replace(/[\u201D\u2019\u201C\u2018]$/, '"');

    // Step 2: handle escaped wrapper quotes \"text\" -> "text"
    if (normalized.startsWith('\\"') && normalized.endsWith('\\"')) {
      normalized = '"' + normalized.substring(2, normalized.length - 2) + '"';
    }

    // Step 3: strip one pair of external straight quotes
    if (normalized.startsWith('"') && normalized.endsWith('"')) {
      const inner = normalized.substring(1, normalized.length - 1);
      if (inner.length >= 2 && !inner.startsWith('"') && !inner.endsWith('"')) {
        return this.normalizeChoiceQuotes(inner.trim());
      }
      if (inner.length >= 2) {
        return this.unescapeDialogueQuotes(inner.trim());
      }
    }
    return normalized.trim();
  }

  private unescapeDialogueQuotes(text: string): string {
    return text.replace(/\\+"/g, '"');
  }

  private normalizeParsedScene(parsed: any): any {
    if (typeof parsed === 'string') {
      const reparsed = this.tryParseJsonObject(parsed);
      return reparsed || { sceneText: parsed };
    }

    const sceneText = parsed?.sceneText || parsed?.scene_text;
    if (typeof sceneText === 'string' && this.looksLikeJsonScene(sceneText)) {
      const nested = this.tryParseJsonObject(sceneText);
      if (nested && typeof nested === 'object' && (nested.sceneText || nested.scene_text)) {
        return {
          ...parsed,
          ...nested,
          choices: Array.isArray(nested.choices) ? nested.choices : parsed.choices,
          sceneMetadata: nested.sceneMetadata || parsed.sceneMetadata,
        };
      }
    }

    return parsed;
  }

  private tryParseJsonObject(content: string): any | null {
    const cleaned = this.stripJsonMarkdown(content).trim();
    const candidates = [
      cleaned,
      this.extractJsonObject(cleaned),
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (typeof parsed === 'string') {
          const nested = this.tryParseJsonObject(parsed);
          if (nested) return nested;
        }
        return parsed;
      } catch {
        continue;
      }
    }

    return null;
  }

  private stripJsonMarkdown(content: string): string {
    return content
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '');
  }

  private extractJsonObject(content: string): string | null {
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) return null;
    return content.substring(firstBrace, lastBrace + 1);
  }

  private looksLikeJsonScene(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.startsWith('{') || trimmed.startsWith('[') || /"scene_?text"\s*:/.test(trimmed);
  }

  private isValidSceneText(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed.length < 8) return false;
    return !this.looksLikeJsonScene(trimmed);
  }

  private calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const catalogModel = getModelById(model);
    if (catalogModel?.costMode === 'FREE') return 0;
    if (
      model.includes(':free') ||
      model === 'groq/free' ||
      model === 'gemini/free' ||
      model.includes('llama') ||
      model.includes('qwen') ||
      model.includes('gpt-oss')
    ) {
      return 0;
    }
    const rates = MODEL_COSTS[model];
    if (!rates) return 0.001;
    return (inputTokens * rates.input) + (outputTokens * rates.output);
  }
}
