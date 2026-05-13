import { readFileSync } from 'node:fs';

const inputPath = process.argv[2];
const input = inputPath ? readFileSync(inputPath, 'utf8') : await new Promise((resolve) => {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { data += chunk; });
  process.stdin.on('end', () => resolve(data));
});

const rules = [
  {
    id: 'eslint-unused-vars',
    severity: 'repairable',
    match: /no-unused-vars|'[^']+' is defined but never used|is assigned a value but never used/i,
    action: 'Remove the unused import, variable, or assignment. Re-run npm run lint.'
  },
  {
    id: 'eslint-flat-config-cli',
    severity: 'repairable',
    match: /Invalid option '--ext'|eslint\.config\.js.*flags are no longer available/i,
    action: 'Use eslint . --max-warnings=0 without deprecated --ext flags.'
  },
  {
    id: 'typescript-next-async-params',
    severity: 'repairable',
    match: /params.*Promise|PageProps|does not satisfy the constraint/i,
    action: 'Update Next App Router page props for Next 15 async params/searchParams.'
  },
  {
    id: 'npm-lock-mismatch',
    severity: 'repairable',
    match: /npm ci|package-lock\.json|package\.json.*not in sync|Missing:/is,
    action: 'Synchronize package.json and package-lock.json. Prefer deterministic npm install on a repair branch.'
  },
  {
    id: 'next-build-lint-wrapper',
    severity: 'repairable',
    match: /next lint|Failed to load config|ESLint must be installed/i,
    action: 'Keep standalone CI lint and avoid duplicate incompatible Next build-time lint wrapper.'
  },
  {
    id: 'runtime-oracle-offline',
    severity: 'blocked-by-host-access',
    match: /ECONNREFUSED|connection refused|Failed to connect.*129\.153\.101\.0|Runtime Offline/i,
    action: 'Run the Oracle VM repair scripts. This requires host, SSH, OCI, or remote command-runner access.'
  }
];

const matches = rules.filter((rule) => rule.match.test(input));
const result = {
  status: matches.length === 0 ? 'unclassified' : 'classified',
  checkedAt: new Date().toISOString(),
  matches,
  recommendation: matches[0]?.action || 'Inspect logs manually and add a classifier rule after root cause is known.'
};

console.log(JSON.stringify(result, null, 2));

if (matches.length === 0) process.exitCode = 2;
