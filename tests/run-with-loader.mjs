import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFile = process.argv[2];
if (!testFile) {
  console.error('Usage: node tests/run-with-loader.mjs <test-file>');
  process.exit(1);
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
const node22SupportsStripTypes = nodeMajor >= 22;

const loaderFlag = node22SupportsStripTypes
  ? '--experimental-strip-types'
  : '--import tsx';

const loaderArgs = loaderFlag.split(' ');
const args = [
  ...loaderArgs,
  '--import',
  join(__dirname, 'register-next-alias.mjs'),
  testFile,
];

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
