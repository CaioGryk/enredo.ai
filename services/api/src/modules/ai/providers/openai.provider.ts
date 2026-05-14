import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionType } from '@prisma/client';
import { LLMProvider, LLMResponse, GenerateConfig } from '../interfaces/llm-provider.interface';
import { withRetry, isAuthError } from './fetch-retry.helper';

interface OpenAIChoice {
  message: {
    content: string;
    role: string;
  };
  finish_reason: string;
}

interface OpenAIResponse {
  id: string;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  async generate(prompt: string, config: GenerateConfig): Promise<LLMResponse> {
    const model = config['model'] || 'gpt-4o-mini';

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.logger.debug(`OpenAI request: model=${model}, maxTokens=${config.maxTokens || 500}`);

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
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt },
        ],
        max_tokens: config.maxTokens || 500,
        temperature: config.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const bodyLength = (await response.text()).length;
      this.logger.error(`OpenAI API error: status=${response.status}, model=${model}, bodyLength=${bodyLength}`);
      const err = new Error(`OpenAI API error: status ${response.status}`);
      if (isAuthError(response.status)) {
        throw err;
      }
      throw err;
    }

    const data: OpenAIResponse = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      model: data.model,
    };
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const rates = this.getModelRates();
    return (inputTokens * rates.input) + (outputTokens * rates.output);
  }

  private getModelRates(): { input: number; output: number } {
    return { input: 0.000015, output: 0.00006 };
  }

  getModelForPlan(plan: SubscriptionType): string {
    switch (plan) {
      case SubscriptionType.PREMIUM:
        return 'gpt-4o';
      case SubscriptionType.FREE:
      default:
        return 'gpt-4o-mini';
    }
  }
}