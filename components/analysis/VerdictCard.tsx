'use client';

import { CheckCircle2, Sparkles, Cpu, Shield, Play, Lightbulb, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerdictCardProps {
  winner: 'A' | 'B' | 'TIE';
  winnerScore: number;
  semantic?: number;
  tests?: { passed: number; total: number } | null;
  secA: number;
  secB: number;
  predictedA: string;
  predictedB: string;
  observed?: string | null;
  onWhy: () => void;
  onOptimize: () => void;
  onRunTests: () => void;
}

export default function VerdictCard({
  winner,
  winnerScore,
  semantic,
  tests,
  secA,
  secB,
  predictedA,
  predictedB,
  observed,
  onWhy,
  onOptimize,
  onRunTests,
}: VerdictCardProps) {
  const isClearWin = winner !== 'TIE' && winnerScore >= 7;

  return (
    <div
      className={cn(
        'card relative overflow-hidden p-6 animate-fade-in-up',
        isClearWin && 'ring-2 ring-offset-2 ring-offset-ink-950',
        winner === 'A' && isClearWin && 'ring-emerald-500/40 shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]',
        winner === 'B' && isClearWin && 'ring-accent-500/40 shadow-[0_0_40px_-12px_rgba(48,147,255,0.35)]',
        winner === 'TIE' && isClearWin && 'ring-amber-500/40'
      )}
      style={{ animation: 'fadeInScale 450ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-accent-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
              White Code Verdict
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'inline-flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black',
                winner === 'A' && 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
                winner === 'B' && 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30',
                winner === 'TIE' && 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
              )}
            >
              {winner}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {winner === 'TIE' ? 'It\'s a Tie' : `Solution ${winner} Wins`}
              </div>
              <div className="text-sm text-ink-400 mt-0.5">
                Confidence score: <span className="text-ink-200 font-mono">{winnerScore.toFixed(1)}</span>/10
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onWhy} className="btn-secondary">
            <Lightbulb className="h-4 w-4" />
            Why?
          </button>
          <button onClick={onOptimize} className="btn-secondary">
            <Gauge className="h-4 w-4" />
            Optimize
          </button>
          <button onClick={onRunTests} className="btn-primary">
            <Play className="h-4 w-4" />
            Run Tests
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Cpu className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-medium text-ink-400">Semantic Equiv.</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-ink-100">
              {semantic != null ? `${(semantic * 100).toFixed(0)}%` : '—'}
            </span>
            {semantic != null && semantic >= 0.95 && (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-ink-400">Test Suite</span>
          </div>
          <div className="text-xl font-bold text-ink-100">
            {tests ? `${tests.passed}/${tests.total}` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-xs font-medium text-ink-400">Security A / B</span>
          </div>
          <div className="text-xl font-bold font-mono text-ink-100">
            <span className={cn(secA >= 8 ? 'text-emerald-400' : secA >= 5 ? 'text-amber-400' : 'text-rose-400')}>
              {secA.toFixed(1)}
            </span>
            <span className="text-ink-500 mx-1">/</span>
            <span className={cn(secB >= 8 ? 'text-emerald-400' : secB >= 5 ? 'text-amber-400' : 'text-rose-400')}>
              {secB.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-ink-700/60 bg-ink-900/50 p-4 md:min-w-[180px]">
          <div className="text-xs font-medium text-ink-400 mb-1.5">Complexity Predicted</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="text-emerald-400">A: {predictedA}</div>
            <div className="text-accent-400">B: {predictedB}</div>
          </div>
          {observed && (
            <div className="mt-2 pt-2 border-t border-ink-700/50">
              <div className="text-xs text-ink-500">Observed</div>
              <div className="text-xs font-mono text-ink-200">{observed}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
