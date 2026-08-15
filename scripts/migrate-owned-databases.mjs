#!/usr/bin/env node

import process from 'node:process';

function usage() {
  console.error('Usage: npm run db:migrate -- --source <sqlite-path> [--source <sqlite-path> ...] [--target <canonical-sqlite-path>]');
}

const args = process.argv.slice(2);
const sources = [];
let targetPath = 'data/canonical-graph.db';
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--source' && args[index + 1]) {
    sources.push({ path: args[index + 1], label: args[index + 1] });
    index += 1;
  } else if (arg === '--target' && args[index + 1]) {
    targetPath = args[index + 1];
    index += 1;
  } else if (arg === '--help' || arg === '-h') {
    usage();
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${arg}`);
    usage();
    process.exit(2);
  }
}

if (!sources.length) {
  usage();
  process.exit(2);
}

process.env.CANONICAL_STORE_TYPE = 'sqlite';
process.env.CANONICAL_SQLITE_PATH = targetPath;

const [{ combineOwnedDatabases }, { getCanonicalStore, resetCanonicalStore }] = await Promise.all([
  import('../lib/canonical-migration.ts'),
  import('../lib/canonical-store.ts'),
]);

try {
  const store = getCanonicalStore();
  const report = await combineOwnedDatabases(sources, store);
  console.log(JSON.stringify({ targetPath, ...report }, null, 2));
  if (!report.ok) process.exitCode = 1;
} finally {
  resetCanonicalStore();
}
