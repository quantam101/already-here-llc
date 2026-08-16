import { NextResponse } from 'next/server';
import { buildWorkOrderRecords, matchTechniciansForWorkOrder, type WorkOrderInput } from '@/lib/field-operations';
import { getCanonicalStore } from '@/lib/canonical-store';
import { buildFollowUpRecord } from '@/lib/followups';

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

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  const text = asString(value);
  if (!text) return [];
  return text.split(/[,;\n]+/).map((v) => v.trim()).filter(Boolean);
}

function asNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inputFromBody(body: Record<string, unknown>): WorkOrderInput | null {
  const customerName = asString(body.customerName);
  const company = asString(body.company);
  const email = asString(body.email);
  const siteAddress = asString(body.siteAddress);
  const siteCity = asString(body.siteCity);
  const siteState = asString(body.siteState);
  const scope = asString(body.scope);
  const serviceType = asString(body.serviceType);

  if (!customerName || !company || !email || !siteAddress || !siteCity || !siteState || !scope || !serviceType) {
    return null;
  }

  return {
    source: asString(body.source) || 'work_order_api',
    sourceId: asString(body.sourceId) || undefined,
    customerName,
    company,
    email,
    phone: asString(body.phone) || undefined,
    siteAddress,
    siteCity,
    siteState,
    siteZip: asString(body.siteZip) || undefined,
    scope,
    serviceType,
    priority: ['low', 'normal', 'high', 'urgent'].includes(asString(body.priority)) ? (asString(body.priority) as WorkOrderInput['priority']) : 'normal',
    requestedDate: asString(body.requestedDate) || undefined,
    requestedWindow: asString(body.requestedWindow) || undefined,
    requiredSkills: asStringArray(body.requiredSkills),
    requiredCertifications: asStringArray(body.requiredCertifications),
    requiredTools: asStringArray(body.requiredTools),
    rateBudgetCents: asNumber(body.rateBudgetCents),
    estimatedValueCents: asNumber(body.estimatedValueCents),
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
    return NextResponse.json({ ok: false, error: 'Missing required work-order fields.' }, { status: 400 });
  }

  const writes = buildWorkOrderRecords(input);
  const writeResult = await getCanonicalStore().executeWrites(writes);
  if (!writeResult.ok) {
    return NextResponse.json({ ok: false, error: 'Canonical write failed.', failed: writeResult.failed }, { status: 500 });
  }

  const workOrderId = writes.find((w) => w.table === 'jobs')!.id;
  const organizationId = writes.find((w) => w.table === 'organizations')!.id;
  const contactId = writes.find((w) => w.table === 'contacts')!.id;

  const followUp = buildFollowUpRecord({
    source: input.source,
    sourceId: input.sourceId,
    organizationId,
    contactId,
    relatedRecordType: 'work_order',
    relatedRecordId: workOrderId,
    lane: 'field_operations',
    purpose: `Follow up on ${input.serviceType} work order for ${input.company}`,
    channel: 'email',
    offer: input.serviceType,
    status: 'open'
  });
  await getCanonicalStore().executeWrites([followUp]);

  const matches = await matchTechniciansForWorkOrder(workOrderId);

  return NextResponse.json({
    ok: true,
    workOrderId,
    canonicalRecordCount: writes.length,
    matchCandidates: matches.matches.length,
    matches: matches.matches
  });
}

export async function GET(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, error: 'Rate limit exceeded.' }, { status: 429 });
  }

  const url = new URL(request.url);
  const workOrderId = url.searchParams.get('id');
  const store = getCanonicalStore();

  if (workOrderId) {
    const record = await store.getRecord('jobs', workOrderId);
    if (!record) return NextResponse.json({ ok: false, error: 'Work order not found.' }, { status: 404 });
    const matches = await matchTechniciansForWorkOrder(workOrderId);
    return NextResponse.json({ ok: true, record, matches });
  }

  const records = await store.queryTable('jobs', 1000);
  return NextResponse.json({ ok: true, count: records.length, records });
}
