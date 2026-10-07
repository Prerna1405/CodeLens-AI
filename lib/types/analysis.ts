import { z } from 'zod';

export interface TimeComplexity {
  best: string;
  avg: string;
  worst: string;
  evidence: string[];
}

export interface SpaceComplexity {
  input: string;
  auxiliary: string;
  evidence: string[];
}

export interface AnalysisEvidence {
  field: string;
  message: string;
  severity?: 'info' | 'warn' | 'error';
}

export interface AlgorithmInfo {
  label: string;
  evidence: string[];
  details?: string;
}

export interface ReadabilityScore {
  score: number;
  reasons: string[];
}

export interface MaintainabilityScore {
  score: number;
  reasons: string[];
}

export interface CorrectnessInfo {
  correct: boolean | null;
  summary: string;
  issues: string[];
  bugsCount?: number;
}

export interface LineAnchor {
  startLine: number;
  endLine: number;
  label?: string;
}

export interface BugFinding {
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  line?: number;
  anchors?: LineAnchor[];
  category: string;
}

export interface SecurityFinding {
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  line?: number;
  anchors?: LineAnchor[];
  category?: string;
  suggestedFix?: string;
}

export interface StructureNode {
  type: string;
  label: string;
  anchors: LineAnchor[];
}

export interface AstAnalysis {
  loops: StructureNode[];
  nestedLoops: StructureNode[];
  recursions: StructureNode[];
  hashMaps: StructureNode[];
  sets: StructureNode[];
  sorts: StructureNode[];
  searches: StructureNode[];
  dps: StructureNode[];
  graphTraversals: StructureNode[];
  twoPointers: StructureNode[];
  slidingWindows: StructureNode[];
  stacks: StructureNode[];
  queues: StructureNode[];
  treeTraversals: StructureNode[];
  queries: StructureNode[];
  functionCalls: StructureNode[];
}

export interface SimilarityScores {
  text: number;
  ast: number;
  structural: number;
  semantic: number;
  verdict: string;
  evidence: string[];
}

export interface OptimizationResult {
  code: string;
  beforeComplexity: string;
  afterComplexity: string;
  why: string;
  tradeoff: string;
}

export interface BenchmarkPoint {
  size: number;
  aMs: number | null;
  bMs: number | null;
  aMemKB: number | null;
  bMemKB: number | null;
  note?: string;
}

export interface BenchmarkTiming {
  size: number;
  medianMs: number;
  runs: number[];
}

export interface BenchmarkMemory {
  heapUsedDeltaBytes: number | null;
  label: string;
}

export interface BenchmarkPerCode {
  available: boolean;
  reason?: string;
  timings?: BenchmarkTiming[];
  memory?: BenchmarkMemory;
  rawNotes?: string[];
}

export interface BenchmarkReport {
  available: boolean;
  unavailableReason?: string;
  points: BenchmarkPoint[];
  observedA: string;
  observedB: string;
  sizes?: number[];
  codeA?: BenchmarkPerCode;
  codeB?: BenchmarkPerCode;
  generatedAt?: string;
  notes?: string[];
  reason?: string;
}

export type TestResultStatus = 'pass' | 'fail' | 'skip' | 'error' | 'not_tested' | 'timeout';

export interface TestCaseResult {
  status: TestResultStatus;
  actual?: unknown;
  error?: string;
}

export interface GeneratedTestCase {
  id: string;
  label: string;
  inputText: string;
  expectedText: string | null;
  resultA?: TestResultStatus;
  resultB?: TestResultStatus;
  actualA?: string;
  actualB?: string;
  errorA?: string;
  errorB?: string;
}

export interface EdgeCase {
  label: string;
  handlesA: boolean | null;
  handlesB: boolean | null;
  note?: string;
}

export interface Recommendation {
  overall: 'A' | 'B' | 'TIE';
  bestForSpeed: 'A' | 'B' | 'TIE';
  bestForMemory: 'A' | 'B' | 'TIE';
  bestForReadability: 'A' | 'B' | 'TIE';
  bestForScalability: 'A' | 'B' | 'TIE';
  reason: string;
  tradeoff: string;
  overallJustification: string[];
  interviewAssessment?: {
    algorithm: string;
    complexity: string;
    codeClarity: string;
    edgeCases: string;
    overall: string;
  };
}

