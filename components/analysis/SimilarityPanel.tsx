'use client';

import { Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SimilarityScores } from '@/lib/types/analysis';

interface SimilarityPanelProps {
  similarity: SimilarityScores;
}

type BarKey = 'text' | 'ast' | 'structural' | 'semantic';

const BARS: { key: BarKey; label: string; stagger: string }[] = [
  { key: 'text', label: 'Text', stagger: 'animate-stagger-1' },
  { key: 'ast', label: 'AST', stagger: 'animate-stagger-2' },
  { key: 'structural', label: 'Structural', stagger: 'animate-stagger-3' },
  { key: 'semantic', label: 'Semantic', stagger: 'animate-stagger-4' },
];

function verdictChipClass(pct: number): string {
  if (pct >= 90) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
  if (pct >= 70) return 'border-accent-500/30 bg-accent-500/10 text-accent-400';
  if (pct >= 50) return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
  return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
}

function verdictLabel(pct: number): string {
  if (pct >= 95) return 'Near identical';
  if (pct >= 85) return 'Very similar';
  if (pct >= 70) return 'Similar';
  if (pct >= 50) return 'Moderate';
  if (pct >= 30) return 'Different';
  return 'Very different';
}

export default function SimilarityPanel({ similarity }: SimilarityPanelProps) {
  const semPct = Math.round(similarity.semantic * 100);
  const syntacticDiff =
    Math.abs(Math.round((similarity.text + similarity.ast + similarity.structural) / 3 * 100) - semPct) > 15;

  return (
    <div className="card p-5 space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-accent-400" />
          <h3 className="section-title">Code Similarity Scores</h3>
        </div>
        <span className={cn('badge', verdictChipClass(semPct))}>
          {similarity.verdict || verdictLabel(semPct)}
        </span>
      </div>

      <div className="space-y-4">
        {BARS.map(({ key, label, stagger }) => {
          const raw = similarity[key];
          const pct = Math.round(raw * 100);
          return (
            <div key={key} className={cn('space-y-2', stagger)}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-200">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="badge border-ink-600/50 bg-ink-800/50 text-ink-200 tabular-nums">
                    {pct}%
                  </span>
                  <span className={cn('badge', verdictChipClass(pct))}>
                    {verdictLabel(pct)}
                  </span>
                </div>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={
                    {
                      ['--progress-width' as string]: `${pct}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          'rounded-xl border p-4 animate-stagger-5',
          syntacticDiff
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-ink-700/60 bg-ink-900/40'
        )}
      >
        <div className="flex items-start gap-3">
          {syntacticDiff ? (
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
          )}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-ink-100">
              {syntacticDiff
                ? 'High semantic similarity detected despite significant syntactic differences.'
                : 'Similarity assessment across all dimensions appears consistent.'}
            </h4>
            {similarity.evidence && similarity.evidence.length > 0 ? (
              <ul className="space-y-1.5">
                {similarity.evidence.map((ev, i) => (
                  <li
                    key={i}
                    className={cn(
                      'text-sm text-ink-300 flex items-start gap-2',
                      `animate-stagger-${Math.min(i + 1, 5)}`
                    )}
                    style={{ animationDelay: `${50 + i * 40}ms` }}
                  >
                    <span className="text-ink-500 mt-0.5 shrink-0">•</span>
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-400">
                {syntacticDiff
                  ? 'The solutions share logical intent and behavior while using different syntax, variable names, or control-flow patterns — a strong signal of equivalent approaches rather than mechanical translation.'
                  : 'No detailed evidence was generated for this analysis.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
