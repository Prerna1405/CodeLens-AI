import { NextResponse } from 'next/server';
import { listHistory, getHistoryById } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get('id');
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
  const sessionId = searchParams.get('sessionId') || undefined;

  if (idParam) {
    const id = parseInt(idParam, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const report = getHistoryById(id);
    if (!report) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ id, report });
  }

  const items = listHistory(limit, sessionId);
  return NextResponse.json({ items, count: items.length });
}
