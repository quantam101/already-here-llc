import { spawnSync } from 'node:child_process';

const patterns = [
  { name: 'private-key', regex: 'BEGIN (RSA )?PRIVATE KEY' },
  { name: 'openai-project-key', regex: 'sk-proj-' },
  { name: 'anthropic-key', regex: 'sk-ant-' },
  { name: 'stripe-secret-key', regex: 'sk_(live|test)_' }
];

function gitLog(regex) {
  const result = spawnSync('git', ['log', '--all', '--format=%H %s', '-G', regex, '--', '.'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `git log failed with ${result.status}`);
  return String(result.stdout || '').trim().split('\n').filter(Boolean).slice(0, 100);
}

const findings = patterns.flatMap(({ name, regex }) => gitLog(regex).map((entry) => ({ marker: name, commit: entry.split(' ')[0], subject: entry.slice(entry.indexOf(' ') + 1) })));
const deduped = Array.from(new Map(findings.map((finding) => [`${finding.marker}:${finding.commit}`, finding])).values());
const currentTree = spawnSync('git', ['grep', '-nE', 'BEGIN (RSA )?PRIVATE KEY|sk-proj-|sk-ant-|sk_(live|test)_', '--', ':!scripts/secret-history-audit.mjs', ':!runtime/security_scanner.py'], { encoding: 'utf8', shell: false });
const currentFindings = currentTree.status === 0 ? String(currentTree.stdout || '').trim().split('\n').filter(Boolean).map((line) => line.replace(/:.*/, ': [REDACTED MATCH]')) : [];

const report = {
  ok: deduped.length === 0 && currentFindings.length === 0,
  historyFindingCount: deduped.length,
  currentTreeFindingCount: currentFindings.length,
  historyFindings: deduped,
  currentTreeFindings: currentFindings,
  remediation: deduped.length ? 'Rotate affected credentials/certificates, then use an approved history-rewrite procedure and require collaborators to re-clone.' : 'No matching historical secret markers found.'
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok && process.env.ALLOW_KNOWN_SECRET_HISTORY !== 'true') process.exit(1);
