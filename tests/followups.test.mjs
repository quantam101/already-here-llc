import assert from 'assert';
import { buildFollowUpRecord } from '../lib/followups.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

resetCanonicalStore();
const store = getCanonicalStore();

const followUp = buildFollowUpRecord({
  source: 'test_followups',
  organizationId: 'org_test',
  contactId: 'contact_test',
  relatedRecordType: 'opportunity',
  relatedRecordId: 'opp_test',
  lane: 'test',
  purpose: 'Test follow-up purpose',
  channel: 'email',
  status: 'open'
});

const result = await store.executeWrites([followUp]);
assert.equal(result.ok, true);

const record = await store.getRecord('followups', followUp.id);
assert.equal(record.status, 'open');
assert.equal(record.lane, 'test');

const { POST } = await import('../app/api/followups/route.ts');

const update = await POST(new Request('http://localhost:3000/api/followups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: followUp.id, status: 'closed', notes: 'Completed' })
}));

const updateJson = await update.json();
assert.equal(updateJson.ok, true);
assert.equal(updateJson.status, 'closed');

const updated = await store.getRecord('followups', followUp.id);
assert.equal(updated.status, 'closed');
assert.equal(updated.notes, 'Completed');

console.log('followups tests passed');
