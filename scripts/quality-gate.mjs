import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const receiptDir = join(repoRoot, 'hermes/receipts');
mkdirSync(receiptDir, { recursive: true });

const checks = [
  { id: 'lint', command: 'npm', args: ['run', 'lint', '--if-present'] },
  { id: 'typecheck', command: 'npm', args: ['run', 'typecheck', '--if-present'] },
  { id: 'build', command: 'npm', args: ['run', 'build', '--if-present'] },
  { id: 'test', command: 'npm', args: ['run', 'test', '--if-present'] },
  { id: 'seo-route-audit', command: 'node', args: ['scripts/seo-route-audit.mjs'] },
  { id: 'content-guard', command: 'npm', args: ['run', 'qa:content', '--if-present'] }
];

function runCheck(check) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(check.command, check.args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false
  });

  return {
    id: check.id,
    command: [check.command, ...check.args].join(' '),
    startedAt,
    finishedAt: new Date().toISOString(),
    status: result.status === 0 ? 'pass' : 'fail',
    exitCode: result.status,
    stdout: result.stdout?.slice(-5000) || '',
    stderr: result.stderr?.slice(-5000) || ''
  };
}

const results = checks.map(runCheck);
const status = results.every((result) => result.status === 'pass') ? 'pass' : 'fail';
const receipt = {
  schemaVersion: 1,
  mission: 'quality.gate',
  status,
  checkedAt: new Date().toISOString(),
  checks: results.map((result) => ({
    id: result.id,
    command: result.command,
    status: result.status,
    exitCode: result.exitCode
  }))
};

const receiptPath = join(receiptDir, `${receipt.checkedAt.replace(/[:.]/g, '-')}-quality-gate.json`);
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');

console.log(JSON.stringify({ status, receipt: receiptPath, checks: receipt.checks }, null, 2));

if (status !== 'pass') {
  const failed = results.find((result) => result.status === 'fail');
  if (failed) {
    console.error(`\nFirst failed check: ${failed.id}`);
    console.error(failed.stdout);
    console.error(failed.stderr);
  }
  process.exit(1);
}
