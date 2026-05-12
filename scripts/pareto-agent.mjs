import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const backlogPath = join(repoRoot, 'hermes/pareto-backlog.json');
const agentPath = join(repoRoot, 'hermes/pareto.agent.json');
const receiptsDir = join(repoRoot, 'hermes/receipts');

function nowIso() { return new Date().toISOString(); }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function writeJson(path, value) { writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); }
function git(args) { try { return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim(); } catch (error) { return `git_error:${error.message}`; } }

function scoreItem(item) {
  return (Number(item.revenue) || 0)
    + (Number(item.conversion) || 0)
    + (Number(item.riskReduction) || 0)
    + (Number(item.operationalLeverage) || 0)
    + (Number(item.reuseValue) || 0)
    - (Number(item.effort) || 0)
    - (Number(item.fragility) || 0);
}

function classify(score, currentClass) {
  if (currentClass === 'P0') return 'P0';
  if (score >= 55) return 'P1';
  if (score >= 35) return 'P2';
  return 'P3';
}

function run() {
  const startedAt = nowIso();
  if (!existsSync(backlogPath)) throw new Error('PARETO backlog missing.');
  if (!existsSync(agentPath)) throw new Error('PARETO agent manifest missing.');

  const backlog = readJson(backlogPath);
  const items = Array.isArray(backlog.items) ? backlog.items : [];
  const ranked = items
    .map((item) => ({ ...item, impactScore: scoreItem(item), recommendedClass: classify(scoreItem(item), item.class) }))
    .sort((a, b) => b.impactScore - a.impactScore);

  const recommendedNow = ranked.filter((item) => item.status !== 'complete').slice(0, 5);
  const updatedBacklog = { ...backlog, generatedAt: nowIso(), items: ranked };
  writeJson(backlogPath, updatedBacklog);

  mkdirSync(receiptsDir, { recursive: true });
  const receipt = {
    schemaVersion: 1,
    mission: 'pareto.prioritize',
    agent: 'PARETO',
    startedAt,
    finishedAt: nowIso(),
    status: 'complete',
    recommendedNow: recommendedNow.map(({ id, title, class: priorityClass, impactScore, notes }) => ({ id, title, class: priorityClass, impactScore, notes })),
    totalItems: ranked.length,
    gitStatus: git(['status', '--short']),
    changedFiles: git(['diff', '--name-only']).split('\n').filter(Boolean)
  };
  const canonical = JSON.stringify(receipt, null, 2);
  const hash = sha256(canonical);
  const receiptPath = join(receiptsDir, `${receipt.finishedAt.replace(/[:.]/g, '-')}-pareto-prioritize.json`);
  writeJson(receiptPath, { ...receipt, hash });
  console.log(JSON.stringify({ status: receipt.status, recommendedNow: receipt.recommendedNow, receipt: receiptPath, hash }, null, 2));
}

run();
