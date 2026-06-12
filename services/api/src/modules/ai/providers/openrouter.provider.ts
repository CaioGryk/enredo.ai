import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionType } from '@prisma/client';
import { setDefaultResultOrder } from 'dns';
import { LLMProvider, LLMResponse, GenerateConfig } from '../interfaces/llm-provider.interface';
import { MockProvider } from './mock.provider';
import { withRetry, isAuthError } from './fetch-retry.helper';

interface OpenRouterChoice {
  message: {
    content: string;
    role: string;
  };
  finish_reason: string;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  provider?: string;
}

@Injectable()
export class OpenRouterProvider implements LLMProvider {
  name = 'openrouter';
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private readonly requestTimeoutMs: number;
  private readonly logger = new Logger(OpenRouterProvider.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mockProvider: MockProvider,
  ) {
    setDefaultResultOrder('ipv4first');
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY') || '';
    this.requestTimeoutMs = Number(this.configService.get<string>('TEXT_PROVIDER_TIMEOUT_MS')) || 20_000;
  }

  async generate(prompt: string, config: GenerateConfig): Promise<LLMResponse> {
    if (!this.apiKey) {
      this.logger.error('OPENROUTER_API_KEY is not configured. Request blocked to prevent broken API call with empty Bearer token.');
      throw new Error('OPENROUTER_API_KEY is not configured. Please set it in your environment variables.');
    }

    const freeLlmOnly = this.isFreeLlmOnly();
    const model = config['model'] || 'openrouter/free';

    if (freeLlmOnly && !this.isFreeModel(model)) {
      this.logger.warn(`FREE_LLM_ONLY=true: Blocked request to paid model "${model}"`);
      throw new Error(`Paid models are disabled. FREE_LLM_ONLY=true restricts to free models only. Requested: ${model}`);
    }

    this.logger.debug(`OpenRouter request: model=${model}, maxTokens=${config.maxTokens || 500}`);

    const response = await withRetry(
      () => this.executeRequest(model, config, prompt),
      { maxAttempts: 2 },
      this.logger,
      `model=${model}`,
    );

    return response;
  }

  private async executeRequest(model: string, config: GenerateConfig, prompt: string): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://enredo.ai',
        'X-Title': 'Enredo AI Storytelling',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt },
        ],
        max_tokens: config.maxTokens || 500,
        temperature: config.temperature || 0.7,
      }),
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });

    if (!response.ok) {
      const bodyLength = (await response.text()).length;
      this.logger.error(`OpenRouter API error: status=${response.status}, model=${model}, bodyLength=${bodyLength}`);
      const err = new Error(`OpenRouter API error: status ${response.status}`);
      if (isAuthError(response.status)) {
        throw err;
      }
      throw err;
    }

    const data: OpenRouterResponse = await response.json();
    const choice = data.choices[0];

    if (!choice?.message?.content) {
      this.logger.error('OpenRouter response missing content');
      throw new Error('OpenRouter response missing content');
    }

    return {
      content: choice.message.content,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      model: data.model || model,
    };
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return 0;
  }

  getModelForPlan(plan: SubscriptionType): string {
    return 'openrouter/free';
  }

  private isFreeLlmOnly(): boolean {
    const value = this.configService.get<boolean | string>('FREE_LLM_ONLY');
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase().trim() === 'true';
    return false;
  }

  private isFreeModel(modelId: string): boolean {
    return modelId.includes('free') || modelId.includes('openrouter/free');
  }
}
