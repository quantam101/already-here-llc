import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = (process.env.SITE_URL || 'https://www.alreadyherellc.com').replace(/\/$/, '');
const mode = process.env.INTAKE_SMOKE_MODE || 'dry-run';
const receiptsDir = join(process.cwd(), 'hermes/receipts');

function nowIso() { return new Date().toISOString(); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }

function buildDispatchForm() {
  const form = new FormData();
  form.set('fullName', 'Hermes Smoke Test');
  form.set('company', 'Already Here LLC');
  form.set('email', process.env.INTAKE_TEST_EMAIL || 'dispatch@alreadyherellc.com');
  form.set('phone', '(602) 882-2920');
  form.set('siteCity', 'Phoenix');
  form.set('siteZip', '85007');
  form.set('serviceType', 'Technical field operations');
  form.set('requestedDate', '2026-01-01');
  form.set('requestedTime', '09:00');
  form.set('requestedWindow', 'Smoke test window');
  form.set('ticketNumber', `SMOKE-${Date.now()}`);
  form.set('message', 'Hermes intake smoke test. Do not schedule. Verify receipt, dispatch ID, and record creation.');
  return form;
}

async function run() {
  const startedAt = nowIso();
  const checks = [];

  for (const route of ['/dispatch', '/rfq']) {
    const response = await fetch(`${baseUrl}${route}`);
    const html = await response.text();
    checks.push({ route, statusCode: response.status, ok: response.ok, hasFormText: /Submit|Send Scope|Quote|Request/i.test(html) });
  }

  let submitResult = { skipped: true, reason: 'Set INTAKE_SMOKE_MODE=submit to post to /api/dispatch.' };
  if (mode === 'submit') {
    const response = await fetch(`${baseUrl}/api/dispatch`, { method: 'POST', body: buildDispatchForm() });
    const text = await response.text();
    submitResult = { skipped: false, statusCode: response.status, ok: response.ok, responseTail: text.slice(-1000) };
  }

  const ok = checks.every((check) => check.ok && check.hasFormText) && (submitResult.skipped || submitResult.ok);
  const receipt = { schemaVersion: 1, mission: 'a-plus.intake-contract-smoke', startedAt, finishedAt: nowIso(), status: ok ? 'pass' : 'fail', mode, checks, submitResult };
  const canonical = JSON.stringify(receipt, null, 2);
  const hash = sha256(canonical);
  mkdirSync(receiptsDir, { recursive: true });
  const receiptPath = join(receiptsDir, `${receipt.finishedAt.replace(/[:.]/g, '-')}-intake-contract-smoke.json`);
  writeFileSync(receiptPath, JSON.stringify({ ...receipt, hash }, null, 2) + '\n');
  console.log(JSON.stringify({ status: receipt.status, mode, receipt: receiptPath, hash, checks, submitResult }, null, 2));
  process.exit(ok ? 0 : 1);
}

run();
