import aiProvider, {
  LLMAnalysisOutputSchema as _LLMAnalysisOutputSchema,
} from '@/lib/ai';
import type { LLMAnalysisOutput as _LLMAnalysisOutput } from '@/lib/ai';
import type {
  AnalysisReport,
  AnalysisConfidence,
  ExplanationLevel,
  PriorityWeights,
  Recommendation,
  SimilarityScores,
} from '@/lib/types/analysis';

export { AIProviderError as LLMConfigError } from '@/lib/ai';
export { AIProviderError as LLMResponseError } from '@/lib/ai';

export const LLMAnalysisOutputSchema = _LLMAnalysisOutputSchema;
export type LLMAnalysisOutput = _LLMAnalysisOutput;

export async function callAnalysisLLM(input: {
  problem: string;
  codeA: string;
  codeB: string;
  langA: string;
  langB: string;
  staticEvidence: {
    solutionA: unknown;
    solutionB: unknown;
    complexityA: unknown;
    complexityB: unknown;
  };
  priorities: PriorityWeights;
  explanationLevel: ExplanationLevel;
  interviewMode: boolean;
  model?: string;
}): Promise<{
  narrative: AnalysisReport['narrative'];
  logicDifference: string;
  edgeCases: AnalysisReport['edgeCases'];
  interviewAssessment?: Recommendation['interviewAssessment'];
  optimizedA: string;
  optimizedB: string;
  confidences: AnalysisConfidence;
  optimizedCodeA?: string;
  optimizedCodeB?: string;
  optimizationWhyA?: string;
  optimizationWhyB?: string;
  optimizationTradeoffA?: string;
  optimizationTradeoffB?: string;
  optimizedBeforeA?: string;
  optimizedAfterA?: string;
  optimizedBeforeB?: string;
  optimizedAfterB?: string;
  similarity?: SimilarityScores;
  semantic_equivalence?: {
    verdict: string;
    score: number;
    evidence: string[];
  };
}> {
  void input.model;
  return await aiProvider.analyze(input);
}

export async function callChatLLM(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  context?: { report?: AnalysisReport | null }
): Promise<string> {
  return await aiProvider.chat(messages, context);
}
