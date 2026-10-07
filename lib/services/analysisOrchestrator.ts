import type {
  AnalysisReport,
  BenchmarkReport,
  BugFinding,
  CorrectnessInfo,
  EdgeCase,
  FinalScores,
  GeneratedTestCase,
  MaintainabilityScore,
  OptimizationResult,
  OptimizationSuggestion,
  PerSolutionAnalysis,
  PriorityWeights,
  SimilarityScores,
  AstAnalysis,
  LineAnchor,
  StructureNode,
  AlgorithmInfo,
} from '@/lib/types/analysis';
import { clamp } from '@/lib/utils';
import * as algorithmAnalyzer from './algorithmAnalyzer';
import * as comparisonEngine from './comparisonEngine';
import * as complexityAnalyzer from './complexityAnalyzer';
import * as qualityAnalyzer from './qualityAnalyzer';
import * as readabilityAnalyzer from './readabilityAnalyzer';
import * as securityAnalyzer from './securityAnalyzer';
import * as syntaxAnalyzer from './syntaxAnalyzer';
import * as astAnalyzer from './astAnalyzer';
import * as bugAnalyzer from './bugAnalyzer';
import { callAnalysisLLM } from './llmService';

export type AnalysisPhase =
  | 'syntax'
  | 'algorithm'
  | 'complexity'
  | 'ast'
  | 'readability'
  | 'quality'
  | 'security'
  | 'bugs'
  | 'llm'
  | 'scoring'
  | 'final';
export type PhaseProgressCallback = (phase: AnalysisPhase, detail?: string) => void;

function toStructureNodes(anchors: { startLine: number; endLine: number; label: string }[]): StructureNode[] {
  return anchors.map((a) => ({
    type: a.label,
    label: a.label,
    anchors: [{ startLine: a.startLine, endLine: a.endLine, label: a.label }],
  }));
}

