import type {
  AnalysisReport,
  AnalysisConfidence,
  ExplanationLevel,
  PriorityWeights,
  Recommendation,
  SimilarityScores,
} from '@/lib/types/analysis';

export type AIChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AIAnalysisInput = {
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
};

export type AIAnalysisOutput = {
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
};

export type AIChatContext = {
  report?: AnalysisReport | null;
};

export interface AIProvider {
  analyze(input: AIAnalysisInput): Promise<AIAnalysisOutput>;
  chat(messages: AIChatMessage[], context?: AIChatContext): Promise<string>;
  providerName: string;
}
