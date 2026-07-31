import { NextResponse } from 'next/server.js';
import { findMatches, loadNetwork } from '@/lib/ginc-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || undefined;
  const category = searchParams.get('category') || undefined;
  const assetType = searchParams.get('assetType') || undefined;
  const [network, matches] = await Promise.all([loadNetwork(), findMatches(state, category, assetType)]);
  return NextResponse.json({ members: network.members, listings: network.listings, jobs: network.jobs, matches });
}
