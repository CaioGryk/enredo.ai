import { getProviderForModel } from '../provider-helper';
import { AiService } from '../ai.service';
import { containsTooMuchEnglish } from '../ai.service';
import { LLMProvider } from '../interfaces/llm-provider.interface';
import {
  AI_MODEL_CATALOG,
  getModelById,
  getDefaultFreeModel,
  getDefaultPremiumModel,
  canUserAccessModel,
  getProviderForModelId,
} from '../model-catalog';
import { SubscriptionType, UserActionType } from '@prisma/client';

describe('AI Provider Selection', () => {
  const mockOpenAIProvider: LLMProvider = {
    name: 'openai',
    generate: jest.fn(),
    estimateCost: jest.fn(),
    getModelForPlan: jest.fn(),
  };

  const mockAnthropicProvider: LLMProvider = {
    name: 'anthropic',
    generate: jest.fn(),
    estimateCost: jest.fn(),
    getModelForPlan: jest.fn(),
  };

  const providers = new Map<string, LLMProvider>();
  providers.set('openai', mockOpenAIProvider);
  providers.set('anthropic', mockAnthropicProvider);

  it('selects OpenAI provider for GPT models', () => {
    expect(getProviderForModel('gpt-4o', providers, mockOpenAIProvider)).toBe(mockOpenAIProvider);
    expect(getProviderForModel('gpt-4o-mini', providers, mockOpenAIProvider)).toBe(mockOpenAIProvider);
    expect(getProviderForModel('gpt-3.5-turbo', providers, mockOpenAIProvider)).toBe(mockOpenAIProvider);
  });

  it('selects Anthropic provider for Claude models', () => {
    expect(getProviderForModel('claude-3-5-sonnet-20241022', providers, mockOpenAIProvider)).toBe(mockAnthropicProvider);
    expect(getProviderForModel('claude-3-opus', providers, mockOpenAIProvider)).toBe(mockAnthropicProvider);
    expect(getProviderForModel('claude-3-haiku', providers, mockOpenAIProvider)).toBe(mockAnthropicProvider);
  });

  it('selects Anthropic for o1/o3 OpenAI models', () => {
    expect(getProviderForModel('o1-mini', providers, mockOpenAIProvider)).toBe(mockOpenAIProvider);
    expect(getProviderForModel('o3-mini', providers, mockOpenAIProvider)).toBe(mockOpenAIProvider);
  });

  it('falls back to default provider for unknown models', () => {
    const result = getProviderForModel('unknown-model', providers, mockOpenAIProvider);
    expect(result).toBe(mockOpenAIProvider);
  });

  it('is case insensitive', () => {
    expect(getProviderForModel('GPT-4O', providers, mockOpenAIProvider)).toBe(mockOpenAIProvider);
    expect(getProviderForModel('CLAUDE-3-5-SONNET', providers, mockOpenAIProvider)).toBe(mockAnthropicProvider);
  });
});

describe('AnthropicProvider Model Tracking', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the requested model name, not the response message id', async () => {
    const { AnthropicProvider } = require('../providers/anthropic.provider');
    const provider = new AnthropicProvider({ get: () => 'test-key' } as any);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'msg_abc123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello' }],
        usage: { input_tokens: 10, output_tokens: 5 },
        stop_reason: 'end_turn',
      }),
    });

    const result = await provider.generate('hello', { model: 'claude-3-5-sonnet-20241022', maxTokens: 100 });

    expect(result.model).toBe('claude-3-5-sonnet-20241022');
    expect(result.model).not.toBe('msg_abc123');
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });

  it('uses default model when none provided', async () => {
    const { AnthropicProvider } = require('../providers/anthropic.provider');
    const provider = new AnthropicProvider({ get: () => 'test-key' } as any);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'msg_xyz',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Test' }],
        usage: { input_tokens: 5, output_tokens: 3 },
        stop_reason: 'end_turn',
      }),
    });

    const result = await provider.generate('test', {});

    expect(result.model).toBe('claude-3-5-sonnet-20241022');
    expect(result.model).not.toBe('msg_xyz');
  });
});

describe('OpenAIProvider Model Tracking', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the model name from API response', async () => {
    const { OpenAIProvider } = require('../providers/openai.provider');
    const provider = new OpenAIProvider({ get: () => 'test-key' } as any);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'chatcmpl_123',
        model: 'gpt-4o',
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    });

    const result = await provider.generate('test', { model: 'gpt-4o', maxTokens: 100 });

    expect(result.model).toBe('gpt-4o');
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });
});

describe('AI Model Catalog', () => {
  it('has at least 4 models in catalog', () => {
    expect(AI_MODEL_CATALOG.length).toBeGreaterThanOrEqual(4);
  });

  it('has Groq as the default free model', () => {
    const freeModel = getDefaultFreeModel();
    expect(freeModel.id).toBe('groq/free');
    expect(freeModel.tier).toBe('FREE');
    expect(freeModel.isDefaultFree).toBe(true);
  });

  it('keeps OpenRouter DeepSeek and Gemini as free fallback models', () => {
    expect(getModelById('deepseek/deepseek-v4-flash:free')?.provider).toBe('openrouter');
    expect(getModelById('gemini/free')?.provider).toBe('google');
  });

  it('has gpt-4.1-nano as default premium model', () => {
    const premiumModel = getDefaultPremiumModel();
    expect(premiumModel.tier).toBe('PREMIUM');
    expect(premiumModel.isDefaultPremium).toBe(true);
  });

  it('has credits model for cinematic', () => {
    const creditsModel = AI_MODEL_CATALOG.find(m => m.tier === 'CREDITS');
    expect(creditsModel).toBeDefined();
    expect(creditsModel?.supportsCinematic).toBe(true);
    expect(creditsModel?.creditCost).toBeGreaterThan(0);
  });

  it('can get model by id', () => {
    const model = getModelById('gpt-4.1-nano');
    expect(model).toBeDefined();
    expect(model?.provider).toBe('openai');
    expect(model?.tier).toBe('PREMIUM');
  });

  it('returns undefined for unknown model id', () => {
    const model = getModelById('unknown-model-xyz');
    expect(model).toBeUndefined();
  });

  it('only active models use implemented providers', () => {
    const activeModels = AI_MODEL_CATALOG.filter(m => m.isActive);
    const implementedProviders = ['openai', 'anthropic', 'openrouter', 'groq', 'google'];
    for (const model of activeModels) {
      expect(implementedProviders).toContain(model.provider);
    }
  });

  it('inactive models include unimplemented providers or disabled paid Google models', () => {
    const inactiveModels = AI_MODEL_CATALOG.filter(m => !m.isActive);
    const unimplementedProviders = ['google', 'together'];
    for (const model of inactiveModels) {
      expect(unimplementedProviders).toContain(model.provider);
    }
  });
});

describe('Model Entitlement', () => {
  it('FREE user can access FREE tier models', () => {
    const freeModel = getModelById('openrouter/free')!;
    const result = canUserAccessModel(freeModel, SubscriptionType.FREE, 0);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('FREE user cannot access PREMIUM tier models', () => {
    const premiumModel = getModelById('gpt-4.1-nano')!;
    const result = canUserAccessModel(premiumModel, SubscriptionType.FREE, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Premium');
  });

  it('FREE user cannot access CREDITS tier models without credits', () => {
    const creditsModel = getModelById('claude-3-5-sonnet-20241022')!;
    const result = canUserAccessModel(creditsModel, SubscriptionType.FREE, 0);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('credits');
  });

  it('FREE user with sufficient credits CAN access CREDITS models', () => {
    const creditsModel = getModelById('claude-3-5-sonnet-20241022')!;
    const result = canUserAccessModel(creditsModel, SubscriptionType.FREE, 5);
    expect(result.allowed).toBe(true);
  });

  it('PREMIUM user can access FREE and PREMIUM models', () => {
    const freeModel = getModelById('openrouter/free')!;
    const premiumModel = getModelById('gpt-4.1-nano')!;
    const creditsModel = getModelById('claude-3-5-sonnet-20241022')!;

    expect(canUserAccessModel(freeModel, SubscriptionType.PREMIUM, 0).allowed).toBe(true);
    expect(canUserAccessModel(premiumModel, SubscriptionType.PREMIUM, 0).allowed).toBe(true);
    expect(canUserAccessModel(creditsModel, SubscriptionType.PREMIUM, 0).allowed).toBe(false);
  });

  it('PREMIUM user can access CREDITS models with sufficient balance', () => {
    const creditsModel = getModelById('claude-3-5-sonnet-20241022')!;
    const result = canUserAccessModel(creditsModel, SubscriptionType.PREMIUM, 5);
    expect(result.allowed).toBe(true);
  });
});

describe('Provider Selection by Model', () => {
  it('groq/free maps to groq provider', () => {
    const provider = getProviderForModelId('groq/free');
    expect(provider).toBe('groq');
  });

  it('openrouter/free maps to openrouter provider', () => {
    const provider = getProviderForModelId('openrouter/free');
    expect(provider).toBe('openrouter');
  });

  it('gemini/free maps to google provider', () => {
    const provider = getProviderForModelId('gemini/free');
    expect(provider).toBe('google');
  });

  it('gpt-4.1-nano maps to openai provider', () => {
    const provider = getProviderForModelId('gpt-4.1-nano');
    expect(provider).toBe('openai');
  });

  it('claude-3-5-sonnet-20241022 maps to anthropic provider', () => {
    const provider = getProviderForModelId('claude-3-5-sonnet-20241022');
    expect(provider).toBe('anthropic');
  });

  it('returns undefined for unknown model', () => {
    const provider = getProviderForModelId('unknown-model');
    expect(provider).toBeUndefined();
  });
});

describe('OpenRouterProvider Model Tracking', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns the model name from API response', async () => {
    const { OpenRouterProvider } = require('../providers/openrouter.provider');
    const provider = new OpenRouterProvider(
      { get: (key: string) => key === 'OPENROUTER_API_KEY' ? 'test-key' : '' } as any,
      { isFreeLlmOnly: () => false } as any,
      { generate: jest.fn() } as any,
    );

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'openrouter_123',
        model: 'openrouter/free',
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    });

    const result = await provider.generate('test', { model: 'openrouter/free', maxTokens: 100 });

    expect(result.model).toBe('openrouter/free');
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });
});

