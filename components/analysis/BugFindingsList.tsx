'use client';

import { useState } from 'react';
import {
  Bug,
  Shield,
  AlertTriangle,
  AlertOctagon,
  Info,
  Highlighter,
  ChevronDown,
  FlaskConical,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BugFinding, SecurityFinding } from '@/lib/types/analysis';

interface BugFindingsListProps {
  title: string;
  findings: BugFinding[];
  color: 'emerald' | 'accent';
  onAnchorClick?: (startLine: number, endLine: number) => void;
}

interface SecurityFindingsListProps {
  title: string;
  findings: SecurityFinding[];
  color: 'emerald' | 'accent';
  onAnchorClick?: (startLine: number, endLine: number) => void;
}

type Severity = 'low' | 'medium' | 'high';

function severityBadge(sev: Severity) {
  switch (sev) {
    case 'high':
      return (
        <span className="badge badge-low">
          <AlertOctagon className="h-3 w-3" />
          High
        </span>
      );
    case 'medium':
      return (
        <span className="badge badge-med">
          <AlertTriangle className="h-3 w-3" />
          Medium
        </span>
      );
    case 'low':
    default:
      return (
        <span className="badge border-ink-500/30 bg-ink-700/30 text-ink-300">
          <Info className="h-3 w-3" />
          Low
        </span>
      );
  }
}

