import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, copyFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const repoRoot = process.cwd();
const startedAt = new Date().toISOString();
const receiptsDir = join(repoRoot, 'hermes/receipts');

const candidatesDir = process.env.DRIVE_CURATOR_CANDIDATES_DIR || '/opt/already-here-gallery/drive-candidates';
const approvedDir = process.env.DRIVE_CURATOR_APPROVED_DIR || '/opt/already-here-gallery/source';
const quarantineDir = process.env.DRIVE_CURATOR_QUARANTINE_DIR || '/opt/already-here-gallery/quarantine';
const moveRejected = process.env.DRIVE_CURATOR_MOVE_REJECTED === 'true';
const publishLimit = Number(process.env.DRIVE_CURATOR_LIMIT || '25');

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const rejectPatterns = [
  /do[-_\s]?not[-_\s]?publish/i,
  /private/i,
  /credential/i,
  /badge/i,
  /license/i,
  /medical/i,
  /patient/i,
  /serial/i,
  /secret/i,
  /password/i,
  /address/i,
  /qr/i,
  /face/i,
  /id[-_\s]?card/i
];

function nowIso() { return new Date().toISOString(); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function safeName(value) { return value.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'gallery-photo.jpg'; }

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function classify(file) {
  const rel = relative(candidatesDir, file);
  const ext = extname(file).toLowerCase();
  const nameRisk = rejectPatterns.find((pattern) => pattern.test(rel));
  const stats = statSync(file);
  if (!allowedExtensions.has(ext)) return { status: 'ignored', reason: 'unsupported_extension', rel };
  if (stats.size <= 0) return { status: 'rejected', reason: 'empty_file', rel };
  if (nameRisk) return { status: 'rejected', reason: `name_risk:${nameRisk}`, rel };
  return { status: 'approved_candidate', reason: 'passed_filename_gate', rel, mtimeMs: stats.mtimeMs };
}

function writeReceipt(result) {
  mkdirSync(receiptsDir, { recursive: true });
  const receipt = {
    schemaVersion: 1,
    mission: 'drive.curate-gallery',
    agent: 'DRIVE_CURATOR',
    startedAt,
    finishedAt: nowIso(),
    status: result.failed ? 'failed' : 'complete',
    candidatesDir,
    approvedDir,
    quarantineDir,
    result
  };
  const canonical = JSON.stringify(receipt, null, 2);
  const hash = sha256(canonical);
  const receiptPath = join(receiptsDir, `${receipt.finishedAt.replace(/[:.]/g, '-')}-drive-curator.json`);
  writeFileSync(receiptPath, JSON.stringify({ ...receipt, hash }, null, 2) + '\n');
  console.log(JSON.stringify({ status: receipt.status, receipt: receiptPath, hash, summary: result.summary }, null, 2));
}

function main() {
  mkdirSync(approvedDir, { recursive: true });
  mkdirSync(quarantineDir, { recursive: true });

  const files = walk(candidatesDir);
  const classified = files.map((file) => ({ file, ...classify(file) }));
  const approved = classified
    .filter((item) => item.status === 'approved_candidate')
    .sort((a, b) => Number(b.mtimeMs || 0) - Number(a.mtimeMs || 0))
    .slice(0, publishLimit);
  const rejected = classified.filter((item) => item.status === 'rejected');
  const ignored = classified.filter((item) => item.status === 'ignored');

  const staged = [];
  for (const item of approved) {
    const destination = join(approvedDir, `${Date.now()}-${safeName(item.rel)}`);
    copyFileSync(item.file, destination);
    staged.push({ source: item.rel, destination: relative(approvedDir, destination) });
  }

  const quarantined = [];
  if (moveRejected) {
    for (const item of rejected) {
      const destination = join(quarantineDir, `${Date.now()}-${safeName(item.rel)}`);
      try {
        renameSync(item.file, destination);
        quarantined.push({ source: item.rel, destination: relative(quarantineDir, destination), reason: item.reason });
      } catch (error) {
        quarantined.push({ source: item.rel, error: error instanceof Error ? error.message : 'unknown_error', reason: item.reason });
      }
    }
  }

  writeReceipt({
    failed: false,
    summary: {
      scanned: files.length,
      staged: staged.length,
      rejected: rejected.length,
      ignored: ignored.length,
      quarantined: quarantined.length
    },
    staged,
    rejected: rejected.map(({ rel, reason }) => ({ rel, reason })),
    ignored: ignored.map(({ rel, reason }) => ({ rel, reason })),
    quarantined
  });
}

try { main(); } catch (error) { writeReceipt({ failed: true, summary: { error: error instanceof Error ? error.message : 'unknown_error' } }); process.exit(1); }
