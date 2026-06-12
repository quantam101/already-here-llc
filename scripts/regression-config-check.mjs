import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const packageLockText = fs.readFileSync('package-lock.json', 'utf8');
const packageLock = JSON.parse(packageLockText);
const eslintConfig = fs.readFileSync('eslint.config.mjs', 'utf8');

const expectedLintScript = 'eslint app components lib tests scripts tailwind.config.ts next.config.mjs postcss.config.js eslint.config.mjs --max-warnings=0';

assert.equal(
  packageJson.scripts?.lint,
  expectedLintScript,
  'lint must target production app, library, tests, scripts, and config files instead of scanning generated/runtime surfaces with eslint .'
);

assert.ok(
  packageJson.scripts?.test?.startsWith('npm run test:regression &&'),
  'npm test must run the regression guard before the rest of the suite'
);

for (const ignoredPath of ['already-here-llc-v1.1/**', 'profitengine/**', 'ops/**', 'runtime/**', 'web/**', 'posts/**', 'docs/**', 'public/**', 'content/**']) {
  assert.ok(eslintConfig.includes(ignoredPath), `eslint config must ignore non-production or generated surface: ${ignoredPath}`);
}

assert.ok(!packageLockText.includes('packages.applied-caas-gateway'), 'package-lock.json must not contain sandbox/internal npm mirror URLs');

const rootLock = packageLock.packages?.[''];
assert.ok(rootLock, 'package-lock.json must contain the root package entry');
assert.deepEqual(rootLock.dependencies, packageJson.dependencies, 'package-lock root dependencies must match package.json dependencies');
assert.deepEqual(rootLock.devDependencies, packageJson.devDependencies, 'package-lock root devDependencies must match package.json devDependencies');
assert.equal(packageLock.packages?.['node_modules/next']?.version, packageJson.dependencies.next, 'locked next version must match package.json');
assert.equal(packageLock.packages?.['node_modules/eslint-config-next']?.version, packageJson.devDependencies['eslint-config-next'], 'locked eslint-config-next version must match package.json');

console.log('regression config check passed');
