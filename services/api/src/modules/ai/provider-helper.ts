import { LLMProvider } from './interfaces/llm-provider.interface';

export function getProviderForModel(
  model: string,
  providers: Map<string, LLMProvider>,
  defaultProvider: LLMProvider,
): LLMProvider {
  const modelLower = model.toLowerCase();
  if (modelLower.startsWith('claude-') || modelLower.startsWith('anthropic')) {
    return providers.get('anthropic') || defaultProvider;
  }
  if (modelLower.startsWith('gpt-') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) {
    return providers.get('openai') || defaultProvider;
  }
  return defaultProvider;
}