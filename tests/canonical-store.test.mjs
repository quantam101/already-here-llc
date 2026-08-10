import assert from 'assert';
import { canonicalId, canonicalSlug } from '../lib/canonical-ids.ts';
import {
  buildGraphFromRecords,
  getCanonicalStore,
  resetCanonicalStore,
} from '../lib/canonical-store.ts';

resetCanonicalStore();

const id1 = canonicalId('org', 'Already Here LLC');
assert.ok(id1.startsWith('org_'), 'canonicalId should prefix org');
assert.equal(canonicalId('org', 'Already Here LLC'), id1, 'canonicalId should be deterministic');

assert.equal(canonicalSlug('Already Here LLC'), 'already_here_llc');

const store = getCanonicalStore();
const writeResult = store.executeWrites([
  { table: 'organizations', id: id1, action: 'insert', record: { id: id1, name: 'Already Here LLC', source: 'test' } }
]);
assert.equal(writeResult.ok, true);
assert.equal(writeResult.insertedIds.length, 1);
assert.equal(writeResult.failed.length, 0);

const org = store.getRecord('organizations', id1);
assert.equal(org?.name, 'Already Here LLC');
assert.equal(org?._table, 'organizations');

const contactId = canonicalId('contact', id1, 'test@example.invalid');
store.executeWrites([
  { table: 'contacts', id: contactId, action: 'insert', record: { id: contactId, organization_id: id1, name: 'Test', source: 'test' } }
]);

const contacts = store.queryTable('contacts');
assert.equal(contacts.length, 1);

const aiRunId = store.recordAiRun({
  agentId: 'agent_test',
  targetTable: 'contacts',
  targetId: contactId,
  action: 'classify_intent',
  recommendation: 'follow_up_draft',
  confidence: 0.92,
  approvalRequired: true,
  persistedExternally: false,
});
assert.ok(aiRunId.startsWith('airun_'));
const aiRun = store.getRecord('ai_runs', aiRunId);
assert.equal(aiRun?.agent_id, 'agent_test');
assert.equal(aiRun?.confidence, 0.92);

const reviewId = store.recordReviewAction({
  targetTable: 'contacts',
  targetId: contactId,
  action: 'reply',
  decision: 'approved',
  approvalRequired: true,
});
assert.ok(reviewId.startsWith('review_'));
const review = store.getRecord('reviews', reviewId);
assert.equal(review?.action, 'reply');
assert.equal(review?.decision, 'approved');

const graph = buildGraphFromRecords(store.queryAll());
const contactNode = graph[contactId];
assert.ok(contactNode, 'contact node should exist in graph');
assert.equal(contactNode._related?.organization_id?.name, 'Already Here LLC');

resetCanonicalStore();
console.log('canonical store tests passed');
