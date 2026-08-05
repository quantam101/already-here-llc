import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { dispatchObjective } from '@/lib/asi-dispatcher';
import { runEnterpriseOperation } from '@/lib/global-enterprise-orchestrator';

const requestSchema = z.object({
  objective: z.string().min(1).max(4000),
  estimatedValue: z.coerce.number().finite().default(0),
  source: z.string().max(200).optional().default('asi-dispatch'),
});

const INTERNAL_API_KEY = process.env.AHFOS_INTERNAL_API_KEY;

function isValidKey(provided: string | null): boolean {
  if (!INTERNAL_API_KEY || !provided) return false;
  const expected = Buffer.from(INTERNAL_API_KEY);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  const provided = request.headers.get('x-internal-api-key');
  if (!isValidKey(provided)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const parseResult = requestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parseResult.error.issues }, { status: 400 });
  }

  const { objective, estimatedValue, source } = parseResult.data;
  const dispatch = await dispatchObjective(objective, estimatedValue, source);
  const result = runEnterpriseOperation({
    operation: dispatch.operation,
    title: dispatch.title,
    body: dispatch.body,
    source: dispatch.source,
    estimatedValue: dispatch.estimatedValue,
  });

  return NextResponse.json({ ...result, dispatch });
}
