'use client';

import {
  Gauge,
  HardDrive,
  BookOpen,
  Wrench,
  Shield,
  CheckCircle2,
  ArrowUpRight,
  Trophy,
  Info,
  Lightbulb,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinalScores } from '@/lib/types/analysis';

interface FinalScoresTableProps {
  scores: FinalScores;
  onWhyClick?: () => void;
  recommendation?: string;
  tradeoff?: string;
}

type DimKey =
  | 'performance'
  | 'memory'
  | 'readability'
  | 'maintainability'
  | 'security'
  | 'correctness'
  | 'scalability';

const DIMS: {
  key: DimKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'performance', label: 'Performance', Icon: Gauge },
  { key: 'memory', label: 'Memory', Icon: HardDrive },
  { key: 'readability', label: 'Readability', Icon: BookOpen },
  { key: 'maintainability', label: 'Maintainability', Icon: Wrench },
  { key: 'security', label: 'Security', Icon: Shield },
  { key: 'correctness', label: 'Correctness', Icon: CheckCircle2 },
  { key: 'scalability', label: 'Scalability', Icon: ArrowUpRight },
];

function ScoreBar({ value, color }: { value: number; color: 'emerald' | 'accent' }) {
  const pct = Math.max(0, Math.min(100, value * 10));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-ink-800 w-20 md:w-28 shrink-0">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-700 ease-out',
          color === 'emerald'
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
            : 'bg-gradient-to-r from-accent-500 to-accent-400'
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function winnerOf(a: number, b: number): 'A' | 'B' | 'TIE' {
  if (a > b + 0.05) return 'A';
  if (b > a + 0.05) return 'B';
  return 'TIE';
}

function WinnerBadge({ winner }: { winner: 'A' | 'B' | 'TIE' }) {
  if (winner === 'A') {
    return (
      <span className="badge border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold">
        <Trophy className="h-3 w-3" /> A
      </span>
    );
  }
  if (winner === 'B') {
    return (
      <span className="badge border-accent-500/40 bg-accent-500/10 text-accent-300 font-bold">
        <Trophy className="h-3 w-3" /> B
      </span>
    );
  }
  return (
    <span className="badge border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold">
      TIE
    </span>
  );
}

export default function FinalScoresTable({
  scores,
  onWhyClick,
  recommendation,
  tradeoff,
}: FinalScoresTableProps) {
  const dimKeys = DIMS.map((d) => d.key);
  let sumA = 0;
  let sumB = 0;
  for (const k of dimKeys) {
    sumA += scores[k].a;
    sumB += scores[k].b;
  }
  const overallA = sumA / dimKeys.length;
  const overallB = sumB / dimKeys.length;
  const overallWinner = winnerOf(overallA, overallB);

  return (
    <div className="card p-5 space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent-400" />
          <h3 className="section-title">Final Dimension Scores</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-ink-300">A</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-500" />
            <span className="text-ink-300">B</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-700/60">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-ink-900/80 border-b border-ink-700/60">
              <th className="text-left font-medium text-ink-400 px-4 py-3 w-[180px]">
                Dimension
              </th>
              <th className="text-left font-medium text-ink-400 px-3 py-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> A
                </span>
              </th>
              <th className="text-left font-medium text-ink-400 px-3 py-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent-500" /> B
                </span>
              </th>
              <th className="text-center font-medium text-ink-400 px-4 py-3 w-[110px]">
                Winner
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700/50">
            {DIMS.map(({ key, label, Icon }, i) => {
              const a = scores[key].a;
              const b = scores[key].b;
              const w = winnerOf(a, b);
              return (
                <tr
                  key={key}
                  className="hover:bg-ink-900/40 animate-stagger-1"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-ink-400" />
                      <span className="font-medium text-ink-200">{label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-mono font-bold tabular-nums w-10 text-right',
                          w === 'A' ? 'text-emerald-400' : 'text-ink-200'
                        )}
                      >
                        {a.toFixed(1)}
                      </span>
                      <ScoreBar value={a} color="emerald" />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-mono font-bold tabular-nums w-10 text-right',
                          w === 'B' ? 'text-accent-400' : 'text-ink-200'
                        )}
                      >
                        {b.toFixed(1)}
                      </span>
                      <ScoreBar value={b} color="accent" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <WinnerBadge winner={w} />
                  </td>
                </tr>
              );
            })}

            <tr className="bg-ink-900/70 border-t-2 border-ink-700/70">
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="font-bold text-ink-100">OVERALL</span>
                </div>
              </td>
              <td className="px-3 py-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-mono font-bold tabular-nums w-10 text-right text-lg',
                      overallWinner === 'A'
                        ? 'text-emerald-400 animate-score-pop'
                        : 'text-ink-100'
                    )}
                  >
                    {overallA.toFixed(1)}
                  </span>
                  <ScoreBar value={overallA} color="emerald" />
                </div>
              </td>
              <td className="px-3 py-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-mono font-bold tabular-nums w-10 text-right text-lg',
                      overallWinner === 'B'
                        ? 'text-accent-400 animate-score-pop'
                        : 'text-ink-100'
                    )}
                  >
                    {overallB.toFixed(1)}
                  </span>
                  <ScoreBar value={overallB} color="accent" />
                </div>
              </td>
              <td className="px-4 py-3.5 text-center">
                <WinnerBadge winner={overallWinner} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 animate-stagger-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-emerald-300">Recommendation</h4>
          </div>
          <p className="text-sm text-ink-300 leading-relaxed">
            {recommendation ||
              (overallWinner === 'TIE'
                ? 'Both solutions score comparably across the analyzed dimensions — choose based on team familiarity, ecosystem fit, or secondary requirements.'
                : overallWinner === 'A'
                ? 'Solution A edges ahead overall, particularly in performance-critical and scalability dimensions. Prefer A for latency-sensitive production workloads.'
                : 'Solution B edges ahead overall, particularly in readability, maintainability, and safety. Prefer B for long-lived codebases and team collaboration.')}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 animate-stagger-2">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-amber-300">Trade-offs</h4>
          </div>
          <p className="text-sm text-ink-300 leading-relaxed">
            {tradeoff ||
              (overallWinner === 'TIE'
                ? 'A and B are closely matched; validate through real benchmarks and edge-case test suites for your specific workload before committing.'
                : overallWinner === 'A'
                ? 'Solution B may offer better readability or security properties in some modules. Consider pairing A with defensive coding standards and documentation to close the maintainability gap.'
                : 'Solution A may still win on raw performance or memory for specific inputs. Profile on representative production data and apply targeted optimizations for hot paths if needed.')}
          </p>
        </div>
      </div>

      {onWhyClick && (
        <div className="flex justify-center animate-stagger-3">
          <button onClick={onWhyClick} className="btn-secondary">
            <Lightbulb className="h-4 w-4" />
            Why does WhiteCode say this?
          </button>
        </div>
      )}
    </div>
  );
}
