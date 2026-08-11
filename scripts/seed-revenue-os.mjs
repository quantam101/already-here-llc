import { seedRevenueOS } from '../lib/revenue-os-seed.ts';

const args = process.argv.slice(2);
const inputArg = args.find((a) => a.startsWith('--input='));
const dbArg = args.find((a) => a.startsWith('--db='));
const dryRun = args.includes('--dry-run');

const inputPath = inputArg ? inputArg.split('=')[1] : undefined;
const dbPath = dbArg ? dbArg.split('=')[1] : (process.env.CANONICAL_SQLITE_PATH || 'data/canonical-graph.db');

const summary = seedRevenueOS({ inputPath, dbPath, dryRun });
console.log(JSON.stringify(summary, null, 2));

if (!summary.ok) {
  process.exit(1);
}
