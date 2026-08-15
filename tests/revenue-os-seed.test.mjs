import assert from 'node:assert';
import { seedRevenueOS } from '../lib/revenue-os-seed.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

process.env.CANONICAL_STORE_TYPE = 'memory';
resetCanonicalStore();
const store = getCanonicalStore();

const result = await seedRevenueOS({ inputPath: 'data/revenue-pipeline.json', store });
if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}

assert.strictEqual(result.recordCount, 7, 'expected 7 revenue OS records');
assert.strictEqual(result.opportunityIds.length, 7, 'expected 7 opportunity IDs');
assert((await store.queryTable('organizations')).length >= 6, 'organizations should be seeded');
assert((await store.queryTable('contacts')).length >= 7, 'contacts should be seeded');
assert((await store.queryTable('leads')).length >= 7, 'leads should be seeded');
assert((await store.queryTable('opportunities')).length >= 7, 'opportunities should be seeded');
assert((await store.queryTable('reviews')).length >= 7, 'reviews should be seeded');
assert((await store.queryTable('ai_actions')).length >= 7, 'ai_actions should be seeded');
assert((await store.queryTable('proof_of_work')).length >= 7, 'proof_of_work should be seeded');

const opportunities = await store.queryTable('opportunities');
const opp = opportunities[0];
assert.strictEqual(typeof opp.estimated_value_cents, 'number', 'estimated_value_cents should be numeric');
assert(opp.score >= 0, 'opportunity score should be non-negative');

console.log('revenue os seed tests passed');
