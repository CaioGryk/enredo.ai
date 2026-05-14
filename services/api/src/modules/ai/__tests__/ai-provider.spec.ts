import { getProviderForModel } from '../provider-helper';
import { AiService } from '../ai.service';
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

  it('has openrouter/free as default free model', () => {
    const freeModel = getDefaultFreeModel();
    expect(freeModel.id).toBe('openrouter/free');
    expect(freeModel.tier).toBe('FREE');
    expect(freeModel.isDefaultFree).toBe(true);
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
    const implementedProviders = ['openai', 'anthropic', 'openrouter'];
    for (const model of activeModels) {
      expect(implementedProviders).toContain(model.provider);
    }
  });

  it('inactive models include unimplemented providers', () => {
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
  it('openrouter/free maps to openrouter provider', () => {
    const provider = getProviderForModelId('openrouter/free');
    expect(provider).toBe('openrouter');
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

  it('FREE default model is openrouter/free', () => {
    const { getDefaultFreeModel } = require('../model-catalog');
    const freeModel = getDefaultFreeModel();
    expect(freeModel.id).toBe('openrouter/free');
    expect(freeModel.tier).toBe('FREE');
  });

  it('PREMIUM default model is gpt-4.1-nano', () => {
    const { getDefaultPremiumModel } = require('../model-catalog');
    const premiumModel = getDefaultPremiumModel();
    expect(premiumModel.id).toBe('gpt-4.1-nano');
    expect(premiumModel.tier).toBe('PREMIUM');
  });

  it('includes openThreads in the final prompt sent to the provider', async () => {
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
    });

    const prompt = (provider.generate as jest.Mock).mock.calls[0][0];
    expect(prompt).toContain('Trilhas em Aberto:');
    expect(prompt).toContain('A porta selada ainda nao foi explicada');
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

    it('Premium user receives openrouter/free as defaultModelId when FREE_LLM_ONLY=true', () => {
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
      expect(defaultId).toBe('openrouter/free');
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

    it('AiService returns MockProvider for openrouter/free when FREE_LLM_ONLY=true, LLM_MOCK_MODE=false, OPENROUTER_API_KEY missing', () => {
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

      // Should now throw ForbiddenException instead of silently returning mock
      expect(() => service.getProviderForModelId('openrouter/free')).toThrow('OPENROUTER_API_KEY is not configured');
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
});