export interface OptimizationSuggestion {
  currentApproach: string;
  suggestedApproach: string;
  beforeComplexity: string;
  afterComplexity: string;
  optimizedCode?: string | null;
  optimizedBeforeAfter?: OptimizationResult | null;
}

export interface PerSolutionAnalysis {
  algorithm: AlgorithmInfo;
  time: TimeComplexity;
  space: SpaceComplexity;
  readability: ReadabilityScore;
  maintainability: MaintainabilityScore;
  correctness: CorrectnessInfo;
  security: SecurityFinding[];
  bugs: BugFinding[];
  ast?: AstAnalysis;
  benchmarks?: BenchmarkReport | null;
  tests?: GeneratedTestCase[];
  quality: {
    deadCode: string[];
    duplication: string[];
    errorHandling: string[];
  };
}

export interface PriorityWeights {
  performance: number;
  memory: number;
  readability: number;
  maintainability: number;
  security: number;
  interview: number;
  production: number;
}

export type ExplanationLevel = 'simple' | 'normal' | 'expert';

export interface AnalysisConfidence {
  algorithm: 'high' | 'medium' | 'low';
  time: 'high' | 'medium' | 'low';
  space: 'high' | 'medium' | 'low';
  security: 'high' | 'medium' | 'low';
}

export interface FinalScores {
  performance: { a: number; b: number };
  memory: { a: number; b: number };
  readability: { a: number; b: number };
  maintainability: { a: number; b: number };
  security: { a: number; b: number };
  correctness: { a: number; b: number };
  testCoverage?: { a: number; b: number };
  scalability: { a: number; b: number };
}

export interface AnalysisReport {
  problem: string;
  langA: string;
  langB: string;
  solutionA: PerSolutionAnalysis;
  solutionB: PerSolutionAnalysis;
  logicDifference: string;
  narrative: {
    summary: string;
    aExplanation: string;
    bExplanation: string;
    keyDifference: string;
  };
  edgeCases: EdgeCase[];
  recommendation: Recommendation;
  weightedOverallScores: {
    a: number;
    b: number;
  };
  confidences: AnalysisConfidence;
  optimizationA: OptimizationSuggestion;
  optimizationB: OptimizationSuggestion;
  similarity?: SimilarityScores;
  optimizationA2?: OptimizationResult | null;
  optimizationB2?: OptimizationResult | null;
  benchmark?: BenchmarkReport | null;
  generatedTests?: GeneratedTestCase[];
  finalScores: FinalScores;
  interviewMode?: boolean;
  explanationLevel?: ExplanationLevel;
  generatedAt: string;
}

export const TimeComplexitySchema = z.object({
  best: z.string(),
  avg: z.string(),
  worst: z.string(),
  evidence: z.array(z.string()),
});

export const SpaceComplexitySchema = z.object({
  input: z.string(),
  auxiliary: z.string(),
  evidence: z.array(z.string()),
});

export const AnalysisEvidenceSchema = z.object({
  field: z.string(),
  message: z.string(),
  severity: z.enum(['info', 'warn', 'error']).optional(),
});

export const AlgorithmInfoSchema = z.object({
  label: z.string(),
  evidence: z.array(z.string()),
  details: z.string().optional(),
});

export const ReadabilityScoreSchema = z.object({
  score: z.number(),
  reasons: z.array(z.string()),
});

export const MaintainabilityScoreSchema = z.object({
  score: z.number(),
  reasons: z.array(z.string()),
});

export const CorrectnessInfoSchema = z.object({
  correct: z.boolean().nullable(),
  summary: z.string(),
  issues: z.array(z.string()),
  bugsCount: z.number().optional(),
});

export const LineAnchorSchema = z.object({
  startLine: z.number(),
  endLine: z.number(),
  label: z.string().optional(),
});

export const BugFindingSchema = z.object({
  severity: z.enum(['low', 'medium', 'high']),
  title: z.string(),
  description: z.string(),
  line: z.number().optional(),
  anchors: z.array(LineAnchorSchema).default([]),
  category: z.string(),
});

