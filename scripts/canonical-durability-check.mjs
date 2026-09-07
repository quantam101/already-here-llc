#!/usr/bin/env node
import crypto from 'node:crypto';

const baseUrl = (process.env.OCI_CANONICAL_URL || '').replace(/\/$/, '');
const apiKey = process.env.OCI_CANONICAL_API_KEY || '';
const restartUrl = process.env.OCI_CANONICAL_RESTART_URL || '';
const restartToken = process.env.OCI_CANONICAL_RESTART_TOKEN || '';

if (!baseUrl || !apiKey) {
  console.error('[DURABILITY][NOT_CONFIGURED] OCI_CANONICAL_URL and OCI_CANONICAL_API_KEY are required.');
  process.exit(2);
}

const headers = { 'content-type': 'application/json', 'x-api-key': apiKey };
const testId = `durability_${crypto.randomUUID()}`;
const table = 'verification_history';
const marker = crypto.randomBytes(16).toString('hex');

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

async function readBack() {
  const record = await request(`/read/${encodeURIComponent(table)}/${encodeURIComponent(testId)}`);
  if (!record || record.marker !== marker) throw new Error('Durability marker mismatch after read');
  return record;
}

await request('/write-many', {
  method: 'POST',
  body: JSON.stringify({
    writes: [{ table, id: testId, action: 'upsert', record: { id: testId, marker, check_type: 'durability', created_at: new Date().toISOString() } }],
  }),
});
await readBack();
console.log('[DURABILITY][PASS] write/read');

if (restartUrl && restartToken) {
  const restartResponse = await fetch(restartUrl, { method: 'POST', headers: { authorization: `Bearer ${restartToken}` } });
  if (!restartResponse.ok) throw new Error(`Restart hook failed: ${restartResponse.status}`);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await readBack();
  console.log('[DURABILITY][PASS] restart persistence');
} else {
  console.log('[DURABILITY][SKIP] restart hook not configured; write/read verified only');
}

const health = await fetch(`${baseUrl}/healthz`, { headers }).then(async (response) => ({ ok: response.ok, status: response.status, body: await response.text() }));
const ready = await fetch(`${baseUrl}/readyz`, { headers }).then(async (response) => ({ ok: response.ok, status: response.status, body: await response.text() }));
if (!health.ok || !ready.ok) throw new Error(`Health/readiness failure: health=${health.status} ready=${ready.status}`);
console.log('[DURABILITY][PASS] healthz/readyz');
console.log(JSON.stringify({ ok: true, testId, restartVerified: Boolean(restartUrl && restartToken) }, null, 2));
