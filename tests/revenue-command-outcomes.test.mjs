import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-outcomes-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'outcomes.sqlite3');

const { persistDatabaseReadyWrites, getRecord, closeDatabase } = await import('../lib/revenue-command-db.ts');
const { recordAiOutcome } = await import('../lib/revenue-command-outcomes.ts');

const now = '2026-08-10T17:00:00.000Z';
const actionId = 'ai_action_test_1';
await persistDatabaseReadyWrites([
  {
    table: 'ai_actions',
    id: actionId,
    action: 'insert',
    record: {
      id: actionId,
      agent_id: 'receptionist',
      target_table: 'opportunities',
      target_id: 'opp_test_1',
      action: 'recommend_follow_up',
      result_json: JSON.stringify({ recommendation: 'Call back' }),
      approval_required: 1,
      created_at: now,
      updated_at: now
    }
  }
]);

const unverified = await recordAiOutcome({
  aiActionId: actionId,
  opportunityId: 'opp_test_1',
  outcomeType: 'completed',
  summary: 'Follow-up completed but revenue has not been verified.',
  realizedRevenueCents: 50000,
  realizedCostCents: 5000,
  verificationStatus: 'unverified',
  occurredAt: '2026-08-10T17:15:00.000Z'
});
assert.equal(unverified.ok, true);
assert.equal(unverified.verificationStatus, 'unverified');
assert.equal(unverified.revenueEventId, undefined);
assert.equal(unverified.contributionMarginCents, 45000);
assert.ok(getRecord('outcomes', unverified.outcomeId));
assert.ok(getRecord('ai_feedback', unverified.feedbackId));
assert.equal(getRecord('ai_actions', actionId)?.outcome_id, unverified.outcomeId);

const verified = await recordAiOutcome({
  aiActionId: actionId,
  opportunityId: 'opp_test_1',
  outcomeType: 'revenue',
  summary: 'Customer payment verified against completed work.',
  realizedRevenueCents: 50000,
  realizedCostCents: 5000,
  verificationStatus: 'verified',
  evidence: [{ source: 'payment_record', reference: 'pay_123' }],
  occurredAt: '2026-08-10T17:30:00.000Z'
});
assert.equal(verified.ok, true);
assert.ok(verified.revenueEventId);
const revenueEvent = getRecord('revenue_events', verified.revenueEventId);
assert.ok(revenueEvent);
assert.equal(revenueEvent.verification_status, 'verified');
assert.equal(revenueEvent.amount_cents, 50000);
assert.equal(revenueEvent.contribution_margin_cents, 45000);

const missing = await recordAiOutcome({
  aiActionId: 'missing_action',
  outcomeType: 'failed',
  summary: 'Should not persist.'
});
assert.equal(missing.ok, false);
assert.match(missing.errors[0], /AI action not found/);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });
console.log('revenue command outcomes tests passed');
