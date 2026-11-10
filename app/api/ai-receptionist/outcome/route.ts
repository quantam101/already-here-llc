import { NextResponse } from 'next/server.js';
import { decideOutcome, executeOutcome, type OutcomeLead } from '@/lib/conversation-outcome';

export const runtime = 'nodejs';

const rateLimitWindowMs = 60_000;
const rateLimitMax = 10;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown';
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

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json({ ok: false, message: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const lead: OutcomeLead = body.lead && typeof body.lead === 'object' ? body.lead : body;

  const decision = decideOutcome(lead);
  const execution = await executeOutcome(request.url, lead, decision);

  const kind = execution.executed === 'intake_fallback' && decision.kind === 'dispatch_created' ? 'urgent_escalation' : decision.kind;

  return NextResponse.json({
    ok: true,
    loop: 'closed',
    outcome: kind,
    serviceLabel: decision.serviceLabel,
    policyChecks: decision.policyChecks,
    quoteRangeUsd: decision.quoteRangeUsd,
    responseWindow: decision.responseWindow,
    priority: decision.priority,
    confirmation: decision.confirmation,
    execution,
    timestamp: new Date().toISOString()
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'ai-receptionist-outcome',
    status: 'ready',
    loop: 'intent -> policy check -> execute -> confirm',
    capabilities: ['policy_check', 'issue_quote', 'create_work_order', 'technician_match', 'urgent_escalation', 'coverage_check'],
    timestamp: new Date().toISOString()
  });
}
