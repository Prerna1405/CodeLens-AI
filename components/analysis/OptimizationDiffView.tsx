'use client';

import { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  GitCompare,
  Lightbulb,
  AlertTriangle,
  Gauge,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OptimizationResult } from '@/lib/types/analysis';

interface OptimizationDiffViewProps {
  solutionLabel: string;
  result: OptimizationResult | null;
  originalCode: string;
  lang: string;
  color: 'emerald' | 'accent';
}

const COLOR_MAP: Record<'emerald' | 'accent', { text: string; bgSoft: string; badge: string; ring: string }> = {
  emerald: {
    text: 'text-emerald-400',
    bgSoft: 'bg-emerald-500/10',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    ring: 'ring-emerald-500/30',
  },
  accent: {
    text: 'text-accent-400',
    bgSoft: 'bg-accent-500/10',
    badge: 'border-accent-500/40 bg-accent-500/10 text-accent-300',
    ring: 'ring-accent-500/30',
  },
};

type LineTag = 'same' | 'add' | 'remove';

function classifyLines(original: string, optimized: string): { left: { tag: LineTag; text: string }[]; right: { tag: LineTag; text: string }[] } {
  const origLines = original.split('\n');
  const optLines = optimized.split('\n');
  const max = Math.max(origLines.length, optLines.length);

  const left: { tag: LineTag; text: string }[] = [];
  const right: { tag: LineTag; text: string }[] = [];

  for (let i = 0; i < max; i++) {
    const o = origLines[i];
    const n = optLines[i];
    if (o === undefined) {
      left.push({ tag: 'same', text: '' });
      right.push({ tag: 'add', text: n ?? '' });
    } else if (n === undefined) {
      left.push({ tag: 'remove', text: o });
      right.push({ tag: 'same', text: '' });
    } else if (o === n) {
      left.push({ tag: 'same', text: o });
      right.push({ tag: 'same', text: n });
    } else {
      left.push({ tag: 'remove', text: o });
      right.push({ tag: 'add', text: n });
    }
  }
  return { left, right };
}

function CodeBlockWithLineNumbers({
  lines,
  side,
  placeholder,
}: {
  lines: { tag: LineTag; text: string }[];
  side: 'before' | 'after';
  placeholder?: string;
}) {
  return (
    <div className="flex h-full w-full">
      <div className="shrink-0 py-3 px-2 select-none bg-ink-950/70 border-r border-ink-700/60 text-right font-mono text-[11px] text-ink-500 w-10 tabular-nums">
        {lines.length === 0 && placeholder ? (
          <div className="pr-1 opacity-0">1</div>
        ) : (
          lines.map((_, i) => (
            <div key={i} className="pr-1 leading-6">
              {i + 1}
            </div>
          ))
        )}
      </div>
      <pre className="flex-1 overflow-x-auto p-3 font-mono text-xs leading-6 whitespace-pre">
        {lines.length === 0 && placeholder ? (
          <code className="text-ink-500 italic">{placeholder}</code>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                'px-2 -mx-2',
                line.tag === 'remove' && side === 'before' && 'bg-rose-500/10 text-rose-200',
                line.tag === 'add' && side === 'after' && 'bg-emerald-500/10 text-emerald-200',
                line.tag === 'same' && 'text-ink-200'
              )}
            >
              {side === 'before' && line.tag === 'remove' && (
                <span className="text-rose-400 font-bold mr-1 select-none">-</span>
              )}
              {side === 'after' && line.tag === 'add' && (
                <span className="text-emerald-400 font-bold mr-1 select-none">+</span>
              )}
              {side === 'before' && line.tag === 'same' && (
                <span className="text-ink-600 font-bold mr-1 select-none">&nbsp;</span>
              )}
              {side === 'after' && line.tag === 'same' && (
                <span className="text-ink-600 font-bold mr-1 select-none">&nbsp;</span>
              )}
              <code>{line.text || '\u00A0'}</code>
            </div>
          ))
        )}
      </pre>
    </div>
  );
}

export default function OptimizationDiffView({
  solutionLabel,
  result,
  originalCode,
  lang,
  color,
}: OptimizationDiffViewProps) {
  const [showDiff, setShowDiff] = useState(false);
  const c = COLOR_MAP[color];

  if (!result?.code) {
    return (
      <div className="card p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className={cn('h-4 w-4', c.text)} />
          <h3 className="section-title">
            Optimization — {solutionLabel}
          </h3>
          <span className={cn('badge', c.badge)}>{lang}</span>
        </div>
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-5 flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-ink-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-100 mb-0.5">
              No optimized code generated.
            </h4>
            <p className="text-sm text-ink-400">
              Click to try again — the optimizer re-runs with stricter rules and alternative
              approaches each time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { left, right } = classifyLines(originalCode || '', result.code || '');

  return (
    <div className="card p-5 space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className={cn('h-4 w-4', c.text)} />
          <h3 className="section-title">Optimization — {solutionLabel}</h3>
          <span className={cn('badge', c.badge)}>{lang}</span>
        </div>
        <div className="flex items-center gap-3 bg-ink-900/50 border border-ink-700/60 rounded-xl px-3 py-2 animate-stagger-1">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-ink-400" />
            <span className="text-xs font-mono text-ink-300 tabular-nums">
              {result.beforeComplexity}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-ink-500" />
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono text-emerald-400 font-bold tabular-nums">
              {result.afterComplexity}
            </span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 animate-stagger-2">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-amber-300">Why optimize?</h4>
          </div>
          <p className="text-sm text-ink-300 leading-relaxed">{result.why}</p>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-violet-400" />
            <h4 className="text-sm font-semibold text-violet-300">Trade-offs</h4>
          </div>
          <p className="text-sm text-ink-300 leading-relaxed">{result.tradeoff}</p>
        </div>
      </div>

      <button
        onClick={() => setShowDiff(!showDiff)}
        className="w-full inline-flex items-center justify-between gap-2 rounded-xl border border-ink-700/60 bg-ink-900/40 hover:bg-ink-800/60 px-4 py-3 text-sm font-medium text-ink-100 transition-colors animate-stagger-3"
      >
        <span className="inline-flex items-center gap-2">
          <GitCompare className={cn('h-4 w-4', c.text)} />
          View Optimization Diff
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-ink-400 transition-transform duration-200',
            showDiff && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'accordion-content',
          showDiff && 'accordion-open'
        )}
      >
        <div className="space-y-3 animate-stagger-1">
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-0 md:gap-2 rounded-xl border border-ink-700/60 overflow-hidden">
            <div className="min-h-[320px] bg-ink-950/50">
              <div className="px-3 py-2 border-b border-ink-700/60 bg-ink-900/70 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  Before
                </span>
                <span className="text-[10px] font-mono text-ink-500 tabular-nums">
                  {result.beforeComplexity}
                </span>
              </div>
              <CodeBlockWithLineNumbers lines={left} side="before" placeholder="(no original code to compare)" />
            </div>
            <div className="hidden md:flex items-center justify-center px-1 text-ink-500">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="min-h-[320px] bg-ink-950/50">
              <div className="px-3 py-2 border-b border-ink-700/60 bg-ink-900/70 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink-300 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Optimized
                </span>
                <span className="text-[10px] font-mono text-emerald-400 tabular-nums">
                  {result.afterComplexity}
                </span>
              </div>
              <CodeBlockWithLineNumbers lines={right} side="after" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
