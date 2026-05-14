import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionType, UserActionType } from '@prisma/client';
import { LLMProvider, SceneGenerationResult, MODEL_COSTS } from './interfaces/llm-provider.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { MockProvider } from './providers/mock.provider';
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
}

@Injectable()
export class AiService {
  private providers: Map<string, LLMProvider>;

  constructor(
    private readonly configService: ConfigService,
    private readonly openAIProvider: OpenAIProvider,
    private readonly anthropicProvider: AnthropicProvider,
    private readonly openRouterProvider: OpenRouterProvider,
    private readonly mockProvider: MockProvider,
  ) {
    this.providers = new Map();
    this.providers.set('openai', this.openAIProvider);
    this.providers.set('anthropic', this.anthropicProvider);
    this.providers.set('openrouter', this.openRouterProvider);
  }

  isMockMode(): boolean {
    const value = this.configService.get<boolean | string>('LLM_MOCK_MODE');
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

    // Check if OpenRouter is required but not configured
    if (provider === 'openrouter') {
      const hasOpenRouterKey = !!(this.configService.get<string>('OPENROUTER_API_KEY'));
      const freeOnly = this.isFreeLlmOnly();
      
      if (!hasOpenRouterKey) {
        if (freeOnly) {
          // FREE_LLM_ONLY=true requires OpenRouter - fail explicitly
          throw new ForbiddenException(
            'OpenRouter free provider is required but OPENROUTER_API_KEY is not configured. ' +
            'Set OPENROUTER_API_KEY or disable FREE_LLM_ONLY.'
          );
        } else {
          // Not in free-only mode, can use other providers - but this specific model needs OpenRouter
          throw new ForbiddenException(
            `Model '${modelId}' requires OpenRouter but OPENROUTER_API_KEY is not configured.`
          );
        }
      }
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
    const provider = this.getProviderForModelId(model.id);
    const response = await provider.generate(
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
      provider: provider.name,
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
        .map(c => `- ${c.name} (${c.role}): ${c.description || 'personagem secundário'}`)
        .join('\n');
      parts.push(`Personagens:\n${charactersList}`);
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
  }): Promise<SceneGenerationResult> {
    const { 
      storyTitle, synopsis, basePrompt, tone, styleGuide, worldRules, genre, 
      characters, premiseContext, characterContext, memorySummary, narrativeMemory, previousSceneText, previousChoices, 
      userAction, plan, isCinematic, modelId, walletBalance
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
      memoryContext += `--- FIM MEMORIA ---\n\n`;
    }

    const history = memorySummary || 'Nenhum resumo disponível ainda. Esta é uma nova sessão.';

    const previousScene = previousSceneText
      ? `Cena anterior:\n${previousSceneText}\nEscolhas oferecidas: ${previousChoices?.join(', ') || 'nenhuma'}`
      : 'Esta é a primeira cena da história.';

    const sceneInstruction = isCinematic 
      ? 'Esta é uma cena CINEMÁTICA. Escreva uma cena mais longa (8-15 parágrafos), com prosa literária rica, atmosfera intensa, e consequências detalhadas da ação do leitor. O texto deve ser imersivo e dramático.'
      : 'Esta é uma cena narrativa interativa.';

    const prompt = memoryContext + premiseNote + characterNote + SCENE_GENERATION_PROMPT
      .replace('{context}', context)
      .replace('{history}', history)
      .replace('{previousScene}', previousScene)
      .replace('{userAction}', userAction)
      .replace('{instruction}', sceneInstruction);

    const provider = this.getProviderForModelId(model.id);
    const response = await provider.generate(prompt, {
      model: model.id,
      maxTokens,
      temperature: isCinematic ? 0.75 : 0.7,
    });

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
      conflictPotential?: string;
    } | null;
  }): Promise<SceneGenerationResult> {
    const {
      title, synopsis, basePrompt, tone, styleGuide, worldRules, openingScene, genre, characters,
      plan, isCinematic, modelId, walletBalance, narrativeMemory,
      premiseContext, characterContext,
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
      if (characterContext.conflictPotential) characterNote += `Potencial de Conflito: ${characterContext.conflictPotential}\n`;
    }

    const sceneInstruction = isCinematic
      ? 'Esta é a PRIMEIRA cena CINEMÁTICA. Ela deve ser épica, envolvente com um hook poderoso, estabelecer o cenário e personagens, e criar curiosidade no leitor. Escreva em prosa literária rica e atmosférica.'
      :       'Esta é a primeira cena da história interativa. Ela deve ser envolvente e estabelecer o ponto de partida narrativo.';

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
      memoryContext += `--- FIM MEMORIA ---\n\n`;
    }

    const prompt = memoryContext + characterNote + FIRST_SCENE_PROMPT
      .replace('{title}', title)
      .replace('{context}', context + openingNote)
      .replace('{genre}', genre)
      .replace('{instruction}', sceneInstruction);

    const provider = this.getProviderForModelId(model.id);
    const response = await provider.generate(prompt, {
      model: model.id,
      maxTokens,
      temperature: isCinematic ? 0.85 : 0.8,
    });

    return this.parseSceneResponse(response, model.id);
  }

  async summarizeMemory(scenes: string[]): Promise<string> {
    const scenesText = scenes.join('\n\n---\n\n');

    const prompt = MEMORY_SUMMARY_PROMPT.replace('{scenes}', scenesText);

    const freeOnly = this.isFreeLlmOnly();
    const model = getDefaultUtilityModel(freeOnly);
    const provider = this.getProviderForModelId(model.id);
    const response = await provider.generate(prompt, {
      model: model.id,
      maxTokens: 500,
      temperature: 0.3,
    });

    return response.content.trim();
  }

  async generatePremises(params: {
    storyTitle: string;
    storySynopsis: string;
    genre: string;
    count?: number;
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
Responda APENAS com um JSON array (sem markdown, sem código, apenas o JSON puro):
[
  {
    "title": "Título da Premissa 1",
    "synopsis": "Situação inicial...",
    "basePrompt": "Base prompt detalhado para a IA...",
    "openingScene": "Cena de abertura...",
    "tone": "tom narrativo",
    "styleGuide": "guia de estilo",
    "worldRules": "regras do mundo",
    "coverPrompt": "prompt visual cinematográfico da capa"
  }
]`;

    const freeOnly = this.isFreeLlmOnly();
    const model = getDefaultUtilityModel(freeOnly);
    const provider = this.getProviderForModelId(model.id);
    const response = await provider.generate(prompt, {
      model: model.id,
      maxTokens: 1500,
      temperature: 0.8,
    });

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response.content);
    } catch (e) {
      console.error(`Failed to parse premises response (${response.content.length} chars)`);
      return this.generateMockPremises(params.storyTitle, count);
    }
  }

  async generatePlayableCharacters(params: {
    storyTitle: string;
    premiseTitle: string;
    premiseSynopsis: string;
    count?: number;
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
    conflictPotential?: string;
    visualPrompt?: string;
  }>> {
    const count = params.count || 3;
    const mockMode = this.isMockMode();

    if (mockMode) {
      return this.generateMockCharacters(params.premiseTitle, count);
    }

    const prompt = `Você é um criador de personagens para histórias interativas.
Gere ${count} personagens jogáveis para a história "${params.storyTitle}".
Premissa: ${params.premiseTitle}
Sinopse da premissa: ${params.premiseSynopsis}

Para cada personagem, forneça:
- Nome
- Rótulo de papel (ex: "O Detetive", "A Feiticeira")
- Função narrativa (HERO, MENTOR, ALLY, SKEPTIC, RIVAL, VILLAIN, TRICKSTER, SHADOW, HARBINGER, GUARDIAN)
- Descrição breve
- Personalidade
- Motivação
- Segredo
- Relacionamento com o jogador
- Objetivo inicial
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
    "conflictPotential": "Potencial de conflito...",
    "visualPrompt": "prompt visual do retrato do personagem"
  }
]`;

    const freeOnly = this.isFreeLlmOnly();
    const model = getDefaultUtilityModel(freeOnly);
    const provider = this.getProviderForModelId(model.id);
    const response = await provider.generate(prompt, {
      model: model.id,
      maxTokens: 1500,
      temperature: 0.8,
    });

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response.content);
    } catch (e) {
      console.error(`Failed to parse characters response (${response.content.length} chars)`);
      return this.generateMockCharacters(params.premiseTitle, count);
    }
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

  private generateMockCharacters(premiseTitle: string, count: number): Array<{
    name: string;
    roleLabel: string;
    narrativeFunction: string;
    description?: string;
    personality?: string;
    motivation?: string;
    secret?: string;
    relationshipToPlayer?: string;
    initialGoal?: string;
    conflictPotential?: string;
    visualPrompt?: string;
  }> {
    const templates = [
      { name: 'Alex', roleLabel: 'O Protagonista', narrativeFunction: 'HERO', motivation: 'Salvar o dia' },
      { name: 'Sam', roleLabel: 'O Mentor', narrativeFunction: 'MENTOR', motivation: 'Guiar o herói' },
      { name: 'Vic', roleLabel: 'O Vilão', narrativeFunction: 'VILLAIN', motivation: 'Dominar todos' },
    ];
    return templates.slice(0, count).map(t => ({
      ...t,
      description: `${t.name} é um personagem importante.`,
      personality: 'Determinado',
      secret: 'Tem um passado oculto',
      relationshipToPlayer: 'Aliado leal',
      initialGoal: t.motivation,
      conflictPotential: 'Conflitos internos',
      visualPrompt: `Retrato editorial de ${t.name}, ${t.roleLabel}, atmosfera dramática, sem texto, sem logo`,
    }));
  }

  private parseSceneResponse(response: { content: string; inputTokens: number; outputTokens: number; model: string }, model: string): SceneGenerationResult {
    let parsed: any;

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(response.content);
      }
    } catch (e) {
      console.error('Failed to parse LLM response', {
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        contentLength: response.content?.length ?? 0,
      });
      return {
        sceneText: response.content,
        choices: ['Continuar lendo', 'Explorar mais', 'Voltar'],
        modelUsed: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costUsd: this.calculateCost(response.inputTokens, response.outputTokens, response.model),
        sceneMetadata: { emotion: 'neutra', pacing: 'media' },
      };
    }

    return {
      sceneText: parsed.sceneText || parsed.scene_text || response.content,
      choices: Array.isArray(parsed.choices) ? parsed.choices : ['Continuar', 'Explorar', 'Voltar'],
      modelUsed: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      costUsd: this.calculateCost(response.inputTokens, response.outputTokens, response.model),
      sceneMetadata: parsed.sceneMetadata || { emotion: 'neutra', pacing: 'media' },
    };
  }

  private calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const rates = MODEL_COSTS[model];
    if (!rates) return 0.001;
    return (inputTokens * rates.input) + (outputTokens * rates.output);
  }
}
