import assert from 'assert';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildRevenueIntakeProof } from '../lib/revenue-command-intake.ts';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-db-test-'));
const dbPath = join(tmpDir, 'revenue-command.sqlite3');
process.env.REVENUE_COMMAND_DB_PATH = dbPath;

const {
  getDatabaseStats,
  getDatabaseHealth,
  persistDatabaseReadyWrites,
  listRecords,
  getRecord,
  findRecordBy,
  closeDatabase
} = await import('../lib/revenue-command-db.ts');

const dispatch = buildRevenueIntakeProof({
  source: 'test_db_dispatch',
  fullName: 'DB Test',
  company: 'Already Here LLC',
  email: 'dbtest@example.invalid',
  title: 'Urgent same-day dispatch revenue opportunity by noon $500',
  body: 'Network smart hands dispatch with same-day revenue target.',
  location: 'Phoenix, AZ',
  serviceType: 'Technical field operations',
  requestedWindow: 'today by noon',
  estimatedValueCents: 50000,
  submittedAt: '2026-06-18T12:00:00.000Z'
});

assert.equal(dispatch.persistedExternally, false);
assert.ok(dispatch.databaseReadyWrites.length >= 10);

const { inserted, errors } = await persistDatabaseReadyWrites(dispatch.databaseReadyWrites);
assert.equal(errors.length, 0, `Unexpected persistence errors: ${errors.join(', ')}`);
assert.ok(inserted >= dispatch.databaseReadyWrites.length, `Expected ${dispatch.databaseReadyWrites.length} inserts, got ${inserted}`);

const sqliteHeader = readFileSync(dbPath).subarray(0, 16).toString('utf8');
assert.equal(sqliteHeader, 'SQLite format 3\u0000');

const health = getDatabaseHealth();
assert.equal(health.driver, 'sqlite');
assert.equal(health.durable, true);
assert.equal(health.schemaVersion, 2);
assert.ok(health.recordCount >= dispatch.databaseReadyWrites.length);
assert.equal(health.warning, undefined);

const stats = getDatabaseStats();
assert.ok(stats.organizations >= 1);
assert.ok(stats.contacts >= 1);
assert.ok(stats.leads >= 1);
assert.ok(stats.opportunities >= 1);
assert.ok(stats.ai_actions >= 1);
assert.ok(stats.ai_conversations >= 1);
assert.ok(stats.ai_memory >= 1);
assert.ok(stats.ai_feedback >= 1);
assert.ok(stats.ai_tasks >= 1);
assert.ok(stats.audit_logs >= 1);
assert.ok(stats.proof_of_work >= 1);
assert.equal(stats.dispatches, 1);
assert.equal(stats.jobs, 1);

const opportunities = listRecords('opportunities', 10);
assert.equal(opportunities.length, 1);
assert.equal(opportunities[0].lane, 'Dispatch');
assert.equal(opportunities[0].priority, 'P0');

const opportunityId = String(opportunities[0].id);
const byId = getRecord('opportunities', opportunityId);
assert.ok(byId);
assert.equal(byId.id, opportunities[0].id);

const byPriority = findRecordBy('opportunities', 'priority', 'P0');
assert.ok(byPriority);
assert.equal(byPriority.id, opportunityId);
assert.equal(findRecordBy('opportunities', 'priority; DROP TABLE owned_records', 'P0'), undefined);

closeDatabase();

// Re-open the database and prove that committed business records survive process lifecycle.
const reopened = getRecord('opportunities', opportunityId);
assert.ok(reopened);
assert.equal(reopened.id, opportunityId);
assert.equal(getDatabaseHealth().recordCount, health.recordCount);

const rejected = await persistDatabaseReadyWrites([
  {
    table: 'not_a_real_table',
    id: 'bad_1',
    action: 'insert',
    record: { id: 'bad_1', created_at: new Date().toISOString() }
  }
]);
assert.equal(rejected.inserted, 0);
assert.equal(rejected.errors.length, 1);
assert.match(rejected.errors[0], /Rejected unknown table/);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });

console.log('revenue command db tests passed');
