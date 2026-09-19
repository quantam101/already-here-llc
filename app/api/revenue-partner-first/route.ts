import { NextRequest, NextResponse } from 'next/server';
import {
  PARTNER_FIRST_DOCTRINE,
  rankPartnerFirstCandidates,
  type PartnerFirstCandidate
} from '@/lib/revenue-partner-first-policy';

export async function GET() {
  return NextResponse.json({
    ok: true,
    strategy: 'partner_first_revenue',
    doctrine: PARTNER_FIRST_DOCTRINE,
    externalActions: 'approval_gated'
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const candidates = body?.candidates;

  if (!Array.isArray(candidates)) {
    return NextResponse.json(
      { ok: false, error: 'candidates must be an array' },
      { status: 400 }
    );
  }

  const ranked = rankPartnerFirstCandidates(candidates as PartnerFirstCandidate[]);

  return NextResponse.json({
    ok: true,
    strategy: 'partner_first_revenue',
    doctrine: PARTNER_FIRST_DOCTRINE,
    ranked,
    externalActions: 'approval_gated'
  });
}