export async function run(input: {
  problem: string;
  codeA: string;
  codeB: string;
  langA: string;
  langB: string;
  priorities: PriorityWeights;
  explanationLevel: 'simple' | 'normal' | 'expert';
  interviewMode: boolean;
  staticOnly?: boolean;
  inputHash?: string;
  onProgress?: PhaseProgressCallback;
}): Promise<AnalysisReport> {
  const onPhase = input.onProgress ?? (() => {});
  onPhase('syntax');

  const syntaxA = syntaxAnalyzer.analyze(input.codeA, input.langA);
  const syntaxB = syntaxAnalyzer.analyze(input.codeB, input.langB);

  onPhase('algorithm');
  const algoA = algorithmAnalyzer.analyze(input.codeA, input.langA);
  const algoB = algorithmAnalyzer.analyze(input.codeB, input.langB);

  onPhase('complexity');
  const complexityA = complexityAnalyzer.analyze(input.codeA, input.langA, algoA.patterns, syntaxA);
  const complexityB = complexityAnalyzer.analyze(input.codeB, input.langB, algoB.patterns, syntaxB);

  onPhase('ast');
  const rawAstA = (astAnalyzer as any).analyze(input.codeA, input.langA);
  const rawAstB = (astAnalyzer as any).analyze(input.codeB, input.langB);
  const astA: AstAnalysis = adaptAst(rawAstA);
  const astB: AstAnalysis = adaptAst(rawAstB);

  onPhase('readability');
  const readA = readabilityAnalyzer.analyze(syntaxA, input.codeA, input.langA);
  const readB = readabilityAnalyzer.analyze(syntaxB, input.codeB, input.langB);

  onPhase('quality');
  const qualA = qualityAnalyzer.analyze(input.codeA, input.langA);
  const qualB = qualityAnalyzer.analyze(input.codeB, input.langB);

  onPhase('security');
  let secA = securityAnalyzer.analyze(input.codeA, input.langA);
  let secB = securityAnalyzer.analyze(input.codeB, input.langB);

  onPhase('bugs');
  let bugsA: BugFinding[] = bugAnalyzer.analyze(input.codeA, input.langA);
  let bugsB: BugFinding[] = bugAnalyzer.analyze(input.codeB, input.langB);

  const maintA = buildMaintainability(readA.score, qualA);
  const maintB = buildMaintainability(readB.score, qualB);

  const correctA = buildCorrectness(algoA.patterns, complexityA.time.worst, bugsA);
  const correctB = buildCorrectness(algoB.patterns, complexityB.time.worst, bugsB);

  const algoInfoA = enhanceAlgorithmInfo(algoA.algorithm, astA);
  const algoInfoB = enhanceAlgorithmInfo(algoB.algorithm, astB);

  const solutionA: PerSolutionAnalysis = {
    algorithm: algoInfoA,
    time: complexityA.time,
    space: complexityA.space,
    readability: readA,
    maintainability: maintA,
    correctness: correctA,
    security: secA,
    bugs: bugsA,
    ast: astA,
    quality: qualA,
  };
  const solutionB: PerSolutionAnalysis = {
    algorithm: algoInfoB,
    time: complexityB.time,
    space: complexityB.space,
    readability: readB,
    maintainability: maintB,
    correctness: correctB,
    security: secB,
    bugs: bugsB,
    ast: astB,
    quality: qualB,
  };

  const cmp = comparisonEngine.compare(solutionA, solutionB, input.priorities);

  const heuristicSimilarity: SimilarityScores = computeDeterministicSimilarity(
    input.codeA,
    input.langA,
    input.codeB,
    input.langB,
    astA,
    astB,
  );

  const staticEvidence = {
    solutionA: {
      algorithm: algoA.algorithm,
      syntax: syntaxA,
      patterns: algoA.patterns,
      readability: readA,
      ast: {
        loops: astA.loops.length,
        nestedLoops: astA.nestedLoops.length,
        hashMaps: astA.hashMaps.length,
        sets: astA.sets.length,
        recursions: astA.recursions.length,
      },
      bugs: bugsA.length,
      security: secA.length,
    },
    solutionB: {
      algorithm: algoB.algorithm,
      syntax: syntaxB,
      patterns: algoB.patterns,
      readability: readB,
      ast: {
        loops: astB.loops.length,
        nestedLoops: astB.nestedLoops.length,
        hashMaps: astB.hashMaps.length,
        sets: astB.sets.length,
        recursions: astB.recursions.length,
      },
      bugs: bugsB.length,
      security: secB.length,
    },
    complexityA,
    complexityB,
  };

  let narrative: AnalysisReport['narrative'] = {
    summary:
      'This is a heuristic analysis (AI unavailable). Based on static patterns, the two solutions differ primarily in algorithmic approach and space trade-offs.',
    aExplanation: `Solution A uses ${algoA.algorithm.label} with worst-case ${complexityA.time.worst} time and ${complexityA.space.auxiliary} auxiliary space.`,
    bExplanation: `Solution B uses ${algoB.algorithm.label} with worst-case ${complexityB.time.worst} time and ${complexityB.space.auxiliary} auxiliary space.`,
    keyDifference: 'See Algorithm / Complexity sections for detailed semantic comparison.',
  };
  let logicDifference: string = `A: ${algoA.algorithm.label}; B: ${algoB.algorithm.label}.`;
  let edgeCases: EdgeCase[] = ['Empty input', 'Single element', 'All same values', 'Target not found', 'Large input size'].map(
    (label) => ({
      label,
      handlesA: null,
      handlesB: null,
    }),
  );
  let confidences = cmp.confidences;
  let interviewAssessment = cmp.recommendation.interviewAssessment;
  let optimizedAText: string = 'Consider hashing or single-pass linear iteration if applicable; measure bottlenecks before refactoring.';
  let optimizedBText: string = 'Consider hashing or single-pass linear iteration if applicable; measure bottlenecks before refactoring.';
  let optimizedCodeA: string | undefined;
  let optimizedCodeB: string | undefined;
  let optimizationWhyA: string | undefined;
  let optimizationWhyB: string | undefined;
  let optimizationTradeoffA: string | undefined;
  let optimizationTradeoffB: string | undefined;
  let optimizedBeforeA: string | undefined;
  let optimizedAfterA: string | undefined;
  let optimizedBeforeB: string | undefined;
  let optimizedAfterB: string | undefined;
  let similarity: SimilarityScores | undefined = heuristicSimilarity;
  let whyWinner: string[] = [];
  let finalScoresOverride: Partial<FinalScores> | undefined;

  onPhase('llm');
  if (!input.staticOnly) {
    try {
      const llm = await callAnalysisLLM({
        problem: input.problem,
        codeA: input.codeA,
        codeB: input.codeB,
        langA: input.langA,
        langB: input.langB,
        staticEvidence,
        priorities: input.priorities,
        explanationLevel: input.explanationLevel,
        interviewMode: input.interviewMode,
      });
      narrative = llm.narrative;
      logicDifference = llm.logicDifference;
      if (llm.edgeCases && llm.edgeCases.length > 0) edgeCases = llm.edgeCases;
      confidences = llm.confidences;
      interviewAssessment = llm.interviewAssessment;
      optimizedAText = llm.optimizedA;
      optimizedBText = llm.optimizedB;
      optimizedCodeA = llm.optimizedCodeA;
      optimizedCodeB = llm.optimizedCodeB;
      optimizationWhyA = llm.optimizationWhyA;
      optimizationWhyB = llm.optimizationWhyB;
      optimizationTradeoffA = llm.optimizationTradeoffA;
      optimizationTradeoffB = llm.optimizationTradeoffB;
      optimizedBeforeA = llm.optimizedBeforeA;
      optimizedAfterA = llm.optimizedAfterA;
      optimizedBeforeB = llm.optimizedBeforeB;
      optimizedAfterB = llm.optimizedAfterB;

      const extra: any = llm as any;

      if (extra.similarity) {
        similarity = {
          text: extra.similarity.text ?? heuristicSimilarity.text,
          ast: extra.similarity.ast ?? heuristicSimilarity.ast,
          structural: extra.similarity.structural ?? heuristicSimilarity.structural,
          semantic: extra.similarity.semantic ?? heuristicSimilarity.semantic,
          verdict: extra.similarity.verdict ?? heuristicSimilarity.verdict,
          evidence: extra.similarity.evidence?.length ? extra.similarity.evidence : heuristicSimilarity.evidence,
        };
      }

      if (extra.semanticEquivalence) {
        similarity = similarity ?? heuristicSimilarity;
        similarity = {
          ...similarity,
          text: extra.semanticEquivalence.syntaxSimilarity ?? similarity.text,
          ast: extra.semanticEquivalence.astSimilarity ?? similarity.ast,
          structural: extra.semanticEquivalence.structuralSimilarity ?? similarity.structural,
          semantic: extra.semanticEquivalence.semanticSimilarity ?? similarity.semantic,
          evidence: extra.semanticEquivalence.evidence?.length
            ? [...similarity.evidence, ...extra.semanticEquivalence.evidence]
            : similarity.evidence,
        };
      }

      if (Array.isArray(extra.bugs?.a)) {
        const aBugs = normalizeBugs(extra.bugs.a, bugsA);
        if (aBugs.length) bugsA = mergeBugArrays(bugsA, aBugs);
      }
      if (Array.isArray(extra.bugs?.b)) {
        const bBugs = normalizeBugs(extra.bugs.b, bugsB);
        if (bBugs.length) bugsB = mergeBugArrays(bugsB, bBugs);
        solutionB.bugs = bugsB;
        solutionB.correctness = buildCorrectness(algoB.patterns, complexityB.time.worst, bugsB);
      }
      solutionA.bugs = bugsA;
      solutionA.correctness = buildCorrectness(algoA.patterns, complexityA.time.worst, bugsA);

      if (Array.isArray(extra.securityFindings?.a) && extra.securityFindings.a.length) {
        secA = mergeSecurity(secA, extra.securityFindings.a);
        solutionA.security = secA;
      }
      if (Array.isArray(extra.securityFindings?.b) && extra.securityFindings.b.length) {
        secB = mergeSecurity(secB, extra.securityFindings.b);
        solutionB.security = secB;
      }

      if (Array.isArray(extra.whyWinner) && extra.whyWinner.length) {
        whyWinner = extra.whyWinner;
      }

      if (extra.finalScoresOverride) {
        finalScoresOverride = extra.finalScoresOverride;
      }

      if (Array.isArray(extra.algorithmAnchors?.a) && extra.algorithmAnchors.a.length) {
        for (const anchor of extra.algorithmAnchors.a) {
          if (anchor && typeof anchor.label === 'string' && anchor.startLine) {
            solutionA.algorithm.evidence.push(
              `${anchor.label} (lines ${anchor.startLine}${anchor.endLine && anchor.endLine !== anchor.startLine ? '-' + anchor.endLine : ''}): ${anchor.description || 'classified via static structure.'}`,
            );
          }
        }
      }
      if (Array.isArray(extra.algorithmAnchors?.b) && extra.algorithmAnchors.b.length) {
        for (const anchor of extra.algorithmAnchors.b) {
          if (anchor && typeof anchor.label === 'string' && anchor.startLine) {
            solutionB.algorithm.evidence.push(
              `${anchor.label} (lines ${anchor.startLine}${anchor.endLine && anchor.endLine !== anchor.startLine ? '-' + anchor.endLine : ''}): ${anchor.description || 'classified via static structure.'}`,
            );
          }
        }
      }
    } catch {
      // keep heuristic defaults
    }
  }

  const defaultBeforeCompA = `${complexityA.time.best} / ${complexityA.time.avg} / ${complexityA.time.worst} time, ${complexityA.space.auxiliary} aux`;
  const defaultAfterCompA = suggestBetterComplexity(algoA.patterns, complexityA.time.worst, complexityA.space.auxiliary);
  const defaultBeforeCompB = `${complexityB.time.best} / ${complexityB.time.avg} / ${complexityB.time.worst} time, ${complexityB.space.auxiliary} aux`;
  const defaultAfterCompB = suggestBetterComplexity(algoB.patterns, complexityB.time.worst, complexityB.space.auxiliary);

  const optimizationA2Result: OptimizationResult | null = optimizedCodeA
    ? {
        code: optimizedCodeA,
        beforeComplexity: optimizedBeforeA ?? defaultBeforeCompA,
        afterComplexity: optimizedAfterA ?? defaultAfterCompA,
        why: optimizationWhyA ?? 'Refactored to improve algorithmic efficiency based on static analysis patterns.',
        tradeoff: optimizationTradeoffA ?? 'No significant trade-off identified; correctness preserved.',
      }
    : null;

  const optimizationB2Result: OptimizationResult | null = optimizedCodeB
    ? {
        code: optimizedCodeB,
        beforeComplexity: optimizedBeforeB ?? defaultBeforeCompB,
        afterComplexity: optimizedAfterB ?? defaultAfterCompB,
        why: optimizationWhyB ?? 'Refactored to improve algorithmic efficiency based on static analysis patterns.',
        tradeoff: optimizationTradeoffB ?? 'No significant trade-off identified; correctness preserved.',
      }
    : null;

  const optimizationA: OptimizationSuggestion = {
    currentApproach: algoA.algorithm.label,
    suggestedApproach: optimizedAText,
    beforeComplexity: defaultBeforeCompA,
    afterComplexity: defaultAfterCompA,
    optimizedCode: optimizedCodeA ?? null,
    optimizedBeforeAfter: optimizationA2Result,
  };
  const optimizationB: OptimizationSuggestion = {
    currentApproach: algoB.algorithm.label,
    suggestedApproach: optimizedBText,
    beforeComplexity: defaultBeforeCompB,
    afterComplexity: defaultAfterCompB,
    optimizedCode: optimizedCodeB ?? null,
    optimizedBeforeAfter: optimizationB2Result,
  };

  onPhase('scoring');
  const finalScores: FinalScores = buildFinalScores(
    solutionA,
    solutionB,
    complexityA.time.worst,
    complexityB.time.worst,
    complexityA.space.auxiliary,
    complexityB.space.auxiliary,
    algoA.patterns,
    algoB.patterns,
    finalScoresOverride,
  );

  const overallJustification = whyWinner.length > 0
    ? whyWinner
    : buildOverallJustification(
        cmp.recommendation.overall,
        finalScores,
        solutionA,
        solutionB,
        complexityA.time.worst,
        complexityB.time.worst,
        complexityA.space.auxiliary,
        complexityB.space.auxiliary,
      );

  const recommendation: AnalysisReport['recommendation'] = {
    ...cmp.recommendation,
    overallJustification,
    interviewAssessment,
  };

  const fallbackSimilarity: SimilarityScores = similarity ?? heuristicSimilarity;

  const fallbackBenchmark: BenchmarkReport = {
    available: false,
    unavailableReason: 'Benchmark execution not performed in this analysis run. Click Run & Benchmark to execute.',
    points: [],
    observedA: 'Not measured',
    observedB: 'Not measured',
  };

  const fallbackTests: GeneratedTestCase[] = [];

  onPhase('final');
  return {
    problem: input.problem,
    langA: input.langA,
    langB: input.langB,
    solutionA,
    solutionB,
    logicDifference,
    narrative,
    edgeCases,
    recommendation,
    weightedOverallScores: cmp.weightedOverallScores,
    confidences,
    optimizationA,
    optimizationB,
    similarity: fallbackSimilarity,
    optimizationA2: optimizationA2Result,
    optimizationB2: optimizationB2Result,
    benchmark: fallbackBenchmark,
    generatedTests: fallbackTests,
    finalScores,
    interviewMode: input.interviewMode,
    explanationLevel: input.explanationLevel,
    generatedAt: new Date().toISOString(),
  };
}