const COLOR_MAP: Record<'emerald' | 'accent', { chip: string; ring: string; text: string; border: string }> = {
  emerald: {
    chip: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    ring: 'ring-emerald-500/30',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  accent: {
    chip: 'border-accent-500/40 bg-accent-500/10 text-accent-300 hover:bg-accent-500/20',
    ring: 'ring-accent-500/30',
    text: 'text-accent-400',
    border: 'border-accent-500/20',
  },
};

function LineChip({
  line,
  endLine,
  onClick,
  color,
}: {
  line: number;
  endLine?: number;
  onClick?: () => void;
  color: 'emerald' | 'accent';
}) {
  const c = COLOR_MAP[color];
  const label = endLine && endLine !== line ? `lines ${line}–${endLine}` : `line ${line}`;
  return (
    <button
      onClick={onClick}
      className={cn(
        'badge transition-colors font-mono text-[11px]',
        c.chip,
        onClick && 'cursor-pointer'
      )}
      title="Jump to lines in editor"
    >
      <Highlighter className="h-3 w-3" />
      {label}
    </button>
  );
}

export function BugFindingsList({
  title,
  findings,
  color,
  onAnchorClick,
}: BugFindingsListProps) {
  const c = COLOR_MAP[color];

  if (!findings || findings.length === 0) {
    return (
      <div className="card p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Bug className={cn('h-4 w-4', c.text)} />
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-5 flex items-start gap-3 animate-stagger-1">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <FlaskConical className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-100 mb-0.5">
              No static bugs detected
            </h4>
            <p className="text-sm text-ink-400">
              Static analysis did not surface bugs in this solution — run{' '}
              <span className="text-ink-200 font-medium">Generate Tests</span> for behavioral
              validation across edge cases.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const high = findings.filter((f) => f.severity === 'high').length;
  const med = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;

  return (
    <div className="card p-5 space-y-3 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bug className={cn('h-4 w-4', c.text)} />
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {high > 0 && (
            <span className="badge badge-low tabular-nums">
              <AlertOctagon className="h-3 w-3" /> {high} high
            </span>
          )}
          {med > 0 && (
            <span className="badge badge-med tabular-nums">
              <AlertTriangle className="h-3 w-3" /> {med} med
            </span>
          )}
          {low > 0 && (
            <span className="badge border-ink-500/30 bg-ink-700/30 text-ink-300 tabular-nums">
              <Info className="h-3 w-3" /> {low} low
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {findings.map((f, i) => {
          const line = f.line ?? f.anchors?.[0]?.startLine;
          const endLine = f.anchors?.[0]?.endLine;
          return (
            <div
              key={i}
              className={cn(
                'rounded-xl border border-ink-700/60 bg-ink-900/40 p-4 hover-lift',
                `animate-stagger-${Math.min(i + 1, 5)}`
              )}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {severityBadge(f.severity)}
                  {f.category && (
                    <span className="badge border-ink-600/50 bg-ink-800/60 text-ink-300 text-[10px] uppercase tracking-wide">
                      {f.category}
                    </span>
                  )}
                </div>
                {line != null && (
                  <LineChip
                    line={line}
                    endLine={endLine}
                    color={color}
                    onClick={
                      onAnchorClick
                        ? () => onAnchorClick(line, endLine ?? line)
                        : undefined
                    }
                  />
                )}
              </div>

              <h4 className="text-sm font-semibold text-ink-100 mt-2.5">{f.title}</h4>
              <p className="text-sm text-ink-300 mt-1 leading-relaxed">{f.description}</p>

              {onAnchorClick && line != null && (
                <button
                  onClick={() => onAnchorClick(line, endLine ?? line)}
                  className={cn(
                    'mt-3 inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
                    c.text,
                    'hover:underline underline-offset-2'
                  )}
                >
                  <Highlighter className="h-3 w-3" />
                  Highlight in editor
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SecurityFindingsList({
  title,
  findings,
  color,
  onAnchorClick,
}: SecurityFindingsListProps) {
  const [openFix, setOpenFix] = useState<number | null>(null);
  const c = COLOR_MAP[color];

  if (!findings || findings.length === 0) {
    return (
      <div className="card p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <Shield className={cn('h-4 w-4', c.text)} />
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-start gap-3 animate-stagger-1">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-300 mb-0.5">
              No security issues detected
            </h4>
            <p className="text-sm text-ink-400">
              Static analysis of input sanitization, unsafe calls, and data handling did not
              surface security-relevant problems in this solution.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const high = findings.filter((f) => f.severity === 'high').length;
  const med = findings.filter((f) => f.severity === 'medium').length;
  const low = findings.filter((f) => f.severity === 'low').length;

  return (
    <div className="card p-5 space-y-3 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className={cn('h-4 w-4', c.text)} />
          <h3 className="section-title">{title}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {high > 0 && (
            <span className="badge badge-low tabular-nums">
              <AlertOctagon className="h-3 w-3" /> {high} critical
            </span>
          )}
          {med > 0 && (
            <span className="badge badge-med tabular-nums">
              <AlertTriangle className="h-3 w-3" /> {med} warning
            </span>
          )}
          {low > 0 && (
            <span className="badge border-ink-500/30 bg-ink-700/30 text-ink-300 tabular-nums">
              <Info className="h-3 w-3" /> {low} info
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {findings.map((f, i) => {
          const line = f.line ?? f.anchors?.[0]?.startLine;
          const endLine = f.anchors?.[0]?.endLine;
          const isOpen = openFix === i;
          return (
            <div
              key={i}
              className={cn(
                'rounded-xl border overflow-hidden bg-ink-900/40 hover-lift',
                f.severity === 'high'
                  ? 'border-rose-500/30'
                  : f.severity === 'medium'
                  ? 'border-amber-500/25'
                  : 'border-ink-700/60',
                `animate-stagger-${Math.min(i + 1, 5)}`
              )}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="p-4 space-y-2">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {severityBadge(f.severity)}
                    {f.category && (
                      <span className="badge border-ink-600/50 bg-ink-800/60 text-ink-300 text-[10px] uppercase tracking-wide">
                        {f.category}
                      </span>
                    )}
                  </div>
                  {line != null && (
                    <LineChip
                      line={line}
                      endLine={endLine}
                      color={color}
                      onClick={
                        onAnchorClick
                          ? () => onAnchorClick(line, endLine ?? line)
                          : undefined
                      }
                    />
                  )}
                </div>

                <h4 className="text-sm font-semibold text-ink-100 mt-1.5">{f.title}</h4>
                <p className="text-sm text-ink-300 leading-relaxed">{f.description}</p>

                {onAnchorClick && line != null && (
                  <button
                    onClick={() => onAnchorClick(line, endLine ?? line)}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
                      c.text,
                      'hover:underline underline-offset-2'
                    )}
                  >
                    <Highlighter className="h-3 w-3" />
                    Highlight in editor
                  </button>
                )}

                {f.suggestedFix && (
                  <button
                    onClick={() => setOpenFix(isOpen ? null : i)}
                    className="w-full mt-1 flex items-center justify-between gap-2 rounded-lg border border-ink-700/60 bg-ink-800/40 hover:bg-ink-800 px-3 py-2 text-xs text-ink-200 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Wrench className="h-3.5 w-3.5 text-ink-400" />
                      Suggested Fix
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-ink-400 transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                )}
              </div>

              {f.suggestedFix && (
                <div
                  className={cn(
                    'accordion-content border-t border-ink-700/50',
                    isOpen && 'accordion-open'
                  )}
                >
                  <div className="px-4 pb-4 pt-3 animate-stagger-1">
                    <pre className="rounded-lg border border-ink-700/60 bg-ink-950/70 p-3 font-mono text-xs text-ink-200 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {f.suggestedFix}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BugFindingsList;
