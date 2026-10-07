import type {
  AnalysisConfidence,
  PerSolutionAnalysis,
  PriorityWeights,
  Recommendation,
} from '@/lib/types/analysis';
import { clamp } from '@/lib/utils';
import * as algorithmAnalyzer from './algorithmAnalyzer';

type Patterns = ReturnType<typeof algorithmAnalyzer.analyze>['patterns'];

export function compare(
  solutionA: PerSolutionAnalysis,
  solutionB: PerSolutionAnalysis,
  priorities: PriorityWeights,
): {
  recommendation: Recommendation;
  weightedOverallScores: { a: number; b: number };
  confidences: AnalysisConfidence;
} {
  const perfA = performanceScore(solutionA.time.worst);
  const perfB = performanceScore(solutionB.time.worst);
  const memA = memoryScore(solutionA.space.auxiliary);
  const memB = memoryScore(solutionB.space.auxiliary);
  const readA = solutionA.readability.score;
  const readB = solutionB.readability.score;
  const maintA = maintainabilityScore(solutionA);
  const maintB = maintainabilityScore(solutionB);
  const secA = securityScore(solutionA.security);
  const secB = securityScore(solutionB.security);
  const ivA = clamp(0.6 * perfA + 0.2 * readA + 0.2 * secA, 0, 10);
  const ivB = clamp(0.6 * perfB + 0.2 * readB + 0.2 * secB, 0, 10);
  const prodA = clamp(0.2 * perfA + 0.2 * memA + 0.2 * readA + 0.2 * maintA + 0.2 * secA, 0, 10);
  const prodB = clamp(0.2 * perfB + 0.2 * memB + 0.2 * readB + 0.2 * maintB + 0.2 * secB, 0, 10);

  const pSum =
    priorities.performance +
    priorities.memory +
    priorities.readability +
    priorities.maintainability +
    priorities.security +
    priorities.interview +
    priorities.production;

  const usePriorities: PriorityWeights =
    pSum === 0
      ? {
          performance: 25,
          memory: 15,
          readability: 15,
          maintainability: 15,
          security: 10,
          interview: 10,
          production: 10,
        }
      : priorities;
  const sum =
    usePriorities.performance +
    usePriorities.memory +
    usePriorities.readability +
    usePriorities.maintainability +
    usePriorities.security +
    usePriorities.interview +
    usePriorities.production;

  const wa =
    (perfA * usePriorities.performance +
      memA * usePriorities.memory +
      readA * usePriorities.readability +
      maintA * usePriorities.maintainability +
      secA * usePriorities.security +
      ivA * usePriorities.interview +
      prodA * usePriorities.production) /
    sum;
  const wb =
    (perfB * usePriorities.performance +
      memB * usePriorities.memory +
      readB * usePriorities.readability +
      maintB * usePriorities.maintainability +
      secB * usePriorities.security +
      ivB * usePriorities.interview +
      prodB * usePriorities.production) /
    sum;

  const overall: 'A' | 'B' | 'TIE' = Math.abs(wa - wb) < 0.25 ? 'TIE' : wa > wb ? 'A' : 'B';
  const bestForSpeed = catTie(perfA, perfB, 0.3);
  const bestForMemory = catTie(memA, memB, 0.3);
  const bestForReadability = catTie(readA, readB, 0.3);
  const scalA = 0.7 * perfA + 0.3 * memA;
  const scalB = 0.7 * perfB + 0.3 * memB;
  const bestForScalability = catTie(scalA, scalB, 0.3);

  const winner = overall === 'A' ? 'A' : overall === 'B' ? 'B' : 'either';
  const reason = buildReason(winner, wa, wb, usePriorities);
  const tradeoff = buildTradeoff(winner, solutionA, solutionB, perfA, perfB, memA, memB, readA, readB);

  const patternsA = extractPatterns(solutionA.algorithm.evidence);
  const patternsB = extractPatterns(solutionB.algorithm.evidence);

  const confidences: AnalysisConfidence = buildConfidences(
    patternsA + patternsB,
    solutionA,
    solutionB,
    perfA,
    perfB,
  );

  return {
    recommendation: {
      overall,
      bestForSpeed,
      bestForMemory,
      bestForReadability,
      bestForScalability,
      reason,
      tradeoff,
      overallJustification: [reason, tradeoff],
    },
    weightedOverallScores: { a: wa, b: wb },
    confidences,
  };
}

function performanceScore(worst: string): number {
  const w = worst.replace(/\s/g, '');
  if (w.includes('2^n') || w.includes('n!')) return 1;
  if (w.includes('n^3')) return 2;
  if (w.includes('n^2')) return 4;
  if (w.includes('nlogn') || w.includes('n log n')) return 7;
  if (w === 'O(n)' || w.includes('(n)') && !w.includes('log') && !w.includes('^')) {
    const hasSimpleN = /^O\(n\)$/.test(w) || w === 'O(n)';
    return hasSimpleN ? 8 : 7;
  }
  if (w.includes('logn') || w.includes('log n')) return 9;
  if (w === 'O(1)') return 10;
  return 6;
}

