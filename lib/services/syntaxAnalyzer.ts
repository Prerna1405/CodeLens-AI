import { LANGUAGES } from '@/lib/config/languages';

const CURLY_BRACE_LANGS = new Set([
  'c', 'cpp', 'java', 'javascript', 'typescript',
  'go', 'rust', 'csharp', 'kotlin', 'php',
]);

export function analyze(code: string, language: string) {
  const lang =
    LANGUAGES.find((l) => l.monacoLanguage === language) ??
    LANGUAGES[0] ??
    { id: 'javascript', name: 'JavaScript', monacoLanguage: 'javascript', commentLine: '//', commentBlock: ['/*', '*/'] };
  const lines = code.split('\n').map((l) => l.replace(/\r$/, ''));
  const totalLines = lines.length;

  let blankLines = 0;
  let commentLines = 0;
  let codeLineCount = 0;
  let nestingDepth = 0;
  let maxNestingDepth = 0;
  let functionCount = 0;
  let branchCount = 0;
  let totalLineLength = 0;
  let nonBlankLines = 0;
  let inBlockComment = false;

  const trimmedLines = lines.map((l) => l.trim());

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const trimmed = trimmedLines[i]!;

    if (trimmed.length === 0) {
      blankLines++;
      continue;
    }

    nonBlankLines++;
    totalLineLength += rawLine.length;

    let isCommentLine = false;

    if (lang.commentBlock) {
      const [blockStart, blockEnd] = lang.commentBlock;
      if (inBlockComment) {
        commentLines++;
        isCommentLine = true;
        if (trimmed.includes(blockEnd)) {
          inBlockComment = false;
        }
      } else if (trimmed.startsWith(blockStart)) {
        commentLines++;
        isCommentLine = true;
        if (!trimmed.includes(blockEnd)) {
          inBlockComment = true;
        }
      }
    }

    if (!isCommentLine && lang.commentLine && trimmed.startsWith(lang.commentLine)) {
      commentLines++;
      isCommentLine = true;
    }

    if (!isCommentLine) {
      codeLineCount++;

      const isCurlyBrace = CURLY_BRACE_LANGS.has(lang.id);

      if (isCurlyBrace) {
        for (const ch of rawLine) {
          if (ch === '{') {
            nestingDepth++;
            if (nestingDepth > maxNestingDepth) maxNestingDepth = nestingDepth;
          } else if (ch === '}') {
            nestingDepth--;
          }
        }
      } else if (lang.id === 'python') {
        const leadingSpaces = rawLine.length - rawLine.trimStart().length;
        const depth = Math.floor(leadingSpaces / 4);
        if (depth > maxNestingDepth) maxNestingDepth = depth;
      }

      branchCount += countBranches(trimmed);
      functionCount += countFunctions(trimmed, lang.id);
    }
  }

  const lineCount = totalLines;
  const commentDensity = totalLines > 0 ? commentLines / totalLines : 0;
  const avgLineLength = nonBlankLines > 0 ? totalLineLength / nonBlankLines : 0;

  const tokens = code.split(/\s+/).filter((t) => t.length > 0);
  const punctCount = (code.match(/[{}()\[\];,.+\-*/=<>!&|?:]/g) ?? []).length;
  const tokenCount = tokens.length + punctCount;

  return {
    lineCount,
    tokenCount,
    nestingDepth: maxNestingDepth,
    functionCount,
    branchCount,
    commentDensity,
    commentLines,
    blankLines,
    avgLineLength,
  };
}

function countBranches(line: string): number {
  let count = 0;
  count += (line.match(/\bif\s*\(/g) ?? []).length;
  count += (line.match(/\belse\s+if\s*\(/g) ?? []).length;
  count += (line.match(/\bswitch\s*\(/g) ?? []).length;
  count += (line.match(/\bcase\s+/g) ?? []).length;
  count += (line.match(/\bfor\s*\(/g) ?? []).length;
  count += (line.match(/\bfor\s+\w+\s+in\s+/g) ?? []).length;
  count += (line.match(/\bfor\s+\w+\s+of\s+/g) ?? []).length;
  count += (line.match(/\bwhile\s*\(/g) ?? []).length;
  count += (line.match(/\?[^:]*:/g) ?? []).length;
  count += (line.match(/&&/g) ?? []).length;
  count += (line.match(/\|\|/g) ?? []).length;
  return count;
}

function countFunctions(line: string, langId: string): number {
  if (langId === 'python') {
    return (line.match(/^\s*def\s+\w+/) ?? []).length;
  }
  let count = 0;
  count += (line.match(/\bfunction\s+\w+/) ?? []).length;
  count += (line.match(/\bfunc\s+\w+/) ?? []).length;
  count += (line.match(/\bfn\s+\w+/) ?? []).length;
  count += (line.match(/\bfun\s+\w+/) ?? []).length;
  count += (line.match(/\w+\s*\([^)]*\)\s*\{/) ?? []).length;
  count += (line.match(/\bdef\s+\w+/) ?? []).length;
  return Math.min(count, 1);
}