function adaptAst(raw: any): AstAnalysis {
  const keys: (keyof AstAnalysis)[] = [
    'loops', 'nestedLoops', 'recursions', 'hashMaps', 'sets', 'sorts', 'searches',
    'dps', 'graphTraversals', 'twoPointers', 'slidingWindows', 'stacks', 'queues',
    'treeTraversals', 'queries', 'functionCalls',
  ];
  const out: any = {};
  for (const k of keys) {
    const arr = (raw && Array.isArray(raw[k])) ? raw[k] : [];
    out[k] = toStructureNodes(arr);
  }
  return out;
}

function enhanceAlgorithmInfo(algo: AlgorithmInfo, ast: AstAnalysis): AlgorithmInfo {
  const patterns: string[] = [];
  if (ast.nestedLoops.length) patterns.push(`Nested loop detected (${ast.nestedLoops.length} outer scope(s)).`);
  if (ast.hashMaps.length) patterns.push(`Hash map construction with O(1) lookups at lines ${summarizeLines(ast.hashMaps)}.`);
  if (ast.sets.length) patterns.push(`Set operations for deduplication at lines ${summarizeLines(ast.sets)}.`);
  if (ast.sorts.length) patterns.push(`Explicit sorting (${ast.sorts.length} call(s)).`);
  if (ast.recursions.length) patterns.push(`Recursive function calls at lines ${summarizeLines(ast.recursions)}.`);
  if (ast.twoPointers.length) patterns.push('Two-pointer pattern detected.');
  if (ast.slidingWindows.length) patterns.push('Sliding window technique detected.');
  if (ast.graphTraversals.length) patterns.push('Graph traversal keywords detected.');
  if (ast.dps.length) patterns.push('Dynamic programming pattern (memo/tabulation keywords).');
  if (ast.stacks.length) patterns.push('Stack-based processing.');
  if (ast.queries.length) patterns.push('Database query statements present.');
  return {
    ...algo,
    evidence: [...patterns, ...algo.evidence],
  };
}

