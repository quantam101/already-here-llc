import { NextResponse } from 'next/server';
import { extractInternalApiKey, isInternalApiKeyValid } from '@/lib/internal-auth';
import {
  SUPERVISOR,
  getIncomeSystem,
  getIncomeSystems,
  getProcessAgents,
  createEngineContext,
  getRoadmap,
  isIncomeSystemId,
  runIncomeSystem,
  validateSystemInput,
  verifyPassiveIncomeEngine
} from '@/lib/passive-income-engine';

export const runtime = 'nodejs';
export const maxDuration = 60;
/** Provider calls stop once this budget is spent so deterministic fallback always finishes inside maxDuration. */
const PROVIDER_BUDGET_MS = 40_000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const systemParam = url.searchParams.get('system');
  const view = url.searchParams.get('view');

  if (systemParam && !isIncomeSystemId(systemParam)) {
    return NextResponse.json({ ok: false, message: 'Unknown income system.' }, { status: 400 });
  }

  if (view === 'verify') {
    const verification = verifyPassiveIncomeEngine();
    return NextResponse.json(
      { ok: verification.ok, service: 'passive-income-engine', verification, timestamp: new Date().toISOString() },
      { status: verification.ok ? 200 : 500 }
    );
  }

  if (isIncomeSystemId(systemParam)) {
    return NextResponse.json({
      ok: true,
      service: 'passive-income-engine',
      system: getIncomeSystem(systemParam),
      timestamp: new Date().toISOString()
    });
  }

  return NextResponse.json({
    ok: true,
    service: 'passive-income-engine',
    mode: 'strict_zero_spend',
    supervisor: SUPERVISOR,
    systems: getIncomeSystems(),
    agents: getProcessAgents(),
    roadmap: getRoadmap(),
    verification: verifyPassiveIncomeEngine(),
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  if (!isInternalApiKeyValid(extractInternalApiKey(request.headers))) {
    return NextResponse.json({ ok: false, message: 'Unauthorized.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON body.' }, { status: 400 });
  }

  const input = validateSystemInput(body);
  if ('error' in input) {
    return NextResponse.json({ ok: false, message: input.error }, { status: 400 });
  }

  const run = await runIncomeSystem(input, createEngineContext({ budgetMs: PROVIDER_BUDGET_MS }));
  return NextResponse.json(
    { ok: run.ok, service: 'passive-income-engine', run, timestamp: new Date().toISOString() },
    { status: run.ok ? 200 : 422 }
  );
}
