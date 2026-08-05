import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import {
  runEnterpriseOperation,
  ENTERPRISE_OPERATIONS,
  ENTERPRISE_PROCESS_IDS,
  type EnterpriseOperation,
  type EnterpriseProcessId,
} from '@/lib/global-enterprise-orchestrator';

const OPERATION_ENUM = ENTERPRISE_OPERATIONS as unknown as readonly [EnterpriseOperation, ...EnterpriseOperation[]];
const PROCESS_ENUM = ENTERPRISE_PROCESS_IDS as unknown as readonly [EnterpriseProcessId, ...EnterpriseProcessId[]];

const enterpriseItemSchema = z.object({
  itemId: z.string().min(1),
  process: z.enum(PROCESS_ENUM),
  source: z.string().max(200).optional().default('enterprise-api'),
  title: z.string().min(1).max(500),
  body: z.string().max(4000).optional().default(''),
  lane: z.string().max(100).optional().default('Enterprise General'),
  priority: z.enum(['P0', 'P1', 'P2']).optional().default('P2'),
  estimatedValue: z.coerce.number().finite().default(0),
  status: z.enum(['new', 'ranked', 'blocked', 'approved']).optional().default('new'),
});

const requestSchema = z.object({
  operation: z.enum(OPERATION_ENUM).optional(),
  prompt: z.string().max(4000).optional(),
  title: z.string().max(500).optional(),
  body: z.string().max(4000).optional(),
  source: z.string().max(200).optional(),
  estimatedValue: z.coerce.number().finite().default(0),
  queue: z.array(enterpriseItemSchema).max(1000).optional(),
  requestedAction: z.string().max(200).optional(),
});

const INTERNAL_API_KEY = process.env.AHFOS_INTERNAL_API_KEY;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const requestLog = new Map<string, number[]>();

function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(clientId) ?? [];
  const recent = timestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  requestLog.set(clientId, recent);
  return false;
}

function isValidKey(provided: string | null): boolean {
  if (!INTERNAL_API_KEY || !provided) return false;
  const expected = Buffer.from(INTERNAL_API_KEY);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function toOperation(value: string | null | undefined): EnterpriseOperation | undefined {
  if (!value) return undefined;
  return ENTERPRISE_OPERATIONS.includes(value as EnterpriseOperation)
    ? (value as EnterpriseOperation)
    : undefined;
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function tooManyRequests(): NextResponse {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}

function invalidInput(error: z.ZodError): NextResponse {
  return NextResponse.json({ error: 'Invalid input', issues: error.issues }, { status: 400 });
}

export async function GET(request: Request) {
  if (isRateLimited(getClientId(request))) {
    return tooManyRequests();
  }

  const url = new URL(request.url);
  const operation = toOperation(url.searchParams.get('operation'));

  if (operation !== 'healthcheck_backend' && !isValidKey(request.headers.get('x-internal-api-key'))) {
    return unauthorized();
  }

  const parseResult = requestSchema.safeParse({
    operation: url.searchParams.get('operation') || undefined,
    prompt: url.searchParams.get('prompt') ?? undefined,
    title: url.searchParams.get('title') ?? undefined,
    body: url.searchParams.get('body') ?? undefined,
    source: url.searchParams.get('source') ?? undefined,
    estimatedValue: url.searchParams.get('estimatedValue') ?? 0,
    requestedAction: url.searchParams.get('requestedAction') ?? undefined,
  });

  if (!parseResult.success) {
    return invalidInput(parseResult.error);
  }

  const response = runEnterpriseOperation(parseResult.data);
  return NextResponse.json(response);
}

export async function POST(request: Request) {
  if (isRateLimited(getClientId(request))) {
    return tooManyRequests();
  }

  if (!isValidKey(request.headers.get('x-internal-api-key'))) {
    return unauthorized();
  }

  const rawBody = await request.json().catch(() => ({}));
  const parseResult = requestSchema.safeParse(rawBody);

  if (!parseResult.success) {
    return invalidInput(parseResult.error);
  }

  const response = runEnterpriseOperation(parseResult.data);
  return NextResponse.json(response);
}
