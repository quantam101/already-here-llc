import { NextResponse } from 'next/server';
import {
  EXPECTED_AGENT_COUNT,
  EXPECTED_THREAD_COUNT,
  getAgent,
  getAgentFleet,
  getFleetSummary,
  getFleetThreads,
  isFleetRepo,
  verifyAgentFleet
} from '@/lib/agent-fleet';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const repoParam = url.searchParams.get('repo');
  const agentParam = url.searchParams.get('agent');
  const view = url.searchParams.get('view');

  if (repoParam && !isFleetRepo(repoParam)) {
    return NextResponse.json({ ok: false, message: 'Unknown repo.' }, { status: 400 });
  }

  const repo = isFleetRepo(repoParam) ? repoParam : undefined;

  if (agentParam) {
    const agent = getAgent(agentParam);
    if (!agent) return NextResponse.json({ ok: false, message: 'Unknown agent.' }, { status: 404 });
    return NextResponse.json({ ok: true, service: 'agent-fleet', agent, timestamp: new Date().toISOString() });
  }

  if (view === 'verify') {
    const verification = verifyAgentFleet();
    return NextResponse.json(
      { ok: verification.ok, service: 'agent-fleet', verification, timestamp: new Date().toISOString() },
      { status: verification.ok ? 200 : 500 }
    );
  }

  if (view === 'threads') {
    return NextResponse.json({
      ok: true,
      service: 'agent-fleet',
      repo: repo ?? 'all',
      threads: getFleetThreads(repo),
      timestamp: new Date().toISOString()
    });
  }

  return NextResponse.json({
    ok: true,
    service: 'agent-fleet',
    mode: 'strict_zero_spend',
    expected: { agents: EXPECTED_AGENT_COUNT, threads: EXPECTED_THREAD_COUNT },
    summary: getFleetSummary(),
    agents: getAgentFleet(repo),
    verification: verifyAgentFleet(),
    timestamp: new Date().toISOString()
  });
}
