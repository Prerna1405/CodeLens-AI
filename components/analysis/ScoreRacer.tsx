'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Gauge,
  HardDrive,
  BookOpen,
  Wrench,
  ShieldCheck,
  CheckCircle,
  ArrowUpRight,
  TestTube,
} from 'lucide-react';
import type { AnalysisReport } from '@/lib/types/analysis';
import { cn, clamp } from '@/lib/utils';

export interface FinalScores {
  performance: { a: number; b: number };
  memory: { a: number; b: number };
  readability: { a: number; b: number };
  maintainability: { a: number; b: number };
  security: { a: number; b: number };
  correctness: { a: number; b: number };
  scalability: { a: number; b: number };
  testCoverage: { a: number; b: number };
}

const AXES = [
  { key: 'performance' as const, label: 'Performance', Icon: Gauge, colorA: 'text-emerald-400', colorB: 'text-accent-400' },
  { key: 'memory' as const, label: 'Memory', Icon: HardDrive, colorA: 'text-emerald-400', colorB: 'text-accent-400' },
  { key: 'readability' as const, label: 'Readability', Icon: BookOpen, colorA: 'text-emerald-400', colorB: 'text-accent-400' },
  { key: 'maintainability' as const, label: 'Maintainability', Icon: Wrench, colorA: 'text-emerald-400', colorB: 'text-accent-400' },
  { key: 'security' as const, label: 'Security', Icon: ShieldCheck, colorA: 'text-emerald-400', colorB: 'text-accent-400' },
  { key: 'correctness' as const, label: 'Correctness', Icon: CheckCircle, colorA: 'text-emerald-400', colorB: 'text-accent-400' },
  { key: 'scalability' as const, label: 'Scalability', Icon: ArrowUpRight, colorA: 'text-emerald-400', colorB: 'text-accent-400' },
  { key: 'testCoverage' as const, label: 'Test Coverage', Icon: TestTube, colorA: 'text-emerald-400', colorB: 'text-accent-400' },
];

function perfScore(worst: string): number {
  const w = worst.replace(/\s/g, '');
  if (w.includes('2^n') || w.includes('n!')) return 1;
  if (w.includes('n^3')) return 2;
  if (w.includes('n^2')) return 4;
  if (w.includes('nlogn') || w.includes('n log n')) return 7;
  if (/^O\(n\)$/.test(w)) return 8;
  if (w.includes('logn') || w.includes('log n')) return 9;
  if (w === 'O(1)') return 10;
  return 6;
}

function memScore(aux: string): number {
  const a = aux.replace(/\s/g, '');
  if (a.includes('n^3')) return 1;
  if (a.includes('n^2')) return 3;
  if (a.includes('nlogn') || a.includes('n log n')) return 6;
  if (a === 'O(n)' || (a.includes('(n)') && !a.includes('log') && !a.includes('^'))) return 7;
  if (a.includes('logn') || a.includes('log n')) return 9;
  if (a === 'O(1)') return 10;
  return 5;
}

function maintScore(read: number, dupLen: number, errLen: number): number {
  const dupOk = dupLen === 0 ? 2 : 0;
  const errGood = errLen >= 2 ? 1 : errLen === 1 ? 1 : 0;
  return clamp(read + dupOk + errGood, 0, 10);
}

function secScore(findings: { severity: 'low' | 'medium' | 'high' }[]): number {
  let s = 10;
  for (const f of findings) {
    if (f.severity === 'high') s -= 2;
    else if (f.severity === 'medium') s -= 1;
    else s -= 0.5;
  }
  return clamp(s, 0, 10);
}

export function deriveFinalScores(report: AnalysisReport): FinalScores {
  const { solutionA, solutionB } = report;
  const perfA = perfScore(solutionA.time.worst);
  const perfB = perfScore(solutionB.time.worst);
  const memA = memScore(solutionA.space.auxiliary);
  const memB = memScore(solutionB.space.auxiliary);
  const scalA = 0.7 * perfA + 0.3 * memA;
  const scalB = 0.7 * perfB + 0.3 * memB;
  const corrA = solutionA.correctness.correct === true ? 10 : solutionA.correctness.correct === false ? 4 : 7;
  const corrB = solutionB.correctness.correct === true ? 10 : solutionB.correctness.correct === false ? 4 : 7;
  const tcA = 10 - clamp(solutionA.quality.errorHandling.length * 1.5 + solutionA.quality.deadCode.length, 0, 5);
  const tcB = 10 - clamp(solutionB.quality.errorHandling.length * 1.5 + solutionB.quality.deadCode.length, 0, 5);
  return {
    performance: { a: perfA, b: perfB },
    memory: { a: memA, b: memB },
    readability: { a: solutionA.readability.score, b: solutionB.readability.score },
    maintainability: {
      a: maintScore(solutionA.readability.score, solutionA.quality.duplication.length, solutionA.quality.errorHandling.length),
      b: maintScore(solutionB.readability.score, solutionB.quality.duplication.length, solutionB.quality.errorHandling.length),
    },
    security: { a: secScore(solutionA.security), b: secScore(solutionB.security) },
    correctness: { a: corrA, b: corrB },
    scalability: { a: scalA, b: scalB },
    testCoverage: { a: tcA, b: tcB },
  };
}

interface ScoreRacerProps {
  finalScores: FinalScores;
}

export default function ScoreRacer({ finalScores }: ScoreRacerProps) {
  const [animated, setAnimated] = useState<FinalScores>(() => {
    const empty: any = {};
    for (const ax of AXES) empty[ax.key] = { a: 0, b: 0 };
    return empty;
  });
  const startRef = useRef<number | null>(null);
  const duration = 1100;

  useEffect(() => {
    let raf = 0;
    const tick = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next: any = {};
      for (const ax of AXES) {
        const target = finalScores[ax.key];
        next[ax.key] = {
          a: target.a * eased,
          b: target.b * eased,
        };
      }
      setAnimated(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finalScores]);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="section-title">Dimension Score Duel</h3>
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

      <div className="space-y-3.5">
        {AXES.map(({ key, label, Icon }, i) => {
          const a = animated[key].a;
          const b = animated[key].b;
          const max = Math.max(10, a, b);
          const aPct = (a / max) * 100;
          const bPct = (b / max) * 100;
          const target = finalScores[key];
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-ink-200 font-medium">
                  <Icon className="h-3.5 w-3.5 text-ink-400" />
                  {label}
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-emerald-400">{target.a.toFixed(1)}</span>
                  <span className="text-ink-600">vs</span>
                  <span className="text-accent-400">{target.b.toFixed(1)}</span>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <div className="relative h-2 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className={cn(
                      'absolute right-0 h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600'
                    )}
                    style={{
                      width: `${aPct}%`,
                      transition: `width ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                      transitionDelay: `${i * 40}ms`,
                    }}
                  />
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="absolute left-0 h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600"
                    style={{
                      width: `${bPct}%`,
                      transition: `width ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                      transitionDelay: `${i * 40}ms`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
