import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const policyPath = join(repoRoot, 'hermes/runner-policy.json');
const queuePath = join(repoRoot, 'hermes/runner-queue.json');
const receiptsDir = join(repoRoot, 'hermes/receipts');
const gitBranch = process.env.HERMES_RUNNER_BRANCH || 'main';
const gitRemote = process.env.HERMES_RUNNER_REMOTE || 'origin';

function nowIso() { return new Date().toISOString(); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function writeJson(path, value) { writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); }
function git(args, stdio = 'pipe') { return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio }).trim(); }
function safeGit(args) { try { return git(args); } catch (error) { return `git_error:${error.message}`; } }

function writeReceipt(job, status, detail) {
  mkdirSync(receiptsDir, { recursive: true });
  const receipt = {
    schemaVersion: 1,
    mission: 'hermes.oci.runner',
    jobId: job.id,
    requestedCommand: job.command,
    startedAt: detail.startedAt,
    finishedAt: nowIso(),
    status,
    detail,
    gitStatus: safeGit(['status', '--short']),
    changedFiles: safeGit(['diff', '--name-only']).split('\n').filter(Boolean)
  };
  const canonical = JSON.stringify(receipt, null, 2);
  const hash = sha256(canonical);
  const file = join(receiptsDir, `${receipt.finishedAt.replace(/[:.]/g, '-')}-hermes-oci-runner-${job.id}.json`);
  writeJson(file, { ...receipt, hash });
  return { file, hash };
}

function refreshRepo() {
  git(['fetch', gitRemote, gitBranch], 'inherit');
  git(['checkout', gitBranch], 'inherit');
  git(['reset', '--hard', `${gitRemote}/${gitBranch}`], 'inherit');
}

function commitRunnerChanges(message) {
  git(['add', 'hermes/runner-queue.json', 'hermes/receipts'], 'inherit');
  const diff = git(['diff', '--cached', '--name-only']);
  if (!diff) return false;
  git(['commit', '-m', message], 'inherit');
  git(['push', gitRemote, gitBranch], 'inherit');
  return true;
}

function executeJob(policy, job) {
  const startedAt = nowIso();
  const allowed = policy.allowedCommands?.[job.command];
  if (!allowed) {
    return { status: 'rejected', detail: { startedAt, reason: 'command_not_allowlisted' } };
  }

  const timeoutSeconds = Number(job.timeoutSeconds || policy.security?.defaultTimeoutSeconds || 900);
  const [cmd, ...args] = allowed.command;
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: timeoutSeconds * 1000,
    maxBuffer: 1024 * 1024 * 8
  });

  const detail = {
    startedAt,
    allowedCommand: allowed.command,
    risk: allowed.risk,
    exitCode: result.status,
    signal: result.signal,
    stdout: (result.stdout || '').slice(-12000),
    stderr: (result.stderr || '').slice(-12000)
  };

  return { status: result.status === 0 ? 'complete' : 'failed', detail };
}

function main() {
  refreshRepo();
  if (!existsSync(policyPath) || !existsSync(queuePath)) {
    throw new Error('Runner policy or queue missing.');
  }

  const policy = readJson(policyPath);
  const queueDoc = readJson(queuePath);
  const queue = Array.isArray(queueDoc.queue) ? queueDoc.queue : [];
  let changed = false;

  for (const job of queue) {
    if (job.status !== 'queued') continue;
    job.startedAt = nowIso();
    const result = executeJob(policy, job);
    const receipt = writeReceipt(job, result.status, result.detail);
    job.status = result.status;
    job.finishedAt = nowIso();
    job.receipt = receipt;
    changed = true;
  }

  if (changed) {
    writeJson(queuePath, { ...queueDoc, queue });
    commitRunnerChanges(`hermes runner receipts ${nowIso().slice(0, 10)}`);
  } else {
    console.log('No queued runner jobs.');
  }
}

main();
