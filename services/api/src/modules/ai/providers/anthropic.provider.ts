import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionType } from '@prisma/client';
import { LLMProvider, LLMResponse, GenerateConfig, MODEL_COSTS } from '../interfaces/llm-provider.interface';
import { withRetry, isAuthError } from './fetch-retry.helper';

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: {
    type: string;
    text: string;
  }[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason: string;
}

@Injectable()
export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
  }

  async generate(prompt: string, config: GenerateConfig): Promise<LLMResponse> {
    const model = config['model'] || 'claude-3-5-sonnet-20241022';

    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    this.logger.debug(`Anthropic request: model=${model}, maxTokens=${config.maxTokens || 1024}`);

    const response = await withRetry(
      () => this.executeRequest(model, config, prompt),
      { maxAttempts: 2 },
      this.logger,
      `model=${model}`,
    );

    return response;
  }

  private async executeRequest(model: string, config: GenerateConfig, prompt: string): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: config.maxTokens || 1024,
      }),
    });

    if (!response.ok) {
      const bodyLength = (await response.text()).length;
      this.logger.error(`Anthropic API error: status=${response.status}, model=${model}, bodyLength=${bodyLength}`);
      const err = new Error(`Anthropic API error: status ${response.status}`);
      if (isAuthError(response.status)) {
        throw err;
      }
      throw err;
    }

    const data: AnthropicResponse = await response.json();
    const content = data.content.find(c => c.type === 'text');
    const responseModel = (data as any).model;
    return {
      content: content?.text || '',
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      model: responseModel || model,
    };
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const model = 'claude-3-5-sonnet-20241022';
    const rates = MODEL_COSTS[model] || { input: 0.000003, output: 0.000015 };
    return (inputTokens * rates.input) + (outputTokens * rates.output);
  }

  getModelForPlan(plan: SubscriptionType): string {
    switch (plan) {
      case SubscriptionType.PREMIUM:
        return 'claude-3-5-sonnet-20241022';
      case SubscriptionType.FREE:
      default:
        return 'claude-3-5-sonnet-20241022';
    }
  }
}