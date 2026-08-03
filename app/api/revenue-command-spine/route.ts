import { NextResponse } from 'next/server';
import { getRevenueCommandAgents, validateRevenueAgentCoverage } from '@/lib/revenue-command-agents';
import { getDatabaseStats } from '@/lib/revenue-command-db';
import { applyReviewAction, getRevenueCommandSpineResponse, type ReviewAction } from '@/lib/revenue-command-spine';

function isReviewAction(value: unknown): value is ReviewAction {
  return ['review', 'pass', 'reply', 'assign', 'quote', 'schedule', 'prove'].includes(String(value));
}

export async function GET() {
  return NextResponse.json({
    ...getRevenueCommandSpineResponse(),
    agents: getRevenueCommandAgents(),
    agentCoverage: validateRevenueAgentCoverage(),
    databaseStats: getDatabaseStats()
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const recordId = typeof body?.recordId === 'string' ? body.recordId : 'unknown-record';
  const action = isReviewAction(body?.action) ? body.action : 'review';

  return NextResponse.json({
    ...applyReviewAction(recordId, action),
    agentCoverage: validateRevenueAgentCoverage()
  });
}
