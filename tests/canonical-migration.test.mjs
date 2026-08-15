import assert from 'node:assert';
import { unlinkSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tempDir = mkdtempSync(join(tmpdir(), 'canon-mig-'));
const sourceOne = join(tempDir, 'source-one.db');
const sourceTwo = join(tempDir, 'source-two.db');

const { DatabaseSync } = await import('node:sqlite');

function seedSource(path, label, rows) {
  const db = new DatabaseSync(path);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS owned_records (
        table_name TEXT NOT NULL,
        id TEXT NOT NULL,
        record_json TEXT NOT NULL
      );
    `);
    const insert = db.prepare('INSERT INTO owned_records (table_name, id, record_json) VALUES (?, ?, ?)');
    for (const { table, id, record } of rows) {
      insert.run(table, id, JSON.stringify(record));
    }
  } finally {
    db.close();
  }
}

seedSource(sourceOne, 'revenue-command', [
  { table: 'organizations', id: 'org-1', record: { id: 'org-1', name: 'Already Here LLC', domain: 'alreadyherellc.com', service_area: 'Arizona' } },
  { table: 'contacts', id: 'contact-1', record: { id: 'contact-1', organization_id: 'org-1', full_name: 'Demo User', email: 'demo@alreadyherellc.com', phone: '5551234567' } },
  { table: 'opportunities', id: 'opp-1', record: { id: 'opp-1', organization_id: 'org-1', contact_id: 'contact-1', title: 'Demo', estimated_value_cents: 10000 } }
]);

seedSource(sourceTwo, 'legacy-canonical', [
  { table: 'organizations', id: 'legacy-org-1', record: { id: 'legacy-org-1', name: 'Already Here LLC', domain: 'alreadyherellc.com', service_area: 'Arizona' } },
  { table: 'contacts', id: 'legacy-contact-1', record: { id: 'legacy-contact-1', organization_id: 'legacy-org-1', full_name: 'Demo User', email: 'demo@alreadyherellc.com', phone: '5551234567' } },
  { table: 'opportunities', id: 'legacy-opp-1', record: { id: 'legacy-opp-1', organization_id: 'legacy-org-1', contact_id: 'legacy-contact-1', title: 'Legacy', estimated_value_cents: 5000 } }
]);

process.env.CANONICAL_STORE_TYPE = 'memory';

const [{ combineOwnedDatabases }, { getCanonicalStore, resetCanonicalStore }] = await Promise.all([
  import('../lib/canonical-migration.ts'),
  import('../lib/canonical-store.ts'),
]);

let store;
try {
  resetCanonicalStore();
  store = getCanonicalStore();
  const report = await combineOwnedDatabases([
    { path: sourceOne, label: 'revenue-command' },
    { path: sourceTwo, label: 'legacy-canonical' },
  ], store);

  assert.equal(report.ok, true);
  assert.equal(report.sourceRecords, 6);
  assert.equal(report.canonicalRecords, 4, 'organization and contact duplicates should collapse, opportunities differ by title');
  assert.equal(report.deduplicatedRecords, 2);

  const organizations = await store.queryTable('organizations');
  const contacts = await store.queryTable('contacts');
  const opportunities = await store.queryTable('opportunities');
  assert.equal(organizations.length, 1);
  assert.equal(contacts.length, 1);
  assert.equal(opportunities.length, 2);
  assert.equal(organizations[0].service_area, 'Arizona');
  assert.deepEqual(new Set(organizations[0].migration_sources), new Set(['revenue-command', 'legacy-canonical']));
  assert.equal(contacts[0].organization_id, organizations[0].id, 'contact foreign key should be rewritten');
  assert.equal(opportunities[0].organization_id, organizations[0].id, 'opportunity organization should be canonical');
  assert.equal(opportunities[0].contact_id, contacts[0].id, 'opportunity contact should be canonical');

  const rerun = await combineOwnedDatabases([{ path: sourceOne, label: 'revenue-command' }], store);
  assert.equal(rerun.ok, true);
  assert.equal((await store.queryTable('organizations')).length, 1, 'rerun must be idempotent');
  assert.equal((await store.queryTable('contacts')).length, 1, 'rerun must not duplicate contacts');
  assert.equal((await store.queryTable('opportunities')).length, 2, 'rerun must not duplicate opportunities');

  console.log('canonical database migration tests passed');
} finally {
  try {
    store?.close?.();
  } catch {
    // ignore
  }
  try {
    unlinkSync(sourceOne);
    unlinkSync(sourceTwo);
  } catch {
    // ignore
  }
}