function summarizeLines(nodes: StructureNode[]): string {
  const lines = new Set<number>();
  for (const n of nodes) {
    for (const a of n.anchors) {
      lines.add(a.startLine);
      if (a.endLine !== a.startLine) lines.add(a.endLine);
    }
  }
  const arr = Array.from(lines).sort((a, b) => a - b).slice(0, 6);
  return arr.length ? arr.join(', ') : 'n/a';
}

function buildMaintainability(
  readScore: number,
  quality: { duplication: string[]; errorHandling: string[] },
): MaintainabilityScore {
  const dupOk = quality.duplication.length === 0 ? 2 : 0;
  const errGood =
    quality.errorHandling.length >= 2
      ? 1
      : quality.errorHandling.length === 1 && !quality.errorHandling[0]!.includes('No explicit')
        ? 1
        : 0;
  const score = clamp(readScore + dupOk + errGood, 0, 10);
  const reasons: string[] = [];
  reasons.push(`Readability contribution: ${readScore}/10.`);
  if (dupOk > 0) reasons.push('No duplicated blocks detected.');
  else reasons.push('Duplicated blocks detected (reduces maintainability).');
  if (errGood > 0) reasons.push('Explicit error handling present.');
  else reasons.push('Limited or no explicit error handling.');
  return { score, reasons };
}

