import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const agentPath = join(repoRoot, 'hermes/socrates.agent.json');
const receiptsDir = join(repoRoot, 'hermes/receipts');

const filesToInspect = [
  'app/page.tsx',
  'app/layout.tsx',
  'app/dispatch/page.tsx',
  'app/rfq/page.tsx',
  'app/project-gallery/page.tsx',
  'app/coverage/page.tsx',
  'app/who-we-serve/page.tsx',
  'app/capability-statement/page.tsx',
  'lib/site.ts',
  'components/Header.tsx',
  'components/ProjectGalleryGrid.tsx',
  'scripts/oci-gallery-agent.mjs',
  'hermes/hermes.os.json'
];

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch (error) {
    return `git_error:${error.message}`;
  }
}

function flagIf(condition, flag, flags) {
  if (condition) flags.push(flag);
}

function inspectSource() {
  const combined = filesToInspect.map((file) => `\n--- ${file} ---\n${read(join(repoRoot, file))}`).join('\n');
  const flags = [];

  flagIf(/SDVOSB Certified|SDVOSB-certified/i.test(combined), 'Unsupported SDVOSB certified wording found.', flags);
  flagIf(/sole-source|set-aside/i.test(combined), 'Set-aside or sole-source procurement language found; verify before publishing.', flags);
  flagIf(/href=["']\/contact["']/.test(combined), 'Dead /contact CTA reference found.', flags);
  flagIf(/API[_-]?KEY\s*=|SECRET\s*=|TOKEN\s*=|BEGIN PRIVATE KEY/i.test(combined), 'Potential secret literal found in source.', flags);
  flagIf(/Redacted visual slot/.test(combined), 'Gallery still uses fallback redacted visual slots when no approved photos are published.', flags);
  flagIf(!existsSync(join(repoRoot, 'data/gallery-manifest.json')), 'Gallery manifest missing.', flags);
  flagIf(!existsSync(join(repoRoot, 'hermes/hermes.os.json')), 'Hermes OS manifest missing.', flags);
  flagIf(!existsSync(join(repoRoot, 'scripts/oci-gallery-agent.mjs')), 'OCI gallery agent missing.', flags);

  const score = Math.max(0, 100 - flags.length * 8);
  return { score, flags, inspectedFiles: filesToInspect.filter((file) => existsSync(join(repoRoot, file))) };
}

function writeReceipt(result) {
  mkdirSync(receiptsDir, { recursive: true });
  const receipt = {
    schemaVersion: 1,
    mission: 'socrates.review',
    agent: 'SOCRATES',
    startedAt: result.startedAt,
    finishedAt: nowIso(),
    status: result.score >= 85 ? 'pass' : 'review_required',
    grade: result.score,
    flags: result.flags,
    inspectedFiles: result.inspectedFiles,
    gitStatus: git(['status', '--short']),
    changedFiles: git(['diff', '--name-only']).split('\n').filter(Boolean),
    agentManifestPresent: existsSync(agentPath)
  };
  const canonical = JSON.stringify(receipt, null, 2);
  const hash = sha256(canonical);
  const file = join(receiptsDir, `${receipt.finishedAt.replace(/[:.]/g, '-')}-socrates-review.json`);
  writeFileSync(file, JSON.stringify({ ...receipt, hash }, null, 2) + '\n');
  return { file, hash, receipt };
}

function main() {
  const startedAt = nowIso();
  const result = { startedAt, ...inspectSource() };
  const { file, hash, receipt } = writeReceipt(result);
  console.log(JSON.stringify({ grade: receipt.grade, status: receipt.status, flags: receipt.flags, receipt: file, hash }, null, 2));
  process.exit(receipt.grade >= 85 ? 0 : 1);
}

main();
