import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runAnalysis } from '@/lib/services';
import { PriorityWeightsSchema, ExplanationLevelSchema } from '@/lib/types/analysis';
import { sha256Hash } from '@/lib/utils';
import {
  getCachedReport,
  cacheReport,
  saveHistory,
} from '@/lib/db';

const AnalyzeRequestSchema = z.object({
  problem: z.string().min(1, 'Problem statement is required').max(5000),
  codeA: z.string().min(1, 'Code A is required').max(50000),
  codeB: z.string().min(1, 'Code B is required').max(50000),
  langA: z.string().min(1),
  langB: z.string().min(1),
  priorities: PriorityWeightsSchema.optional(),
  explanationLevel: ExplanationLevelSchema.optional(),
  interviewMode: z.boolean().optional(),
  staticOnly: z.boolean().optional(),
  skipCache: z.boolean().optional(),
  sessionId: z.string().optional(),
});

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = AnalyzeRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const input = {
      problem: body.problem,
      codeA: body.codeA,
      codeB: body.codeB,
      langA: body.langA,
      langB: body.langB,
      priorities: body.priorities ?? {
        performance: 25,
        memory: 15,
        readability: 15,
        maintainability: 15,
        security: 10,
        interview: 10,
        production: 10,
      },
      explanationLevel: body.explanationLevel ?? 'normal',
      interviewMode: body.interviewMode ?? false,
      staticOnly: body.staticOnly ?? false,
    };

    const cacheKey = sha256Hash([
      input.problem,
      input.codeA,
      input.codeB,
      input.langA,
      input.langB,
      String(input.explanationLevel),
      String(input.interviewMode),
      JSON.stringify(input.priorities),
    ]);

    if (!body.skipCache && !input.staticOnly) {
      const cached = getCachedReport(cacheKey);
      if (cached) {
        return NextResponse.json({
          report: cached,
          cached: true,
          cacheKey,
        });
      }
    }

    const report = await runAnalysis({
      ...input,
      inputHash: cacheKey,
    });

    if (!input.staticOnly) {
      try {
        cacheReport(cacheKey, input, report);
      } catch {
        // cache failure should not fail request
      }
    }

    try {
      saveHistory(input, report, body.sessionId);
    } catch {
      // history failure should not fail request
    }

    return NextResponse.json({
      report,
      cached: false,
      cacheKey,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Analysis failed', detail: message },
      { status: 500 }
    );
  }
}

export async function GET(_req: Request) {
  return NextResponse.json(
    {
      name: 'WhiteCode Analyze API',
      method: 'POST',
      fields: [
        'problem',
        'codeA',
        'codeB',
        'langA',
        'langB',
        'priorities?',
        'explanationLevel?',
        'interviewMode?',
        'staticOnly?',
      ],
    },
    { status: 200 }
  );
}
