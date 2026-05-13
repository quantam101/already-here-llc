import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = (process.env.SITE_URL || 'https://www.alreadyherellc.com').replace(/\/$/, '');
const receiptsDir = join(process.cwd(), 'hermes/receipts');

const routes = [
  { path: '/', mustContain: ['Request Project Quote', 'View Project Gallery', 'Check Coverage'] },
  { path: '/dispatch', mustContain: ['After submission', 'dispatch ID', 'Send Scope'] },
  { path: '/rfq', mustContain: ['Request', 'Quote'] },
  { path: '/coverage', mustContain: ['Coverage'] },
  { path: '/project-gallery', mustContain: ['Project gallery'] },
  { path: '/capability-statement', mustContain: ['Already Here LLC'] }
];

const forbidden = [/SDVOSB[-\s]certified|SDVOSB Certified/i, /set-aside|sole-source/i, /endpoint must be configured|before the form can deliver production/i, /Government\s*\/\s*SDVOSB\s*set-aside/i];

function nowIso() { return new Date().toISOString(); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }

async function checkRoute(route) {
  const url = `${baseUrl}${route.path}`;
  const response = await fetch(url, { headers: { 'user-agent': 'AlreadyHere-Hermes-SmokeTest/1.0' } });
  const html = await response.text();
  const missing = route.mustContain.filter((needle) => !html.includes(needle));
  const forbiddenMatches = forbidden.filter((rule) => rule.test(html)).map((rule) => String(rule));
  return { path: route.path, url, statusCode: response.status, ok: response.ok && missing.length === 0 && forbiddenMatches.length === 0, missing, forbiddenMatches };
}

const startedAt = nowIso();
const results = [];
for (const route of routes) results.push(await checkRoute(route));
const ok = results.every((result) => result.ok);
const receipt = { schemaVersion: 1, mission: 'a-plus.live-smoke-test', startedAt, finishedAt: nowIso(), status: ok ? 'pass' : 'fail', baseUrl, results };
const canonical = JSON.stringify(receipt, null, 2);
const hash = sha256(canonical);
mkdirSync(receiptsDir, { recursive: true });
const receiptPath = join(receiptsDir, `${receipt.finishedAt.replace(/[:.]/g, '-')}-live-smoke-test.json`);
writeFileSync(receiptPath, JSON.stringify({ ...receipt, hash }, null, 2) + '\n');
console.log(JSON.stringify({ status: receipt.status, receipt: receiptPath, hash, results }, null, 2));
process.exit(ok ? 0 : 1);
