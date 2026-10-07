import type { TimeComplexity, SpaceComplexity } from '@/lib/types/analysis';
import * as algorithmAnalyzer from './algorithmAnalyzer';
import * as syntaxAnalyzer from './syntaxAnalyzer';

type Patterns = ReturnType<typeof algorithmAnalyzer.analyze>['patterns'];
type Syntax = ReturnType<typeof syntaxAnalyzer.analyze>;

export function analyze(
  _code: string,
  _language: string,
  patterns: Patterns,
  syntax: Syntax,
): {
  time: TimeComplexity;
  space: SpaceComplexity;
} {
  const loopNestingDepth = deriveLoopDepth(patterns, syntax);
  const hasAnyLoop = syntax.branchCount > 0 || patterns.nestedLoop || loopNestingDepth >= 1;
  const halvingRecursion = false;

  const time = buildTime(patterns, loopNestingDepth, hasAnyLoop, halvingRecursion);
  const space = buildSpace(patterns, loopNestingDepth);

  return { time, space };
}

function deriveLoopDepth(patterns: Patterns, syntax: Syntax): number {
  if (!patterns.nestedLoop) {
    return syntax.branchCount > 0 ? 1 : 0;
  }
  return Math.max(2, Math.min(syntax.nestingDepth, 3));
}

function buildTime(
  patterns: Patterns,
  loopDepth: number,
  hasAnyLoop: boolean,
  _halving: boolean,
): TimeComplexity {
  const evidence: string[] = [];
  let best = 'O(1)';
  let avg = 'O(1)';
  let worst = 'O(1)';

  if (patterns.sorting) {
    best = 'O(n)';
    avg = 'O(n log n)';
    worst = 'O(n log n)';
    evidence.push('Sorting pattern detected → standard comparison sort is O(n log n) average/worst-case.');
  }

  if (patterns.nestedLoop || loopDepth >= 2) {
    const d = Math.max(2, loopDepth);
    if (d >= 3) {
      best = hasAnyLoop ? 'O(n^3)' : best;
      avg = 'O(n^3)';
      worst = 'O(n^3)';
      evidence.push(`Triple-nested loop structure detected (depth ${d}) → worst-case O(n^3).`);
    } else {
      if (!patterns.sorting) {
        best = hasAnyLoop ? 'O(n^2)' : best;
        avg = 'O(n^2)';
        worst = 'O(n^2)';
      } else {
        worst = 'O(n^2)';
      }
      evidence.push(`Nested loop detected (depth ${d}) → worst-case O(n^2) unless optimized by sorting.`);
    }
  } else if (patterns.twoPointers) {
    best = 'O(n)';
    avg = 'O(n)';
    worst = 'O(n)';
    evidence.push('Two pointers pattern with single pass → O(n) time.');
  } else if (patterns.slidingWindow) {
    best = 'O(n)';
    avg = 'O(n)';
    worst = 'O(n)';
    evidence.push('Sliding window pattern with single pass → O(n) time.');
  } else if (patterns.recursion) {
    best = 'O(log n)';
    avg = 'O(n)';
    worst = 'O(n)';
    evidence.push('Recursive structure detected; assuming O(log n) best with halving, up to O(n) worst-case.');
  } else if (hasAnyLoop) {
    best = 'O(n)';
    avg = 'O(n)';
    worst = 'O(n)';
    evidence.push('Single loop structure detected → linear O(n) time.');
  } else {
    evidence.push('No loops detected → constant O(1) time.');
  }

  if (patterns.hashing && !patterns.nestedLoop && loopDepth < 2) {
    if (!hasAnyLoop) {
      avg = 'O(1)';
      worst = 'O(n)';
      evidence.push('Hash Map detected without iteration → average O(1) lookup, worst-case O(n) with collisions.');
    } else {
      evidence.push('Hash Map lookups inside loop → average O(1) per operation, overall O(n) average.');
    }
  }

  if (patterns.heap) {
    if (patterns.sorting) {
      worst = 'O(n log n)';
    }
    evidence.push('Heap/PriorityQueue operations are O(log n) per insertion/extraction on average.');
  }

  return { best, avg, worst, evidence };
}

function buildSpace(patterns: Patterns, loopDepth: number): SpaceComplexity {
  const evidence: string[] = [];
  const input = 'O(n)';
  let auxiliary = 'O(1)';

  if (patterns.hashing || patterns.dp) {
    auxiliary = 'O(n)';
    if (patterns.hashing) evidence.push('Hash Map/Set detected → auxiliary O(n) in the worst case for stored entries.');
    if (patterns.dp) evidence.push('Dynamic Programming memo/tabulation storage → auxiliary O(n).');
  }

  if (patterns.sorting && auxiliary === 'O(1)') {
    auxiliary = 'O(log n)';
    evidence.push('In-place sorting typically uses O(log n) auxiliary stack space.');
  }

  if (patterns.recursion) {
    const worst = Math.max(loopDepth, 1);
    if (worst >= 1 && (patterns.dp || patterns.hashing)) {
      evidence.push('Recursion with data structures → stack plus storage, auxiliary O(n).');
    } else if (worst >= 1) {
      auxiliary = 'O(n)';
      evidence.push(`Recursion depth up to N → call-stack auxiliary O(N) worst case.`);
    }
  }

  if (auxiliary === 'O(1)') {
    evidence.push('No auxiliary collections or deep recursion observed → auxiliary O(1).');
  }

  return { input, auxiliary, evidence };
}
