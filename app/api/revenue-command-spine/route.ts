import { NextResponse } from 'next/server';
import { getRevenueCommandAgents, validateRevenueAgentCoverage } from '@/lib/revenue-command-agents';
import { applyReviewAction, getDatabaseReadyRecords, getRevenueCommandSpineResponse, type ReviewAction } from '@/lib/revenue-command-spine';
import { getCanonicalStore } from '@/lib/canonical-store';

const VALID_RECORD_IDS = new Set(getDatabaseReadyRecords().map((record) => record.id));

function isReviewAction(value: unknown): value is ReviewAction {
  return ['review', 'pass', 'reply', 'assign', 'quote', 'schedule', 'prove'].includes(String(value));
}

function isValidRecordId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 120 && VALID_RECORD_IDS.has(value);
}

export async function GET() {
  return NextResponse.json({
    ...getRevenueCommandSpineResponse(),
    agents: getRevenueCommandAgents(),
    agentCoverage: validateRevenueAgentCoverage()
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const recordId = isValidRecordId(body?.recordId) ? body.recordId : undefined;
  const action = isReviewAction(body?.action) ? body.action : 'review';

  if (!recordId) {
    return NextResponse.json({ ok: false, error: 'Invalid or missing recordId' }, { status: 400 });
  }

  const review = applyReviewAction(recordId, action);
  const reviewId = await getCanonicalStore().recordReviewAction({
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
