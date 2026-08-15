import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { queryCatchCorrectEvents, queryCodexEvents, recordCatchCorrectEvent, recordCodexEvent } from '@/lib/codex';

const INTERNAL_API_KEY = process.env.AHFOS_INTERNAL_API_KEY;

function isValidKey(provided: string | null): boolean {
  if (!INTERNAL_API_KEY) return true;
  if (!provided) return false;
  const expected = Buffer.from(INTERNAL_API_KEY);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

const codexSchema = z.object({
  source: z.string().min(1).max(200),
  module: z.string().min(1).max(100),
  changeType: z.string().min(1).max(100),
  description: z.string().min(1).max(5000),
  status: z.enum(['open', 'in_progress', 'verified', 'closed']).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

const catchCorrectSchema = z.object({
  source: z.string().min(1).max(200),
  failureType: z.string().min(1).max(100),
  evidence: z.string().min(1).max(5000),
  proposedCorrection: z.string().min(1).max(5000),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
  relatedCodexId: z.string().max(100).optional(),
});

const postSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('codex') }).merge(codexSchema),
  z.object({ type: z.literal('catch-correct') }).merge(catchCorrectSchema),
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 1000);
  const [codexEvents, catchCorrectEvents] = await Promise.all([
    queryCodexEvents(limit),
    queryCatchCorrectEvents(limit)
  ]);
  return NextResponse.json({
    ok: true,
    codexEvents,
    catchCorrectEvents,
  });
}

export async function POST(request: Request) {
  const provided = request.headers.get('x-internal-api-key');
  if (!isValidKey(provided)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const parseResult = postSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parseResult.error.issues }, { status: 400 });
  }

  const data = parseResult.data;
  let id: string;
  if (data.type === 'codex') {
    id = await recordCodexEvent(data);
  } else {
    id = await recordCatchCorrectEvent(data);
  }

  return NextResponse.json({ ok: true, id });
}