function buildCorrectness(
  patterns: ReturnType<typeof algorithmAnalyzer.analyze>['patterns'],
  worstTime: string,
  bugs: BugFinding[],
): CorrectnessInfo {
  const issues: string[] = [];
  if (patterns.nestedLoop && (worstTime.includes('n^2') || worstTime.includes('n^3'))) {
    issues.push('Nested iteration detected; may timeout for large inputs.');
  }
  if (patterns.recursion) {
    issues.push('Recursive implementation may hit stack overflow on deep inputs.');
  }
  if (patterns.hashing) {
    issues.push('Hashing relies on uniform hash distribution; worst-case collisions degrade to O(n).');
  }
  for (const b of bugs) {
    issues.push(`${b.severity.toUpperCase()} bug: ${b.title}${b.line ? ` (line ${b.line})` : ''} — ${b.description}`);
  }
  const highCount = bugs.filter((b) => b.severity === 'high').length;
  const medCount = bugs.filter((b) => b.severity === 'medium').length;
  return {
    correct: null,
    summary: highCount + medCount === 0
      ? 'No static correctness issues detected. Run Generate Tests to validate behavior against concrete inputs.'
      : `${highCount} high-severity and ${medCount} medium-severity potential bugs detected via static analysis. Run tests for confirmation.`,
    issues,
    bugsCount: bugs.length,
  };
}

function suggestBetterComplexity(
  patterns: ReturnType<typeof algorithmAnalyzer.analyze>['patterns'],
  _worst: string,
  aux: string,
): string {
  if (patterns.nestedLoop) return 'Target: O(n) or O(n log n) time, O(1) or O(n) aux';
  if (patterns.hashing && aux === 'O(1)') return 'Target: O(n) time, O(n) aux (hash map); verify correctness vs two-pointer alternatives.';
  return 'Target: linear or better time, minimal auxiliary memory.';
}

function scoreFromComplexity(worst: string): number {
  const w = worst.toLowerCase();
  if (w.includes('n!') || w.includes('2^n') || w.includes('exp')) return 0;
  if (w.includes('n^3') || w.includes('n3')) return 2;
  if (w.includes('n^2') || w.includes('n2')) return 4;
  if (w.includes('n log') || w.includes('n lg')) return 6;
  if (w.includes('o(n)') || w.includes('linear')) return 8;
  if (w.includes('log n') || w.includes('lg n')) return 9;
  if (w.includes('o(1)') || w.includes('constant')) return 10;
  return 5;
}

