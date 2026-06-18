import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = (process.env.SITE_URL || 'https://www.alreadyherellc.com').replace(/\/$/, '');
const mode = process.env.INTAKE_SMOKE_MODE || 'local-proof';
const receiptsDir = join(process.cwd(), 'hermes/receipts');

function nowIso() { return new Date().toISOString(); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }

function buildDispatchForm() {
  const form = new FormData();
  form.set('fullName', 'Hermes Smoke Test');
  form.set('company', 'Already Here LLC');
  form.set('email', process.env.INTAKE_TEST_EMAIL || 'smoke@example.invalid');
  form.set('phone', '(602) 882-2920');
  form.set('siteCity', 'Phoenix');
  form.set('siteZip', '85007');
  form.set('serviceType', 'Technical field operations');
  form.set('requestedDate', '2026-01-01');
  form.set('requestedTime', '09:00');
  form.set('requestedWindow', 'Smoke test window');
  form.set('ticketNumber', `SMOKE-${Date.now()}`);
  form.set('message', 'Hermes intake smoke test. Do not schedule. Verify receipt, dispatch ID, revenue spine records, agent assignment, and local proof path. $500 revenue target check.');
  return form;
}

async function run() {
  const startedAt = nowIso();
  const checks = [];

  for (const route of ['/dispatch', '/rfq', '/revenue-command']) {
    const response = await fetch(`${baseUrl}${route}`);
    const html = await response.text();
    checks.push({ route, statusCode: response.status, ok: response.ok, hasExpectedText: /Submit|Quote|Revenue Command|Owned database|Dispatch/i.test(html) });
  }

  const spineResponse = await fetch(`${baseUrl}/api/revenue-command-spine`);
  const spineText = await spineResponse.text();
  const spineJson = JSON.parse(spineText);
  checks.push({ route: '/api/revenue-command-spine', statusCode: spineResponse.status, ok: spineResponse.ok, agentCoverage: spineJson?.agentCoverage?.oneAgentPerTask === true, records: spineJson?.agentCoverage?.recordCount, agents: spineJson?.agentCoverage?.agentCount });

  const proofResponse = await fetch(`${baseUrl}/api/revenue-command-spine/intake?demo=all`);
  const proofText = await proofResponse.text();
  const proofJson = JSON.parse(proofText);
  checks.push({ route: '/api/revenue-command-spine/intake?demo=all', statusCode: proofResponse.status, ok: proofResponse.ok, demoCount: proofJson?.demos?.length, demoLanes: proofJson?.demos?.map((demo) => demo.lane) });

  let submitResult = { skipped: true, reason: 'Set INTAKE_SMOKE_MODE=off to skip; default local-proof posts to /api/dispatch without external delivery.' };
  if (mode !== 'off') {
    const isExternal = mode === 'external-submit';
    const response = await fetch(`${baseUrl}/api/dispatch${isExternal ? '' : '?mode=local-proof'}`, {
      method: 'POST',
      headers: isExternal ? undefined : { 'x-ah-local-proof': 'true' },
      body: buildDispatchForm()
    });
    const text = await response.text();
    const json = JSON.parse(text);
    submitResult = {
      skipped: false,
      mode: isExternal ? 'external-submit' : 'local-proof',
      statusCode: response.status,
      ok: response.ok,
      dispatchId: json.dispatchId,
      delivery: json.delivery,
      recordLocation: json.recordLocation,
      lane: json.revenueSpine?.lane,
      priority: json.revenueSpine?.priority,
      assignedAgentId: json.revenueSpine?.assignedAgentId,
      writeCount: json.revenueSpine?.databaseReadyWrites?.length,
      persistedExternally: json.persistedExternally ?? json.revenueSpine?.persistedExternally
    };
  }

  const ok = checks.every((check) => check.ok && (check.hasExpectedText ?? true) && (check.agentCoverage ?? true)) && (submitResult.skipped || (submitResult.ok && submitResult.persistedExternally === false && submitResult.writeCount >= 10));
  const receipt = { schemaVersion: 2, mission: 'a-plus.intake-contract-smoke', startedAt, finishedAt: nowIso(), status: ok ? 'pass' : 'fail', mode, checks, submitResult };
  const canonical = JSON.stringify(receipt, null, 2);
  const hash = sha256(canonical);
  mkdirSync(receiptsDir, { recursive: true });
  const receiptPath = join(receiptsDir, `${receipt.finishedAt.replace(/[:.]/g, '-')}-intake-contract-smoke.json`);
  writeFileSync(receiptPath, JSON.stringify({ ...receipt, hash }, null, 2) + '\n');
  console.log(JSON.stringify({ status: receipt.status, mode, receipt: receiptPath, hash, checks, submitResult }, null, 2));
  process.exit(ok ? 0 : 1);
}

run();