export const SecurityFindingSchema = z.object({
  severity: z.enum(['low', 'medium', 'high']),
  title: z.string(),
  description: z.string(),
  line: z.number().optional(),
  anchors: z.array(LineAnchorSchema).default([]),
  category: z.string().optional(),
  suggestedFix: z.string().optional(),
});

export const StructureNodeSchema = z.object({
  type: z.string(),
  label: z.string(),
  anchors: z.array(LineAnchorSchema),
});

export const AstAnalysisSchema = z.object({
  loops: z.array(StructureNodeSchema),
  nestedLoops: z.array(StructureNodeSchema),
  recursions: z.array(StructureNodeSchema),
  hashMaps: z.array(StructureNodeSchema),
  sets: z.array(StructureNodeSchema),
  sorts: z.array(StructureNodeSchema),
  searches: z.array(StructureNodeSchema),
  dps: z.array(StructureNodeSchema),
  graphTraversals: z.array(StructureNodeSchema),
  twoPointers: z.array(StructureNodeSchema),
  slidingWindows: z.array(StructureNodeSchema),
  stacks: z.array(StructureNodeSchema),
  queues: z.array(StructureNodeSchema),
  treeTraversals: z.array(StructureNodeSchema),
  queries: z.array(StructureNodeSchema),
  functionCalls: z.array(StructureNodeSchema),
});

export const SimilarityScoresSchema = z.object({
  text: z.number(),
  ast: z.number(),
  structural: z.number(),
  semantic: z.number(),
  verdict: z.string(),
  evidence: z.array(z.string()),
});

export const OptimizationResultSchema = z.object({
  code: z.string(),
  beforeComplexity: z.string(),
  afterComplexity: z.string(),
  why: z.string(),
  tradeoff: z.string(),
});

export const BenchmarkPointSchema = z.object({
  size: z.number(),
  aMs: z.number().nullable(),
  bMs: z.number().nullable(),
  aMemKB: z.number().nullable(),
  bMemKB: z.number().nullable(),
  note: z.string().optional(),
});

export const BenchmarkTimingSchema = z.object({
  size: z.number(),
  medianMs: z.number(),
  runs: z.array(z.number()),
});

export const BenchmarkMemorySchema = z.object({
  heapUsedDeltaBytes: z.number().nullable(),
  label: z.string(),
});

export const BenchmarkPerCodeSchema = z.object({
  available: z.boolean(),
  reason: z.string().optional(),
  timings: z.array(BenchmarkTimingSchema).optional(),
  memory: BenchmarkMemorySchema.optional(),
  rawNotes: z.array(z.string()).optional(),
});

const TestResultStatusEnum = z.enum(['pass', 'fail', 'skip', 'error', 'not_tested', 'timeout']);

