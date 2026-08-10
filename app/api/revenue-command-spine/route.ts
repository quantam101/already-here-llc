import { NextResponse } from 'next/server';
import { getRevenueCommandAgents, validateRevenueAgentCoverage } from '@/lib/revenue-command-agents';
import { applyReviewAction, getRevenueCommandSpineResponse, type ReviewAction } from '@/lib/revenue-command-spine';
import { getCanonicalStore } from '@/lib/canonical-store';

function isReviewAction(value: unknown): value is ReviewAction {
  return ['review', 'pass', 'reply', 'assign', 'quote', 'schedule', 'prove'].includes(String(value));
}

export async function GET() {
  return NextResponse.json({
    ...getRevenueCommandSpineResponse(),
    agents: getRevenueCommandAgents({ persist: true }),
    agentCoverage: validateRevenueAgentCoverage()
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const recordId = typeof body?.recordId === 'string' ? body.recordId : 'unknown-record';
  const action = isReviewAction(body?.action) ? body.action : 'review';

  const review = applyReviewAction(recordId, action);
  const reviewId = getCanonicalStore().recordReviewAction({
    targetTable: 'revenue_command_records',
    targetId: recordId,
    action,
    decision: review.nextLocalState,
    persistedExternally: review.persistedExternally,
    approvalRequired: review.approvalRequired,
    source: 'revenue_command_spine_api'
  });

  return NextResponse.json({
    ...review,
    reviewId,
    agentCoverage: validateRevenueAgentCoverage()
  });
}
