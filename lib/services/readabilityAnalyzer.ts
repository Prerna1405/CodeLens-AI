import type { ReadabilityScore } from '@/lib/types/analysis';
import { clamp } from '@/lib/utils';
import * as syntaxAnalyzer from './syntaxAnalyzer';

type Syntax = ReturnType<typeof syntaxAnalyzer.analyze>;

export function analyze(
  syntax: Syntax,
  _code: string,
  _language: string,
): ReadabilityScore {
  const reasons: string[] = [];
  let lineCountPts = 0;
  let commentPts = 0;
  let lineLenPts = 0;
  let nestingPts = 0;
  let funcPts = 0;

  if (syntax.lineCount <= 30) {
    lineCountPts = 3;
    reasons.push(`Good: concise at ${syntax.lineCount} lines.`);
  } else if (syntax.lineCount <= 60) {
    lineCountPts = 2;
    reasons.push(`Moderate length: ${syntax.lineCount} lines.`);
  } else {
    lineCountPts = 1;
    reasons.push(`Long file: ${syntax.lineCount} lines (consider breaking into smaller functions).`);
  }

  const densityPct = syntax.commentDensity * 100;
  if (syntax.commentDensity >= 0.1) {
    commentPts = 2;
    reasons.push(`Good: comment density ${densityPct.toFixed(0)}%.`);
  } else if (syntax.commentDensity >= 0.03) {
    commentPts = 1;
    reasons.push(`Low comment density (${densityPct.toFixed(0)}%).`);
  } else {
    commentPts = 0;
    if (syntax.lineCount > 10) {
      reasons.push(`Very low comment density (${densityPct.toFixed(0)}%).`);
    }
  }

  if (syntax.avgLineLength <= 80) {
    lineLenPts = 2;
    reasons.push(`Good: avg line length ${syntax.avgLineLength.toFixed(0)} chars.`);
  } else if (syntax.avgLineLength <= 120) {
    lineLenPts = 1;
    reasons.push(`Moderate line length: ${syntax.avgLineLength.toFixed(0)} chars.`);
  } else {
    lineLenPts = 0;
    reasons.push(`Long lines detected: avg ${syntax.avgLineLength.toFixed(0)} chars.`);
  }

  if (syntax.nestingDepth <= 3) {
    nestingPts = 2;
    reasons.push(`Good: shallow nesting (${syntax.nestingDepth} levels).`);
  } else if (syntax.nestingDepth <= 5) {
    nestingPts = 1;
    reasons.push(`Moderate nesting depth (${syntax.nestingDepth} levels).`);
  } else {
    nestingPts = 0;
    reasons.push(`High nesting depth (${syntax.nestingDepth} levels — consider extracting helpers).`);
  }

  if (syntax.functionCount >= 1) {
    funcPts = 1;
    reasons.push(`Good: ${syntax.functionCount} function(s) defined; modular.`);
  } else {
    reasons.push('No functions identified — all logic inlined.');
  }

  const total = lineCountPts + commentPts + lineLenPts + nestingPts + funcPts;
  const score = clamp(total, 0, 10);

  return { score, reasons };
}
