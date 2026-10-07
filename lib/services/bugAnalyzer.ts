import type { BugFinding, LineAnchor } from '@/lib/types/analysis';

export function analyze(code: string, _language: string): BugFinding[] {
  const findings: BugFinding[] = [];
  const lines = code.split('\n').map((l) => l.replace(/\r$/, ''));

  detectOffByOne(findings, lines, code);
  detectNullHandling(findings, lines, code);
  detectEmptyInputHandling(findings, lines, code);
  detectIncorrectLoopBoundaries(findings, lines, code);
  detectIntegerOverflow(findings, lines, code);
  detectIncorrectInitialization(findings, lines, code);
  detectMissingReturn(findings, lines, code);
  detectInfiniteLoop(findings, lines, code);
  detectRecursionBaseCase(findings, lines, code);
  detectMutationProblems(findings, lines, code);
  detectDuplicateHandling(findings, lines, code);
  detectIncorrectIndexing(findings, lines, code);

  return findings;
}

function anchor(lineNumber: number, label?: string): LineAnchor[] {
  return [{ startLine: lineNumber, endLine: lineNumber, label }];
}

function multiAnchor(start: number, end: number, label?: string): LineAnchor[] {
  return [{ startLine: start, endLine: end, label }];
}

function detectOffByOne(findings: BugFinding[], lines: string[], code: string): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    const forLoopStart1 = /for\s*\(\s*(?:let|var|int|)\s*(\w+)\s*=\s*1\s*;\s*\1\s*<\s*\w+(?:\.length|\.size\(\)|len\s*\(\s*\w+\s*\)|count)/.test(line);
    if (forLoopStart1) {
      findings.push({
        severity: 'medium',
        title: 'Off-by-one: loop starts at index 1 instead of 0',
        description: `Loop initializes counter at 1 before iterating an array/collection. This skips the first element. Pattern found: \`${trimmed.substring(0, 120)}\``,
        line: i + 1,
        anchors: anchor(i + 1, 'off-by-one loop start'),
        category: 'off-by-one',
      });
    }

    const sliceFrom1 = /\.(?:slice|substring|splice|substr)\s*\(\s*1\s*[,)]/.test(line);
    if (sliceFrom1) {
      findings.push({
        severity: 'low',
        title: 'Off-by-one hint: slice/substring starting at index 1',
        description: `Slicing from index 1 drops the first element. Confirm this is intentional. Pattern: \`${trimmed.substring(0, 120)}\``,
        line: i + 1,
        anchors: anchor(i + 1, 'slice from 1'),
        category: 'off-by-one',
      });
    }

    const rangeStart1 = /range\s*\(\s*1\s*[,)]/.test(line);
    if (rangeStart1) {
      findings.push({
        severity: 'low',
        title: 'Off-by-one hint: range() starting at 1',
        description: `range(1, ...) skips the first iteration. Verify the starting index is correct. Pattern: \`${trimmed.substring(0, 120)}\``,
        line: i + 1,
        anchors: anchor(i + 1, 'range from 1'),
        category: 'off-by-one',
      });
    }

    if (forLoopStart1 || sliceFrom1 || rangeStart1) {
      void code;
    }
  }
}