function scoreFromSpace(aux: string): number {
  const a = aux.toLowerCase();
  if (a.includes('n^2') || a.includes('n2')) return 2;
  if (a.includes('o(n)') || a.includes('linear')) return 5;
  if (a.includes('log n')) return 7;
  if (a.includes('o(1)') || a.includes('constant')) return 10;
  return 5;
}

function buildFinalScores(
  solA: PerSolutionAnalysis,
  solB: PerSolutionAnalysis,
  timeA: string,
  timeB: string,
  spaceA: string,
  spaceB: string,
  patternsA: ReturnType<typeof algorithmAnalyzer.analyze>['patterns'],
  patternsB: ReturnType<typeof algorithmAnalyzer.analyze>['patterns'],
  override?: Partial<FinalScores>,
): FinalScores {
  const perfA = clamp(scoreFromComplexity(timeA) + (patternsA.hashing ? 0.5 : 0), 0, 10);
  const perfB = clamp(scoreFromComplexity(timeB) + (patternsB.hashing ? 0.5 : 0), 0, 10);
  const memA = scoreFromSpace(spaceA);
  const memB = scoreFromSpace(spaceB);
  const readA = clamp(solA.readability.score, 0, 10);
  const readB = clamp(solB.readability.score, 0, 10);
  const maintA = clamp(solA.maintainability.score, 0, 10);
  const maintB = clamp(solB.maintainability.score, 0, 10);
  const secPenaltyA = Math.min(solA.security.length * 1.5, 5);
  const secPenaltyB = Math.min(solB.security.length * 1.5, 5);
  const secA = clamp(10 - secPenaltyA, 0, 10);
  const secB = clamp(10 - secPenaltyB, 0, 10);

  const issuePenaltyA = Math.min((solA.correctness.bugsCount ?? 0) * 1.0 + solA.correctness.issues.length * 0.4, 6);
  const issuePenaltyB = Math.min((solB.correctness.bugsCount ?? 0) * 1.0 + solB.correctness.issues.length * 0.4, 6);
  const correctA = clamp(10 - issuePenaltyA, 0, 10);
  const correctB = clamp(10 - issuePenaltyB, 0, 10);

  let scaleA = 1;
  let scaleB = 1;
  if (patternsA.nestedLoop && !patternsB.nestedLoop) scaleA = 0.9;
  if (patternsB.nestedLoop && !patternsA.nestedLoop) scaleB = 0.9;
  if (patternsA.recursion && !patternsB.recursion) scaleA *= 0.95;
  if (patternsB.recursion && !patternsA.recursion) scaleB *= 0.95;
  if (patternsA.hashing && !patternsB.hashing) scaleA = Math.min(scaleA * 1.05, 1.1);
  if (patternsB.hashing && !patternsA.hashing) scaleB = Math.min(scaleB * 1.05, 1.1);

  const scalA = clamp(perfA * scaleA, 0, 10);
  const scalB = clamp(perfB * scaleB, 0, 10);

  const base: FinalScores = {
    performance: { a: +perfA.toFixed(1), b: +perfB.toFixed(1) },
    memory: { a: +memA.toFixed(1), b: +memB.toFixed(1) },
    readability: { a: +readA.toFixed(1), b: +readB.toFixed(1) },
    maintainability: { a: +maintA.toFixed(1), b: +maintB.toFixed(1) },
    security: { a: +secA.toFixed(1), b: +secB.toFixed(1) },
    correctness: { a: +correctA.toFixed(1), b: +correctB.toFixed(1) },
    scalability: { a: +scalA.toFixed(1), b: +scalB.toFixed(1) },
  };

  if (override) {
    for (const k of Object.keys(base) as (keyof FinalScores)[]) {
      const ov: any = (override as any)[k];
      if (ov && typeof ov.a === 'number' && typeof ov.b === 'number') {
        base[k] = { a: clamp(+ov.a.toFixed(1), 0, 10), b: clamp(+ov.b.toFixed(1), 0, 10) };
      }
    }
  }
  return base;
}

