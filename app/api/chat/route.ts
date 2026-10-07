import { NextResponse } from 'next/server';
import { z } from 'zod';
import { callChatLLM } from '@/lib/services/llmService';
import type { AnalysisReport } from '@/lib/types/analysis';
import { AnalysisReportSchema } from '@/lib/types/analysis';

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().max(20000),
    })
  ).min(1).max(100),
  report: AnalysisReportSchema.optional(),
});

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = ChatRequestSchema.safeParse(raw);

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

    const { messages, report } = parsed.data;
    const context: { report?: AnalysisReport | null } = report ? { report } : {};

    const reply = await callChatLLM(messages, context);

    return NextResponse.json({
      role: 'assistant' as const,
      content: reply,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: 'Chat request failed', detail: message },
      { status: 500 }
    );
  }
}
