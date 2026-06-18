import assert from 'assert';
import {
  applyReviewAction,
  getDatabaseReadyRecords,
  getRevenueCommandSpineResponse,
  scoreRecord
} from '../lib/revenue-command-spine.ts';
import {
  getRevenueCommandAgents,
  validateRevenueAgentCoverage
} from '../lib/revenue-command-agents.ts';

const response = getRevenueCommandSpineResponse(new Date('2026-06-18T12:00:00.000Z'));
assert.equal(response.ok, true);
assert.equal(response.databaseRole, 'owned_core_asset_layer');
assert.equal(response.externalActions, 'blocked_by_default');
assert.ok(response.databaseTables.includes('leads'));
assert.ok(response.databaseTables.includes('opportunities'));
assert.ok(response.databaseTables.includes('proof_of_work'));
assert.ok(response.databaseTables.includes('catch_correct_events'));
assert.ok(response.databaseTables.includes('codex_changelog'));

const records = getDatabaseReadyRecords();
assert.ok(records.length >= 18);
assert.equal(records[0].priority, 'P0');
assert.ok(scoreRecord(records[0]) >= scoreRecord(records[records.length - 1]));

const agents = getRevenueCommandAgents();
const coverage = validateRevenueAgentCoverage();
assert.equal(coverage.ok, true);
assert.equal(coverage.oneAgentPerTask, true);
assert.equal(coverage.recordCount, records.length);
assert.equal(coverage.agentCount, records.length);
assert.equal(coverage.missingAgentRecordIds.length, 0);
assert.equal(coverage.duplicateAgentRecordIds.length, 0);
assert.equal(coverage.duplicateOperations.length, 0);

for (const record of records) {
  const matched = agents.filter((agent) => agent.recordId === record.id);
  assert.equal(matched.length, 1, `record ${record.id} must have exactly one agent`);
  assert.equal(matched[0].runPolicy, 'one_agent_one_task');
  assert.equal(matched[0].executionScope, 'local_proof_only');
  assert.ok(matched[0].blockedExternalActions.includes('send_email'));
  assert.ok(matched[0].blockedExternalActions.includes('production_deploy'));
  assert.ok(matched[0].blockedExternalActions.includes('move_money'));
}

const reply = applyReviewAction(records[0].id, 'reply');
assert.equal(reply.ok, true);
assert.equal(reply.persistedExternally, false);
assert.equal(reply.approvalRequired, true);
assert.equal(reply.nextLocalState, 'reply_drafted');

const pass = applyReviewAction(records[0].id, 'pass');
assert.equal(pass.persistedExternally, false);
assert.equal(pass.approvalRequired, false);
assert.equal(pass.nextLocalState, 'passed');

console.log('revenue command spine tests passed');
