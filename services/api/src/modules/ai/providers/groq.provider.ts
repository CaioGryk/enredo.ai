import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionType } from '@prisma/client';
import { LLMProvider, LLMResponse, GenerateConfig } from '../interfaces/llm-provider.interface';
import { withRetry, isAuthError } from './fetch-retry.helper';

interface GroqChoice {
  message: {
    content: string | null;
    role: string;
  };
  finish_reason: string;
}

interface GroqResponse {
  model: string;
  choices: GroqChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

@Injectable()
export class GroqProvider implements LLMProvider {
  name = 'groq';
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly baseUrl = 'https://api.groq.com/openai/v1';
  private readonly logger = new Logger(GroqProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY') || '';
    this.defaultModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
  }

  async generate(prompt: string, config: GenerateConfig): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is not configured.');
    }

    const model = config.model && config.model !== 'groq/free'
      ? config.model
      : this.defaultModel;

    this.logger.debug(`Groq request: model=${model}, maxTokens=${config.maxTokens || 500}`);

    return withRetry(
      () => this.executeRequest(model, prompt, config),
      { maxAttempts: 2 },
      this.logger,
      `model=${model}`,
    );
  }

  private async executeRequest(model: string, prompt: string, config: GenerateConfig): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.maxTokens || 500,
        temperature: config.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      const bodyLength = (await response.text()).length;
      this.logger.error(`Groq API error: status=${response.status}, model=${model}, bodyLength=${bodyLength}`);
      const err = new Error(`Groq API error: status ${response.status}`);
      if (isAuthError(response.status)) {
        throw err;
      }
      throw err;
    }

    const data: GroqResponse = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Groq response missing content');
    }

    return {
      content,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      model: data.model || model,
    };
  }

  estimateCost(): number {
    return 0;
  }

  getModelForPlan(_plan: SubscriptionType): string {
    return 'groq/free';
  }
}
