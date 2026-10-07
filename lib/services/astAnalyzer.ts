export interface LineAnchor {
  startLine: number;
  endLine: number;
  label: string;
}

export interface StructureNode {
  startLine: number;
  endLine: number;
  label: string;
}

export interface AstAnalysis {
  loops: LineAnchor[];
  nestedLoops: LineAnchor[];
  recursions: LineAnchor[];
  hashMaps: LineAnchor[];
  sets: LineAnchor[];
  sorts: LineAnchor[];
  searches: LineAnchor[];
  dps: LineAnchor[];
  graphTraversals: LineAnchor[];
  twoPointers: LineAnchor[];
  slidingWindows: LineAnchor[];
  stacks: LineAnchor[];
  queues: LineAnchor[];
  treeTraversals: LineAnchor[];
  queries: LineAnchor[];
  functionCalls: LineAnchor[];
  functions: LineAnchor[];
}

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

const HASHMAP_KEYWORDS = [
  /\bHashMap\b/,
  /\bHashTable\b/,
  /\bdict\b/,
  /new\s+Map\b/,
  /unordered_map/,
  /\.fromkeys\(/,
  /\bdefaultdict\b/,
  /\bCounter\s*\(/,
];

const SET_KEYWORDS = [
  /\bHashSet\b/,
  /new\s+Set\b/,
  /unordered_set/,
  /\bset\s*\(/,
];

const SORT_KEYWORDS = [
  /\.sort\s*\(/,
  /Arrays\.sort/,
  /sorted\s*\(/,
  /Collections\.sort/,
  /sort\.Slice/,
  /\.sorted\s*\(/,
  /std::sort/,
  /\.sort_values/,
  /heapq/,
];

const SEARCH_KEYWORDS = [
  /binary.?search/i,
  /bsearch/,
  /\.find\s*\(/,
  /\.indexOf\s*\(/,
  /\.contains\s*\(/,
  /\.includes\s*\(/,
  /\bindex\s*\(/,
];

const DP_KEYWORDS = [
  /\bmemo\b/i,
  /\bdp\b/i,
  /tabulation/i,
  /memoize/i,
  /\bcache\b/i,
  /lru_cache/i,
  /@cache/,
  /dp\s*\[/,
  /memo\s*\[/,
];

const GRAPH_TRAVERSAL_KWS = [
  /\bdfs\b/i,
  /\bbfs\b/i,
  /\bvisited\b/i,
  /\badjacen\w*\b/i,
  /\bgraph\b/i,
];

const TWO_POINTER_PAIRS: [string, string][] = [
  ['left', 'right'],
  ['low', 'high'],
  ['start', 'end'],
  ['p1', 'p2'],
  ['slow', 'fast'],
];

const SLIDING_WINDOW_KWS = [
  /sliding/i,
  /window/i,
  /substring/i,
  /subarray/i,
];

const STACK_KWS = [
  /\.push\s*\(/,
  /\.pop\s*\(\)/,
  /\.peek\s*\(\)/,
  /\.top\s*\(\)/,
  /\bStack\b/,
];

const QUEUE_KWS = [
  /\.enqueue\s*\(/,
  /\.dequeue\s*\(\)/,
  /\.offer\s*\(/,
  /\.poll\s*\(\)/,
  /\bQueue\b/,
  /\bDeque\b/,
  /\bLinkedList\b.*queue/i,
];

const TREE_TRAVERSAL_KWS = [
  /in.?order/i,
  /pre.?order/i,
  /post.?order/i,
  /level.?order/i,
  /\btree\b/i,
  /\bstack\b.*(left|right)/i,
];

const SQL_KWS = [
  /\bSELECT\b/i,
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bFROM\b/i,
  /\bWHERE\b/i,
  /\bJOIN\b/i,
  /\bGROUP\s+BY\b/i,
  /\bORDER\s+BY\b/i,
];

export function analyze(code: string, _language: string): AstAnalysis {
  const rawLines = code.split('\n').map((l) => l.replace(/\r$/, ''));
  const trimmedLines = rawLines.map((l) => l.trim());
  const total = rawLines.length;

  const loops = detectLoops(rawLines, trimmedLines);
  const nestedLoops = detectNestedLoops(loops);
  const recursions = detectRecursions(code, rawLines, trimmedLines);
  const hashMaps = findAnchorsByKeywords(rawLines, trimmedLines, HASHMAP_KEYWORDS, 'HashMap');
  const sets = findAnchorsByKeywords(rawLines, trimmedLines, SET_KEYWORDS, 'Set');
  const sorts = findAnchorsByKeywords(rawLines, trimmedLines, SORT_KEYWORDS, 'Sort');
  const searches = findAnchorsByKeywords(rawLines, trimmedLines, SEARCH_KEYWORDS, 'Search');
  const dps = findAnchorsByKeywords(rawLines, trimmedLines, DP_KEYWORDS, 'DP');
  const graphTraversals = detectGraphTraversals(rawLines, trimmedLines);
  const twoPointers = detectTwoPointers(rawLines, trimmedLines);
  const slidingWindows = detectSlidingWindows(rawLines, trimmedLines);
  const stacks = findAnchorsByKeywords(rawLines, trimmedLines, STACK_KWS, 'Stack');
  const queues = findAnchorsByKeywords(rawLines, trimmedLines, QUEUE_KWS, 'Queue');
  const treeTraversals = detectTreeTraversals(rawLines, trimmedLines);
  const queries = detectQueries(rawLines, trimmedLines);
  const functionCalls = detectFunctionCalls(code, rawLines);
  const functions = detectFunctions(rawLines, trimmedLines);

  return {
    loops,
    nestedLoops,
    recursions,
    hashMaps,
    sets,
    sorts,
    searches,
    dps,
    graphTraversals,
    twoPointers,
    slidingWindows,
    stacks,
    queues,
    treeTraversals,
    queries,
    functionCalls,
    functions,
  };

  function lineFromIndex(idx: number): number {
    return code.substring(0, idx).split('\n').length;
  }

  function detectLoops(_raw: string[], trimmed: string[]): LineAnchor[] {
    const result: LineAnchor[] = [];
    const stack: { startLine: number; depth: number }[] = [];
    let braceDepth = 0;

    for (let i = 0; i < trimmed.length; i++) {
      const line = trimmed[i]!;
      const startsLoop = LOOP_START_REGEXES.some((r) => r.test(line));
      const opens = (line.match(/\{/g) ?? []).length;
      const closes = (line.match(/\}/g) ?? []).length;

      if (startsLoop) {
        stack.push({ startLine: i + 1, depth: braceDepth });
      }

      braceDepth += opens - closes;

      while (stack.length > 0 && braceDepth <= stack[stack.length - 1]!.depth) {
        const entry = stack.pop()!;
        const endLine = Math.max(entry.startLine, i + 1);
        result.push({ startLine: entry.startLine, endLine, label: 'Loop' });
      }

      if (startsLoop && opens === 0 && !line.includes(':')) {
        if (stack.length > 0 && stack[stack.length - 1]!.startLine === i + 1) {
          const entry = stack.pop()!;
          result.push({ startLine: entry.startLine, endLine: i + 1, label: 'Loop' });
        }
      }
    }

    while (stack.length > 0) {
      const entry = stack.pop()!;
      result.push({ startLine: entry.startLine, endLine: total, label: 'Loop' });
    }

    return result;
  }

  function detectNestedLoops(loopsArr: LineAnchor[]): LineAnchor[] {
    const result: LineAnchor[] = [];
    for (let i = 0; i < loopsArr.length; i++) {
      const outer = loopsArr[i]!;
      for (let j = 0; j < loopsArr.length; j++) {
        if (i === j) continue;
        const inner = loopsArr[j]!;
        if (
          inner.startLine > outer.startLine &&
          inner.endLine <= outer.endLine
        ) {
          result.push({
            startLine: outer.startLine,
            endLine: inner.endLine,
            label: 'NestedLoop',
          });
        }
      }
    }
    return dedupe(result);
  }

  function detectRecursions(src: string, _raw: string[], trimmed: string[]): LineAnchor[] {
    const fnNames = extractFnNames(trimmed);
    const result: LineAnchor[] = [];

    for (const name of fnNames) {
      const re = new RegExp(`\\b${name}\\s*\\(`, 'g');
      const matches = [...src.matchAll(re)];
      if (matches.length >= 2) {
        for (const m of matches) {
          if (m.index === undefined) continue;
          const ln = lineFromIndex(m.index);
          result.push({ startLine: ln, endLine: ln, label: `Recursion:${name}` });
        }
      }
    }
    return dedupe(result);
  }

  function extractFnNames(trimmed: string[]): string[] {
    const names: string[] = [];
    for (const line of trimmed) {
      let m: RegExpMatchArray | null;
      m = line.match(/def\s+(\w+)\s*\(/);
      if (m && m[1]) names.push(m[1]);
      m = line.match(/function\s+(\w+)\s*\(/);
      if (m && m[1]) names.push(m[1]);
      m = line.match(/func\s+(?:\([^)]*\)\s+)?(\w+)\s*\(/);
      if (m && m[1]) names.push(m[1]);
      m = line.match(/fn\s+(\w+)\s*\(/);
      if (m && m[1]) names.push(m[1]);
      m = line.match(/fun\s+(\w+)\s*\(/);
      if (m && m[1]) names.push(m[1]);
    }
    return names;
  }

  function findAnchorsByKeywords(
    _raw: string[],
    trimmed: string[],
    patterns: RegExp[],
    label: string,
  ): LineAnchor[] {
    const result: LineAnchor[] = [];
    for (let i = 0; i < trimmed.length; i++) {
      const line = trimmed[i]!;
      if (patterns.some((p) => p.test(line))) {
        result.push({ startLine: i + 1, endLine: i + 1, label });
      }
    }
    return result;
  }

  function detectGraphTraversals(_raw: string[], trimmed: string[]): LineAnchor[] {
    const result: LineAnchor[] = [];
    for (let i = 0; i < trimmed.length; i++) {
      const line = trimmed[i]!;
      let hits = 0;
      for (const kw of GRAPH_TRAVERSAL_KWS) {
        if (kw.test(line)) hits++;
      }
      if (hits >= 1) {
        result.push({ startLine: i + 1, endLine: i + 1, label: 'GraphTraversal' });
      }
    }
    return dedupe(result);
  }

  function detectTwoPointers(_raw: string[], trimmed: string[]): LineAnchor[] {
    const result: LineAnchor[] = [];
    const allText = trimmed.join(' ');
    for (const [a, b] of TWO_POINTER_PAIRS) {
      const hasA = new RegExp(`\\b${a}\\b`, 'i').test(allText);
      const hasB = new RegExp(`\\b${b}\\b`, 'i').test(allText);
      if (hasA && hasB) {
        const reA = new RegExp(`\\b${a}\\b`, 'i');
        const reB = new RegExp(`\\b${b}\\b`, 'i');
        let firstLine = -1;
        let lastLine = -1;
        for (let i = 0; i < trimmed.length; i++) {
          if (reA.test(trimmed[i]!) || reB.test(trimmed[i]!)) {
            if (firstLine === -1) firstLine = i + 1;
            lastLine = i + 1;
          }
        }
        if (firstLine !== -1 && lastLine !== -1) {
          result.push({ startLine: firstLine, endLine: lastLine, label: 'TwoPointers' });
        }
      }
    }
    return dedupe(result);
  }

  function detectSlidingWindows(_raw: string[], trimmed: string[]): LineAnchor[] {
    const result: LineAnchor[] = [];
    for (let i = 0; i < trimmed.length; i++) {
      if (SLIDING_WINDOW_KWS.some((kw) => kw.test(trimmed[i]!))) {
        result.push({ startLine: i + 1, endLine: i + 1, label: 'SlidingWindow' });
      }
    }
    return result;
  }

  function detectTreeTraversals(_raw: string[], trimmed: string[]): LineAnchor[] {
    const result: LineAnchor[] = [];
    for (let i = 0; i < trimmed.length; i++) {
      if (TREE_TRAVERSAL_KWS.some((kw) => kw.test(trimmed[i]!))) {
        result.push({ startLine: i + 1, endLine: i + 1, label: 'TreeTraversal' });
      }
    }
    return result;
  }

  function detectQueries(_raw: string[], trimmed: string[]): LineAnchor[] {
    const result: LineAnchor[] = [];
    for (let i = 0; i < trimmed.length; i++) {
      let hits = 0;
      for (const kw of SQL_KWS) {
        if (kw.test(trimmed[i]!)) hits++;
      }
      if (hits >= 2) {
        result.push({ startLine: i + 1, endLine: i + 1, label: 'Query' });
      }
    }
    return result;
  }

  function detectFunctionCalls(src: string, raw: string[]): LineAnchor[] {
    const callRe = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    const result: LineAnchor[] = [];
    const fnNames = new Set(extractFnNames(raw));
    const builtins = new Set([
      'if', 'while', 'for', 'switch', 'return', 'new', 'typeof',
      'instanceof', 'void', 'delete', 'in', 'of', 'throw', 'catch',
      'try', 'finally', 'class', 'interface', 'implements', 'extends',
      'import', 'export', 'from', 'as', 'async', 'await', 'yield',
      'let', 'var', 'const', 'static', 'public', 'private', 'protected',
    ]);
    let m: RegExpExecArray | null;
    while ((m = callRe.exec(src)) !== null) {
      const name = m[1]!;
      if (fnNames.has(name) && !builtins.has(name)) {
        const ln = lineFromIndex(m.index);
        result.push({ startLine: ln, endLine: ln, label: `Call:${name}` });
      }
    }
    return dedupe(result);
  }

  function detectFunctions(_raw: string[], trimmed: string[]): LineAnchor[] {
    const result: LineAnchor[] = [];
    for (let i = 0; i < trimmed.length; i++) {
      const line = trimmed[i]!;
      if (
        /\bdef\s+\w+/.test(line) ||
        /\bfunction\s+\w+/.test(line) ||
        /\bfunc\s+(?:\([^)]*\)\s+)?\w+/.test(line) ||
        /\bfn\s+\w+/.test(line) ||
        /\bfun\s+\w+/.test(line)
      ) {
        result.push({ startLine: i + 1, endLine: i + 1, label: 'Function' });
      }
    }
    return result;
  }

  function dedupe(arr: LineAnchor[]): LineAnchor[] {
    const seen = new Set<string>();
    const out: LineAnchor[] = [];
    for (const a of arr) {
      const key = `${a.startLine}:${a.endLine}:${a.label}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(a);
      }
    }
    return out;
  }
}
