import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const osPath = join(repoRoot, 'hermes/hermes.os.json');
const receiptsDir = join(repoRoot, 'hermes/receipts');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch (error) {
    return `git_error:${error.message}`;
  }
}

function writeReceipt(mission, status, detail = {}) {
  mkdirSync(receiptsDir, { recursive: true });
  const startedAt = detail.startedAt || new Date().toISOString();
  const finishedAt = new Date().toISOString();
  const receipt = {
    schemaVersion: 1,
    mission,
    startedAt,
    finishedAt,
    status,
    detail,
    gitStatus: git(['status', '--short']),
    changedFiles: git(['diff', '--name-only']).split('\n').filter(Boolean),
    environmentSummary: {
      node: process.version,
      cwd: repoRoot,
      gallerySourceConfigured: Boolean(process.env.GALLERY_LOCAL_SOURCE_DIR),
      repoUrlConfigured: Boolean(process.env.GALLERY_REPO_URL)
    }
  };
  const canonical = JSON.stringify(receipt, null, 2);
  const hash = sha256(canonical);
  const file = join(receiptsDir, `${finishedAt.replace(/[:.]/g, '-')}-${mission.replace(/[^a-z0-9._-]/gi, '-')}.json`);
  writeFileSync(file, JSON.stringify({ ...receipt, hash }, null, 2) + '\n');
  console.log(`receipt=${file}`);
  console.log(`hash=${hash}`);
}

function health() {
  const startedAt = new Date().toISOString();
  const checks = [];
  checks.push({ name: 'hermes.os.json exists', ok: existsSync(osPath) });
  const os = existsSync(osPath) ? readJson(osPath) : null;
  checks.push({ name: 'gallery.rotate mission exists', ok: Boolean(os?.missionRegistry?.['gallery.rotate']) });
  checks.push({ name: 'gallery manifest exists', ok: existsSync(join(repoRoot, 'data/gallery-manifest.json')) });
  checks.push({ name: 'gallery agent exists', ok: existsSync(join(repoRoot, 'scripts/oci-gallery-agent.mjs')) });
  checks.push({ name: 'OCI Dockerfile exists', ok: existsSync(join(repoRoot, 'infra/oci-gallery-agent/Dockerfile')) });
  checks.push({ name: 'systemd unit exists', ok: existsSync(join(repoRoot, 'infra/oci-gallery-agent/already-here-gallery-agent.service')) });
  const ok = checks.every((check) => check.ok);
  for (const check of checks) console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.name}`);
  writeReceipt('health.check', ok ? 'success' : 'failed', { startedAt, checks });
  process.exit(ok ? 0 : 1);
}

function missionInfo() {
  const os = readJson(osPath);
  console.log(JSON.stringify(os.missionRegistry, null, 2));
  writeReceipt('mission.info', 'success', { missions: Object.keys(os.missionRegistry || {}) });
}

const command = process.argv[2] || 'health';
if (command === 'health') health();
else if (command === 'missions') missionInfo();
else {
  console.error(`Unknown command: ${command}`);
  process.exit(2);
}
