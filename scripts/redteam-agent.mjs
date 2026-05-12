import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const repoRoot = process.cwd();
const receiptsDir = join(repoRoot, 'hermes/receipts');
const reportPath = join(repoRoot, 'hermes/redteam-report.json');

const ignoreDirs = new Set(['.git', 'node_modules', '.next', 'out']);
const inspectExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.yml', '.yaml', '.sh', '.md', '.css']);

const checks = [
  { id: 'secret-literal', severity: 'critical', pattern: /(BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|API[_-]?KEY\s*=|SECRET\s*=|TOKEN\s*=)/i, description: 'Potential secret literal or credential marker in source.' },
  { id: 'pipe-shell', severity: 'high', pattern: /(curl|wget).*(\|\s*(bash|sh))/i, description: 'Pipe-to-shell install pattern found.' },
  { id: 'unsafe-delete', severity: 'high', pattern: /rm\s+-rf\s+\//i, description: 'Dangerous recursive root deletion pattern found.' },
  { id: 'world-writable', severity: 'medium', pattern: /chmod\s+777/i, description: 'World-writable permission pattern found.' },
  { id: 'unsupported-certification', severity: 'critical', pattern: /SDVOSB Certified|SDVOSB-certified/i, description: 'Unsupported SDVOSB certified wording found.' },
  { id: 'set-aside-claim', severity: 'high', pattern: /set-aside|sole-source/i, description: 'Set-aside or sole-source language found; verify status before publishing.' },
  { id: 'dead-contact-route', severity: 'high', pattern: /href=["']\/contact["']/i, description: 'Dead /contact route reference found.' },
  { id: 'production-warning-copy', severity: 'high', pattern: /endpoint must be configured|before the form can deliver production/i, description: 'Buyer-facing production warning copy found.' },
  { id: 'arbitrary-runner-command', severity: 'critical', pattern: /spawnSync\([^,]+,\s*job\.|execSync\(job\.|execFileSync\(job\./i, description: 'Potential arbitrary runner command execution from queue input.' }
];

function nowIso() { return new Date().toISOString(); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function git(args) { try { return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim(); } catch (error) { return `git_error:${error.message}`; } }

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile()) {
      const ext = entry.name.includes('.') ? entry.name.slice(entry.name.lastIndexOf('.')) : '';
      if (inspectExtensions.has(ext) && statSync(full).size < 1024 * 1024) files.push(full);
    }
  }
  return files;
}

function severityWeight(severity) {
  if (severity === 'critical') return 30;
  if (severity === 'high') return 18;
  if (severity === 'medium') return 9;
  return 3;
}

function run() {
  const startedAt = nowIso();
  const files = walk(repoRoot);
  const findings = [];

  for (const file of files) {
    const rel = relative(repoRoot, file);
    const source = readFileSync(file, 'utf8');
    for (const check of checks) {
      if (check.pattern.test(source)) {
        findings.push({ id: check.id, severity: check.severity, file: rel, description: check.description });
      }
    }
  }

  if (!existsSync(join(repoRoot, 'hermes/hermes.os.json'))) findings.push({ id: 'missing-hermes-os', severity: 'critical', file: 'hermes/hermes.os.json', description: 'Hermes OS manifest missing.' });
  if (!existsSync(join(repoRoot, 'hermes/runner-policy.json'))) findings.push({ id: 'missing-runner-policy', severity: 'high', file: 'hermes/runner-policy.json', description: 'Runner policy missing.' });
  if (!existsSync(join(repoRoot, 'scripts/hermes-oci-runner.mjs'))) findings.push({ id: 'missing-runner', severity: 'high', file: 'scripts/hermes-oci-runner.mjs', description: 'OCI runner missing.' });
  if (!existsSync(join(repoRoot, 'data/gallery-manifest.json'))) findings.push({ id: 'missing-gallery-manifest', severity: 'medium', file: 'data/gallery-manifest.json', description: 'Gallery manifest missing.' });

  const penalty = findings.reduce((sum, finding) => sum + severityWeight(finding.severity), 0);
  const score = Math.max(0, 100 - penalty);
  const status = findings.some((f) => f.severity === 'critical') ? 'critical_review_required' : score >= 85 ? 'pass' : 'review_required';

  const report = {
    schemaVersion: 1,
    agent: 'REDTEAM',
    mission: 'redteam.review',
    startedAt,
    finishedAt: nowIso(),
    status,
    score,
    findings,
    inspectedFiles: files.length
  };

  mkdirSync(receiptsDir, { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  const canonical = JSON.stringify(report, null, 2);
  const hash = sha256(canonical);
  const receiptPath = join(receiptsDir, `${report.finishedAt.replace(/[:.]/g, '-')}-redteam-review.json`);
  const receipt = { ...report, hash, gitStatus: git(['status', '--short']), changedFiles: git(['diff', '--name-only']).split('\n').filter(Boolean) };
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ status, score, findings: findings.length, receipt: receiptPath, report: reportPath, hash }, null, 2));
  process.exit(status === 'pass' ? 0 : 1);
}

run();
