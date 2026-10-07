import type { AlgorithmInfo } from '@/lib/types/analysis';

type Patterns = {
  nestedLoop: boolean;
  hashing: boolean;
  recursion: boolean;
  sorting: boolean;
  dp: boolean;
  bfsDfs: boolean;
  twoPointers: boolean;
  slidingWindow: boolean;
  greedy: boolean;
  prefixSum: boolean;
  heap: boolean;
};

const LOOP_START_REGEXES = [
  /for\s*\(/,
  /while\s*\(/,
  /for\s+\w+\s+in\s+range/,
  /for\s+_\s*,/,
  /for\s+\w+\s*:=\s*range/,
  /for\s+\w+\s+in\s+/,
  /for\s+\w+\s+of\s+/,
  /loop\s*\{/,
];

export function analyze(code: string, language: string): {
  algorithm: AlgorithmInfo;
  patterns: Patterns;
} {
  const lines = code.split('\n').map((l) => l.replace(/\r$/, '').trim());
  const codeLower = code.toLowerCase();

  const patterns: Patterns = {
    nestedLoop: detectNestedLoop(lines),
    hashing: detectHashing(code, codeLower),
    recursion: detectRecursion(code, language),
    sorting: detectSorting(code, codeLower),
    dp: detectDP(code, codeLower),
    bfsDfs: detectBfsDfs(code, codeLower),
    twoPointers: detectTwoPointers(code, codeLower, lines),
    slidingWindow: detectSlidingWindow(code, codeLower),
    greedy: detectGreedy(code, codeLower, lines),
    prefixSum: detectPrefixSum(code, codeLower),
    heap: detectHeap(code, codeLower),
  };

  return {
    algorithm: buildAlgorithmInfo(patterns),
    patterns,
  };
}

function detectNestedLoop(lines: string[]): boolean {
  let loopDepth = 0;
  let maxLoopDepth = 0;
  const stack: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const startsLoop = LOOP_START_REGEXES.some((r) => r.test(line));
    const braceOpen = (line.match(/\{/g) ?? []).length;
    const braceClose = (line.match(/\}/g) ?? []).length;

    if (startsLoop) {
      loopDepth++;
      if (loopDepth > maxLoopDepth) maxLoopDepth = loopDepth;
      stack.push(braceOpen - braceClose > 0 ? braceOpen - braceClose : 1);
    } else {
      let net = braceOpen - braceClose;
      while (net < 0 && stack.length > 0) {
        const top = stack[stack.length - 1]!;
        const consume = Math.min(-net, top);
        stack[stack.length - 1] = top - consume;
        net += consume;
        if (stack[stack.length - 1] === 0) {
          stack.pop();
          loopDepth = Math.max(0, loopDepth - 1);
        }
      }
    }

    if (line.includes('def ') && line.includes(':') && stack.length === 0) {
      loopDepth = 0;
      stack.length = 0;
    }
  }

  return maxLoopDepth >= 2;
}

function detectHashing(code: string, codeLower: string): boolean {
  const keywords = [
    /\bHashMap\b/,
    /\bHashSet\b/,
    /\bHashTable\b/,
    /\bdict\b/,
    /\bMap\b/,
    /\bSet\b/,
    /\bObject\b/,
    /new\s+Map\b/,
    /new\s+Set\b/,
    /unordered_map/,
    /unordered_set/,
    /\.fromkeys\(/,
  ];
  if (keywords.some((k) => k.test(code))) return true;
  if (codeLower.includes('defaultdict')) return true;
  if (codeLower.includes('counter(')) return true;
  const curlyDict = code.match(/\{\s*['"\w]/) && code.match(/['"]?\s*:/);
  if (curlyDict && codeLower.includes('python')) return false;
  return false;
}

function detectRecursion(code: string, _language: string): boolean {
  const pyNames = [...code.matchAll(/def\s+(\w+)\s*\(/g)].map((m) => m[1]);
  const jsNames = [...code.matchAll(/function\s+(\w+)\s*\(/g)].map((m) => m[1]);
  const goNames = [...code.matchAll(/func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(/g)].map((m) => m[1]);
  const rustNames = [...code.matchAll(/fn\s+(\w+)\s*\(/g)].map((m) => m[1]);
  const ktNames = [...code.matchAll(/fun\s+(\w+)\s*\(/g)].map((m) => m[1]);
  const javaNames = [...code.matchAll(/(?:public|private|protected|static|\s)\s+(\w+)\s*\([^)]*\)\s*\{/g)].map((m) => m[1]);

  const allNames = [...pyNames, ...jsNames, ...goNames, ...rustNames, ...ktNames, ...javaNames];
  if (allNames.length === 0) return false;

  for (const name of allNames) {
    if (!name) continue;
    const calls = [...code.matchAll(new RegExp(`\\b${name}\\s*\\(`, 'g'))];
    if (calls.length >= 2) return true;
  }
  return false;
}

function detectSorting(code: string, codeLower: string): boolean {
  const patterns = [
    /\.sort\s*\(/,
    /Arrays\.sort/,
    /sorted\s*\(/,
    /Collections\.sort/,
    /sort\.Slice/,
    /\.sorted\s*\(/,
    /std::sort/,
    /\.sort_values/,
  ];
  return patterns.some((p) => p.test(code)) || codeLower.includes('heapq');
}

function detectDP(_code: string, codeLower: string): boolean {
  const kws = ['memo', ' dp ', 'tabulation', 'memoize', 'cache', 'lru_cache', '@cache', 'dp[', 'memo[', 'memoize'];
  for (const kw of kws) {
    if (codeLower.includes(kw)) return true;
  }
  return false;
}

function detectBfsDfs(_code: string, codeLower: string): boolean {
  const kws = ['queue', 'stack', 'dfs', 'bfs', 'visited', 'adjacency', 'adj[', 'graph'];
  let hits = 0;
  for (const kw of kws) {
    if (codeLower.includes(kw)) hits++;
  }
  return hits >= 2;
}

function detectTwoPointers(code: string, codeLower: string, lines: string[]): boolean {
  if (codeLower.includes('two pointer')) return true;
  const pairs = [
    ['left', 'right'],
    ['low', 'high'],
    ['start', 'end'],
    ['i', 'j'],
    ['p1', 'p2'],
  ];
  for (const [a, b] of pairs) {
    const hasA = new RegExp(`\\b${a}\\b`).test(code);
    const hasB = new RegExp(`\\b${b}\\b`).test(code);
    if (hasA && hasB) {
      const incDec = /\+\+|--|\+=\s*1|-=\s*1/i.test(code);
      if (incDec) return true;
    }
  }
  let zeroInitIdx = 0;
  for (const line of lines) {
    if (/\b(let|var|const|int|def|val)\s+\w+\s*=\s*0/.test(line)) zeroInitIdx++;
  }
  if (zeroInitIdx >= 2 && /while\s*\(/.test(code)) return true;
  return false;
}

function detectSlidingWindow(_code: string, codeLower: string): boolean {
  const kws = ['sliding', 'window', 'substring', 'subarray'];
  let hits = 0;
  for (const kw of kws) {
    if (codeLower.includes(kw)) hits++;
  }
  return hits >= 1;
}

function detectGreedy(_code: string, codeLower: string, lines: string[]): boolean {
  if (codeLower.includes('greedy')) return true;
  let inLoop = false;
  let found = false;
  for (const line of lines) {
    if (LOOP_START_REGEXES.some((r) => r.test(line))) inLoop = true;
    if (inLoop && /Math\.(max|min)\s*\(|max\s*\(|min\s*\(/.test(line)) {
      found = true;
    }
    if (line.includes('}')) inLoop = false;
  }
  return found;
}

function detectPrefixSum(_code: string, codeLower: string): boolean {
  const kws = ['prefix', 'running_sum', 'runningsum', 'cumulative', 'prefixsum', 'prefix_sum'];
  for (const kw of kws) {
    if (codeLower.includes(kw)) return true;
  }
  return false;
}

function detectHeap(_code: string, codeLower: string): boolean {
  const kws = [
    'priorityqueue', 'heapq', 'minheap', 'maxheap',
    '.top()', '.poll()', '.push(', 'heap.init',
    'heapify', 'heappush', 'heappop', 'heapq.',
  ];
  for (const kw of kws) {
    if (codeLower.includes(kw)) return true;
  }
  return false;
}

function buildAlgorithmInfo(patterns: Patterns): AlgorithmInfo {
  const labels: { key: keyof Patterns; label: string }[] = [
    { key: 'nestedLoop', label: 'Nested Iteration' },
    { key: 'recursion', label: 'Recursion' },
    { key: 'sorting', label: 'Sorting' },
    { key: 'dp', label: 'Dynamic Programming' },
    { key: 'bfsDfs', label: 'Breadth/Depth-First Search' },
    { key: 'hashing', label: 'Hashing' },
    { key: 'twoPointers', label: 'Two Pointers' },
    { key: 'slidingWindow', label: 'Sliding Window' },
    { key: 'heap', label: 'Heap / Priority Queue' },
    { key: 'prefixSum', label: 'Prefix Sum' },
    { key: 'greedy', label: 'Greedy' },
  ];

  const active = labels.filter((l) => patterns[l.key]);
  const evidence = active.map((l) => `Pattern detected: ${l.label}`);

  let labelText: string;
  if (active.length === 0) {
    labelText = 'General iteration';
    evidence.unshift('No specific algorithm pattern matched; defaulting to general iteration.');
  } else {
    labelText = active.map((l) => l.label).join(' · ');
  }

  return {
    label: labelText,
    evidence,
  };
}
