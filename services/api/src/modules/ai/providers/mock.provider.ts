import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionType } from '@prisma/client';
import { LLMProvider, LLMResponse, GenerateConfig } from '../interfaces/llm-provider.interface';

@Injectable()
export class MockProvider implements LLMProvider {
  name = 'mock';
  private mockMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const value = this.configService.get<boolean | string>('LLM_MOCK_MODE');
    this.mockMode = value === true || value === 'true';
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  async generate(prompt: string, config: GenerateConfig): Promise<LLMResponse> {
    const model = config.model || 'openrouter/free';
    const choices = ['Investigar', 'Conversar', 'Recuar'];

    const mockContent = JSON.stringify({
      sceneText: `[MOCK] Esta é uma cena simulada usando o modelo: ${model}. O leitor decidiu continuar a história de forma interativa. A narrativa flui naturalmente com base na ação escolhida.`,
      choices,
      sceneMetadata: { emotion: 'curiosa', pacing: 'media' },
    });

    return {
      content: mockContent,
      inputTokens: 100,
      outputTokens: 80,
      model,
    };
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return 0;
  }

  getModelForPlan(plan: SubscriptionType): string {
    return 'openrouter/free';
  }
}