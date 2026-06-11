import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const rateLimitWindowMs = 60_000;
const rateLimitMax = 20;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

const productizedOffers = [
  {
    id: 'ai-missed-call-recovery',
    name: 'AI Missed Call Recovery Agent',
    setupFee: 0,
    monthlyFee: 497,
    lane: 'ai_automation_offer',
    proofMetric: 'captured calls, booked jobs, recovered revenue'
  },
  {
    id: 'dispatch-intake-agent',
    name: 'Dispatch Intake and Quote Agent',
    setupFee: 500,
    monthlyFee: 750,
    lane: 'premium_dispatch',
    proofMetric: 'qualified scopes, faster quotes, booked work orders'
  },
  {
    id: 'retainer-procurement-radar',
    name: 'Retainer Procurement Radar',
    setupFee: 1000,
    monthlyFee: 1500,
    lane: 'retainer_procurement',
    proofMetric: 'new vendor targets, tracked bids, recurring opportunities'
  }
];

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimit.get(key);
  if (!current || current.resetAt <= now) {
    rateLimit.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }
  current.count += 1;
  return current.count > rateLimitMax;
}

function clean(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim().slice(0, 1200) : undefined;
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value * 100) / 100);
}

function normalizeOpportunities(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const title = clean(record.title);
      const source = clean(record.source);
      if (!title || !source) return null;
      return {
        id: clean(record.id),
        title,
        source,
        buyer: clean(record.buyer),
        location: clean(record.location),
        schedule: clean(record.schedule),
        fixedPay: cleanNumber(record.fixedPay),
        rate: cleanNumber(record.rate),
        estimatedHours: cleanNumber(record.estimatedHours),
        scope: clean(record.scope)
      };
    })
    .filter(Boolean)
    .slice(0, 50);
}

function buildPlan(opportunities: Array<Record<string, unknown>>) {
  const totalEstimatedRevenue = opportunities.reduce((sum, item) => {
    const fixedPay = typeof item.fixedPay === 'number' ? item.fixedPay : 0;
    const rate = typeof item.rate === 'number' ? item.rate : 0;
    const hours = typeof item.estimatedHours === 'number' ? item.estimatedHours : 0;
    return sum + Math.max(fixedPay, rate * hours);
  }, 0);

  return {
    status: opportunities.length ? 'opportunities-ready' : 'ready-for-intake',
    opportunityCount: opportunities.length,
    totalEstimatedRevenue,
    topActions: opportunities.length
      ? ['Prioritize highest-margin work', 'Confirm scope and schedule', 'Send quote or counter offer']
      : ['Capture lead intake', 'Qualify buyer urgency', 'Route to dispatch or AI automation offer'],
    taskReplacement: opportunities.length ? null : 'No new opportunities submitted. Use dispatch intake or procurement radar.'
  };
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) {
    return NextResponse.json({ ok: false, message: 'Too many revenue-mesh requests. Try again later.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: 'Invalid JSON payload.' }, { status: 400 });

  const opportunities = normalizeOpportunities(body.opportunities) as Array<Record<string, unknown>>;
  return NextResponse.json({
    ok: true,
    service: 'revenue-mesh',
    status: 'ready',
    plan: buildPlan(opportunities),
    selectedOffer: productizedOffers[0],
    timestamp: new Date().toISOString()
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'revenue-mesh',
    status: 'ready',
    operatingRules: [
      'No fake live claims.',
      'Use performance-aligned offers for small businesses.',
      'Prioritize retained and recurring revenue.'
    ],
    productizedOffers,
    taskReplacementWhenEmpty: 'No new opportunities submitted. Use dispatch intake or procurement radar.',
    timestamp: new Date().toISOString()
  });
}

export function OPTIONS() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
