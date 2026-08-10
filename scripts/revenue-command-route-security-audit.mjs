import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'app', 'api', 'revenue-command-spine');
const allowedWithoutInternalAuth = new Set([
  'auth/route.ts'
]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else if (name === 'route.ts') out.push(path);
  }
  return out;
}

const findings = [];
for (const path of walk(root)) {
  const rel = relative(root, path).replace(/\\/g, '/');
  if (allowedWithoutInternalAuth.has(rel)) continue;
  const source = readFileSync(path, 'utf8');
  const importsAuth = source.includes('authorizeRevenueCommandInternalRequest');
  const callsAuth = source.includes('authorizeRevenueCommandInternalRequest(request)');
  if (!importsAuth || !callsAuth) findings.push({ route: rel, importsAuth, callsAuth });
}

const result = { ok: findings.length === 0, routesChecked: walk(root).length, findings };
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
