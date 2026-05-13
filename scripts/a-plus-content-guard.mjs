import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const repoRoot = process.cwd();
const receiptsDir = join(repoRoot, 'hermes/receipts');
const ignoreDirs = new Set(['.git', 'node_modules', '.next', 'out']);
const inspectExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.html']);

const forbidden = [
  { id: 'sdvosb-certified', pattern: /SDVOSB[-\s]certified|SDVOSB Certified/i, reason: 'Do not claim SDVOSB certification unless verified complete.' },
  { id: 'set-aside', pattern: /set-aside|sole-source/i, reason: 'Do not use procurement set-aside or sole-source language without verified status.' },
  { id: 'endpoint-warning', pattern: /endpoint must be configured|before the form can deliver production/i, reason: 'Buyer-facing production warning copy is prohibited.' },
  { id: 'dead-contact-route', pattern: /href=["']\/contact["']|href=\{["']\/contact["']\}/i, reason: 'No /contact route exists; use /dispatch or /rfq.' },
  { id: 'encoded-sdvosb', pattern: /SDVOSB-certified\s*Â·/i, reason: 'Encoded stale certification string is prohibited.' },
  { id: 'government-set-aside-option', pattern: /Government\s*\/\s*SDVOSB\s*set-aside/i, reason: 'Dispatch service options must not overclaim procurement status.' }
];

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    if (entry.isFile()) {
      const ext = entry.name.includes('.') ? entry.name.slice(entry.name.lastIndexOf('.')) : '';
      if (inspectExtensions.has(ext) && statSync(full).size < 1024 * 1024) files.push(full);
    }
  }
  return files;
}

const findings = [];
for (const file of walk(repoRoot)) {
  const rel = relative(repoRoot, file);
  const text = readFileSync(file, 'utf8');
  for (const rule of forbidden) {
    if (rule.pattern.test(text)) findings.push({ ...rule, file: rel });
  }
}

mkdirSync(receiptsDir, { recursive: true });
const status = findings.length === 0 ? 'pass' : 'fail';
const receipt = {
  schemaVersion: 1,
  mission: 'a-plus.content-guard',
  startedAt: nowIso(),
  finishedAt: nowIso(),
  status,
  findings,
  inspectedRuleCount: forbidden.length
};
const canonical = JSON.stringify(receipt, null, 2);
const hash = sha256(canonical);
const receiptPath = join(receiptsDir, `${receipt.finishedAt.replace(/[:.]/g, '-')}-a-plus-content-guard.json`);
writeFileSync(receiptPath, JSON.stringify({ ...receipt, hash }, null, 2) + '\n');
console.log(JSON.stringify({ status, findings: findings.length, receipt: receiptPath, hash }, null, 2));
process.exit(status === 'pass' ? 0 : 1);
