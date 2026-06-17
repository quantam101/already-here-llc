import { NextResponse } from 'next/server';
import { runDailyCommandSuperAiOperation, type DailyCommandSuperAiOperation } from '@/lib/daily-command-super-ai';

function toOperation(value: string | null | undefined): DailyCommandSuperAiOperation | undefined {
  if (!value) return undefined;
  return value as DailyCommandSuperAiOperation;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = runDailyCommandSuperAiOperation({
    operation: toOperation(url.searchParams.get('operation')),
    prompt: url.searchParams.get('prompt') ?? undefined,
    title: url.searchParams.get('title') ?? undefined,
    body: url.searchParams.get('body') ?? undefined,
    source: url.searchParams.get('source') ?? 'daily-command-api-get',
    estimatedValue: Number.isFinite(Number(url.searchParams.get('estimatedValue'))) ? Number(url.searchParams.get('estimatedValue')) : 0,
    requestedAction: url.searchParams.get('requestedAction') ?? undefined
  });

  return NextResponse.json(response);
}

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