describe('MockProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns valid JSON with sceneText, choices, and sceneMetadata', async () => {
    const { MockProvider } = require('../providers/mock.provider');
    const provider = new MockProvider({ get: () => false } as any);

    const result = await provider.generate('test prompt', { model: 'openrouter/free', maxTokens: 500 });

    expect(result.model).toBe('openrouter/free');
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(80);

    const parsed = JSON.parse(result.content);
    expect(parsed.sceneText).toContain('[MOCK]');
    expect(parsed.choices).toHaveLength(3);
    expect(parsed.sceneMetadata).toBeDefined();
  });

  it('returns the selected model id as modelUsed', async () => {
    const { MockProvider } = require('../providers/mock.provider');
    const provider = new MockProvider({ get: () => false } as any);

    const result = await provider.generate('test', { model: 'claude-3-5-sonnet-20241022', maxTokens: 500 });

    expect(result.model).toBe('claude-3-5-sonnet-20241022');
    expect(result.content).toContain('claude-3-5-sonnet-20241022');
  });
});

describe('AiService Mock Mode', () => {
  it('returns MockProvider when LLM_MOCK_MODE=true', () => {
    const { MockProvider } = require('../providers/mock.provider');
    const mockProvider = new MockProvider({ get: (key: string) => key === 'LLM_MOCK_MODE' ? true : false } as any);
    expect(mockProvider.name).toBe('mock');
  });

  it('FREE user still cannot use PREMIUM model even in mock mode', () => {
    const { canUserAccessModel, getModelById } = require('../model-catalog');
    const { SubscriptionType } = require('@prisma/client');

    const premiumModel = getModelById('gpt-4.1-nano')!;
    const result = canUserAccessModel(premiumModel, SubscriptionType.FREE, 100);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Premium');
  });

  describe('Explicit Boolean Parsing', () => {
    it('isFreeLlmOnly returns true for boolean true', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return true;
          return undefined;
        },
      };
      const service = new AiService(
        mockConfig as any,
        {} as any, {} as any, {} as any, {} as any,
      );
      expect(service.isFreeLlmOnly()).toBe(true);
    });

    it('isFreeLlmOnly returns false for boolean false', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return false;
          return undefined;
        },
      };
      const service = new AiService(
        mockConfig as any,
        {} as any, {} as any, {} as any, {} as any,
      );
      expect(service.isFreeLlmOnly()).toBe(false);
    });

    it('isFreeLlmOnly returns true for string "true"', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return 'true';
          return undefined;
        },
      };
      const service = new AiService(
        mockConfig as any,
        {} as any, {} as any, {} as any, {} as any,
      );
      expect(service.isFreeLlmOnly()).toBe(true);
    });

    it('isFreeLlmOnly returns false for string "false" (not truthy)', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return 'false';
          return undefined;
        },
      };
      const service = new AiService(
        mockConfig as any,
        {} as any, {} as any, {} as any, {} as any,
      );
      expect(service.isFreeLlmOnly()).toBe(false);
    });

    it('isFreeLlmOnly returns false for string "FALSE" (case insensitive)', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return 'FALSE';
          return undefined;
        },
      };
      const service = new AiService(
        mockConfig as any,
        {} as any, {} as any, {} as any, {} as any,
      );
      expect(service.isFreeLlmOnly()).toBe(false);
    });

    it('isFreeLlmOnly returns false when env var is not set', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: () => undefined,
      };
      const service = new AiService(
        mockConfig as any,
        {} as any, {} as any, {} as any, {} as any,
      );
      expect(service.isFreeLlmOnly()).toBe(false);
    });
  });

  it('CREDITS model without sufficient balance is locked for any user', () => {
    const { canUserAccessModel, getModelById } = require('../model-catalog');
    const { SubscriptionType } = require('@prisma/client');

    const creditsModel = getModelById('claude-3-5-sonnet-20241022')!;

    const freeResult = canUserAccessModel(creditsModel, SubscriptionType.FREE, 0);
    expect(freeResult.allowed).toBe(false);

    const premiumResult = canUserAccessModel(creditsModel, SubscriptionType.PREMIUM, 1);
    expect(premiumResult.allowed).toBe(false);

    const enoughBalance = canUserAccessModel(creditsModel, SubscriptionType.FREE, 5);
    expect(enoughBalance.allowed).toBe(true);
  });

  it('FREE default model is Groq free model', () => {
    const { getDefaultFreeModel } = require('../model-catalog');
    const freeModel = getDefaultFreeModel();
    expect(freeModel.id).toBe('groq/free');
    expect(freeModel.tier).toBe('FREE');
  });

  it('PREMIUM default model is gpt-4.1-nano', () => {
    const { getDefaultPremiumModel } = require('../model-catalog');
    const premiumModel = getDefaultPremiumModel();
    expect(premiumModel.id).toBe('gpt-4.1-nano');
    expect(premiumModel.tier).toBe('PREMIUM');
  });

  it('includes openThreads and Story Codex in the final prompt sent to the provider', async () => {
    const provider: LLMProvider = {
      name: 'mock',
      generate: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          sceneText: 'Cena gerada',
          choices: ['Continuar', 'Investigar'],
          sceneMetadata: { emotion: 'curiosa', pacing: 'media' },
        }),
        inputTokens: 20,
        outputTokens: 10,
        model: 'openrouter/free',
      }),
      estimateCost: jest.fn(),
      getModelForPlan: jest.fn(),
    };
    const service = new AiService(
      { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
      provider as any,
      provider as any,
      provider as any,
      provider as any,
    );

    await service.generateScene({
      storyTitle: 'A Porta Selada',
      synopsis: 'Uma historia de misterio.',
      genre: 'mistério',
      userAction: 'abrir a porta',
      userActionType: UserActionType.CHOICE,
      plan: SubscriptionType.FREE,
      narrativeMemory: {
        constraints: 'Tom: suspense',
        worldState: 'A mansao nao obedece mapas comuns.',
        characterState: 'Lia: investigadora.',
        summary: 'Lia encontrou uma chave fria.',
        importantChoices: 'Lia escolheu seguir o som no corredor.',
        openThreads: '[Cena 2] A porta selada ainda nao foi explicada (em aberto)',
      },
      codexContext: [
        '--- CODEX NARRATIVO ---',
        'FATOS CANÔNICOS (NÃO CONTRADIZER):',
        '  - Lia nunca abriu a porta selada.',
        '--- FIM CODEX ---',
      ].join('\n'),
    });

    const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
    expect(prompt).toContain('Trilhas em Aberto:');
    expect(prompt).toContain('A porta selada ainda nao foi explicada');
    expect(prompt).toContain('--- CODEX NARRATIVO ---');
    expect(prompt).toContain('Lia nunca abriu a porta selada.');
  });

  it('adds adult narrative policy instructions to continuation prompts', async () => {
    const provider: LLMProvider = {
      name: 'mock',
      generate: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          sceneText: 'Cena gerada',
          choices: ['Continuar', 'Investigar'],
          sceneMetadata: { emotion: 'intensa', pacing: 'media' },
        }),
        inputTokens: 20,
        outputTokens: 10,
        model: 'openrouter/free',
      }),
      estimateCost: jest.fn(),
      getModelForPlan: jest.fn(),
    };
    const service = new AiService(
      { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
      provider as any,
      provider as any,
      provider as any,
      provider as any,
    );

    await service.generateScene({
      storyTitle: 'A Porta Selada',
      synopsis: 'Uma historia de misterio.',
      genre: 'mistério',
      userAction: 'aproximar-se de Lia',
      userActionType: UserActionType.FREE_TEXT,
      plan: SubscriptionType.FREE,
      narrativePolicy: {
        effectiveRomanceIntensity: 'ADULT_18',
        adultContentAllowed: true,
        mediaAdultContentAllowed: false,
        userLikenessAdultContentAllowed: false,
      },
    });

    const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
    expect(prompt).toContain('--- DIRETRIZES DE CONTEÚDO ---');
    expect(prompt).toContain('Conteúdo adulto permitido: SIM.');
    expect(prompt).toContain('Sem menores em qualquer contexto sexual.');
    expect(prompt).toContain('Sem uso de imagem real, foto de perfil ou aparência do usuário em conteúdo sexual explícito.');
  });

  it('anchors continuation prompts to the selected playable character', async () => {
    const provider: LLMProvider = {
      name: 'mock',
      generate: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          sceneText: 'Cena gerada',
          choices: ['Responder a Marco', 'Defender sua ideia'],
          sceneMetadata: { emotion: 'conflituosa', pacing: 'media' },
        }),
        inputTokens: 20,
        outputTokens: 10,
        model: 'openrouter/free',
      }),
      estimateCost: jest.fn(),
      getModelForPlan: jest.fn(),
    };
    const service = new AiService(
      { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
      provider as any,
      provider as any,
      provider as any,
      provider as any,
    );

    await service.generateScene({
      storyTitle: 'Sabores em Conflito',
      synopsis: 'Dois chefs rivais precisam salvar um restaurante.',
      genre: 'romance gastronomico',
      userAction: 'aceitar trabalhar com Marco',
      userActionType: UserActionType.CHOICE,
      plan: SubscriptionType.FREE,
      characterContext: {
        name: 'Luna',
        roleLabel: 'A Guardia dos Sabores Selvagens',
        startingSituation: 'Luna esta na cozinha e precisa defender sua visao criativa.',
      },
    });

    const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
    expect(prompt).toContain('PERSONAGEM JOGAVEL SELECIONADO');
    expect(prompt).toContain('Nome: Luna');
    expect(prompt).toContain('ANCORA DE PROTAGONISTA');
    expect(prompt).toContain('nunca escreva como se outro personagem fosse "voce"');
    expect(prompt).toContain('Outros personagens devem ter agencia propria');
  });

  it('prints NPC personality traits in continuation prompts', async () => {
    const provider: LLMProvider = {
      name: 'mock',
      generate: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          sceneText: 'Cena gerada',
          choices: ['Responder a Marco', 'Defender sua ideia'],
          sceneMetadata: { emotion: 'conflituosa', pacing: 'media' },
        }),
        inputTokens: 20,
        outputTokens: 10,
        model: 'openrouter/free',
      }),
      estimateCost: jest.fn(),
      getModelForPlan: jest.fn(),
    };
    const service = new AiService(
      { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
      provider as any,
      provider as any,
      provider as any,
      provider as any,
    );

    await service.generateScene({
      storyTitle: 'Sabores em Conflito',
      synopsis: 'Dois chefs rivais precisam salvar um restaurante.',
      genre: 'romance gastronomico',
      userAction: 'chamar a equipe para provar',
      userActionType: UserActionType.CHOICE,
      plan: SubscriptionType.FREE,
      characters: [
        {
          name: 'Marco',
          role: 'O Mestre dos Sonhos Açucarados',
          description: 'Confeiteiro metódico.',
          personality: 'Controlado, perfeccionista e provocador.',
          motivation: 'Salvar sua reputação diante da crítica.',
          relationshipToPlayer: 'Rival que admira Luna em segredo.',
          conflictPotential: 'Cutuca Luna para esconder atração e medo.',
        },
      ],
    });

    const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
    expect(prompt).toContain('PERSONAGENS E PERSONALIDADES');
    expect(prompt).toContain('Marco (O Mestre dos Sonhos Açucarados)');
    expect(prompt).toContain('Personalidade: Controlado, perfeccionista e provocador.');
    expect(prompt).toContain('Motivacao: Salvar sua reputação diante da crítica.');
    expect(prompt).toContain('Relacao com protagonista/jogador: Rival que admira Luna em segredo.');
    expect(prompt).toContain('Nao escreva NPCs como vozes genericas intercambiaveis.');
  });

  it('anchors first-scene prompts to the selected playable character', async () => {
    const provider: LLMProvider = {
      name: 'mock',
      generate: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          sceneText: 'Primeira cena gerada',
          choices: ['Encarar Marco', 'Chamar Madame Dubois'],
          sceneMetadata: { emotion: 'tensa', pacing: 'media' },
        }),
        inputTokens: 20,
        outputTokens: 10,
        model: 'openrouter/free',
      }),
      estimateCost: jest.fn(),
      getModelForPlan: jest.fn(),
    };
    const service = new AiService(
      { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
      provider as any,
      provider as any,
      provider as any,
      provider as any,
    );

    await service.generateFirstScene({
      title: 'Sabores em Conflito',
      synopsis: 'Dois chefs rivais precisam salvar um restaurante.',
      genre: 'romance gastronomico',
      plan: SubscriptionType.FREE,
      characterContext: {
        name: 'Luna',
        roleLabel: 'A Guardia dos Sabores Selvagens',
        startingSituation: 'Luna esta na cozinha quando o desafio e anunciado.',
      },
    });

    const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
    expect(prompt).toContain('PERSONAGEM JOGAVEL SELECIONADO');
    expect(prompt).toContain('Nome: Luna');
    expect(prompt).toContain('ANCORA DE PROTAGONISTA');
    expect(prompt).toContain('Nunca comece do ponto de vista de outro personagem');
    expect(prompt).toContain('Outros personagens devem aparecer vivos');
  });

  it('adds safe default narrative policy instructions to first-scene prompts when no policy is provided', async () => {
    const provider: LLMProvider = {
      name: 'mock',
      generate: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          sceneText: 'Primeira cena gerada',
          choices: ['Continuar', 'Observar'],
          sceneMetadata: { emotion: 'curiosa', pacing: 'media' },
        }),
        inputTokens: 20,
        outputTokens: 10,
        model: 'openrouter/free',
      }),
      estimateCost: jest.fn(),
      getModelForPlan: jest.fn(),
    };
    const service = new AiService(
      { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
      provider as any,
      provider as any,
      provider as any,
      provider as any,
    );

    await service.generateFirstScene({
      title: 'A Porta Selada',
      synopsis: 'Uma historia de misterio.',
      genre: 'mistério',
      plan: SubscriptionType.FREE,
    });

    const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
    expect(prompt).toContain('--- DIRETRIZES DE CONTEÚDO ---');
    expect(prompt).toContain('Romance permitido: apenas sugestivo e emocional.');
    expect(prompt).toContain('Conteúdo adulto explícito: NÃO permitido.');
    expect(prompt).toContain('Use fade-to-black se necessário.');
  });

  describe('FREE_LLM_ONLY Mode', () => {
    it('blocks premium modelId in reading sendAction via AiService', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return true;
          if (key === 'LLM_MOCK_MODE') return false;
          return undefined;
        },
      };
      const mockProvider = { name: 'mock', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'openrouter/free' };
      const service = new AiService(
        mockConfig as any,
        mockProvider as any,
        mockProvider as any,
        mockProvider as any,
        mockProvider as any,
      );

       expect(() =>
         service.getModelForRequest({
           plan: 'PREMIUM' as any,
           modelId: 'gpt-4.1-nano',
         })
       ).toThrow('Paid models are disabled. FREE_LLM_ONLY=true restricts to free models only.');
    });

    it('blocks credits/cinematic modelId in reading sendAction via AiService', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return true;
          if (key === 'LLM_MOCK_MODE') return false;
          return undefined;
        },
      };
      const mockProvider = { name: 'mock', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'openrouter/free' };
      const service = new AiService(
        mockConfig as any,
        mockProvider as any,
        mockProvider as any,
        mockProvider as any,
        mockProvider as any,
      );

       expect(() =>
         service.getModelForRequest({
           plan: 'FREE' as any,
           isCinematic: true,
         })
       ).toThrow('Paid models are disabled. FREE_LLM_ONLY=true restricts to free models only.');
    });

    it('Premium user receives Groq free defaultModelId when FREE_LLM_ONLY=true', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return true;
          if (key === 'LLM_MOCK_MODE') return false;
          return undefined;
        },
      };
      const mockProvider = { name: 'mock', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'openrouter/free' };
      const service = new AiService(
        mockConfig as any,
        mockProvider as any,
        mockProvider as any,
        mockProvider as any,
        mockProvider as any,
      );

      const defaultId = service.getDefaultModelIdForPlan('PREMIUM' as any);
      expect(defaultId).toBe('groq/free');
    });

    it('falls back from Groq to OpenRouter DeepSeek for free text generation', async () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return true;
          if (key === 'LLM_MOCK_MODE') return false;
          return undefined;
        },
      };
      const mockOpenAi = { name: 'openai', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'gpt-4.1-nano' };
      const mockAnthropic = { name: 'anthropic', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'claude-3-5-sonnet-20241022' };
      const mockOpenRouter = {
        name: 'openrouter',
        generate: jest.fn().mockResolvedValue({
          content: 'DeepSeek fallback ok',
          inputTokens: 10,
          outputTokens: 5,
          model: 'deepseek/deepseek-v4-flash:free',
        }),
        estimateCost: () => 0,
        getModelForPlan: () => 'openrouter/free',
      };
      const mockMock = { name: 'mock', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'openrouter/free' };
      const mockGroq = {
        name: 'groq',
        generate: jest.fn().mockRejectedValue(new Error('Groq temporary quota')),
        estimateCost: () => 0,
        getModelForPlan: () => 'groq/free',
      };
      const mockGoogle = { name: 'google', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'gemini/free' };
      const service = new AiService(
        mockConfig as any,
        mockOpenAi as any,
        mockAnthropic as any,
        mockOpenRouter as any,
        mockMock as any,
        mockGroq as any,
        mockGoogle as any,
      );

      const result = await service.testModel({ plan: 'FREE' as any });

      expect(mockGroq.generate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ model: 'groq/free' }));
      expect(mockOpenRouter.generate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ model: 'deepseek/deepseek-v4-flash:free' }));
      expect(mockGoogle.generate).not.toHaveBeenCalled();
      expect(result.modelId).toBe('deepseek/deepseek-v4-flash:free');
    });

    it('falls back from Groq and OpenRouter DeepSeek to Gemini for free text generation', async () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return true;
          if (key === 'LLM_MOCK_MODE') return false;
          return undefined;
        },
      };
      const mockOpenAi = { name: 'openai', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'gpt-4.1-nano' };
      const mockAnthropic = { name: 'anthropic', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'claude-3-5-sonnet-20241022' };
      const mockOpenRouter = {
        name: 'openrouter',
        generate: jest.fn().mockRejectedValue(new Error('OpenRouter quota')),
        estimateCost: () => 0,
        getModelForPlan: () => 'openrouter/free',
      };
      const mockMock = { name: 'mock', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'openrouter/free' };
      const mockGroq = {
        name: 'groq',
        generate: jest.fn().mockRejectedValue(new Error('Groq temporary quota')),
        estimateCost: () => 0,
        getModelForPlan: () => 'groq/free',
      };
      const mockGoogle = {
        name: 'google',
        generate: jest.fn().mockResolvedValue({
          content: 'Gemini fallback ok',
          inputTokens: 10,
          outputTokens: 5,
          model: 'gemini-2.5-flash-lite',
        }),
        estimateCost: () => 0,
        getModelForPlan: () => 'gemini/free',
      };
      const service = new AiService(
        mockConfig as any,
        mockOpenAi as any,
        mockAnthropic as any,
        mockOpenRouter as any,
        mockMock as any,
        mockGroq as any,
        mockGoogle as any,
      );

      const result = await service.testModel({ plan: 'FREE' as any });

      expect(mockGroq.generate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ model: 'groq/free' }));
      expect(mockOpenRouter.generate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ model: 'deepseek/deepseek-v4-flash:free' }));
      expect(mockGoogle.generate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ model: 'gemini/free' }));
      expect(result.provider).toBe('google');
      expect(result.modelId).toBe('gemini-2.5-flash-lite');
    });

    it('respects explicit openrouter/free before trying the default Groq fallback', async () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return true;
          if (key === 'LLM_MOCK_MODE') return false;
          return undefined;
        },
      };
      const mockOpenAi = { name: 'openai', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'gpt-4.1-nano' };
      const mockAnthropic = { name: 'anthropic', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'claude-3-5-sonnet-20241022' };
      const mockOpenRouter = {
        name: 'openrouter',
        generate: jest.fn().mockResolvedValue({
          content: 'OpenRouter explicit ok',
          inputTokens: 10,
          outputTokens: 5,
          model: 'openrouter/free',
        }),
        estimateCost: () => 0,
        getModelForPlan: () => 'openrouter/free',
      };
      const mockMock = { name: 'mock', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'openrouter/free' };
      const mockGroq = { name: 'groq', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'groq/free' };
      const mockGoogle = { name: 'google', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'gemini/free' };
      const service = new AiService(
        mockConfig as any,
        mockOpenAi as any,
        mockAnthropic as any,
        mockOpenRouter as any,
        mockMock as any,
        mockGroq as any,
        mockGoogle as any,
      );

      const result = await service.testModel({ plan: 'FREE' as any, modelId: 'openrouter/free' });

      expect(mockOpenRouter.generate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ model: 'openrouter/free' }));
      expect(mockGroq.generate).not.toHaveBeenCalled();
      expect(mockGoogle.generate).not.toHaveBeenCalled();
      expect(result.provider).toBe('openrouter');
    });

    it('OpenRouter missing API key throws clear configuration error', async () => {
      const { OpenRouterProvider } = require('../providers/openrouter.provider');
      const mockMockProvider = { generate: jest.fn().mockResolvedValue({ content: 'mock', inputTokens: 0, outputTokens: 0, model: 'mock' }) };
      const provider = new OpenRouterProvider(
        { get: () => '' } as any,
        mockMockProvider as any,
      );

      await expect(provider.generate('test', { model: 'openrouter/free' })).rejects.toThrow('OPENROUTER_API_KEY is not configured');
    });

    it('AiService resolves OpenRouter provider even when key is missing so fallback can continue', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return true;
          if (key === 'LLM_MOCK_MODE') return false;
          if (key === 'OPENROUTER_API_KEY') return '';
          return undefined;
        },
      };
      const mockOpenRouter = { name: 'openrouter', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'openrouter/free' };
      const mockMock = { name: 'mock', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'openrouter/free' };
      const service = new AiService(
        mockConfig as any,
        mockMock as any,
        mockMock as any,
        mockOpenRouter as any,
        mockMock as any,
      );

      expect(service.getProviderForModelId('openrouter/free')).toBe(mockOpenRouter);
    });

    describe('OpenRouter FREE_LLM_ONLY Enforcement', () => {
      it('blocks paid model when FREE_LLM_ONLY=true', async () => {
        const { OpenRouterProvider } = require('../providers/openrouter.provider');
        const mockMockProvider = { generate: jest.fn() };
        const provider = new OpenRouterProvider(
          {
            get: (key: string) => {
              if (key === 'FREE_LLM_ONLY') return true;
              if (key === 'OPENROUTER_API_KEY') return 'test-key';
              return undefined;
            },
          } as any,
          mockMockProvider as any,
        );

        await expect(provider.generate('test', { model: 'gpt-4.1-nano' })).rejects.toThrow('Paid models are disabled');
      });

      it('allows openrouter/free when FREE_LLM_ONLY=true', async () => {
        const { OpenRouterProvider } = require('../providers/openrouter.provider');
        const mockMockProvider = { generate: jest.fn() };
        
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            id: 'openrouter_123',
            model: 'openrouter/free',
            choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
        });

        const provider = new OpenRouterProvider(
          {
            get: (key: string) => {
              if (key === 'FREE_LLM_ONLY') return true;
              if (key === 'OPENROUTER_API_KEY') return 'test-key';
              return undefined;
            },
          } as any,
          mockMockProvider as any,
        );

        const result = await provider.generate('test', { model: 'openrouter/free' });
        expect(result.model).toBe('openrouter/free');
        
        global.fetch = originalFetch;
      });

      it('allows paid model when FREE_LLM_ONLY=false', async () => {
        const { OpenRouterProvider } = require('../providers/openrouter.provider');
        const mockMockProvider = { generate: jest.fn() };
        
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            id: 'openrouter_123',
            model: 'gpt-4.1-nano',
            choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
        });

        const provider = new OpenRouterProvider(
          {
            get: (key: string) => {
              if (key === 'FREE_LLM_ONLY') return false;
              if (key === 'OPENROUTER_API_KEY') return 'test-key';
              return undefined;
            },
          } as any,
          mockMockProvider as any,
        );

        const result = await provider.generate('test', { model: 'gpt-4.1-nano' });
        expect(result.model).toBe('gpt-4.1-nano');
        
        global.fetch = originalFetch;
      });
    });

    it('MockProvider parses string "false" correctly as false', () => {
      const { MockProvider } = require('../providers/mock.provider');
      const provider = new MockProvider({ get: () => 'false' } as any);
      expect(provider.isMockMode()).toBe(false);
    });

    it('MockProvider parses boolean true correctly', () => {
      const { MockProvider } = require('../providers/mock.provider');
      const provider = new MockProvider({ get: () => true } as any);
      expect(provider.isMockMode()).toBe(true);
    });

    it('FREE_LLM_ONLY=true filters catalog to FREE models only', () => {
      const { AiService } = require('../ai.service');
      const mockConfig = {
        get: (key: string) => {
          if (key === 'FREE_LLM_ONLY') return true;
          if (key === 'LLM_MOCK_MODE') return false;
          return undefined;
        },
      };
      const mockProvider = { name: 'mock', generate: jest.fn(), estimateCost: () => 0, getModelForPlan: () => 'openrouter/free' };
      const service = new AiService(
        mockConfig as any,
        mockProvider as any,
        mockProvider as any,
        mockProvider as any,
        mockProvider as any,
      );

      const catalog = service.getCatalog();
      expect(catalog.length).toBeGreaterThan(0);
      catalog.forEach((model: any) => {
        expect(model.costMode).toBe('FREE');
      });
    });
  });

  describe('JSON extraction', () => {
    it('extracts array from plain JSON content', () => {
      const { AiService } = require('../ai.service');
      const service = new AiService(
        { get: () => false } as any,
        {} as any, {} as any, {} as any, {} as any,
      );
      const result = (service as any).extractJsonArray('[{"a":1}]', 'test');
      expect(result).toBe('[{"a":1}]');
    });

    it('extracts array from fenced markdown code block', () => {
      const { AiService } = require('../ai.service');
      const service = new AiService(
        { get: () => false } as any,
        {} as any, {} as any, {} as any, {} as any,
      );
      const result = (service as any).extractJsonArray('```json\n[{"a":1}]\n```', 'test');
      expect(result).toBe('[{"a":1}]');
    });

    it('extracts array with leading prose', () => {
      const { AiService } = require('../ai.service');
      const service = new AiService(
        { get: () => false } as any,
        {} as any, {} as any, {} as any, {} as any,
      );
      const result = (service as any).extractJsonArray('Here is your data:\n[{"a":1}]', 'test');
      expect(result).toBe('[{"a":1}]');
    });

    it('throws when no array found', () => {
      const { AiService } = require('../ai.service');
      const service = new AiService(
        { get: () => false } as any,
        {} as any, {} as any, {} as any, {} as any,
      );
      expect(() => (service as any).extractJsonArray('no array here', 'test')).toThrow('No JSON array');
    });
  });

  describe('tryGenerateJson retry', () => {
    const mockProvider = () => ({
      name: 'mock',
      generate: jest.fn(),
      estimateCost: () => 0,
      getModelForPlan: () => 'groq/free',
    });

    it('succeeds on first attempt with valid JSON', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();
      provider.generate.mockResolvedValue({
        content: '[{"title":"T1","synopsis":"S1","basePrompt":"B1"}]',
        inputTokens: 10, outputTokens: 5, model: 'groq/free',
      });
      const service = new AiService(
        { get: (k: string) => k === 'LLM_MOCK_MODE' ? false : undefined } as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );
      const result = await (service as any).tryGenerateJson('prompt', 'groq/free', 'test',
        (p: any) => Array.isArray(p) && p.every((x: any) => x.title && x.synopsis && x.basePrompt),
      );
      expect(result).toEqual([{ title: 'T1', synopsis: 'S1', basePrompt: 'B1' }]);
      expect(provider.generate).toHaveBeenCalledTimes(1);
    });

    it('retries on malformed first response and succeeds on second', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();
      provider.generate
        .mockResolvedValueOnce({ content: 'not json at all', inputTokens: 5, outputTokens: 2, model: 'groq/free' })
        .mockResolvedValueOnce({ content: '[{"title":"T2","synopsis":"S2","basePrompt":"B2"}]', inputTokens: 10, outputTokens: 5, model: 'groq/free' });
      const service = new AiService(
        { get: (k: string) => k === 'LLM_MOCK_MODE' ? false : undefined } as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );
      const result = await (service as any).tryGenerateJson('prompt', 'groq/free', 'test',
        (p: any) => Array.isArray(p) && p.every((x: any) => x.title && x.synopsis && x.basePrompt),
      );
      expect(result).toEqual([{ title: 'T2', synopsis: 'S2', basePrompt: 'B2' }]);
      expect(provider.generate).toHaveBeenCalledTimes(2);
    });

    it('throws BadGateway after both attempts fail', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();
      provider.generate.mockResolvedValue({ content: 'still not json', inputTokens: 5, outputTokens: 2, model: 'groq/free' });
      const service = new AiService(
        { get: (k: string) => k === 'LLM_MOCK_MODE' ? false : undefined } as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );
      await expect(
        (service as any).tryGenerateJson('prompt', 'groq/free', 'test',
          (p: any) => Array.isArray(p) && p.length > 0,
        )
      ).rejects.toThrow('invalid JSON after 2 attempts');
      expect(provider.generate).toHaveBeenCalledTimes(2);
    });
  });

  describe('character generation JSON repair', () => {
    const mockProvider = () => ({
      name: 'mock',
      generate: jest.fn(),
      estimateCost: () => 0,
      getModelForPlan: () => 'groq/free',
    });

    const validChar = (name: string) => ({
      name,
      roleLabel: 'O herói',
      narrativeFunction: 'HERO',
      description: 'A brave soul',
      personality: 'Bold',
      motivation: 'Justice',
      secret: 'Hidden past',
      relationshipToPlayer: 'Ally',
      initialGoal: 'Save the world',
      startingSituation: 'On a hilltop at dawn',
      conflictPotential: 'Fear of failure',
      visualPrompt: 'Cinematic portrait of ' + name,
    });

    it('repairs malformed character JSON and succeeds with valid response', () => {
      // Test via tryGenerateJson directly (bounded retry)
      const { AiService } = require('../ai.service');
      const provider = mockProvider();
      const chars = [validChar('Aria'), validChar('Kael'), validChar('Mira')];
      provider.generate
        .mockResolvedValueOnce({ content: 'Sure, here are your characters:\n```json\n' + JSON.stringify(chars).substring(0, 200) + '...\n```', inputTokens: 100, outputTokens: 200, model: 'groq/free' })
        .mockResolvedValueOnce({ content: JSON.stringify(chars), inputTokens: 100, outputTokens: 150, model: 'groq/free' });
      const service = new AiService(
        { get: (k: string) => k === 'LLM_MOCK_MODE' ? false : undefined } as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );
      return (service as any).tryGenerateJson('prompt', 'groq/free', 'characters',
        (p: any) => Array.isArray(p) && p.length === 3 && p.every((c: any) => c.name && c.roleLabel && c.narrativeFunction && c.description && c.personality && c.startingSituation),
      ).then((result: any) => {
        expect(result).toHaveLength(3);
        expect(provider.generate).toHaveBeenCalledTimes(2);
      });
    });

    it('throws BadGateway after both attempts fail for characters', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();
      provider.generate.mockResolvedValue({ content: '{broken}', inputTokens: 5, outputTokens: 2, model: 'groq/free' });
      const service = new AiService(
        { get: (k: string) => k === 'LLM_MOCK_MODE' ? false : undefined } as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );
      await expect(
        (service as any).tryGenerateJson('prompt', 'groq/free', 'characters', () => false)
      ).rejects.toThrow('invalid JSON after 2 attempts');
      expect(provider.generate).toHaveBeenCalledTimes(2);
    });
  });

  describe('PT-BR language guard', () => {
    function mockProvider(): any {
      return {
        name: 'groq',
        generate: jest.fn(),
        estimateCost: jest.fn().mockReturnValue(0),
        getModelForPlan: jest.fn().mockReturnValue('groq/free'),
        isAvailable: jest.fn().mockReturnValue(true),
      };
    }

    const mockConfigService = {
      get: (k: string) => k === 'LLM_MOCK_MODE' ? false : undefined,
    };

    const englishStoryDraft = {
      title: 'The Last Shadow',
      synopsis: 'A detective investigates a mysterious disappearance in the city. The clues lead to an ancient conspiracy.',
      genres: ['mystery'],
      openingScene: 'The rain fell hard against the window as Detective Morgan stared at the crime scene.',
      basePrompt: 'This is a noir detective story set in a modern city.',
      tone: 'dark and gritty',
      styleGuide: 'Use short sentences and vivid descriptions.',
      worldRules: 'Magic does not exist in this world.',
      language: 'en',
      maturityRating: '16+',
    };

    const englishPremises = [
      {
        title: 'The Neon Path',
        synopsis: 'A young hacker discovers a hidden network of digital ghosts operating in the abandoned metro tunnels.',
        basePrompt: 'Cyberpunk thriller about underground technology.',
        openingScene: 'The monitor flickered as data streams cascaded across the screen.',
        tone: 'tense',
      },
    ];

    const englishCharacters = [
      {
        name: 'Sarah',
        roleLabel: 'The Hacker',
        narrativeFunction: 'HERO',
        description: 'A skilled programmer who left the corporate world after a personal tragedy.',
        personality: 'Introverted but determined, she trusts her code more than people.',
        motivation: 'To expose the truth about the digital underworld.',
        secret: 'She knows the CEO was involved.',
        relationshipToPlayer: 'She needs the player to crack the final firewall.',
        initialGoal: 'Decrypt the master server logs.',
        startingSituation: 'Sarah sits in her dark apartment, fingers hovering over the keyboard as encrypted messages flood her inbox.',
        conflictPotential: 'The corporation will stop at nothing to protect their secrets.',
        visualPrompt: 'A young woman in a dark room, neon lights reflecting on her glasses.',
      },
    ];

    it('premises: rejects English content on first attempt, succeeds on retry with pt-BR', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();

      const ptBR = [
        { title: 'O Caminho do Silêncio', synopsis: 'Um jovem hacker descobre uma rede oculta de inteligências digitais nos túneis do metrô abandonado.', basePrompt: 'Thriller cyberpunk sobre tecnologia esquecida.', openingScene: 'O monitor piscou enquanto dados criptografados surgiam na tela.', tone: 'tenso' },
      ];

      provider.generate
        .mockResolvedValueOnce({ content: JSON.stringify(englishPremises), inputTokens: 100, outputTokens: 200, model: 'groq/free' })
        .mockResolvedValueOnce({ content: JSON.stringify(ptBR), inputTokens: 100, outputTokens: 200, model: 'groq/free' });

      const service = new AiService(
        mockConfigService as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );
      const result = await (service as any).tryGenerateJson('prompt', 'groq/free', 'premises',
        (p: any) => {
          if (!Array.isArray(p) || p.length < 1) return false;
          if (!p.every((x: any) => x.title && x.synopsis && x.basePrompt)) return false;
          return !containsTooMuchEnglish(...p.map((x: any) =>
            `${x.title} ${x.synopsis} ${x.basePrompt} ${x.openingScene || ''} ${x.tone || ''}`,
          ));
        },
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('O Caminho do Silêncio');
      expect(provider.generate).toHaveBeenCalledTimes(2);
    });

    it('characters: rejects English content on first attempt, succeeds on retry with pt-BR', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();

      const ptBR = [
        { name: 'Sara', roleLabel: 'A Programadora', narrativeFunction: 'HERO', description: 'Uma desenvolvedora que deixou o mundo corporativo após uma tragédia pessoal.', personality: 'Introvertida mas determinada, confia mais no seu código do que nas pessoas.', motivation: 'Expor a verdade sobre o submundo digital.', startingSituation: 'Sara está em seu apartamento escuro, os dedos pairando sobre o teclado enquanto mensagens surgem na tela.' },
      ];

      provider.generate
        .mockResolvedValueOnce({ content: JSON.stringify(englishCharacters), inputTokens: 100, outputTokens: 200, model: 'groq/free' })
        .mockResolvedValueOnce({ content: JSON.stringify(ptBR), inputTokens: 100, outputTokens: 200, model: 'groq/free' });

      const service = new AiService(
        mockConfigService as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );
      const result = await (service as any).tryGenerateJson('prompt', 'groq/free', 'characters',
        (c: any) => {
          if (!Array.isArray(c) || c.length < 1) return false;
          if (!c.every((x: any) => x.name && x.roleLabel && x.narrativeFunction && x.description && x.personality && x.startingSituation)) return false;
          return !containsTooMuchEnglish(...c.map((x: any) =>
            `${x.roleLabel} ${x.description} ${x.personality} ${x.motivation || ''} ${x.secret || ''} ${x.relationshipToPlayer || ''} ${x.initialGoal || ''} ${x.startingSituation || ''} ${x.conflictPotential || ''} ${x.visualPrompt || ''}`,
          ));
        },
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sara');
      expect(provider.generate).toHaveBeenCalledTimes(2);
    });

    it('story draft: rejects English content', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();
      provider.generate.mockResolvedValue({ content: JSON.stringify(englishStoryDraft), inputTokens: 100, outputTokens: 200, model: 'groq/free' });

      const service = new AiService(
        mockConfigService as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );

      const parsed = (service as any).parseAndValidateStoryDraft(JSON.stringify(englishStoryDraft));
      expect(parsed).toBeNull();
    });

    it('story draft: accepts pt-BR content', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();

      const ptBR = {
        title: 'A Última Sombra',
        synopsis: 'Uma detetive investiga o desaparecimento misterioso na cidade. As pistas levam a uma conspiração milenar.',
        genres: ['mistério'],
        openingScene: 'A chuva caía forte contra a janela enquanto a Detetive Moraes analisava a cena do crime.',
        basePrompt: 'Uma história de detetive noir ambientada em São Paulo.',
        tone: 'sombrio e realista',
        styleGuide: 'Use frases curtas e descrições vívidas.',
        worldRules: 'Não existe magia neste mundo.',
        language: 'pt-BR',
        maturityRating: '16+',
      };

      const service = new AiService(
        mockConfigService as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );

      const parsed = (service as any).parseAndValidateStoryDraft(JSON.stringify(ptBR));
      expect(parsed).toBeTruthy();
      expect(parsed.title).toBe('A Última Sombra');
    });

    it('story draft: rejects pt-BR content that is missing narrative contract fields', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();

      const incompleteDraft = {
        title: 'A Última Sombra',
        synopsis: 'Uma detetive investiga um desaparecimento misterioso que muda a cidade.',
        genres: ['mistério'],
        openingScene: 'A chuva caía forte contra a janela enquanto a Detetive Moraes analisava a cena do crime.',
        language: 'pt-BR',
        maturityRating: '16+',
      };

      const service = new AiService(
        mockConfigService as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );

      const parsed = (service as any).parseAndValidateStoryDraft(JSON.stringify(incompleteDraft));
      expect(parsed).toBeNull();
    });

    it('story draft: retries English first response and returns valid pt-BR draft', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();

      const ptBR = {
        title: 'A Última Sombra',
        synopsis: 'Uma detetive investiga o desaparecimento misterioso na cidade. As pistas levam a uma conspiração milenar.',
        genres: ['mistério'],
        openingScene: 'A chuva caía forte contra a janela enquanto a Detetive Moraes analisava a cena do crime. No centro da sala, um relógio parado indicava uma hora impossível e uma fotografia molhada mostrava alguém que não deveria estar vivo.',
        basePrompt: 'Continue como uma história interativa de investigação sombria, preservando pistas, escolhas abertas e tensão psicológica.',
        tone: 'sombrio e realista',
        styleGuide: 'Use frases curtas, descrições sensoriais e escolhas dramáticas ao fim de cada cena.',
        worldRules: 'Não existe magia neste mundo. Toda pista deve ter origem humana, tecnológica ou psicológica.',
        language: 'pt-BR',
        maturityRating: '16+',
      };

      provider.generate
        .mockResolvedValueOnce({ content: JSON.stringify(englishStoryDraft), inputTokens: 100, outputTokens: 200, model: 'groq/free' })
        .mockResolvedValueOnce({ content: JSON.stringify(ptBR), inputTokens: 100, outputTokens: 200, model: 'groq/free' });

      const service = new AiService(
        mockConfigService as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateStoryDraft({
        keywords: ['detetive', 'sombra'],
        modelId: 'groq/free',
      });

      expect(result.title).toBe('A Última Sombra');
      expect(result.basePrompt).toContain('história interativa');
      expect(provider.generate).toHaveBeenCalledTimes(2);
    });

    it('premises: throws BadGateway after both attempts return English', async () => {
      const { AiService } = require('../ai.service');
      const provider = mockProvider();
      provider.generate.mockResolvedValue({ content: JSON.stringify(englishPremises), inputTokens: 100, outputTokens: 200, model: 'groq/free' });

      const service = new AiService(
        mockConfigService as any,
        provider as any, provider as any, provider as any, provider as any, provider as any,
      );
      await expect(
        (service as any).tryGenerateJson('prompt', 'groq/free', 'premises',
          (p: any) => {
            if (!Array.isArray(p) || p.length < 1) return false;
            if (!p.every((x: any) => x.title && x.synopsis && x.basePrompt)) return false;
            return !containsTooMuchEnglish(...p.map((x: any) =>
              `${x.title} ${x.synopsis} ${x.basePrompt} ${x.openingScene || ''} ${x.tone || ''}`,
            ));
          },
        )
      ).rejects.toThrow('invalid JSON after 2 attempts');
      expect(provider.generate).toHaveBeenCalledTimes(2);
    });

    it('admin catalog premises: tries next provider when first provider returns invalid JSON twice', async () => {
      const { AiService } = require('../ai.service');
      const groq = mockProvider();
      groq.name = 'groq';
      const openrouter = mockProvider();
      openrouter.name = 'openrouter';
      const google = mockProvider();
      google.name = 'google';

      groq.generate.mockResolvedValue({ content: 'not json', inputTokens: 10, outputTokens: 5, model: 'groq/free' });
      openrouter.generate.mockResolvedValueOnce({
        content: JSON.stringify([
          { title: 'A Carta Selada', synopsis: 'Uma herdeira encontra uma carta que muda sua família.', basePrompt: 'Continue como romance de mistério.' },
        ]),
        inputTokens: 10,
        outputTokens: 20,
        model: 'deepseek/deepseek-v4-flash:free',
      });

      const service = new AiService(
        {
          get: (k: string) => {
            if (k === 'LLM_MOCK_MODE') return false;
            if (k === 'ADMIN_CATALOG_TEXT_PROVIDER_CHAIN') return 'groq,openrouter,google';
            return undefined;
          },
        } as any,
        {} as any,
        {} as any,
        openrouter as any,
        {} as any,
        groq as any,
        google as any,
      );

      const result = await (service as any).tryGenerateJson('prompt', 'groq/free', 'premises',
        (p: any) => Array.isArray(p) && p.length >= 1 && p.every((x: any) => x.title && x.synopsis && x.basePrompt),
        'ADMIN_CATALOG',
      );

      expect(result[0].title).toBe('A Carta Selada');
      expect(groq.generate).toHaveBeenCalledTimes(2);
      expect(openrouter.generate).toHaveBeenCalledTimes(1);
      expect(google.generate).not.toHaveBeenCalled();
    });

    it('user story premises: preserves bounded two-attempt behavior without provider hopping', async () => {
      const { AiService } = require('../ai.service');
      const groq = mockProvider();
      groq.name = 'groq';
      const openrouter = mockProvider();
      openrouter.name = 'openrouter';

      groq.generate.mockResolvedValue({ content: 'not json', inputTokens: 10, outputTokens: 5, model: 'groq/free' });

      const service = new AiService(
        {
          get: (k: string) => {
            if (k === 'LLM_MOCK_MODE') return false;
            if (k === 'USER_STORY_TEXT_PROVIDER_CHAIN') return 'groq,openrouter';
            return undefined;
          },
        } as any,
        {} as any,
        {} as any,
        openrouter as any,
        {} as any,
        groq as any,
        {} as any,
      );

      await expect(
        (service as any).tryGenerateJson('prompt', 'groq/free', 'premises',
          (p: any) => Array.isArray(p) && p.length >= 1,
          'USER_STORY',
        )
      ).rejects.toThrow('invalid JSON after 2 attempts');
      expect(groq.generate).toHaveBeenCalledTimes(2);
      expect(openrouter.generate).not.toHaveBeenCalled();
    });
  });

  describe('Provider exhaustion skip', () => {
    function mockProviderWithName(name: string): any {
      return {
        name,
        generate: jest.fn(),
        estimateCost: jest.fn().mockReturnValue(0),
        getModelForPlan: jest.fn().mockReturnValue('groq/free'),
        isAvailable: jest.fn().mockReturnValue(true),
      };
    }

    const mockConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    it('skips exhausted provider on the second call in the same service instance', async () => {
      const { AiService } = require('../ai.service');
      const groq = mockProviderWithName('groq');
      const openrouter = mockProviderWithName('openrouter');
      const gemini = mockProviderWithName('gemini');

      // First call: groq returns quota error, openrouter succeeds
      groq.generate
        .mockRejectedValueOnce(new Error('Groq API error: status 429'))
        .mockResolvedValueOnce({ content: 'ok', inputTokens: 10, outputTokens: 5, model: 'groq/free' });
      openrouter.generate.mockResolvedValue({ content: 'ok', inputTokens: 10, outputTokens: 5, model: 'deepseek/deepseek-v4-flash:free' });

      const service = new AiService(
        mockConfigService as any,
        openrouter as any, openrouter as any, openrouter as any,
        { generate: jest.fn(), name: 'mock' } as any,
        groq as any, gemini as any,
      );

      // First call — groq fails with 429 (exhausted), openrouter succeeds
      (service as any).generateWithProviderFallback('test', { model: 'groq/free', maxTokens: 500, temperature: 0.7 });

      // Wait for the first call to resolve
      await new Promise((r) => setTimeout(r, 50));

      // Second call — groq should be skipped
      groq.generate.mockClear();

      (service as any).generateWithProviderFallback('test2', { model: 'groq/free', maxTokens: 500, temperature: 0.7 });
      await new Promise((r) => setTimeout(r, 50));

      // Groq was NOT called again (skipped as exhausted)
      expect(groq.generate).not.toHaveBeenCalled();
    });

    it('context-specific ADMIN_CATALOG_TEXT_PROVIDER_CHAIN overrides global chain', async () => {
      const { AiService } = require('../ai.service');
      const gemini = mockProviderWithName('gemini');
      gemini.generate.mockResolvedValue({ content: 'ok', inputTokens: 10, outputTokens: 5, model: 'gemini/free' });

      const chainConfigService = {
        get: (key: string) => {
          if (key === 'ADMIN_CATALOG_TEXT_PROVIDER_CHAIN') return 'gemini';
          if (key === 'FREE_TEXT_PROVIDER_CHAIN') return 'groq,openrouter';
          return undefined;
        },
      };

      // Pass gemini as googleTextProvider (position 6)
      const service = new AiService(
        chainConfigService as any,
        undefined as any, undefined as any, undefined as any,  // openai, anthropic, openrouter all undefined
        { generate: jest.fn(), name: 'mock' } as any,          // mock
        undefined, gemini as any,                               // groq=undefined, googleText=gemini
      );

      await (service as any).generateWithProviderFallback('test', { model: 'groq/free', maxTokens: 500, temperature: 0.7 }, 'ADMIN_CATALOG' as any);
      expect(gemini.generate).toHaveBeenCalled();
    });

    it('USER_STORY context still respects USER_STORY_TEXT_PROVIDER_CHAIN', async () => {
      const { AiService } = require('../ai.service');
      const openrouter = mockProviderWithName('openrouter');
      openrouter.generate.mockResolvedValue({ content: 'ok', inputTokens: 10, outputTokens: 5, model: 'deepseek/deepseek-v4-flash:free' });

      const chainConfigService = {
        get: (key: string) => {
          const chains: Record<string, string> = {
            'FREE_TEXT_PROVIDER_CHAIN': 'groq',
            'USER_STORY_TEXT_PROVIDER_CHAIN': 'openrouter',
          };
          return chains[key];
        },
      };

      const service = new AiService(
        chainConfigService as any,
        undefined as any, undefined as any, openrouter as any,
        { generate: jest.fn(), name: 'mock' } as any,
        undefined, undefined as any,
      );

      (service as any).generateWithProviderFallback('test', { model: 'groq/free', maxTokens: 500, temperature: 0.7 }, 'USER_STORY');
      await new Promise((r) => setTimeout(r, 50));

      // openrouter was called (USER_STORY chain)
      expect(openrouter.generate).toHaveBeenCalled();
    });
  });

  describe('Scene Generation Prompt Guidance (Step 98d)', () => {
    function mockPromptProvider(): LLMProvider {
      return {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            sceneText: 'Cena gerada com personagem ativo.',
            choices: ['Encará-lo em silêncio', 'Perguntar o que ele esconde'],
            sceneMetadata: { emotion: 'tensa', pacing: 'media' },
          }),
          inputTokens: 20,
          outputTokens: 10,
          model: 'openrouter/free',
        }),
        estimateCost: jest.fn(),
        getModelForPlan: jest.fn(),
      };
    }

    it('continuation prompt includes character-reaction guidance', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateScene({
        storyTitle: 'A Porta Selada',
        synopsis: 'Uma história de mistério.',
        genre: 'mistério',
        userAction: 'abrir a porta',
        userActionType: UserActionType.CHOICE,
        plan: SubscriptionType.FREE,
        characters: [{ name: 'Lia', role: 'investigadora' }],
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('reação significativa');
      expect(prompt).toContain('personagens ativos');
    });

    it('continuation prompt includes shorter default scene guidance', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateScene({
        storyTitle: 'A Porta Selada',
        genre: 'mistério',
        userAction: 'investigar',
        userActionType: UserActionType.FREE_TEXT,
        plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('180');
      expect(prompt).toContain('350 palavras');
      expect(prompt).toContain('2-4 blocos');
    });

    it('continuation prompt includes relational choice guidance', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateScene({
        storyTitle: 'O Dono da Cidade',
        synopsis: 'Uma fotógrafa vê algo que não devia.',
        genre: 'suspense',
        userAction: 'seguir o herdeiro',
        userActionType: UserActionType.CHOICE,
        plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('ESPECÍFICAS');
      expect(prompt).toContain('RELACIONAIS');
      expect(prompt).toContain('EVITE escolhas genéricas');
    });

    it('continuation prompt includes narration balance guidance', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateScene({
        storyTitle: 'Entre Luxo e Mentiras',
        genre: 'mistério',
        userAction: 'questionar a assistente',
        userActionType: UserActionType.CHOICE,
        plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('40%');
      expect(prompt).toContain('narração atmosférica concisa');
      expect(prompt).toContain('NÃO descreva o ambiente em excesso');
    });

    it('continuation prompt includes dialogue and subtext guidance', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateScene({
        storyTitle: 'Contrato de Sangue',
        genre: 'romance',
        userAction: 'confrontar o médico',
        userActionType: UserActionType.FREE_TEXT,
        plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('diálogo');
      expect(prompt).toContain('subtexto');
    });

    it('first-scene prompt includes active character reaction requirement', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateFirstScene({
        title: 'A Rainha Sem Coroa',
        synopsis: 'Uma jovem descobre que é herdeira.',
        genre: 'romantasy',
        plan: SubscriptionType.FREE,
        characters: [{ name: 'Kael', role: 'guardião', description: 'Protetor silencioso' }],
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('PELO MENOS UMA reação');
      expect(prompt).toContain('presença ativa');
    });

    it('first-scene prompt includes shorter default pacing guidance', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateFirstScene({
        title: 'O Príncipe das Sombras',
        genre: 'romantasy',
        plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('180');
      expect(prompt).toContain('350 palavras');
      expect(prompt).toContain('hook na primeira');
    });

    it('first-scene prompt includes relational choice guidance', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateFirstScene({
        title: 'A Dívida do CEO',
        synopsis: 'Uma jovem advogada trabalha para um CEO implacável.',
        genre: 'romance',
        plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('EVITE escolhas genéricas');
      expect(prompt).toContain('específicas');
    });

    it('first-scene prompt avoids excessive description guidance', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateFirstScene({
        title: 'Academia dos Sete Selos',
        genre: 'fantasia',
        plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('Não encha de exposição');
      expect(prompt).toContain('1-2 frases de ambientação');
    });

    it('sceneInstruction with isCinematic preserves character activity guidance', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateScene({
        storyTitle: 'A Porta Selada',
        genre: 'mistério',
        userAction: 'abrir a porta',
        userActionType: UserActionType.CHOICE,
        plan: SubscriptionType.FREE,
        isCinematic: true,
        walletBalance: 10,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('CINEMÁTICA');
      expect(prompt).toContain('personagens ativos');
      expect(prompt).toContain('evite exposição descritiva excessiva');
    });

    it('recovers scene JSON returned as an escaped JSON string', async () => {
      const provider = mockPromptProvider();
      provider.generate = jest.fn().mockResolvedValue({
        content: JSON.stringify(JSON.stringify({
          sceneText: 'Luna sentiu o calor da cozinha mudar quando Marco parou diante dela com a colher ainda erguida.',
          choices: ['Responder ao desafio', 'Provar o creme', 'Chamar a equipe'],
          sceneMetadata: { emotion: 'tensa', pacing: 'media' },
        })),
        inputTokens: 20,
        outputTokens: 10,
        model: 'groq/free',
      });
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateFirstScene({
        title: 'Sabores em Conflito',
        genre: 'romance gastronomico',
        plan: SubscriptionType.FREE,
      });

      expect(result.sceneText).toContain('Luna sentiu o calor');
      expect(result.sceneText).not.toContain('"sceneText"');
      expect(result.choices).toEqual(['Responder ao desafio', 'Provar o creme', 'Chamar a equipe']);
    });

    it('rejects raw JSON leaked inside sceneText instead of rendering it in the reader', async () => {
      const provider = mockPromptProvider();
      provider.generate = jest.fn().mockResolvedValue({
        content: JSON.stringify({
          sceneText: '{ "sceneText": "A porta se abriu, mas a resposta veio truncada',
          choices: ['Continuar lendo'],
        }),
        inputTokens: 20,
        outputTokens: 10,
        model: 'groq/free',
      });
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await expect(service.generateFirstScene({
        title: 'Sabores em Conflito',
        genre: 'romance gastronomico',
        plan: SubscriptionType.FREE,
      })).rejects.toThrow('invalid scene text');
    });
  });

  describe('normalizeSceneTextQuotes', () => {
    it('strips external wrapping quotes when content is valid', async () => {
      const provider: LLMProvider = {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            sceneText: '"O estalo da porta ecoou pelo corredor vazio. Você prendeu a respiração e esperou."',
            choices: ['Avançar devagar', 'Voltar pelo corredor'],
            sceneMetadata: { emotion: 'tensa', pacing: 'lenta' },
          }),
          inputTokens: 20,
          outputTokens: 10,
          model: 'openrouter/free',
        }),
        estimateCost: jest.fn(),
        getModelForPlan: jest.fn(),
      };
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateScene({
        storyTitle: 'A Porta Selada',
        genre: 'mistério',
        userAction: 'escutar',
        userActionType: UserActionType.CHOICE,
        plan: SubscriptionType.FREE,
      });

      expect(result.sceneText).not.toContain('"O estalo');
      expect(result.sceneText).toContain('O estalo da porta ecoou');
      expect(result.sceneText).toContain('Você prendeu a respiração');
    });

    it('preserves legitimate dialogue quotes inside the text', async () => {
      const provider: LLMProvider = {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            sceneText: '"Você hesitou. Então ouviu a voz: \"Entre logo ou vou trancar a porta.\" O tom era seco."',
            choices: ['Entrar', 'Responder'],
            sceneMetadata: { emotion: 'tensa', pacing: 'media' },
          }),
          inputTokens: 20,
          outputTokens: 10,
          model: 'openrouter/free',
        }),
        estimateCost: jest.fn(),
        getModelForPlan: jest.fn(),
      };
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateScene({
        storyTitle: 'Test',
        genre: 'mistério',
        userAction: 'escutar',
        userActionType: UserActionType.CHOICE,
        plan: SubscriptionType.FREE,
      });

      expect(result.sceneText).toContain('"Entre logo');
      expect(result.sceneText).not.toMatch(/^"/);
      expect(result.sceneText).not.toMatch(/"$/);
    });

    it('does not strip text when quotes are part of content structure', async () => {
      const provider: LLMProvider = {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            sceneText: 'Ela disse: "Confio em você." Você sabia que era mentira.',
            choices: ['Confrontar', 'Aceitar'],
            sceneMetadata: { emotion: 'conflituosa', pacing: 'media' },
          }),
          inputTokens: 20,
          outputTokens: 10,
          model: 'openrouter/free',
        }),
        estimateCost: jest.fn(),
        getModelForPlan: jest.fn(),
      };
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateScene({
        storyTitle: 'Test',
        genre: 'drama',
        userAction: 'ouvir',
        userActionType: UserActionType.CHOICE,
        plan: SubscriptionType.FREE,
      });

      expect(result.sceneText).toContain('Ela disse');
      expect(result.sceneText).toContain('Confio em você.');
      expect(result.sceneText).toContain('Você sabia');
    });
  });

  describe('Second-Person Voice (Step 98f)', () => {
    function mockPromptProvider(): LLMProvider {
      return {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            sceneText: 'Você sente o ar frio da noite.',
            choices: ['Seguir em frente'],
            sceneMetadata: { emotion: 'misteriosa', pacing: 'media' },
          }),
          inputTokens: 20,
          outputTokens: 10,
          model: 'openrouter/free',
        }),
        estimateCost: jest.fn(),
        getModelForPlan: jest.fn(),
      };
    }

    it('continuation prompt enforces segunda pessoa voce narration', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateScene({
        storyTitle: 'A Porta Selada',
        genre: 'mistério',
        userAction: 'escutar',
        userActionType: UserActionType.CHOICE,
        plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('SEGUNDA PESSOA');
      expect(prompt).toContain('você');
      expect(prompt).toContain('NUNCA use primeira pessoa');
      expect(prompt).toContain('eu');
      expect(prompt).toContain('meu');
      expect(prompt).toContain('minha');
    });

    it('first-scene prompt enforces segunda pessoa voce narration', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateFirstScene({
        title: 'A Porta Selada',
        genre: 'mistério',
        plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('SEGUNDA PESSOA');
      expect(prompt).toContain('você');
      expect(prompt).toContain('NUNCA use primeira pessoa');
    });

    it('allows first person in dialogue by explicitly exempting it', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateScene({
        storyTitle: 'Test',
        genre: 'drama',
        userAction: 'conversar',
        userActionType: UserActionType.CHOICE,
        plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('Personagens podem falar em primeira pessoa');
      expect(prompt).toContain('diálogos');
    });
  });

  describe('Choice Quote Normalization (Step 98i)', () => {
    it('strips wrapper quotes from choices', async () => {
      const provider: LLMProvider = {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            sceneText: 'Você avança pelo corredor.',
            choices: ['"Abrir a porta devagar"', '"Perguntar quem está ali"'],
            sceneMetadata: { emotion: 'tensa', pacing: 'media' },
          }),
          inputTokens: 20, outputTokens: 10, model: 'openrouter/free',
        }),
        estimateCost: jest.fn(), getModelForPlan: jest.fn(),
      };
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateScene({
        storyTitle: 'Test', genre: 'mistério', userAction: 'avançar',
        userActionType: UserActionType.CHOICE, plan: SubscriptionType.FREE,
      });

      expect(result.choices).not.toContain('"Abrir a porta devagar"');
      expect(result.choices).toContain('Abrir a porta devagar');
    });

    it('preserves intentional internal quotes in choices', async () => {
      const provider: LLMProvider = {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            sceneText: 'Você ouve algo.',
            choices: ['Dizer "eu confio em você"', 'Ficar em silêncio'],
            sceneMetadata: { emotion: 'conflituosa', pacing: 'media' },
          }),
          inputTokens: 20, outputTokens: 10, model: 'openrouter/free',
        }),
        estimateCost: jest.fn(), getModelForPlan: jest.fn(),
      };
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateScene({
        storyTitle: 'Test', genre: 'drama', userAction: 'ouvir',
        userActionType: UserActionType.CHOICE, plan: SubscriptionType.FREE,
      });

      expect(result.choices).toContain('Dizer "eu confio em você"');
    });
  });

  describe('Anti-Repetition Prompt Guidance (Step 98i)', () => {
    function mockPromptProvider(): LLMProvider {
      return {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({ sceneText: 'Você sente o ar frio.', choices: ['Seguir'], sceneMetadata: { emotion: 'misteriosa', pacing: 'media' } }),
          inputTokens: 20, outputTokens: 10, model: 'openrouter/free',
        }),
        estimateCost: jest.fn(), getModelForPlan: jest.fn(),
      };
    }

    it('continuation prompt prohibits restating previous scene', async () => {
      const provider = mockPromptProvider();
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      await service.generateScene({
        storyTitle: 'Test', genre: 'mistério', userAction: 'abrir a porta',
        userActionType: UserActionType.CHOICE, plan: SubscriptionType.FREE,
      });

      const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
      expect(prompt).toContain('NUNCA repita');
      expect(prompt).toContain('CONTEXTO APENAS');
      expect(prompt).toContain('SOMENTE a nova cena');
      expect(prompt).toContain('consequência da ação do leitor');
    });
  });

  describe('Escaped Wrapper Quote Normalization (Step 98j)', () => {
    it('strips escaped wrapper quotes from scene text', async () => {
      const provider: LLMProvider = {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({ sceneText: '\\"O estalo da porta ecoou pelo corredor vazio e você prendeu a respiração.\\"', choices: ['Avançar', 'Recuar'], sceneMetadata: { emotion: 'tensa', pacing: 'lenta' } }),
          inputTokens: 20, outputTokens: 10, model: 'openrouter/free',
        }),
        estimateCost: jest.fn(), getModelForPlan: jest.fn(),
      };
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateScene({
        storyTitle: 'A Porta Selada', genre: 'mistério', userAction: 'escutar',
        userActionType: UserActionType.CHOICE, plan: SubscriptionType.FREE,
      });

      expect(result.sceneText).toContain('O estalo da porta ecoou');
      expect(result.sceneText).not.toMatch(/^\\?"/);
      expect(result.sceneText).not.toMatch(/\\?"$/);
    });

    it('preserves escaped internal dialogue quotes while stripping wrappers', async () => {
      const provider: LLMProvider = {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({ sceneText: '\\"Você ouviu a voz: \\\\\\"Entre logo ou vou trancar a porta.\\\\\\" O tom era seco e definitivo.\\"', choices: ['Entrar', 'Responder'], sceneMetadata: { emotion: 'tensa', pacing: 'media' } }),
          inputTokens: 20, outputTokens: 10, model: 'openrouter/free',
        }),
        estimateCost: jest.fn(), getModelForPlan: jest.fn(),
      };
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateScene({
        storyTitle: 'Test', genre: 'mistério', userAction: 'escutar',
        userActionType: UserActionType.CHOICE, plan: SubscriptionType.FREE,
      });

      expect(result.sceneText).toContain('Você ouviu a voz');
      expect(result.sceneText).toContain('Entre logo');
      expect(result.sceneText).toContain('O tom era seco');
      expect(result.sceneText).toContain('"Entre logo ou vou trancar a porta."');
      expect(result.sceneText).not.toContain('\\"');
      expect(result.sceneText).not.toContain('\\\\');
      expect(result.sceneText).not.toMatch(/^\\?"/);
      expect(result.sceneText).not.toMatch(/\\?"$/);
    });

    it('strips escaped wrapper quotes from choices', async () => {
      const provider: LLMProvider = {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({ sceneText: 'Você avança pelo corredor escuro.', choices: ['\\"Abrir a porta devagar\\"', '\\"Perguntar quem está ali\\"'], sceneMetadata: { emotion: 'tensa', pacing: 'media' } }),
          inputTokens: 20, outputTokens: 10, model: 'openrouter/free',
        }),
        estimateCost: jest.fn(), getModelForPlan: jest.fn(),
      };
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateScene({
        storyTitle: 'Test', genre: 'mistério', userAction: 'avançar',
        userActionType: UserActionType.CHOICE, plan: SubscriptionType.FREE,
      });

      expect(result.choices).toContain('Abrir a porta devagar');
      expect(result.choices).not.toContain('\\"Abrir a porta devagar\\"');
      expect(result.choices.join(' ')).not.toContain('\\"');
      expect(result.choices.join(' ')).not.toContain('\\\\');
    });

    it('handles smart quotes escaped wrappers', async () => {
      const provider: LLMProvider = {
        name: 'mock',
        generate: jest.fn().mockResolvedValue({
          content: JSON.stringify({ sceneText: '\u201CO cheiro de carvão ainda quente preenchia o ar da cozinha.\u201D', choices: ['Avançar', 'Recuar'], sceneMetadata: { emotion: 'nostálgica', pacing: 'media' } }),
          inputTokens: 20, outputTokens: 10, model: 'openrouter/free',
        }),
        estimateCost: jest.fn(), getModelForPlan: jest.fn(),
      };
      const service = new AiService(
        { get: (key: string) => key === 'LLM_MOCK_MODE' ? 'true' : undefined } as any,
        provider as any, provider as any, provider as any, provider as any,
      );

      const result = await service.generateScene({
        storyTitle: 'Sabores em Conflito', genre: 'romance gastronômico', userAction: 'sentir',
        userActionType: UserActionType.CHOICE, plan: SubscriptionType.FREE,
      });

      expect(result.sceneText).toContain('O cheiro de carvão');
      expect(result.sceneText).not.toMatch(/^[\u201C"]/);
      expect(result.sceneText).not.toMatch(/[\u201D"]$/);
    });
  });
});
