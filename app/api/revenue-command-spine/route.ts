import { NextResponse } from 'next/server';
import { getDatabaseStats, getRecord } from '@/lib/revenue-command-db';
import { getRevenueCommandAgents, validateRevenueAgentCoverage } from '@/lib/revenue-command-agents';
import { applyPipelineAction, type PipelineAction } from '@/lib/revenue-command-pipeline';
import { applyReviewAction, getRevenueCommandSpineResponse, type ReviewAction } from '@/lib/revenue-command-spine';

function isReviewAction(value: unknown): value is ReviewAction {
  return ['review', 'pass', 'reply', 'assign', 'quote', 'schedule', 'prove'].includes(String(value));
}

function isPipelineAction(value: unknown): value is PipelineAction {
  return ['review', 'pass', 'reply', 'assign', 'quote', 'schedule', 'prove', 'invoice', 'payment', 'repeat'].includes(String(value));
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
  const recordId = typeof body?.recordId === 'string' ? body.recordId : typeof body?.opportunityId === 'string' ? body.opportunityId : 'unknown-record';
  const action = isPipelineAction(body?.action) ? body.action : 'review';

  const opportunity = getRecord('opportunities', recordId);
  if (opportunity) {
    const result = await applyPipelineAction(recordId, action, 'api_revenue_command_spine');
    return NextResponse.json({ ...result, recordId: result.opportunityId, agentCoverage: validateRevenueAgentCoverage() });
  }

  if (isReviewAction(action)) {
    return NextResponse.json({
      ...applyReviewAction(recordId, action),
      agentCoverage: validateRevenueAgentCoverage()
    });
  }

  return NextResponse.json({ ok: false, message: 'Unknown record or action' }, { status: 400 });
}
