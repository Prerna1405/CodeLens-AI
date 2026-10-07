import { NextResponse } from 'next/server';
import { z } from 'zod';
import { runAnalysis } from '@/lib/services';
import type { AnalysisPhase } from '@/lib/services/analysisOrchestrator';
import { PriorityWeightsSchema, ExplanationLevelSchema } from '@/lib/types/analysis';
import type { AnalysisReport } from '@/lib/types/analysis';
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
  const encoder = new TextEncoder();

  try {
    const raw = await req.json();
    const parsed = AnalyzeRequestSchema.safeParse(raw);

    if (!parsed.success) {
      const body = JSON.stringify({
        error: 'Invalid request body',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return new Response(
        encoder.encode(`event: error\ndata: ${body}\n\n`),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        },
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

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (!body.skipCache && !input.staticOnly) {
            const cached = getCachedReport(cacheKey);
            if (cached) {
              controller.enqueue(
                encoder.encode(
                  `event: phase\ndata: ${JSON.stringify({
                    phase: 'syntax' as AnalysisPhase,
                    percent: 100,
                    message: 'Serving cached report.',
                  })}\n\n`,
                ),
              );
              controller.enqueue(
                encoder.encode(
                  `event: done\ndata: ${JSON.stringify({
                    report: cached,
                    cached: true,
                    cacheKey,
                  })}\n\n`,
                ),
              );
              controller.close();
              return;
            }
          }

          const onPhase = (info: { phase: AnalysisPhase; percent: number; message: string }) => {
            controller.enqueue(
              encoder.encode(`event: phase\ndata: ${JSON.stringify(info)}\n\n`),
            );
          };

          const report = await runAnalysis({
            ...input,
            inputHash: cacheKey,
            onProgress: (phase, detail) => onPhase({ phase, percent: 50, message: detail ?? phase }),
          });

          if (!input.staticOnly) {
            try {
              cacheReport(cacheKey, input, report);
            } catch {
            }
          }

          try {
            saveHistory(input, report, body.sessionId);
          } catch {
          }

          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({
                report,
                cached: false,
                cacheKey,
              })}\n\n`,
            ),
          );
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                error: 'Analysis failed',
                detail: message,
              })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const body = JSON.stringify({ error: 'Analysis failed', detail: message });
    return new Response(
      encoder.encode(`event: error\ndata: ${body}\n\n`),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      },
    );
  }
}

export async function GET(_req: Request) {
  return NextResponse.json(
    {
      name: 'WhiteCode Analyze Stream API',
      method: 'POST',
      eventStream: true,
      events: ['phase', 'done', 'error'],
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
    { status: 200 },
  );
}
