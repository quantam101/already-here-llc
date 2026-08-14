import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const tempRoot = mkdtempSync(join(tmpdir(), 'already-here-canonical-migration-'));
const sourceOne = join(tempRoot, 'revenue-command.sqlite3');
const sourceTwo = join(tempRoot, 'canonical-old.sqlite3');
const targetPath = join(tempRoot, 'combined.sqlite3');

function makeOwnedDb(path) {
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE owned_records (
    table_name TEXT NOT NULL,
    id TEXT NOT NULL,
    record_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (table_name, id)
  )`);
  const insert = db.prepare('INSERT INTO owned_records(table_name,id,record_json,created_at,updated_at) VALUES (?,?,?,?,?)');
  const now = '2026-08-14T12:00:00.000Z';
  insert.run('organizations', 'org_old_1', JSON.stringify({ id: 'org_old_1', name: 'CPT Network Solutions', domain: 'cptnetworks.com', source: 'gmail' }), now, now);
  insert.run('contacts', 'contact_old_1', JSON.stringify({ id: 'contact_old_1', organization_id: 'org_old_1', full_name: 'Partner Desk', email: 'partners@cptnetworks.com' }), now, now);
  insert.run('opportunities', 'opp_old_1', JSON.stringify({ id: 'opp_old_1', organization_id: 'org_old_1', contact_id: 'contact_old_1', title: 'Arizona field services', source_system: 'gmail', source_record_id: 'msg-123', estimated_value_cents: 250000 }), now, now);
  db.close();
}

function makeCanonicalDb(path) {
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE canonical_records (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    payload TEXT NOT NULL,
    source TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  const insert = db.prepare('INSERT INTO canonical_records(id,table_name,payload,source,created_at,updated_at) VALUES (?,?,?,?,?,?)');
  const now = '2026-08-14T12:10:00.000Z';
  insert.run('legacy_org_2', 'organizations', JSON.stringify({ id: 'legacy_org_2', name: 'CPT Network Solutions', domain: 'www.cptnetworks.com', service_area: 'Arizona' }), 'legacy_canonical', now, now);
  insert.run('legacy_contact_2', 'contacts', JSON.stringify({ id: 'legacy_contact_2', organization_id: 'legacy_org_2', email: 'PARTNERS@CPTNETWORKS.COM', phone: '+1 (602) 555-0100' }), 'legacy_canonical', now, now);
  db.close();
}

makeOwnedDb(sourceOne);
makeCanonicalDb(sourceTwo);
process.env.CANONICAL_STORE_TYPE = 'sqlite';
process.env.CANONICAL_SQLITE_PATH = targetPath;

const [{ combineOwnedDatabases }, { getCanonicalStore, resetCanonicalStore }] = await Promise.all([
  import('../lib/canonical-migration.ts'),
  import('../lib/canonical-store.ts'),
]);

try {
  resetCanonicalStore();
  const store = getCanonicalStore();
  const report = combineOwnedDatabases([
    { path: sourceOne, label: 'revenue-command' },
    { path: sourceTwo, label: 'legacy-canonical' },
  ], store);

  assert.equal(report.ok, true);
  assert.equal(report.sourceRecords, 5);
  assert.equal(report.canonicalRecords, 3, 'organization and contact duplicates should collapse');
  assert.equal(report.deduplicatedRecords, 2);

  const organizations = store.queryTable('organizations');
  const contacts = store.queryTable('contacts');
  const opportunities = store.queryTable('opportunities');
  assert.equal(organizations.length, 1);
  assert.equal(contacts.length, 1);
  assert.equal(opportunities.length, 1);
  assert.equal(organizations[0].service_area, 'Arizona');
  assert.deepEqual(new Set(organizations[0].migration_sources), new Set(['revenue-command', 'legacy-canonical']));
  assert.equal(contacts[0].organization_id, organizations[0].id, 'contact foreign key should be rewritten');
  assert.equal(opportunities[0].organization_id, organizations[0].id, 'opportunity organization should be canonical');
  assert.equal(opportunities[0].contact_id, contacts[0].id, 'opportunity contact should be canonical');

  const rerun = combineOwnedDatabases([{ path: sourceOne, label: 'revenue-command' }], store);
  assert.equal(rerun.ok, true);
  assert.equal(store.queryTable('organizations').length, 1, 'rerun must be idempotent');
  assert.equal(store.queryTable('contacts').length, 1, 'rerun must not duplicate contacts');
  assert.equal(store.queryTable('opportunities').length, 1, 'rerun must not duplicate opportunities');

  console.log('canonical database migration tests passed');
} finally {
  resetCanonicalStore();
  rmSync(tempRoot, { recursive: true, force: true });
}