function detectNullHandling(findings: BugFinding[], lines: string[], _code: string): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    const dotDereference = /(\w+)\.(\w+)\s*[=;(,[]/.exec(line);
    const bracketDereference = /(\w+)\s*\[\s*\w+\s*\]/.exec(line);
    const methodCall = /(\w+)\s*\.\s*\w+\s*\(/.exec(line);

    const derefVar = dotDereference?.[1] ?? bracketDereference?.[1] ?? methodCall?.[1];
    if (!derefVar) continue;
    if (/^(this|self|super|console|Math|JSON|Array|Object|String|Number|Boolean|Date|RegExp)$/.test(derefVar)) continue;
    if (/^\d/.test(derefVar)) continue;

    const prevLines = lines.slice(Math.max(0, i - 5), i);
    const hasNullGuard = prevLines.some((pl) => {
      const g1 = new RegExp(`if\\s*[(:]\\s*[!]?\\s*${derefVar}\\b`).test(pl);
      const g2 = new RegExp(`${derefVar}\\s*[!=]==?\\s*(null|undefined|None|nil)`).test(pl);
      const g3 = new RegExp(`(null|undefined|None|nil)\\s*[!=]==?\\s*${derefVar}`).test(pl);
      const g4 = new RegExp(`${derefVar}\\s*&&\\s*${derefVar}\\.${methodCall?.[2] ?? '\\w+'}`).test(pl);
      const g5 = new RegExp(`${derefVar}\\s*\\?\\.`).test(pl);
      const g6 = new RegExp(`\\b${derefVar}\\s*!=\\s*nil\\b`).test(pl);
      return g1 || g2 || g3 || g4 || g5 || g6;
    });

    if (!hasNullGuard) {
      const defPattern = new RegExp(`(?:const|let|var|val|int|string|\\w+)\\s+${derefVar}\\s*=\\s*(null|undefined|None|nil)\\b`);
      const nullableParam = new RegExp(`\\b${derefVar}\\s*\\?\\s*:`);
      const inFunc = /function\s*\(|def\s+\w+\s*\(/.test(line);
      let hasEvidence = false;
      for (let j = 0; j < Math.min(i, 8); j++) {
        if (defPattern.test(lines[j]!)) {
          hasEvidence = true;
          break;
        }
        if (nullableParam.test(lines[j]!)) {
          hasEvidence = true;
          break;
        }
      }
      if (hasEvidence && !inFunc) {
        findings.push({
          severity: 'high',
          title: 'Possible null/undefined dereference without guard',
          description: `Variable \`${derefVar}\` may be null/undefined but is dereferenced without a guard clause. Access: \`${trimmed.substring(0, 120)}\``,
          line: i + 1,
          anchors: anchor(i + 1, 'null dereference risk'),
          category: 'null-handling',
        });
      }
    }
  }
}

function detectEmptyInputHandling(findings: BugFinding[], lines: string[], _code: string): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    const directFirst = /(\w+)\s*\[\s*0\s*\]/.exec(line);
    const arrFirst = /(\w+)\.first\(\)/.exec(line);
    const arrHead = /(\w+)\[1\]/.exec(line);
    const peek = /(\w+)\.peek\(\)/.exec(line);
    const target = directFirst?.[1] ?? arrFirst?.[1] ?? peek?.[1];
    if (!target) {
      if (arrHead) {
        const hTarget = arrHead[1]!;
        const headGuard = hasLengthGuard(lines, i, hTarget);
        if (!headGuard) {
          findings.push({
            severity: 'medium',
            title: 'Potential out-of-bounds: accessing index without length guard',
            description: `\`${hTarget}[1]\` accesses the second element without checking the array length first. Empty or short inputs will crash.`,
            line: i + 1,
            anchors: anchor(i + 1, 'unchecked index access'),
            category: 'empty-input',
          });
        }
      }
      continue;
    }
    if (/^(Math|JSON|Array|Object|console|String)$/.test(target)) continue;

    const hasGuard = hasLengthGuard(lines, i, target);
    if (!hasGuard) {
      findings.push({
        severity: 'medium',
        title: 'Potential out-of-bounds: accessing first element without length guard',
        description: `\`${target}[0]\` or equivalent accessed without a preceding length/count check. Empty inputs will throw an index error. Pattern: \`${trimmed.substring(0, 120)}\``,
        line: i + 1,
        anchors: anchor(i + 1, 'unchecked first element access'),
        category: 'empty-input',
      });
    }
  }
}

function hasLengthGuard(lines: string[], idx: number, target: string): boolean {
  const window = lines.slice(Math.max(0, idx - 10), idx);
  return window.some((pl) => {
    const c1 = new RegExp(`\\b${target}\\b\\s*(?:\\.(?:length|size|count)\\s*(?:\\(\\))?)?\\s*(?:[>=]>?|<<?|!=|==)\\s*\\d+`).test(pl);
    const c2 = new RegExp(`\\b${target}\\b\\s*(?:\\?(?:\\.)?\\s*(?:length|size|count))`).test(pl);
    const c3 = new RegExp(`(?:len|count|sizeof)\\s*\\(\\s*\\b${target}\\b\\s*\\)\\s*(?:[>=]>?|<<?|!=|==)\\s*\\d+`).test(pl);
    const c4 = new RegExp(`if\\s*[(:]\\s*(?:not\\s+|!)\\s*\\b${target}\\b`).test(pl);
    const c5 = new RegExp(`\\b${target}\\s*&&`).test(pl);
    const c6 = new RegExp(`\\b${target}\\b\\.\\b(?:is_empty|isEmpty|any)\\s*\\(`).test(pl);
    return c1 || c2 || c3 || c4 || c5 || c6;
  });
}

function detectIncorrectLoopBoundaries(findings: BugFinding[], lines: string[], _code: string): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    const inclusiveEnd = /for\s*\(\s*(?:let|var|int|)\s*(\w+)\s*=\s*0\s*;\s*\1\s*<=\s*\w+(?:\.length|\.size\(\)|len\s*\(\s*\w+\s*\)|count)/.exec(line);
    if (inclusiveEnd) {
      findings.push({
        severity: 'high',
        title: 'Incorrect loop boundary: inclusive end (<=) with length causes OOB',
        description: `Loop uses \`i <= length\` instead of \`i < length\`. This iterates one past the last valid index and will throw an out-of-bounds error. Pattern: \`${inclusiveEnd[0]}\``,
        line: i + 1,
        anchors: anchor(i + 1, 'inclusive loop bound (<= length)'),
        category: 'loop-boundary',
      });
    }

    const lenMinusOneAndLess = /for\s*\(\s*(?:let|var|int|)\s*(\w+)\s*=\s*0\s*;\s*\1\s*<\s*\w+(?:\.length|\.size\(\))\s*-\s*1/.exec(line);
    if (lenMinusOneAndLess) {
      findings.push({
        severity: 'medium',
        title: 'Suspicious loop boundary: length - 1 with < may skip last element',
        description: `Loop condition \`i < length - 1\` skips the final element. Use \`i <= length - 1\` or \`i < length\` depending on intent. Pattern: \`${lenMinusOneAndLess[0]}\``,
        line: i + 1,
        anchors: anchor(i + 1, 'len-1 with < boundary'),
        category: 'loop-boundary',
      });
    }
  }
}

function detectIntegerOverflow(findings: BugFinding[], lines: string[], _code: string): void {
  const overflowLangs = ['java', 'c#', 'c++', 'cpp', 'c'];
  const hasOverflowLang = (() => {
    void _code;
    let match = false;
    for (let k = 0; k < Math.min(lines.length, 15); k++) {
      const l = lines[k]!.toLowerCase();
      for (const lang of overflowLangs) {
        if (l.includes(lang) && /(?:class|int\s|#include|public\s+static|using\s+)/.test(lines[k]!)) {
          match = true;
        }
      }
    }
    return match;
  })();

  const cStyle = /^\s*#include\b|^\s*(int|void|char|long|float|double)\s+\w+\s*\(|^\s*public\s+(class|static|int)|^\s*using\s+System/.test(lines.join('\n'));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (cStyle || hasOverflowLang) {
      const uncheckedArith = /(\w+)\s*=\s*\w+\s*[+\-*]\s*\w+/.exec(line);
      if (uncheckedArith && !/checked\s*\{/.test(lines.slice(Math.max(0, i - 3), i + 1).join(' '))) {
        if (/^\s*int\s+|^\s*long\s+|^\s*Int32|^\s*Int64|^\s*uint\s+/.test(line) || /^\s*(int|long|short|byte)\s+\w+\s*=/.test(line)) {
          findings.push({
            severity: 'low',
            title: 'Integer overflow risk: unchecked arithmetic on fixed-size integer type',
            description: `Arithmetic on fixed-width integer without overflow check. Pattern: \`${trimmed.substring(0, 120)}\`. Consider wrapping in a checked block or validating bounds.`,
            line: i + 1,
            anchors: anchor(i + 1, 'unchecked arithmetic'),
            category: 'integer-overflow',
          });
        }
      }
    }
  }
}

function detectIncorrectInitialization(findings: BugFinding[], lines: string[], _code: string): void {
  const declared: Map<string, number> = new Map();
  const assigned: Set<string> = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    const declareMatch = /^\s*(?:let|var|int|long|string|double|float|bool|char|short)\s+(\w+)\s*;/.exec(line);
    if (declareMatch) {
      const varName = declareMatch[1]!;
      if (!declared.has(varName)) {
        declared.set(varName, i);
      }
    }

    const assignMatch = /^\s*(\w+)\s*=\s*[^=]/;
    for (let j = i; j >= Math.max(0, i - 1); j--) {
      const am = assignMatch.exec(lines[j]!);
      if (am) assigned.add(am[1]!);
    }

    const usageMatches = line.matchAll(/\b([a-zA-Z_]\w*)\b(?!\s*[=:(])/g);
    for (const um of usageMatches) {
      const used = um[1]!;
      if (declared.has(used) && !assigned.has(used)) {
        const declaredAt = declared.get(used)!;
        if (i > declaredAt) {
          findings.push({
            severity: 'high',
            title: `Potentially uninitialized variable \`${used}\` used before assignment`,
            description: `Variable \`${used}\` was declared at line ${declaredAt + 1} without an initializer and is used here without a preceding assignment.`,
            line: i + 1,
            anchors: [
              { startLine: declaredAt + 1, endLine: declaredAt + 1, label: 'declaration without init' },
              { startLine: i + 1, endLine: i + 1, label: 'use before assign' },
            ],
            category: 'initialization',
          });
          assigned.add(used);
        }
      }
    }
  }
}

function detectMissingReturn(findings: BugFinding[], lines: string[], _code: string): void {
  const funcStarts: { idx: number; name: string; nonVoid: boolean }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const jsFunc = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w*)\s*\([^)]*\)\s*(:\s*(?!void)[\w<>\[\],\s|?]+)?/.exec(line);
    const tsArrow = /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*:\s*(?!void)[\w<>\[\],\s|?]+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/.exec(line);
    const pyFunc = /^\s*def\s+(\w+)\s*\([^)]*\)\s*(?:->\s*(?!None)\s*[\w[\],\s|]+)?/.exec(line);
    const javaFunc = /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?!void\s+)([\w<>\[\]]+)\s+(\w+)\s*\(/.exec(line);
    const csFunc = /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?(?!void\s+)([\w<>\[\]]+)\s+(\w+)\s*\(/.exec(line);

    if (jsFunc) {
      funcStarts.push({ idx: i, name: jsFunc[1] ?? '<anon>', nonVoid: !!jsFunc[2] });
    } else if (tsArrow) {
      funcStarts.push({ idx: i, name: tsArrow[1]!, nonVoid: true });
    } else if (pyFunc) {
      funcStarts.push({ idx: i, name: pyFunc[1]!, nonVoid: /->\s*(?!None)/.test(line) });
    } else if (javaFunc) {
      funcStarts.push({ idx: i, name: javaFunc[2]!, nonVoid: true });
    } else if (csFunc) {
      funcStarts.push({ idx: i, name: csFunc[2]!, nonVoid: true });
    }
  }

  for (const fs of funcStarts) {
    if (!fs.nonVoid) continue;
    const startIdx = fs.idx;
    let braceDepth = 0;
    let started = false;
    let hasReturnVal = false;
    let funcEnd = startIdx;
    let indentRef = -1;
    const startMatch = /^(\s*)/.exec(lines[startIdx]!);
    if (startMatch) indentRef = startMatch[1]!.length;

    for (let j = startIdx; j < lines.length; j++) {
      const l = lines[j]!;
      for (const ch of l) {
        if (ch === '{') { braceDepth++; started = true; }
        else if (ch === '}') { braceDepth--; }
      }
      if (/^\s*return\s+[^;\s]/.test(l) || /^\s*return\s*\([^)]/.test(l)) hasReturnVal = true;
      if (/^\s*raise\s+/.test(l) || /^\s*throw\s+/.test(l)) hasReturnVal = true;
      if (started && braceDepth === 0) { funcEnd = j; break; }
      if (j > startIdx && indentRef >= 0 && !/^\s*$/.test(l)) {
        const lm = /^(\s*)/.exec(l);
        if (lm && lm[1]!.length <= indentRef && l.trim().length > 0 && j > startIdx + 1) {
          funcEnd = j - 1;
          break;
        }
      }
    }
    if (funcEnd === startIdx) funcEnd = Math.min(startIdx + 3, lines.length - 1);

    const funcLines = lines.slice(startIdx, funcEnd + 1);
    const hasExplicitReturn = funcLines.some((fl) => /^\s*return\s+[^;\s]/.test(fl) || /^\s*return\s*\([^)]/.test(fl));
    const allPathsReturn = (() => {
      if (hasExplicitReturn) {
        const last = funcLines[funcLines.length - 1]?.trim() ?? '';
        if (/^\s*return\b/.test(last) || /^\s*}/.test(last)) return true;
        return false;
      }
      return false;
    })();

    if (!hasReturnVal || !allPathsReturn) {
      const lastIdx = funcEnd;
      findings.push({
        severity: 'medium',
        title: `Possible missing return in non-void function \`${fs.name}\``,
        description: `Function \`${fs.name}\` declares a non-void return type but some code paths may not return a value. Ensure every branch returns or throws.`,
        line: startIdx + 1,
        anchors: multiAnchor(startIdx + 1, lastIdx + 1, `function ${fs.name}`),
        category: 'missing-return',
      });
    }
  }
}

