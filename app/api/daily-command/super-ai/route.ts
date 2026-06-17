import { NextResponse } from 'next/server';
import { runDailyCommandSuperAiOperation } from '@/lib/daily-command-super-ai';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const response = runDailyCommandSuperAiOperation({
    operation: body?.operation,
    prompt: typeof body?.prompt === 'string' ? body.prompt : undefined,
    title: typeof body?.title === 'string' ? body.title : undefined,
    body: typeof body?.body === 'string' ? body.body : undefined,
    source: typeof body?.source === 'string' ? body.source : 'daily-command-api',
    estimatedValue: Number.isFinite(Number(body?.estimatedValue)) ? Number(body.estimatedValue) : 0,
    queue: Array.isArray(body?.queue) ? body.queue : undefined,
    requestedAction: typeof body?.requestedAction === 'string' ? body.requestedAction : undefined
  });

  return NextResponse.json(response);
}