function memoryScore(aux: string): number {
  const a = aux.replace(/\s/g, '');
  if (a.includes('n^3')) return 1;
  if (a.includes('n^2')) return 3;
  if (a.includes('nlogn') || a.includes('n log n')) return 6;
  if (a === 'O(n)' || (a.includes('(n)') && !a.includes('log') && !a.includes('^'))) return 7;
  if (a.includes('logn') || a.includes('log n')) return 9;
  if (a === 'O(1)') return 10;
  return 5;
}

function maintainabilityScore(sol: PerSolutionAnalysis): number {
  const dupOk = sol.quality.duplication.length === 0 ? 2 : 0;
  const errGood = sol.quality.errorHandling.length >= 2 ? 1 : sol.quality.errorHandling.length === 1 && !sol.quality.errorHandling[0]!.includes('No explicit') ? 1 : 0;
  return clamp(sol.readability.score + dupOk + errGood, 0, 10);
}

function securityScore(findings: { severity: 'low' | 'medium' | 'high' }[]): number {
  let s = 10;
  for (const f of findings) {
    if (f.severity === 'high') s -= 2;
    else if (f.severity === 'medium') s -= 1;
    else s -= 0.5;
  }
  return clamp(s, 0, 10);
}

function catTie(a: number, b: number, eps: number): 'A' | 'B' | 'TIE' {
  if (Math.abs(a - b) < eps) return 'TIE';
  return a > b ? 'A' : 'B';
}

function topPriorityName(p: PriorityWeights): string {
  const list = [
    { k: 'performance', v: p.performance },
    { k: 'memory', v: p.memory },
    { k: 'readability', v: p.readability },
    { k: 'maintainability', v: p.maintainability },
    { k: 'security', v: p.security },
    { k: 'interview suitability', v: p.interview },
    { k: 'production suitability', v: p.production },
  ];
  let best = list[0]!;
  for (const it of list) if (it.v > best.v) best = it;
  return best.k;
}

function buildReason(winner: string, wa: number, wb: number, p: PriorityWeights): string {
  const top = topPriorityName(p);
  if (winner === 'TIE') {
    return `Solutions are closely matched (A: ${wa.toFixed(2)}, B: ${wb.toFixed(2)}). Weights prioritize ${top}; neither side dominates.`;
  }
  return `Solution ${winner} is preferred (A: ${wa.toFixed(2)} vs B: ${wb.toFixed(2)}), driven mainly by the configured priority on ${top}.`;
}

function buildTradeoff(
  winner: string,
  a: PerSolutionAnalysis,
  b: PerSolutionAnalysis,
  perfA: number,
  perfB: number,
  memA: number,
  memB: number,
  readA: number,
  readB: number,
): string {
  const rec = winner === 'A' ? a : winner === 'B' ? b : null;
  const other = winner === 'A' ? b : winner === 'B' ? a : null;
  if (!rec || !other) return 'Approaches are effectively tied; no material trade-off required.';

  const recName = winner as 'A' | 'B';
  const otherName = winner === 'A' ? 'B' : 'A';
  const parts: string[] = [];

  if (perfA !== perfB) {
    const fast = perfA > perfB ? 'A' : 'B';
    if (fast !== recName) parts.push(`${recName} is slower than ${otherName} (${rec.time.worst} vs ${other.time.worst}).`);
  }
  if (memA !== memB) {
    const lean = memA > memB ? 'A' : 'B';
    if (lean !== recName) parts.push(`${recName} uses more auxiliary memory than ${otherName} (${rec.space.auxiliary} vs ${other.space.auxiliary}).`);
  }
  if (readA !== readB) {
    const clr = readA > readB ? 'A' : 'B';
    if (clr !== recName) parts.push(`${recName} is less readable than ${otherName} (${rec.readability.score}/10 vs ${other.readability.score}/10).`);
  }

  if (parts.length === 0) {
    parts.push(`${recName} is slightly preferred; disadvantages relative to ${otherName} are minor.`);
  }
  return parts.join(' ');
}

function extractPatterns(evidence: string[]): number {
  return evidence.filter((e) => e.startsWith('Pattern detected:')).length;
}

function buildConfidences(
  totalPatterns: number,
  a: PerSolutionAnalysis,
  b: PerSolutionAnalysis,
  perfA: number,
  perfB: number,
): AnalysisConfidence {
  let algorithm: 'high' | 'medium' | 'low';
  if (totalPatterns >= 2) algorithm = 'high';
  else if (totalPatterns === 1) algorithm = 'medium';
  else algorithm = 'low';

  const timeEvidence =
    a.time.evidence.length + b.time.evidence.length + (perfA >= 6 ? 1 : 0) + (perfB >= 6 ? 1 : 0);
  let time: 'high' | 'medium' | 'low';
  if (timeEvidence >= 4) time = 'high';
  else if (timeEvidence >= 2) time = 'medium';
  else time = 'low';

  const spaceEvidence = a.space.evidence.length + b.space.evidence.length;
  let space: 'high' | 'medium' | 'low';
  if (spaceEvidence >= 3) space = 'high';
  else if (spaceEvidence >= 1) space = 'medium';
  else space = 'low';

  const secCount = a.security.length + b.security.length;
  let security: 'high' | 'medium' | 'low';
  if (secCount > 0) security = 'high';
  else security = 'medium';

  return { algorithm, time, space, security };
}

export type { Patterns };