function detectInfiniteLoop(findings: BugFinding[], lines: string[], _code: string): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    const whileTrue = /^\s*while\s*\(\s*(?:true|1|True)\s*\)\s*\{?\s*$/.test(line);
    const forEver = /^\s*for\s*\(\s*;\s*;\s*\)/.test(line);
    const forRangeNoStep = /for\s+(\w+)\s+in\s+(\w+)\s*:/.exec(line);

    if (whileTrue || forEver) {
      const windowEnd = Math.min(lines.length, i + 15);
      let hasBreakOrReturn = false;
      let braces = 0;
      let entered = false;
      for (let j = i; j < windowEnd; j++) {
        const body = lines[j]!;
        for (const ch of body) {
          if (ch === '{') { braces++; entered = true; }
          else if (ch === '}') braces--;
        }
        if (/\bbreak\b/.test(body) || /\breturn\b/.test(body) || /\braise\s+/.test(body) || /\bthrow\s+/.test(body)) {
          hasBreakOrReturn = true;
          break;
        }
        if (entered && braces === 0) break;
      }
      if (!hasBreakOrReturn) {
        findings.push({
          severity: 'high',
          title: 'Infinite loop risk: `while(true)` / `for(;;)` without break/return in visible body',
          description: `Loop has no observable break, return, or exception path within the first 15 lines. Pattern: \`${trimmed.substring(0, 120)}\``,
          line: i + 1,
          anchors: multiAnchor(i + 1, Math.min(i + 15, lines.length), 'infinite loop risk'),
          category: 'infinite-loop',
        });
      }
    }

    if (forRangeNoStep) {
      const v = forRangeNoStep[1]!;
      const col = forRangeNoStep[2]!;
      const windowEnd = Math.min(lines.length, i + 12);
      let mutated = false;
      for (let j = i + 1; j < windowEnd; j++) {
        if (new RegExp(`\\b${col}\\b\\s*(=|\\+=|-=|append|push|pop|remove|add)`).test(lines[j]!)) {
          mutated = true;
          break;
        }
        if (new RegExp(`\\b${v}\\b\\s*(=|\\+=|-=)`).test(lines[j]!)) {
          mutated = true;
          break;
        }
      }
      void mutated;
    }
  }
}

