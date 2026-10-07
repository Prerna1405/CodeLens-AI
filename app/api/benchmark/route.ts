import { NextResponse } from 'next/server';
import { z } from 'zod';
import type {
  BenchmarkReport,
  BenchmarkPerCode,
  BenchmarkTiming,
} from '@/lib/types/analysis';
import {
  looksLikeTwoSum,
  runTimingsInWorker,
} from '@/lib/services/sandbox';

export const maxDuration = 120;

const BenchmarkRequestSchema = z.object({
  codeA: z.string().min(1).max(50000),
  codeB: z.string().min(1).max(50000),
  langA: z.string().min(1),
  langB: z.string().min(1),
  problem: z.string().max(5000).optional(),
  sizes: z.array(z.number().int().min(1).max(1_000_000)).max(20).optional(),
});

const BENCHMARK_UNAVAILABLE_REASON =
  'Benchmark only available for JavaScript in this environment';

function isJavaScript(lang: string): boolean {
  const normalized = lang.trim().toLowerCase();
  return (
    normalized === 'javascript' ||
    normalized === 'js' ||
    normalized === 'typescript' ||
    normalized === 'ts' ||
    normalized === 'node' ||
    normalized === 'nodejs' ||
    normalized === 'ecmascript'
  );
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = BenchmarkRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const sizes = body.sizes && body.sizes.length > 0 ? body.sizes : [100, 1000, 10000];
    const jsA = isJavaScript(body.langA);
    const jsB = isJavaScript(body.langB);
    const availableOverall = jsA || jsB;
    const twoSum = looksLikeTwoSum(body.codeA + '\n' + body.codeB, body.problem);

    const baseSeed = (() => {
      let h = 0;
      const s = (body.problem || '') + body.codeA.slice(0, 200) + body.codeB.slice(0, 200);
      for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      }
      return h >>> 0;
    })();

    const notes: string[] = [];
    notes.push(
      twoSum
        ? 'Input generated as two-sum style (nums + target) with guaranteed solution pair.'
        : 'Input generated as seeded deterministic number array.',
    );
    notes.push('Each size: 10 warmup runs, 10 measured runs, per-iteration timeout 2000ms.');
    notes.push('All code executed in Node worker_threads Workers, never in the main thread.');

    async function runPerCode(
      code: string,
      enabled: boolean,
      label: string,
    ): Promise<BenchmarkPerCode> {
      if (!enabled) {
        return {
          available: false,
          reason: BENCHMARK_UNAVAILABLE_REASON,
        };
      }
      try {
        const timings: BenchmarkTiming[] = [];
        let heapDeltas: number[] = [];
        for (let i = 0; i < sizes.length; i++) {
          const size = sizes[i]!;
          const seed = (baseSeed + size * 7919) >>> 0;
          const r = await runTimingsInWorker({
            code,
            size,
            seed,
            looksTwoSum: twoSum,
          });
          if (!r.ok) {
            notes.push(`${label}@size=${size}: ${r.error || 'Iteration failed'}`);
            return {
              available: false,
              reason: r.error || 'Benchmark iteration failed',
              timings,
              rawNotes: notes,
            };
          }
          timings.push({
            size,
            medianMs: r.medianMs,
            runs: r.runs,
          });
          if (r.heapUsedDeltaBytes !== null && r.heapUsedDeltaBytes !== undefined) {
            heapDeltas.push(r.heapUsedDeltaBytes);
          }
        }
        const avgHeap =
          heapDeltas.length > 0
            ? heapDeltas.reduce((a, b) => a + b, 0) / heapDeltas.length
            : null;
        return {
          available: true,
          timings,
          memory:
            avgHeap !== null
              ? { heapUsedDeltaBytes: Math.round(avgHeap), label: 'approx' }
              : { heapUsedDeltaBytes: null, label: 'approx' },
          rawNotes: notes,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          available: false,
          reason: msg,
        };
      }
    }

    const codeA = await runPerCode(body.codeA, jsA, 'codeA');
    const codeB = await runPerCode(body.codeB, jsB, 'codeB');

    const points = sizes.map((sz) => {
      const tA = codeA.timings?.find((t) => t.size === sz);
      const tB = codeB.timings?.find((t) => t.size === sz);
      return {
        size: sz,
        aMs: tA ? tA.medianMs : null,
        bMs: tB ? tB.medianMs : null,
        aMemKB: codeA.memory?.heapUsedDeltaBytes != null ? Math.round(codeA.memory.heapUsedDeltaBytes / 1024) : null,
        bMemKB: codeB.memory?.heapUsedDeltaBytes != null ? Math.round(codeB.memory.heapUsedDeltaBytes / 1024) : null,
      };
    });

    const report: BenchmarkReport = {
      available: availableOverall,
      unavailableReason: availableOverall ? undefined : BENCHMARK_UNAVAILABLE_REASON,
      reason: availableOverall ? undefined : BENCHMARK_UNAVAILABLE_REASON,
      points,
      observedA: codeA.available ? 'Measured (see benchmark table)' : 'Unavailable',
      observedB: codeB.available ? 'Measured (see benchmark table)' : 'Unavailable',
      sizes,
      codeA,
      codeB,
      generatedAt: new Date().toISOString(),
      notes,
    };

    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: 'Benchmark failed',
        detail: message,
      },
      { status: 500 },
    );
  }
}

export async function GET(_req: Request) {
  return NextResponse.json(
    {
      name: 'WhiteCode Benchmark API',
      method: 'POST',
      supportedLanguages: ['javascript', 'typescript', 'js', 'ts', 'node'],
      defaultSizes: [100, 1000, 10000],
      sandbox: 'Node.js worker_threads Worker (2000ms timeout per iteration)',
      fields: [
        'codeA',
        'codeB',
        'langA',
        'langB',
        'problem?',
        'sizes?',
      ],
    },
    { status: 200 },
  );
}
