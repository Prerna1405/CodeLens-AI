export function analyze(code: string, _language: string): {
  deadCode: string[];
  duplication: string[];
  errorHandling: string[];
} {
  const deadCode = detectDeadCode(code);
  const duplication = detectDuplication(code);
  const errorHandling = detectErrorHandling(code);
  return { deadCode, duplication, errorHandling };
}

function detectDeadCode(code: string): string[] {
  const deadCode: string[] = [];
  const lines = code.split('\n').map((l) => l.replace(/\r$/, ''));

  if (/if\s*\(\s*false\s*\)/.test(code) || /if\s+not\s+True/.test(code)) {
    deadCode.push('Dead code: `if (false)` / always-false conditional branch.');
  }
  if (/while\s*\(\s*false\s*\)/.test(code)) {
    deadCode.push('Dead code: `while (false)` loop never executes.');
  }

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i]!.trim();
    const nextLine = lines[i + 1]!.trim();
    if (!nextLine) continue;
    const isUnreachableKeyword =
      /^\s*return\s*[;(\[]/.test(lines[i]!) ||
      /^\s*throw\s+/.test(lines[i]!) ||
      /^\s*break\s*;/.test(lines[i]!) ||
      /^\s*continue\s*;/.test(lines[i]!) ||
      /^\s*return\s+\w+/.test(line) ||
      /^raise\s+/.test(line);
    const isNextBraceOnly = /^[}\])\s,;]*$/.test(nextLine);
    const isNextComment = /^\s*(\/\/|#|\/\*|\*\/)/.test(nextLine);
    if (isUnreachableKeyword && !isNextBraceOnly && !isNextComment) {
      const loc = `approx line ${i + 1}`;
      const exists = deadCode.some((d) => d.includes(loc));
      if (!exists) {
        deadCode.push(`Possibly unreachable code after statement at ${loc} (${line.substring(0, 60)}).`);
      }
      if (deadCode.length >= 3) break;
    }
  }

  return deadCode.slice(0, 5);
}

function normalizeLine(line: string): string {
  return line.trim().replace(/\s+/g, ' ');
}

function detectDuplication(code: string): string[] {
  const lines = code.split('\n').map((l) => normalizeLine(l.replace(/\r$/, '')));
  const WINDOW = 6;
  const dup: string[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i + WINDOW <= lines.length; i++) {
    const window = lines.slice(i, i + WINDOW).join('\n');
    const prev = seen.get(window);
    if (prev !== undefined && i - prev >= WINDOW) {
      dup.push(
        `6-line duplicate block detected (approx lines ${prev + 1}-${prev + WINDOW} and ${i + 1}-${i + WINDOW}).`,
      );
      if (dup.length >= 3) break;
      seen.delete(window);
    } else if (prev === undefined) {
      seen.set(window, i);
    }
  }

  return dup;
}

function detectErrorHandling(code: string): string[] {
  const found: string[] = [];
  const lower = code.toLowerCase();

  if (/try\s*\{/.test(code) || /try\s*:/.test(code)) {
    found.push('try/catch or try/except block present.');
  }
  if (/throw\s+new\s+/.test(code) || /raise\s+\w+/.test(code)) {
    found.push('Explicit exception thrown.');
  }
  if (/Result\s*<\s*.*\s*>/.test(code) || /Option\s*<\s*.*\s*>/.test(code)) {
    found.push('Result<T>/Option<T> style error/nullable types used.');
  }
  if (/if\s*\(\s*(err|error)\s*(!=\s*null|!==\s*undefined|!= null)/.test(code)) {
    found.push('Null error check guard present.');
  }
  if (/if\s+\w+\s*==\s*nil\b|if\s+!\w+\s*\(|if\s+not\s+\w+/.test(code) || lower.includes('if err != nil')) {
    found.push('Guard clause pattern (nil/falsy check) detected.');
  }
  if (/\.(ok|isOk|isSome|isError|isErr)\s*\(/.test(code) || /\?\./.test(code)) {
    found.push('Optional/safe-navigation handling present.');
  }

  if (found.length === 0) {
    return ['No explicit error handling or guard clauses detected.'];
  }
  return found;
}
