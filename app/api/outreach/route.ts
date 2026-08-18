import { NextResponse } from 'next/server';
import { buildOutreachRecords, type OutreachInput } from '@/lib/outreach';
import { getCanonicalStore } from '@/lib/canonical-store';

export const runtime = 'nodejs';

const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

const validChannels = ['email', 'phone', 'social', 'sms', 'in_person', 'vendor', 'other'];
const validStatuses = ['draft', 'ready', 'sent', 'responded', 'meeting', 'proposal', 'won', 'lost', 'no_response', 'do_not_contact', 'bounced'];

function inputFromBody(body: Record<string, unknown>): OutreachInput | null {
  const fullName = asString(body.fullName);
  const company = asString(body.company);
  const messageType = asString(body.messageType);
  const offer = asString(body.offer);
  const channel = asString(body.channel) || 'email';

  if (!fullName || !company || !messageType || !offer) return null;
  if (!validChannels.includes(channel)) return null;

  const status = asString(body.status);

  return {
    source: asString(body.source) || 'outreach_api',
    sourceId: asString(body.sourceId) || undefined,
    channel: channel as OutreachInput['channel'],
    fullName,
    company,
    email: asString(body.email) || undefined,
    phone: asString(body.phone) || undefined,
    domain: asString(body.domain) || undefined,
    messageType,
    offer,
    messageBody: asString(body.messageBody) || undefined,
    response: asString(body.response) || undefined,
    status: validStatuses.includes(status) ? (status as OutreachInput['status']) : 'draft',
    nextAction: asString(body.nextAction) || undefined,
    nextFollowUpDate: asString(body.nextFollowUpDate) || undefined,
    assignedTo: asString(body.assignedTo) || undefined,
    submittedAt: asString(body.submittedAt) || undefined
  };
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = inputFromBody(body);
  if (!input) {
    return NextResponse.json({ ok: false, error: 'Missing required outreach fields.' }, { status: 400 });
  }

  const writes = buildOutreachRecords(input);
  const writeResult = await getCanonicalStore().executeWrites(writes);
  if (!writeResult.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: writeResult.failed }, { status: 500 });
  }

  const outreachId = writes.find((w) => w.table === 'outreach')!.id;
  return NextResponse.json({ ok: true, outreachId, canonicalRecordCount: writes.length });
}

export async function GET(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const outreachId = url.searchParams.get('id');
  const store = getCanonicalStore();

  if (outreachId) {
    const record = await store.getRecord('outreach', outreachId);
    if (!record) return NextResponse.json({ ok: false, error: 'Outreach record not found.' }, { status: 404 });
    return NextResponse.json({ ok: true, record });
  }

  const records = await store.queryTable('outreach', 1000);
  return NextResponse.json({ ok: true, count: records.length, records });
}
