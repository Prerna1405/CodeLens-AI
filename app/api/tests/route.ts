import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { GeneratedTestCase, TestResultStatus } from '@/lib/types/analysis';
import {
  looksLikeTwoSum,
  buildTwoSumInput,
  buildGenericNumberArray,
  runInWorker,
} from '@/lib/services/sandbox';

export const maxDuration = 120;

const TestsRequestSchema = z.object({
  codeA: z.string().min(1).max(50000),
  codeB: z.string().min(1).max(50000),
  langA: z.string().min(1),
  langB: z.string().min(1),
  problem: z.string().max(5000).optional(),
});

type TestCaseInputBuilder = (seed: number) => unknown;

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

function buildTestGenerators(twoSum: boolean): Array<{
  id: string;
  label: string;
  build: TestCaseInputBuilder;
}> {
  if (twoSum) {
    return [
      {
        id: 'empty',
        label: 'Empty input',
        build: () => ({ nums: [], target: 0 }),
      },
      {
        id: 'single',
        label: 'Single element',
        build: (s) => ({ nums: [42], target: 42 }),
      },
      {
        id: 'two',
        label: 'Two elements (matches target)',
        build: (s) => {
          const t = buildTwoSumInput(2, s + 1);
          return { nums: t.nums, target: t.target };
        },
      },
      {
        id: 'duplicates',
        label: 'Duplicate values',
        build: (s) => ({ nums: [7, 7, 7, 7, 7], target: 14 }),
      },
      {
        id: 'negatives',
        label: 'Negative values',
        build: (s) => {
          const t = buildTwoSumInput(16, s + 2);
          const neg = t.nums.map((n, i) => (i % 2 === 0 ? -Math.abs(n) : n));
          return { nums: neg, target: neg[0]! + neg[neg.length - 1]! };
        },
      },
      {
        id: 'zeros',
        label: 'Zero values',
        build: (s) => ({ nums: [0, 0, 1, -1, 0], target: 0 }),
      },
      {
        id: 'large',
        label: 'Large input (1000 elements)',
        build: (s) => {
          const t = buildTwoSumInput(1000, s + 3);
          return { nums: t.nums, target: t.target };
        },
      },
      {
        id: 'notfound',
        label: 'Target not found',
        build: (s) => {
          const t = buildTwoSumInput(20, s + 4);
          return { nums: t.nums, target: 9999999999 };
        },
      },
    ];
  }

  return [
    {
      id: 'empty',
      label: 'Empty input',
      build: () => [],
    },
    {
      id: 'single',
      label: 'Single element',
      build: (s) => buildGenericNumberArray(1, s + 1),
    },
    {
      id: 'two',
      label: 'Two elements',
      build: (s) => buildGenericNumberArray(2, s + 2),
    },
    {
      id: 'duplicates',
      label: 'Duplicate values',
      build: (s) => [5, 5, 5, 5, 5, 1, 1, 5],
    },
    {
      id: 'negatives',
      label: 'Negative values',
      build: (s) => {
        const arr = buildGenericNumberArray(20, s + 3);
        return arr.map((n, i) => (i % 2 === 0 ? -n : n));
      },
    },
    {
      id: 'zeros',
      label: 'Zero values',
      build: (s) => [0, 0, 0, 0, 1, 0, -1, 0],
    },
    {
      id: 'large',
      label: 'Large input (1000 elements)',
      build: (s) => buildGenericNumberArray(1000, s + 4),
    },
    {
      id: 'notfound',
      label: 'Target not found (impossible min/max)',
      build: (s) => {
        const arr = buildGenericNumberArray(20, s + 5);
        (arr as unknown as { __target?: number }).__target = -99999999;
        return arr;
      },
    },
  ];
}

async function runOneCodeOnInput(
  code: string,
  enabled: boolean,
  input: unknown,
): Promise<{ status: TestResultStatus; actual?: unknown; error?: string }> {
  if (!enabled) {
    return { status: 'not_tested' };
  }
  try {
    const r = await runInWorker({
      code,
      input,
      timeoutMs: 2000,
    });
    if (r.timedOut) {
      return { status: 'timeout', error: r.error || 'Timed out' };
    }
    if (!r.ok) {
      return { status: 'error', error: r.error };
    }
    return { status: 'pass', actual: r.output };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 'error', error: msg };
  }
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = TestsRequestSchema.safeParse(raw);

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
    const twoSum = looksLikeTwoSum(body.codeA + '\n' + body.codeB, body.problem);
    const generators = buildTestGenerators(twoSum);

    const baseSeed = (() => {
      let h = 1337;
      const s = (body.problem || '') + body.codeA.slice(0, 100) + body.codeB.slice(0, 100);
      for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      }
      return h >>> 0;
    })();

    const jsA = isJavaScript(body.langA);
    const jsB = isJavaScript(body.langB);
    const executed = jsA || jsB;
    const languageExecuted: 'javascript' | 'none' = executed ? 'javascript' : 'none';

    const tests: GeneratedTestCase[] = [];
    for (let i = 0; i < generators.length; i++) {
      const g = generators[i]!;
      const input = g.build(baseSeed + i * 101);
      const inputText = JSON.stringify(input);
      const [rA, rB] = await Promise.all([
        runOneCodeOnInput(body.codeA, jsA, input),
        runOneCodeOnInput(body.codeB, jsB, input),
      ]);
      tests.push({
        id: `${g.id}_${i + 1}`,
        label: g.label,
        inputText,
        expectedText: null,
        resultA: rA.status,
        resultB: rB.status,
        actualA: rA.actual !== undefined ? JSON.stringify(rA.actual) : undefined,
        actualB: rB.actual !== undefined ? JSON.stringify(rB.actual) : undefined,
        errorA: rA.error,
        errorB: rB.error,
      });
    }

    return NextResponse.json(
      {
        tests,
        executed,
        languageExecuted,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: 'Tests generation failed',
        detail: message,
      },
      { status: 500 },
    );
  }
}

export async function GET(_req: Request) {
  return NextResponse.json(
    {
      name: 'WhiteCode Tests API',
      method: 'POST',
      minTestCases: 8,
      categories: [
        'Empty input',
        'Single element',
        'Two elements',
        'Duplicate values',
        'Negative values',
        'Zero values',
        'Large input',
        'Target not found',
      ],
      executionSupport: {
        javascript: true,
        default: 'not_tested (results only generated for JavaScript)',
      },
      fields: ['codeA', 'codeB', 'langA', 'langB', 'problem?'],
    },
    { status: 200 },
  );
}
