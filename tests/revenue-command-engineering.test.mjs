import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-engineering-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'revenue-command.json');

const { getRecord, getDatabaseStats, closeDatabase } = await import('../lib/revenue-command-db.ts');
const { ingestCodexChangelog, ingestSystemHealthSignal, ingestCatchCorrectEvent } = await import('../lib/revenue-command-engineering.ts');

const codex = await ingestCodexChangelog({
  commitHash: 'abc123',
  author: 'dev@alreadyherellc.com',
  message: 'Phase 7 engineering platform ingestion',
  branch: 'devin/revenue-command-owned-db',
  tags: ['v1.2.0'],
  deploymentStatus: 'success'
});
assert.equal(codex.ok, true);
assert.ok(getRecord('codex_changelog', codex.id));

const health = await ingestSystemHealthSignal({
  service: 'revenue-command-spine',
  status: 'healthy',
  reason: 'Owned database is writable and reads return after writes.',
  severity: 'low',
  source: 'qa:gate',
  recommendation: 'Continue monitoring write queue depth.'
});
assert.equal(health.ok, true);
assert.ok(getRecord('system_health_signals', health.id));

const catchCorrect = await ingestCatchCorrectEvent({
  module: 'revenue-command-pipeline',
  errorSummary: 'Pipeline action race on concurrent writes',
  correction: 'Use promise queue for serialized persistence',
  rule: 'All owned writes must pass through persistDatabaseReadyWrites',
  severity: 'medium'
});
assert.equal(catchCorrect.ok, true);
assert.ok(getRecord('catch_correct_events', catchCorrect.id));

const stats = getDatabaseStats();
assert.ok(stats.audit_logs >= 1);
assert.ok(stats.codex_changelog >= 1);
assert.ok(stats.system_health_signals >= 1);
assert.ok(stats.catch_correct_events >= 1);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });

console.log('revenue command engineering tests passed');
