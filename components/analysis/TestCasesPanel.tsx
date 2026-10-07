'use client';

import { useState } from 'react';
import { FlaskConical, ChevronDown, CheckCircle2, XCircle, AlertCircle, Clock, Play, Beaker } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeneratedTestCase, TestResultStatus } from '@/lib/types/analysis';

interface TestCasesPanelProps {
  tests: GeneratedTestCase[];
  langA: string;
  langB: string;
  loading?: boolean;
  onRunClick?: () => void;
}

function resultBadge(status?: TestResultStatus) {
  switch (status) {
    case 'pass':
      return (
        <span className="badge badge-high">
          <CheckCircle2 className="h-3 w-3" />
          Pass
        </span>
      );
    case 'fail':
      return (
        <span className="badge badge-low">
          <XCircle className="h-3 w-3" />
          Fail
        </span>
      );
    case 'error':
    case 'timeout':
      return (
        <span className="badge badge-low">
          <AlertCircle className="h-3 w-3" />
          {status === 'timeout' ? 'Timeout' : 'Error'}
        </span>
      );
    case 'skip':
      return (
        <span className="badge border-ink-500/30 bg-ink-700/30 text-ink-300">
          Skipped
        </span>
      );
    case 'not_tested':
    default:
      return (
        <span className="badge border-ink-600/40 bg-ink-800/60 text-ink-400">
          <Clock className="h-3 w-3" />
          Not run
        </span>
      );
  }
}

export default function TestCasesPanel({
  tests,
  langA,
  langB,
  loading,
  onRunClick,
}: TestCasesPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="card p-5 space-y-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="shimmer h-6 w-48 rounded-lg" />
          <div className="shimmer h-6 w-32 rounded-lg" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="shimmer h-12 rounded-xl" />
            <div className="shimmer h-48 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (!tests.length) {
    return (
      <div className="card p-8 animate-fade-in-up">
        <div className="flex flex-col items-center text-center gap-4 py-6">
          <div className="h-14 w-14 rounded-2xl border border-ink-700/60 bg-ink-900/50 flex items-center justify-center">
            <FlaskConical className="h-7 w-7 text-ink-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink-100">No test cases generated yet</h3>
            <p className="text-sm text-ink-400 mt-1 max-w-md mx-auto">
              Generate unit tests to verify both solutions handle edge cases, random inputs, and
              large-scale data correctly.
            </p>
          </div>
          {onRunClick && (
            <button onClick={onRunClick} className="btn-primary mt-2">
              <Play className="h-4 w-4" />
              Run Tests
            </button>
          )}
        </div>
      </div>
    );
  }

  const total = tests.length;
  const passedBoth = tests.filter((t) => t.resultA === 'pass' && t.resultB === 'pass').length;
  const failedA = tests.filter((t) => t.resultA === 'fail' || t.resultA === 'error' || t.resultA === 'timeout');
  const failedB = tests.filter((t) => t.resultB === 'fail' || t.resultB === 'error' || t.resultB === 'timeout');

  return (
    <div className="card p-5 space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Beaker className="h-4 w-4 text-accent-400" />
          <h3 className="section-title">Generated Test Cases</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="badge badge-high tabular-nums">
            <CheckCircle2 className="h-3 w-3" />
            {passedBoth}/{total} Passes
          </span>
          {failedA.length > 0 && (
            <span className="badge badge-low tabular-nums">
              <XCircle className="h-3 w-3" />
              A fails: {failedA.length}
            </span>
          )}
          {failedB.length > 0 && (
            <span className="badge badge-low tabular-nums">
              <XCircle className="h-3 w-3" />
              B fails: {failedB.length}
            </span>
          )}
          {onRunClick && (
            <button onClick={onRunClick} className="btn-secondary text-xs">
              <Play className="h-3.5 w-3.5" />
              Re-run
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {tests.map((t, idx) => {
          const isOpen = expandedId === t.id;
          const aFailed = t.resultA === 'fail' || t.resultA === 'error' || t.resultA === 'timeout';
          const bFailed = t.resultB === 'fail' || t.resultB === 'error' || t.resultB === 'timeout';
          const anyFailed = aFailed || bFailed;

          return (
            <div
              key={t.id}
              className={cn(
                'rounded-xl border overflow-hidden transition-colors',
                anyFailed
                  ? aFailed && bFailed
                    ? 'border-rose-500/30 bg-rose-500/[0.04]'
                    : 'border-ink-700/60 bg-ink-900/40'
                  : 'border-ink-700/60 bg-ink-900/40 hover:bg-ink-900/60'
              )}
            >
              <button
                onClick={() => setExpandedId(isOpen ? null : t.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-ink-400 shrink-0 transition-transform duration-200',
                    isOpen && 'rotate-180'
                  )}
                />
                <span className="text-sm font-semibold text-ink-100 shrink-0">
                  Test #{idx + 1}
                </span>
                {t.label && (
                  <span className="text-xs text-ink-400 truncate">{t.label}</span>
                )}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {resultBadge(t.resultA)}
                  {resultBadge(t.resultB)}
                </div>
              </button>

              <div
                className={cn(
                  'accordion-content',
                  isOpen && 'accordion-open'
                )}
              >
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-ink-700/50 animate-stagger-1">
                  {anyFailed && (
                    <div
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs font-semibold',
                        aFailed && bFailed
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                          : aFailed
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      )}
                    >
                      {aFailed && bFailed
                        ? 'Both solutions failed this test case.'
                        : aFailed
                        ? `Solution A failed this test case.`
                        : `Solution B failed this test case.`}
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-1.5">
                      Input
                    </div>
                    <pre className="rounded-lg border border-ink-700/60 bg-ink-950/60 p-3 font-mono text-xs text-ink-200 whitespace-pre-wrap overflow-x-auto">
                      {t.inputText || '(empty input)'}
                    </pre>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-1.5">
                      Expected Output
                    </div>
                    {t.expectedText ? (
                      <pre className="rounded-lg border border-ink-700/60 bg-ink-950/60 p-3 font-mono text-xs text-emerald-300 whitespace-pre-wrap overflow-x-auto">
                        {t.expectedText}
                      </pre>
                    ) : (
                      <div className="rounded-lg border border-ink-700/60 bg-ink-900/50 p-3 text-xs text-ink-400">
                        auto-compare A vs B outputs for semantic equivalence
                      </div>
                    )}
                  </div>

                  {(t.actualA != null || t.errorA != null || aFailed) && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-1.5">
                        Actual A ({langA})
                      </div>
                      <pre
                        className={cn(
                          'rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto',
                          aFailed
                            ? 'border-rose-500/40 bg-rose-500/5 text-rose-200'
                            : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
                        )}
                      >
                        {t.errorA ?? t.actualA ?? '(no output)'}
                      </pre>
                    </div>
                  )}

                  {(t.actualB != null || t.errorB != null || bFailed) && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400 mb-1.5">
                        Actual B ({langB})
                      </div>
                      <pre
                        className={cn(
                          'rounded-lg border p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto',
                          bFailed
                            ? 'border-rose-500/40 bg-rose-500/5 text-rose-200'
                            : 'border-accent-500/30 bg-accent-500/5 text-accent-200'
                        )}
                      >
                        {t.errorB ?? t.actualB ?? '(no output)'}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