function detectRecursionBaseCase(findings: BugFinding[], lines: string[], _code: string): void {
  const functions: { name: string; start: number; end: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    const defMatch = /^\s*def\s+(\w+)\s*\(/.exec(l) ||
      /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/.exec(l) ||
      /^\s*(?:public|private|protected|static|void|int|string|bool|char|long|double|float|[\w<>[\]]+)\s+(\w+)\s*\(/.exec(l);
    if (defMatch && defMatch[1]) {
      const name = defMatch[1];
      let end = i;
      let depth = 0;
      let started = false;
      const startIndent = /^(\s*)/.exec(l)?.[1]?.length ?? -1;
      for (let j = i; j < lines.length; j++) {
        for (const ch of lines[j]!) {
          if (ch === '{') { depth++; started = true; }
          else if (ch === '}') depth--;
        }
        if (started && depth === 0) { end = j; break; }
        if (j > i && startIndent >= 0 && !/^\s*$/.test(lines[j]!)) {
          const curIndent = /^(\s*)/.exec(lines[j]!)?.[1]?.length ?? 0;
          if (curIndent <= startIndent && lines[j]!.trim().length > 0) { end = j - 1; break; }
        }
        end = j;
      }
      functions.push({ name, start: i, end });
    }
  }

  for (const fn of functions) {
    const body = lines.slice(fn.start, fn.end + 1).join('\n');
    const callsItself = new RegExp(`\\b${fn.name}\\s*\\(`).test(body);
    if (!callsItself) continue;

    const baseFound = lines.slice(fn.start, fn.end + 1).some((bl) => {
      const trimmed = bl.trim();
      const isEarlyReturn = /^\s*if\s+/.test(trimmed) && /\breturn\b/.test(trimmed);
      const isTernary = /\?\s*[^:]+:\s*[^;]+/.test(trimmed) && new RegExp(`\\b${fn.name}\\s*\\(`).test(trimmed);
      const matchGuard1 = /(?:<=|<|>=|>|==|===|!=|!==)\s*(?:0|1|null|undefined|None|nil|"")/.test(trimmed);
      const matchGuard2 = /(?:0|1|null|undefined|None|nil|"")\s*(?:<=|<|>=|>|==|===|!=|!==)/.test(trimmed);
      const matchGuard3 = /\b(?:not\s+)?len\s*\(\s*\w+\s*\)\s*(?:<=|<|>=|>|==|!=)\s*(?:0|1)/.test(trimmed);
      const matchGuard4 = /\.length\s*(?:<=|<|>=|>|==|===|!=|!==)\s*(?:0|1)/.test(trimmed);
      const isEmpty = /\b(?:is_empty|isEmpty|not\s+any|!any)\b/.test(trimmed);
      return (isEarlyReturn || isTernary) && (matchGuard1 || matchGuard2 || matchGuard3 || matchGuard4 || isEmpty);
    });

    if (!baseFound) {
      findings.push({
        severity: 'high',
        title: `Missing or incorrect recursion base case in \`${fn.name}\``,
        description: `Recursive function \`${fn.name}\` calls itself but no simple base-case guard (comparison against 0/1/None/length check with early return) was identified. Verify the recursion always terminates.`,
        line: fn.start + 1,
        anchors: multiAnchor(fn.start + 1, fn.end + 1, `recursive function ${fn.name}`),
        category: 'recursion-base-case',
      });
    }
  }
}

function detectMutationProblems(findings: BugFinding[], lines: string[], _code: string): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    const inPlaceSort = /(\w+)\.sort\s*\(\s*[^)]*\)\s*[;,\n]?\s*$/.exec(line);
    const reverseMut = /(\w+)\.reverse\s*\(\s*\)/.exec(line);
    const pySort = /(\w+)\.sort\s*\(\s*\)/.exec(line);
    const pyReverse = /(\w+)\.reverse\s*\(\s*\)/.exec(line);

    const sortVar = inPlaceSort?.[1] ?? '';
    if (inPlaceSort && !(new RegExp(`\\.slice\\s*\\(\\s*\\)\\.sort|\\.concat\\s*\\(\\s*\\)\\.sort|\\.\\.\\.\\s*${sortVar}`).test(lines.slice(Math.max(0, i - 2), i + 1).join(' ')))) {
      findings.push({
        severity: 'medium',
        title: 'Input mutation risk: in-place `.sort()` modifies caller array',
        description: `\`.sort()\` mutates the array in-place. If \`${inPlaceSort[1]}\` was passed as an argument, the caller's array is modified unintentionally. Use \`[...arr].sort()\` or \`arr.slice().sort()\` to avoid side effects.`,
        line: i + 1,
        anchors: anchor(i + 1, 'in-place sort mutation'),
        category: 'mutation',
      });
    }

    if (reverseMut && !/\.slice\s*\(\s*\)\.reverse|\.\.\.\s*(\w+)\.reverse/.test(lines.slice(Math.max(0, i - 2), i + 1).join(' '))) {
      findings.push({
        severity: 'low',
        title: 'Input mutation hint: `.reverse()` mutates array in-place',
        description: `\`.reverse()\` mutates \`${reverseMut[1]}\` in-place. Consider copying first if the original order must be preserved. Pattern: \`${trimmed.substring(0, 120)}\``,
        line: i + 1,
        anchors: anchor(i + 1, 'in-place reverse mutation'),
        category: 'mutation',
      });
    }

    if (pySort || pyReverse) {
      findings.push({
        severity: 'medium',
        title: `Input mutation: Python list.${pySort ? 'sort' : 'reverse'}() in-place on parameter`,
        description: `Python list.${pySort ? 'sort' : 'reverse'}() modifies the list in-place. If \`${(pySort ?? pyReverse)?.[1]}\` is a caller-supplied argument, this leaks side effects. Use \`sorted()\` or \`reversed()\` for a new copy.`,
        line: i + 1,
        anchors: anchor(i + 1, 'python in-place mutation'),
        category: 'mutation',
      });
    }
  }
}

