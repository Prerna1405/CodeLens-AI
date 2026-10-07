'use client';

import { useState } from 'react';
import { Layers, Trophy, Plus, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalysisReport, FinalScores } from '@/lib/types/analysis';
import * as syntaxAnalyzer from '@/lib/services/syntaxAnalyzer';
import * as algorithmAnalyzer from '@/lib/services/algorithmAnalyzer';
import * as complexityAnalyzer from '@/lib/services/complexityAnalyzer';
import * as readabilityAnalyzer from '@/lib/services/readabilityAnalyzer';
import * as qualityAnalyzer from '@/lib/services/qualityAnalyzer';
import * as securityAnalyzer from '@/lib/services/securityAnalyzer';

interface MultiSolutionProps {
  report: AnalysisReport;
  langA: string;
  langB: string;
}

interface SolutionScores {
  name: string;
  label: string;
  performance: number;
  memory: number;
  security: number;
  readability: number;
  maintainability: number;
  overall: number;
}

export default function MultiSolutionComparison({ report, langA, langB }: MultiSolutionProps) {
  const [codeC, setCodeC] = useState<string>('');
  const [langC, setLangC] = useState<string>(langA);
  const [codeD, setCodeD] = useState<string>('');
  const [langD, setLangD] = useState<string>(langB);

  const [expanded, setExpanded] = useState<boolean>(false);

  // Solution A & B from report finalScores
  const scoreA: SolutionScores = {
    name: 'A',
    label: 'Solution A',
    performance: report.finalScores.performance.a,
    memory: report.finalScores.memory.a,
    security: report.finalScores.security.a,
    readability: report.finalScores.readability.a,
    maintainability: report.finalScores.maintainability.a,
    overall: report.weightedOverallScores.a,
  };

  const scoreB: SolutionScores = {
    name: 'B',
    label: 'Solution B',
    performance: report.finalScores.performance.b,
    memory: report.finalScores.memory.b,
    security: report.finalScores.security.b,
    readability: report.finalScores.readability.b,
    maintainability: report.finalScores.maintainability.b,
    overall: report.weightedOverallScores.b,
  };

  const computeExtraScores = (code: string, lang: string, name: string): SolutionScores | null => {
    if (!code.trim()) return null;
    const syn = syntaxAnalyzer.analyze(code, lang);
    const algo = algorithmAnalyzer.analyze(code, lang);
    const comp = complexityAnalyzer.analyze(code, lang, algo.patterns, syn);
    const read = readabilityAnalyzer.analyze(syn, code, lang);
    const qual = qualityAnalyzer.analyze(code, lang);
    const sec = securityAnalyzer.analyze(code, lang);

    const perfScore = comp.time.worst.includes('O(1)') ? 10 : comp.time.worst.includes('O(log n)') ? 9 : comp.time.worst.includes('O(n)') ? 8 : comp.time.worst.includes('O(n log n)') ? 6.5 : 4.5;
    const memScore = comp.space.auxiliary.includes('O(1)') ? 9.5 : comp.space.auxiliary.includes('O(n)') ? 7 : 5;
    const secScore = Math.max(1, 10 - sec.length * 2.5);
    const readScore = read.score;
    const maintScore = Math.min(10, readScore + (qual.duplication.length === 0 ? 1.5 : 0));
    const overall = Number(((perfScore * 0.35 + memScore * 0.25 + secScore * 0.15 + readScore * 0.15 + maintScore * 0.1)).toFixed(1));

    return {
      name,
      label: `Solution ${name}`,
      performance: Number(perfScore.toFixed(1)),
      memory: Number(memScore.toFixed(1)),
      security: Number(secScore.toFixed(1)),
      readability: Number(readScore.toFixed(1)),
      maintainability: Number(maintScore.toFixed(1)),
      overall,
    };
  };

  const scoreC = computeExtraScores(codeC, langC, 'C');
  const scoreD = computeExtraScores(codeD, langD, 'D');

  const allSolutions: SolutionScores[] = [scoreA, scoreB];
  if (scoreC) allSolutions.push(scoreC);
  if (scoreD) allSolutions.push(scoreD);

  const winner = allSolutions.reduce((prev, current) => (current.overall > prev.overall ? current : prev), allSolutions[0]!);

  return (
    <div className="card p-5 space-y-4 animate-fade-in-up border border-ink-700/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-400" />
          <h3 className="section-title">Multi-Solution Comparison (A vs B vs C vs D)</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-secondary text-xs"
        >
          {expanded ? 'Collapse Matrix' : '+ Add Solution C / D'}
        </button>
      </div>

      {expanded && (
        <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-ink-700/40">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-300">Solution C Code</span>
              <select
                value={langC}
                onChange={(e) => setLangC(e.target.value)}
                className="bg-ink-800 border border-ink-700 rounded px-2 py-0.5 text-xs text-ink-200"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
            <textarea
              value={codeC}
              onChange={(e) => setCodeC(e.target.value)}
              placeholder="Paste Solution C code..."
              rows={4}
              className="w-full rounded-lg bg-ink-950 border border-ink-800 p-3 text-xs font-mono text-ink-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-300">Solution D Code</span>
              <select
                value={langD}
                onChange={(e) => setLangD(e.target.value)}
                className="bg-ink-800 border border-ink-700 rounded px-2 py-0.5 text-xs text-ink-200"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
            <textarea
              value={codeD}
              onChange={(e) => setCodeD(e.target.value)}
              placeholder="Paste Solution D code..."
              rows={4}
              className="w-full rounded-lg bg-ink-950 border border-ink-800 p-3 text-xs font-mono text-ink-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-ink-700/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-900/80 border-b border-ink-700/60 text-left">
              <th className="px-4 py-3 text-ink-400 font-medium">Dimension</th>
              {allSolutions.map((s) => (
                <th key={s.name} className="px-4 py-3 text-ink-200 font-bold text-center">
                  Solution {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700/50">
            <tr>
              <td className="px-4 py-2.5 font-medium text-ink-300">Performance</td>
              {allSolutions.map((s) => (
                <td key={s.name} className="px-4 py-2.5 text-center font-mono font-bold text-ink-100">
                  {s.performance.toFixed(1)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-2.5 font-medium text-ink-300">Memory</td>
              {allSolutions.map((s) => (
                <td key={s.name} className="px-4 py-2.5 text-center font-mono font-bold text-ink-100">
                  {s.memory.toFixed(1)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-2.5 font-medium text-ink-300">Security</td>
              {allSolutions.map((s) => (
                <td key={s.name} className="px-4 py-2.5 text-center font-mono font-bold text-ink-100">
                  {s.security.toFixed(1)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-2.5 font-medium text-ink-300">Readability</td>
              {allSolutions.map((s) => (
                <td key={s.name} className="px-4 py-2.5 text-center font-mono font-bold text-ink-100">
                  {s.readability.toFixed(1)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-2.5 font-medium text-ink-300">Maintainability</td>
              {allSolutions.map((s) => (
                <td key={s.name} className="px-4 py-2.5 text-center font-mono font-bold text-ink-100">
                  {s.maintainability.toFixed(1)}
                </td>
              ))}
            </tr>
            <tr className="bg-ink-900/60 font-bold border-t-2 border-ink-700/60">
              <td className="px-4 py-3 text-ink-100 flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-400" />
                OVERALL
              </td>
              {allSolutions.map((s) => (
                <td
                  key={s.name}
                  className={cn(
                    'px-4 py-3 text-center font-mono text-base tabular-nums',
                    s.name === winner.name ? 'text-emerald-400 font-extrabold' : 'text-ink-200'
                  )}
                >
                  {s.overall.toFixed(1)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-200">
            Strongest Solution: <strong className="text-white">Solution {winner.name}</strong> ({winner.overall.toFixed(1)}/10)
          </span>
        </div>
        <span className="badge border-emerald-500/40 bg-emerald-500/20 text-emerald-300 text-[10px]">
          Winner Identified
        </span>
      </div>
    </div>
  );
}
