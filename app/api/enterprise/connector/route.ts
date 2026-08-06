import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { getConnector, type ConnectorResult } from '@/lib/enterprise-connectors';

const requestSchema = z.object({
  connector: z.string().min(1),
  action: z.enum(['search', 'read', 'writeDraft']),
  identifier: z.string().max(500).optional().default(''),
  content: z.string().max(50_000).optional().default(''),
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
  if (!isValidKey(request.headers.get('x-internal-api-key'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const parseResult = requestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parseResult.error.issues }, { status: 400 });
  }

  const { connector, action, identifier, content } = parseResult.data;
  const adapter = getConnector(connector);
  if (!adapter) {
    return NextResponse.json({ error: 'Unknown connector' }, { status: 404 });
  }

  let result: ConnectorResult;
  switch (action) {
    case 'search':
      result = await adapter.search(identifier);
      break;
    case 'read':
      result = await adapter.read(identifier);
      break;
    case 'writeDraft':
      result = await adapter.writeDraft(identifier, content);
      break;
  }

  return NextResponse.json(result);
}