function detectDuplicateHandling(findings: BugFinding[], lines: string[], _code: string): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    const naiveUniq = /if\s+not\s+(\w+)\s+in\s+(\w+)\s*:\s*$/.exec(line) ||
      /if\s*\(\s*!\w+\.includes\s*\(\s*(\w+)\s*\)\s*\)\s*\{?$/.exec(line) ||
      /if\s*\(\s*\w+\.indexOf\s*\(\s*(\w+)\s*\)\s*===\s*-1\s*\)\s*\{?$/.exec(line);

    if (naiveUniq) {
      const nextLines = lines.slice(i + 1, i + 4).join(' ');
      if (/\.add\s*\(|\.append\s*\(|push\s*\(/.test(nextLines)) {
        findings.push({
          severity: 'low',
          title: 'Duplicate handling without Set: consider using a Set for O(1) lookups',
          description: `Pattern manually checks membership before adding. Using a Set avoids duplicates implicitly and runs in O(1) instead of O(n) per check. Pattern near: \`${naiveUniq[0]}\``,
          line: i + 1,
          anchors: multiAnchor(i + 1, Math.min(i + 3, lines.length), 'manual dedupe block'),
          category: 'duplicate-handling',
        });
      }
    }
  }
}

function detectIncorrectIndexing(findings: BugFinding[], lines: string[], _code: string): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    const idxEqualsCount = /(\w+)\s*\[\s*(\w+(?:\.length|\.size\(\)|len\s*\(\s*\w+\s*\)))\s*\]/.exec(line);
    if (idxEqualsCount) {
      findings.push({
        severity: 'high',
        title: 'Guaranteed out-of-bounds: index equals length/size',
        description: `\`${idxEqualsCount[1]}[${idxEqualsCount[2]}]\` uses length as the index directly. Valid indices are 0..length-1, so this always throws an out-of-bounds error.`,
        line: i + 1,
        anchors: anchor(i + 1, 'index equals length'),
        category: 'incorrect-indexing',
      });
    }

    const oneIndexedLoop = /for\s*\(\s*(?:let|var|int|)\s*i\s*=\s*1\s*;\s*i\s*<=\s*(\w+(?:\.length|\.size\(\)))/.exec(line);
    if (oneIndexedLoop) {
      findings.push({
        severity: 'high',
        title: '1-indexed loop used on 0-indexed array: will skip element 0 and overflow',
        description: `Loop starts at i=1 and runs i<=${oneIndexedLoop[1]}, accessing 1..length. Arrays are 0-indexed, so this skips index 0 and reads past the last element at i=${oneIndexedLoop[1]}.`,
        line: i + 1,
        anchors: anchor(i + 1, '1-indexed loop bound'),
        category: 'incorrect-indexing',
      });
    }

    const idxMinusOneWrong = /\[(\w+)\s*-\s*0\s*\]/.test(line);
    if (idxMinusOneWrong) {
      findings.push({
        severity: 'low',
        title: 'Suspicious index: `- 0` is a no-op; likely meant `- 1`',
        description: `Index expression contains \`- 0\` which is equivalent to not subtracting anything. This is often a typo for \`- 1\` to get the last element. Line: \`${line.trim().substring(0, 120)}\``,
        line: i + 1,
        anchors: anchor(i + 1, 'suspicious `- 0` index'),
        category: 'incorrect-indexing',
      });
    }
  }
}
