import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { runEnterpriseOperation } from '@/lib/global-enterprise-orchestrator';

const CRON_SECRET = process.env.AHFOS_CRON_SECRET;

function isValidCronKey(provided: string | null): boolean {
  if (!CRON_SECRET || !provided) return false;
  const expected = Buffer.from(CRON_SECRET);
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  const provided = request.headers.get('x-cron-secret');
  if (!isValidCronKey(provided)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scan = runEnterpriseOperation({
    operation: 'scan_opportunities',
    prompt: 'Daily autonomous scan: procurement, grants, field-service, teaming, and technical-assistance opportunities for Already Here LLC.',
    title: 'Daily opportunity scan',
    source: 'enterprise-cron',
  });

  const summary = runEnterpriseOperation({
    operation: 'summarize_daily_command',
    prompt: 'Daily command summary',
    title: 'Daily command summary',
    source: 'enterprise-cron',
  });

  return NextResponse.json({
    ok: true,
    service: 'already-here-enterprise-cron',
    timestamp: new Date().toISOString(),
    scanSummary: scan.summary,
    dailySummary: summary.summary,
    stats: summary.stats,
    nextAgent: 'owner_approval_gate',
    approvalRequired: true,
  });
}
