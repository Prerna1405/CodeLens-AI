'use client';

import { Timer, HardDrive, TrendingUp, Gauge, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BenchmarkReport } from '@/lib/types/analysis';

interface BenchmarkTableProps {
  benchmark?: BenchmarkReport | null;
  predictedA: string;
  predictedB: string;
  loading?: boolean;
}

function fmtMs(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n < 0.01) return '<0.01ms';
  if (n < 1) return `${n.toFixed(2)}ms`;
  if (n < 1000) return `${n.toFixed(1)}ms`;
  return `${(n / 1000).toFixed(2)}s`;
}

function fmtKB(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n < 1024) return `${n.toFixed(0)} KB`;
  return `${(n / 1024).toFixed(2)} MB`;
}

function inferGrowth(timings: { size: number; medianMs: number }[]): string {
  if (timings.length < 2) return 'insufficient data';
  const ratios: number[] = [];
  for (let i = 1; i < timings.length; i++) {
    const prev = timings[i - 1]!;
    const cur = timings[i]!;
    if (prev.medianMs <= 0 || prev.size <= 0) continue;
    const sizeRatio = cur.size / prev.size;
    const timeRatio = cur.medianMs / prev.medianMs;
    if (sizeRatio > 1) ratios.push(timeRatio / sizeRatio);
  }
  if (ratios.length === 0) return 'insufficient data';
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  if (avg < 1.2) return 'near-linear growth';
  if (avg < 1.8) return 'slower-than-linear growth';
  if (avg < 3) return 'moderate super-linear growth';
  return 'quadratic-or-worse growth';
}

export default function BenchmarkTable({
  benchmark,
  predictedA,
  predictedB,
  loading,
}: BenchmarkTableProps) {
  if (loading) {
    return (
      <div className="card p-5 space-y-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div className="shimmer h-6 w-48 rounded-lg" />
          <div className="shimmer h-6 w-24 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="shimmer h-9 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!benchmark || !benchmark.available) {
    return (
      <div className="card p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="h-4 w-4 text-accent-400" />
          <h3 className="section-title">Real Benchmark</h3>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-ink-100">
                Benchmark unavailable for this language.
              </h4>
              <span className="badge border-amber-500/30 bg-amber-500/10 text-amber-400">
                Unsupported
              </span>
            </div>
            <p className="text-sm text-ink-300">
              {benchmark?.unavailableReason ||
                'Runtime-level benchmarks require a supported sandbox language (JavaScript / TypeScript / Python). Static complexity predictions are still available below.'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-4">
            <div className="text-xs font-medium text-ink-400 mb-2">Predicted A</div>
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-emerald-400" />
              <span className="font-mono text-lg font-bold text-emerald-400">{predictedA}</span>
            </div>
          </div>
          <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-4">
            <div className="text-xs font-medium text-ink-400 mb-2">Predicted B</div>
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-accent-400" />
              <span className="font-mono text-lg font-bold text-accent-400">{predictedB}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sizes = benchmark.sizes ?? benchmark.points.map((p) => p.size);
  const timingsA = benchmark.codeA?.timings ?? [];
  const timingsB = benchmark.codeB?.timings ?? [];
  const hasMemory = benchmark.points.some((p) => p.aMemKB != null || p.bMemKB != null);

  const observedA = benchmark.observedA || (timingsA.length ? inferGrowth(timingsA) : '—');
  const observedB = benchmark.observedB || (timingsB.length ? inferGrowth(timingsB) : '—');

  return (
    <div className="card p-5 space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-accent-400" />
          <h3 className="section-title">Real Benchmark Results</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-ink-300">Solution A</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-500" />
            <span className="text-ink-300">Solution B</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-700/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-900/80 border-b border-ink-700/60">
              <th className="text-left font-medium text-ink-400 px-4 py-3">Metric</th>
              {sizes.map((sz) => (
                <th
                  key={sz}
                  className="text-right font-medium text-ink-400 px-4 py-3 tabular-nums"
                >
                  n = {sz.toLocaleString()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700/50">
            <tr className="hover:bg-ink-900/40">
              <td className="px-4 py-3 font-medium text-ink-200">
                <div className="flex items-center gap-2">
                  <Timer className="h-3.5 w-3.5 text-emerald-400" />
                  Runtime A (median)
                </div>
              </td>
              {sizes.map((sz) => {
                const pt = benchmark.points.find((p) => p.size === sz);
                const tA = timingsA.find((t) => t.size === sz);
                const val = tA?.medianMs ?? pt?.aMs;
                const tB = timingsB.find((t) => t.size === sz);
                const valB = tB?.medianMs ?? pt?.bMs;
                const wins = val != null && valB != null && val < valB;
                return (
                  <td
                    key={sz}
                    className={cn(
                      'text-right px-4 py-3 font-mono tabular-nums',
                      wins ? 'text-emerald-400 font-semibold' : 'text-ink-200'
                    )}
                  >
                    {fmtMs(val)}
                  </td>
                );
              })}
            </tr>

            <tr className="hover:bg-ink-900/40">
              <td className="px-4 py-3 font-medium text-ink-200">
                <div className="flex items-center gap-2">
                  <Timer className="h-3.5 w-3.5 text-accent-400" />
                  Runtime B (median)
                </div>
              </td>
              {sizes.map((sz) => {
                const pt = benchmark.points.find((p) => p.size === sz);
                const tA = timingsA.find((t) => t.size === sz);
                const valA = tA?.medianMs ?? pt?.aMs;
                const tB = timingsB.find((t) => t.size === sz);
                const val = tB?.medianMs ?? pt?.bMs;
                const wins = val != null && valA != null && val < valA;
                return (
                  <td
                    key={sz}
                    className={cn(
                      'text-right px-4 py-3 font-mono tabular-nums',
                      wins ? 'text-accent-400 font-semibold' : 'text-ink-200'
                    )}
                  >
                    {fmtMs(val)}
                  </td>
                );
              })}
            </tr>

            {hasMemory && (
              <>
                <tr className="hover:bg-ink-900/40">
                  <td className="px-4 py-3 font-medium text-ink-200">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
                      Memory A
                    </div>
                  </td>
                  {sizes.map((sz) => {
                    const pt = benchmark.points.find((p) => p.size === sz);
                    return (
                      <td
                        key={sz}
                        className="text-right px-4 py-3 font-mono text-ink-200 tabular-nums"
                      >
                        {fmtKB(pt?.aMemKB)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="hover:bg-ink-900/40">
                  <td className="px-4 py-3 font-medium text-ink-200">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3.5 w-3.5 text-accent-400" />
                      Memory B
                    </div>
                  </td>
                  {sizes.map((sz) => {
                    const pt = benchmark.points.find((p) => p.size === sz);
                    return (
                      <td
                        key={sz}
                        className="text-right px-4 py-3 font-mono text-ink-200 tabular-nums"
                      >
                        {fmtKB(pt?.bMemKB)}
                      </td>
                    );
                  })}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" /> Predicted Complexity
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
              {predictedA}
            </span>
            <span className="text-ink-600">vs</span>
            <span className="font-mono text-lg font-bold text-accent-400 tabular-nums">
              {predictedB}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-ink-700/60 bg-ink-900/40 p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Observed Growth
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-ink-300">A:</span>
              <span className="font-mono text-ink-100">{observedA}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-500" />
              <span className="text-ink-300">B:</span>
              <span className="font-mono text-ink-100">{observedB}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
