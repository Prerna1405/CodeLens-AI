'use client';

import { Sparkles, Cpu, CheckCircle2, Shield, Timer, Lightbulb, Gauge, FlaskConical, Play, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalysisReport } from '@/lib/types/analysis';

interface VerdictSummaryCardProps {
  report: AnalysisReport;
  onWhyClick: () => void;
  onRunBenchmark?: () => void;
  onRunTests?: () => void;
  onOptimizeA?: () => void;
  onOptimizeB?: () => void;
  benchmarkLoading?: boolean;
  testsLoading?: boolean;
  cached?: boolean;
}

export default function VerdictSummaryCard({
  report,
  onWhyClick,
  onRunBenchmark,
  onRunTests,
  onOptimizeA,
  onOptimizeB,
  benchmarkLoading,
  testsLoading,
  cached,
}: VerdictSummaryCardProps) {
  const winner = report.recommendation.overall;
  const winnerScore =
    winner === 'A'
      ? report.weightedOverallScores.a
      : winner === 'B'
      ? report.weightedOverallScores.b
      : (report.weightedOverallScores.a + report.weightedOverallScores.b) / 2;

  const semanticPct = report.similarity?.semantic != null ? Math.round(report.similarity.semantic * 100) : null;

  const tests = report.generatedTests ?? [];
  const passedCount = tests.filter((t) => t.resultA === 'pass' && t.resultB === 'pass').length;
  const testsLabel = tests.length > 0 ? `${passedCount}/${tests.length}` : 'N/A';

  const secTotal = (report.solutionA.security?.length ?? 0) + (report.solutionB.security?.length ?? 0);

  const winnerSolution = winner === 'A' ? report.solutionA : winner === 'B' ? report.solutionB : report.solutionA;
  const predictedWorst = winnerSolution?.time?.worst ?? '—';

  let observedRuntime: string | null = null;
  if (report.benchmark?.codeA?.timings?.length && report.benchmark?.codeB?.timings?.length) {
    const ta = report.benchmark.codeA.timings;
    const tb = report.benchmark.codeB.timings;
    if (ta.length && tb.length) {
      const medA = ta[Math.floor(ta.length / 2)]!.medianMs;
      const medB = tb[Math.floor(tb.length / 2)]!.medianMs;
      observedRuntime = `${medA.toFixed(1)}ms vs ${medB.toFixed(1)}ms`;
    }
  } else if (report.benchmark?.codeA?.timings?.length) {
    const ta = report.benchmark.codeA.timings;
    const medA = ta[Math.floor(ta.length / 2)]!.medianMs;
    observedRuntime = `A: ${medA.toFixed(1)}ms`;
  } else if (report.benchmark?.codeB?.timings?.length) {
    const tb = report.benchmark.codeB.timings;
    const medB = tb[Math.floor(tb.length / 2)]!.medianMs;
    observedRuntime = `B: ${medB.toFixed(1)}ms`;
  }

  const winnerBadgeColor =
    winner === 'A'
      ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
      : winner === 'B'
      ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
      : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30';

  const winnerRingColor =
    winner === 'A'
      ? 'ring-emerald-500/40 shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]'
      : winner === 'B'
      ? 'ring-accent-500/40 shadow-[0_0_40px_-12px_rgba(48,147,255,0.35)]'
      : 'ring-amber-500/40';

  return (
    <div
      className={cn(
        'card-bordered relative p-6 animate-scale-in',
        winner !== 'TIE' && winnerScore >= 7 && 'ring-2 ring-offset-2 ring-offset-ink-950',
        winner !== 'TIE' && winnerScore >= 7 && winnerRingColor
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-1">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Sparkles className="h-4 w-4 text-accent-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              WHITE CODE VERDICT
            </span>
            {cached && (
              <span className="badge border-violet-500/30 bg-violet-500/10 text-violet-300 ml-1">
                <Database className="h-3 w-3" />
                Cached
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'inline-flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black',
                winnerBadgeColor
              )}
            >
              {winner === 'TIE' ? '=' : winner}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {winner === 'TIE' ? "It's a Tie" : `Solution ${winner} WINS`}
              </div>
              <div className="text-sm text-ink-400 mt-0.5">
                Weighted score:{' '}
                <span className="text-ink-200 font-mono tabular-nums">
                  {winner === 'TIE'
                    ? `${report.weightedOverallScores.a.toFixed(1)} / ${report.weightedOverallScores.b.toFixed(1)}`
                    : `${winnerScore.toFixed(1)}`}
                </span>
                <span className="text-ink-500"> / 10</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onWhyClick} className="btn-secondary">
            <Lightbulb className="h-4 w-4" />
            Why {winner === 'TIE' ? 'tie?' : `${winner} wins?`}
          </button>
          <button
            onClick={onRunBenchmark}
            disabled={benchmarkLoading}
            className="btn-secondary"
          >
            <Timer className={cn('h-4 w-4', benchmarkLoading && 'animate-spin-slow')} />
            {benchmarkLoading ? 'Benchmarking...' : 'Run & Benchmark'}
          </button>
          <button onClick={onRunTests} disabled={testsLoading} className="btn-primary">
            <FlaskConical className={cn('h-4 w-4', testsLoading && 'animate-spin-slow')} />
            {testsLoading ? 'Generating...' : 'Generate Tests'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4 animate-stagger-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Cpu className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-medium text-ink-400">Semantic Equivalence</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-ink-100 tabular-nums">
              {semanticPct != null ? `${semanticPct}%` : '—'}
            </span>
            {semanticPct != null && semanticPct >= 95 && (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4 animate-stagger-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-ink-400">Tests Passed</span>
          </div>
          <div className="text-xl font-bold text-ink-100 tabular-nums">{testsLabel}</div>
        </div>

        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4 animate-stagger-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-xs font-medium text-ink-400">Security Issues</span>
          </div>
          <div
            className={cn(
              'text-xl font-bold tabular-nums',
              secTotal === 0 ? 'text-emerald-400' : secTotal <= 2 ? 'text-amber-400' : 'text-rose-400'
            )}
          >
            {secTotal}
          </div>
        </div>

        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4 animate-stagger-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Gauge className="h-3.5 w-3.5 text-accent-400" />
            <span className="text-xs font-medium text-ink-400">Predicted Complexity</span>
          </div>
          <div className="text-sm font-mono font-bold text-ink-100">{predictedWorst}</div>
        </div>

        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4 animate-stagger-5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Play className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-ink-400">Observed Runtime</span>
          </div>
          <div className="text-sm font-mono font-bold text-ink-100 tabular-nums">
            {observedRuntime ?? 'N/A'}
          </div>
        </div>
      </div>

      {(onOptimizeA || onOptimizeB) && (
        <div className="mt-5 pt-5 border-t border-ink-700/50 flex flex-wrap gap-2">
          {onOptimizeA && (
            <button onClick={onOptimizeA} className="btn-secondary text-xs">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Optimize Solution A
            </button>
          )}
          {onOptimizeB && (
            <button onClick={onOptimizeB} className="btn-secondary text-xs">
              <Sparkles className="h-3.5 w-3.5 text-accent-400" />
              Optimize Solution B
            </button>
          )}
        </div>
      )}
    </div>
  );
}