export const BenchmarkReportSchema = z.object({
  available: z.boolean(),
  unavailableReason: z.string().optional(),
  points: z.array(BenchmarkPointSchema),
  observedA: z.string(),
  observedB: z.string(),
  sizes: z.array(z.number()).optional(),
  codeA: BenchmarkPerCodeSchema.optional(),
  codeB: BenchmarkPerCodeSchema.optional(),
  generatedAt: z.string().optional(),
  notes: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

export const GeneratedTestCaseSchema = z.object({
  id: z.string(),
  label: z.string(),
  inputText: z.string(),
  expectedText: z.string().nullable(),
  resultA: TestResultStatusEnum.optional(),
  resultB: TestResultStatusEnum.optional(),
  actualA: z.string().optional(),
  actualB: z.string().optional(),
  errorA: z.string().optional(),
  errorB: z.string().optional(),
});

export const EdgeCaseSchema = z.object({
  label: z.string(),
  handlesA: z.boolean().nullable(),
  handlesB: z.boolean().nullable(),
  note: z.string().optional(),
});

export const InterviewAssessmentSchema = z.object({
  algorithm: z.string(),
  complexity: z.string(),
  codeClarity: z.string(),
  edgeCases: z.string(),
  overall: z.string(),
});

export const RecommendationSchema = z.object({
  overall: z.enum(['A', 'B', 'TIE']),
  bestForSpeed: z.enum(['A', 'B', 'TIE']),
  bestForMemory: z.enum(['A', 'B', 'TIE']),
  bestForReadability: z.enum(['A', 'B', 'TIE']),
  bestForScalability: z.enum(['A', 'B', 'TIE']),
  reason: z.string(),
  tradeoff: z.string(),
  overallJustification: z.array(z.string()).default([]),
  interviewAssessment: InterviewAssessmentSchema.optional(),
});

export const OptimizationSuggestionSchema = z.object({
  currentApproach: z.string(),
  suggestedApproach: z.string(),
  beforeComplexity: z.string(),
  afterComplexity: z.string(),
  optimizedCode: z.string().nullable().optional(),
  optimizedBeforeAfter: OptimizationResultSchema.nullable().optional(),
});

export const PerSolutionAnalysisSchema = z.object({
  algorithm: AlgorithmInfoSchema,
  time: TimeComplexitySchema,
  space: SpaceComplexitySchema,
  readability: ReadabilityScoreSchema,
  maintainability: MaintainabilityScoreSchema,
  correctness: CorrectnessInfoSchema,
  security: z.array(SecurityFindingSchema),
  bugs: z.array(BugFindingSchema).default([]),
  ast: AstAnalysisSchema.optional(),
  benchmarks: BenchmarkReportSchema.nullable().optional(),
  tests: z.array(GeneratedTestCaseSchema).optional(),
  quality: z.object({
    deadCode: z.array(z.string()),
    duplication: z.array(z.string()),
    errorHandling: z.array(z.string()),
  }),
});

export const PriorityWeightsSchema = z.object({
  performance: z.number().min(0).max(100),
  memory: z.number().min(0).max(100),
  readability: z.number().min(0).max(100),
  maintainability: z.number().min(0).max(100),
  security: z.number().min(0).max(100),
  interview: z.number().min(0).max(100),
  production: z.number().min(0).max(100),
});

export const ExplanationLevelSchema = z.enum(['simple', 'normal', 'expert']);

export const AnalysisConfidenceSchema = z.object({
  algorithm: z.enum(['high', 'medium', 'low']),
  time: z.enum(['high', 'medium', 'low']),
  space: z.enum(['high', 'medium', 'low']),
  security: z.enum(['high', 'medium', 'low']),
});

export const FinalScoresSchema = z.object({
  performance: z.object({ a: z.number(), b: z.number() }),
  memory: z.object({ a: z.number(), b: z.number() }),
  readability: z.object({ a: z.number(), b: z.number() }),
  maintainability: z.object({ a: z.number(), b: z.number() }),
  security: z.object({ a: z.number(), b: z.number() }),
  correctness: z.object({ a: z.number(), b: z.number() }),
  testCoverage: z.object({ a: z.number(), b: z.number() }).optional(),
  scalability: z.object({ a: z.number(), b: z.number() }),
});

export const AnalysisReportSchema = z.object({
  problem: z.string(),
  langA: z.string(),
  langB: z.string(),
  solutionA: PerSolutionAnalysisSchema,
  solutionB: PerSolutionAnalysisSchema,
  logicDifference: z.string(),
  narrative: z.object({
    summary: z.string(),
    aExplanation: z.string(),
    bExplanation: z.string(),
    keyDifference: z.string(),
  }),
  edgeCases: z.array(EdgeCaseSchema),
  recommendation: RecommendationSchema,
  weightedOverallScores: z.object({
    a: z.number(),
    b: z.number(),
  }),
  confidences: AnalysisConfidenceSchema,
  optimizationA: OptimizationSuggestionSchema,
  optimizationB: OptimizationSuggestionSchema,
  similarity: SimilarityScoresSchema.optional(),
  optimizationA2: OptimizationResultSchema.nullable().optional(),
  optimizationB2: OptimizationResultSchema.nullable().optional(),
  benchmark: BenchmarkReportSchema.nullable().optional(),
  generatedTests: z.array(GeneratedTestCaseSchema).optional(),
  finalScores: FinalScoresSchema,
  interviewMode: z.boolean().optional(),
  explanationLevel: ExplanationLevelSchema.optional(),
  generatedAt: z.string(),
});
