import type { AIProvider } from './provider';
import { GeminiProvider } from './gemini';

export type {
  AIChatMessage,
  AIAnalysisInput,
  AIAnalysisOutput,
  AIChatContext,
  AIProvider,
} from './provider';
export { GeminiProvider, AIProviderError, LLMAnalysisOutputSchema } from './gemini';
export type { LLMAnalysisOutput } from './gemini';

let instance: AIProvider | null = null;

export function createAIProvider(): AIProvider {
  return new GeminiProvider();
}

const aiProvider: AIProvider = new Proxy({} as AIProvider, {
  get(_target, prop: keyof AIProvider) {
    if (!instance) {
      instance = createAIProvider();
    }
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});

export default aiProvider;
