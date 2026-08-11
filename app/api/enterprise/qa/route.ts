import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { buildQaPacket } from '@/lib/ahfos-qa';

const requestSchema = z.object({
  contactId: z.string().min(1).optional(),
  opportunityId: z.string().min(1).optional(),
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

  const { contactId, opportunityId } = parseResult.data;
  if (!contactId && !opportunityId) {
    return NextResponse.json({ error: 'Provide contactId or opportunityId' }, { status: 400 });
  }

  const packet = buildQaPacket({ contactId, opportunityId });
  return NextResponse.json(packet);
}
