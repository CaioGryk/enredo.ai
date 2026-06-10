import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionType } from '@prisma/client';
import { LLMProvider, LLMResponse, GenerateConfig } from '../interfaces/llm-provider.interface';
import { withRetry } from './fetch-retry.helper';

@Injectable()
export class GoogleTextProvider implements LLMProvider {
  name = 'google';
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly logger = new Logger(GoogleTextProvider.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY') || '';
    this.defaultModel = this.configService.get<string>('GOOGLE_TEXT_MODEL') || 'gemini-2.5-flash-lite';
  }

  async generate(prompt: string, config: GenerateConfig): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not configured.');
    }

    const model = config.model && config.model !== 'gemini/free'
      ? config.model
      : this.defaultModel;

    this.logger.debug(`Google text request: model=${model}, maxTokens=${config.maxTokens || 500}`);

    return withRetry(
      () => this.executeRequest(model, prompt, config),
      { maxAttempts: 2 },
      this.logger,
      `model=${model}`,
    );
  }

  private async executeRequest(model: string, prompt: string, config: GenerateConfig): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: config.maxTokens || 500,
          temperature: config.temperature || 0.7,
        },
      }),
    });

    if (!response.ok) {
      const bodyLength = (await response.text()).length;
      this.logger.error(`Google text API error: status=${response.status}, model=${model}, bodyLength=${bodyLength}`);
      throw new Error(`Google text API error: status ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || '')
      .join('')
      .trim();

    if (!content) {
      throw new Error('Google text response missing content');
    }

    return {
      content,
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      model,
    };
  }

  estimateCost(): number {
    return 0;
  }

  getModelForPlan(_plan: SubscriptionType): string {
    return 'gemini/free';
  }
}