function buildOverallJustification(
  overall: 'A' | 'B' | 'TIE',
  scores: FinalScores,
  solA: PerSolutionAnalysis,
  solB: PerSolutionAnalysis,
  timeA: string,
  timeB: string,
  spaceA: string,
  spaceB: string,
): string[] {
  const bullets: string[] = [];
  const winners: Record<keyof FinalScores, 'A' | 'B' | 'TIE'> = {
    performance: scores.performance.a > scores.performance.b ? 'A' : scores.performance.b > scores.performance.a ? 'B' : 'TIE',
    memory: scores.memory.a > scores.memory.b ? 'A' : scores.memory.b > scores.memory.a ? 'B' : 'TIE',
    readability: scores.readability.a > scores.readability.b ? 'A' : scores.readability.b > scores.readability.a ? 'B' : 'TIE',
    maintainability: scores.maintainability.a > scores.maintainability.b ? 'A' : scores.maintainability.b > scores.maintainability.a ? 'B' : 'TIE',
    security: scores.security.a > scores.security.b ? 'A' : scores.security.b > scores.security.a ? 'B' : 'TIE',
    correctness: scores.correctness.a > scores.correctness.b ? 'A' : scores.correctness.b > scores.correctness.a ? 'B' : 'TIE',
    testCoverage: scores.testCoverage ? (scores.testCoverage.a > scores.testCoverage.b ? 'A' : scores.testCoverage.b > scores.testCoverage.a ? 'B' : 'TIE') : 'TIE',
    scalability: scores.scalability.a > scores.scalability.b ? 'A' : scores.scalability.b > scores.scalability.a ? 'B' : 'TIE',
  };
  if (winners.performance !== 'TIE') {
    bullets.push(
      `Performance favors ${winners.performance}: worst-case time is ${winners.performance === 'A' ? timeA : timeB} (A: ${timeA}, B: ${timeB}).`,
    );
  } else {
    bullets.push(`Performance is comparable: both exhibit ${timeA} worst-case time complexity.`);
  }
  if (winners.memory !== 'TIE') {
    bullets.push(
      `Memory efficiency favors ${winners.memory}: auxiliary space is ${winners.memory === 'A' ? spaceA : spaceB} (A: ${spaceA}, B: ${spaceB}).`,
    );
  } else {
    bullets.push(`Memory footprint is comparable with ${spaceA} auxiliary space for both.`);
  }
  if (winners.correctness !== 'TIE' || solA.bugs.length > 0 || solB.bugs.length > 0) {
    bullets.push(
      `Correctness & bugs: A has ${solA.bugs.length} static bug finding(s); B has ${solB.bugs.length} finding(s). Correctness scores: A ${scores.correctness.a} / B ${scores.correctness.b}.`,
    );
  }
  if (winners.readability !== 'TIE') {
    bullets.push(
      `Readability favors ${winners.readability} with a score of ${Math.max(scores.readability.a, scores.readability.b)}/10 vs ${Math.min(scores.readability.a, scores.readability.b)}/10, driven by structure and naming clarity.`,
    );
  } else {
    bullets.push(`Readability is comparable (both ~${scores.readability.a}/10).`);
  }
  if (winners.security !== 'TIE' || solA.security.length > 0 || solB.security.length > 0) {
    bullets.push(
      `Security posture: A has ${solA.security.length} finding(s); B has ${solB.security.length} finding(s). ${
        winners.security === 'TIE' ? 'Neither shows a material security advantage.' : `${winners.security} has fewer or less severe security issues.`
      }`,
    );
  } else {
    bullets.push('Security posture is clean for both solutions with no findings reported.');
  }
  if (overall === 'TIE') {
    bullets.push(
      'Overall the solutions are effectively tied: trade off speed/memory/readability without a decisive winner, so choice depends on project priorities.',
    );
  } else {
    const w = overall;
    const wScores = w === 'A'
      ? { p: scores.performance.a, r: scores.readability.a, c: scores.correctness.a }
      : { p: scores.performance.b, r: scores.readability.b, c: scores.correctness.b };
    bullets.push(
      `Overall ${w} is recommended because it leads or ties on the most weighted dimensions (perf ${wScores.p}, readability ${wScores.r}, correctness ${wScores.c}) after applying priority weights.`,
    );
  }
  return bullets;
}

function computeDeterministicSimilarity(
  codeA: string, langA: string,
  codeB: string, langB: string,
  astA: AstAnalysis, astB: AstAnalysis,
): SimilarityScores {
  const text = tokenSimilarity(codeA, codeB);
  const ast = astStructureOverlap(astA, astB);
  const structural = structuralOverlap(astA, astB);
  const semantic = Math.max(ast, structural, 0.15);
  const verdict = semantic >= 0.9 ? 'near-duplicate'
    : semantic >= 0.75 ? 'same algorithm'
    : semantic >= 0.55 ? 'related approaches'
    : semantic >= 0.3 ? 'different algorithms'
    : 'unrelated';
  const evidence: string[] = [];
  evidence.push(`Text/token similarity (static): ${(text * 100).toFixed(0)}% — shared normalized tokens.`);
  evidence.push(`AST node overlap (static): ${(ast * 100).toFixed(0)}% — matched structural node types.`);
  evidence.push(`Control-flow / pattern similarity (static): ${(structural * 100).toFixed(0)}% — patterns (loop/hash/recursion/etc) overlap.`);
  evidence.push(`Languages: ${langA} vs ${langB} — ${langA === langB ? 'same language may inflate text similarity; semantic score preferred.' : 'different languages; use AST/semantic scores.'}`);
  return { text, ast, structural, semantic, verdict, evidence };
}

