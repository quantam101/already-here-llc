import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-approval-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'approval.sqlite3');

const { persistDatabaseReadyWrites, getRecord, listRecords, closeDatabase } = await import('../lib/revenue-command-db.ts');
const { recordApprovalAction } = await import('../lib/revenue-command-approval.ts');

const now = '2026-08-10T18:00:00.000Z';
await persistDatabaseReadyWrites([{ table: 'opportunities', id: 'opp_approval_1', action: 'insert', record: {
  id: 'opp_approval_1', title: 'Review me', lane: 'Dispatch', status: 'new', created_at: now, updated_at: now
}}]);

const reviewed = await recordApprovalAction({
  targetTable: 'opportunities', targetId: 'opp_approval_1', action: 'review', actorId: 'owner', createdAt: now
});
assert.equal(reviewed.ok, true);
assert.equal(reviewed.decision, 'reviewed');
assert.equal(reviewed.executionAllowed, false);
assert.equal(reviewed.externalExecutionAllowed, false);
assert.ok(getRecord('approval_actions', reviewed.approvalId));

const reply = await recordApprovalAction({
  targetTable: 'opportunities', targetId: 'opp_approval_1', action: 'reply', actorId: 'owner',
  requestId: 'reply-once', createdAt: '2026-08-10T18:01:00.000Z'
});
assert.equal(reply.ok, true);
assert.equal(reply.decision, 'reply_prepared');
assert.equal(reply.externalExecutionAllowed, false);

const dispatch = await recordApprovalAction({
  targetTable: 'opportunities', targetId: 'opp_approval_1', action: 'dispatch', actorId: 'owner',
  createdAt: '2026-08-10T18:02:00.000Z'
});
assert.equal(dispatch.ok, true);
assert.equal(dispatch.executionAllowed, true);
assert.equal(dispatch.externalExecutionAllowed, false);

assert.equal(listRecords('approval_actions', 20).length, 3);
assert.ok(listRecords('reviews', 20).length >= 3);
assert.ok(listRecords('audit_logs', 20).length >= 3);

const missing = await recordApprovalAction({ targetTable: 'opportunities', targetId: 'missing', action: 'approve', actorId: 'owner' });
assert.equal(missing.ok, false);
const unsupported = await recordApprovalAction({ targetTable: 'payments', targetId: 'anything', action: 'approve', actorId: 'owner' });
assert.equal(unsupported.ok, false);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });
console.log('revenue command approval tests passed');