function normalizeTokens(code: string): string[] {
  return code
    .toLowerCase()
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[{}()\[\];,:.<>+\-*/=!?&|^%~`'"]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1 && /[a-z0-9]/.test(t));
}

function tokenSimilarity(a: string, b: string): number {
  const ta = normalizeTokens(a);
  const tb = normalizeTokens(b);
  if (!ta.length || !tb.length) return 0;
  const sa = new Set(ta);
  const sb = new Set(tb);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter || 1;
  return clamp(inter / union, 0, 1);
}

function astStructureOverlap(a: AstAnalysis, b: AstAnalysis): number {
  const keys: (keyof AstAnalysis)[] = [
    'loops', 'nestedLoops', 'recursions', 'hashMaps', 'sets', 'sorts', 'searches',
    'dps', 'graphTraversals', 'twoPointers', 'slidingWindows', 'stacks', 'queues',
    'treeTraversals', 'queries',
  ];
  let match = 0;
  let total = 0;
  for (const k of keys) {
    const la = a[k]?.length ?? 0;
    const lb = b[k]?.length ?? 0;
    if (la === 0 && lb === 0) continue;
    total++;
    if (la > 0 && lb > 0) {
      const min = Math.min(la, lb);
      const max = Math.max(la, lb);
      match += max === 0 ? 0 : min / max;
    }
  }
  return total === 0 ? 0.5 : clamp(match / total, 0, 1);
}

function structuralOverlap(a: AstAnalysis, b: AstAnalysis): number {
  const hashes: any[] = [
    { a: a.nestedLoops.length, b: b.nestedLoops.length },
    { a: a.hashMaps.length, b: b.hashMaps.length },
    { a: a.recursions.length, b: b.recursions.length },
    { a: a.sets.length, b: b.sets.length },
    { a: a.sorts.length, b: b.sorts.length },
    { a: a.twoPointers.length, b: b.twoPointers.length },
    { a: a.slidingWindows.length, b: b.slidingWindows.length },
    { a: a.dps.length, b: b.dps.length },
  ];
  let agree = 0;
  for (const h of hashes) {
    if ((h.a > 0) === (h.b > 0)) agree++;
  }
  return clamp(agree / hashes.length, 0, 1);
}

function normalizeBugs(list: any[], base: BugFinding[]): BugFinding[] {
  const out: BugFinding[] = [];
  const seen = new Set(base.map((b) => `${b.title}|${b.line ?? ''}`));
  for (const raw of list) {
    if (!raw || !raw.title) continue;
    const sev: any = (['low', 'medium', 'high'].includes(raw.severity) ? raw.severity : 'medium');
    const key = `${raw.title}|${raw.line ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const anchors: LineAnchor[] = (raw.startLine && raw.endLine)
      ? [{ startLine: raw.startLine, endLine: raw.endLine, label: raw.title }]
      : raw.line ? [{ startLine: raw.line, endLine: raw.line, label: raw.title }] : [];
    out.push({
      severity: sev,
      title: String(raw.title),
      description: String(raw.description || raw.title),
      line: typeof raw.line === 'number' ? raw.line : undefined,
      anchors,
      category: String(raw.category || 'static-analysis'),
    });
  }
  return out;
}

function mergeBugArrays(base: BugFinding[], extras: BugFinding[]): BugFinding[] {
  const seen = new Set(base.map((b) => `${b.title}|${b.line ?? ''}`));
  const out = [...base];
  for (const e of extras) {
    const key = `${e.title}|${e.line ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

function mergeSecurity(base: any[], extras: any[]): any[] {
  const seen = new Set(base.map((s) => `${s.title}|${s.line ?? ''}`));
  const out = [...base];
  for (const raw of extras) {
    if (!raw || !raw.title) continue;
    const sev = ['low', 'medium', 'high'].includes(raw.severity) ? raw.severity : 'medium';
    const key = `${raw.title}|${raw.line ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const anchors = (raw.startLine && raw.endLine)
      ? [{ startLine: raw.startLine, endLine: raw.endLine, label: raw.title }]
      : raw.line ? [{ startLine: raw.line, endLine: raw.line, label: raw.title }] : [];
    out.push({
      severity: sev,
      title: String(raw.title),
      description: String(raw.description || raw.title),
      line: typeof raw.line === 'number' ? raw.line : undefined,
      anchors,
      category: String(raw.category || 'injection'),
      suggestedFix: String(raw.suggestedFix || 'Remediate using industry standard secure practices.'),
    });
  }
  return out;
}
