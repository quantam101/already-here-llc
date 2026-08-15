import assert from 'assert';
import { buildOutreachRecords } from '../lib/outreach.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

resetCanonicalStore();
const store = getCanonicalStore();

const input = {
  source: 'test_outreach',
  channel: 'email',
  fullName: 'Warm Prospect',
  company: 'Prospect Co',
  email: 'warm@prospect.alreadyherellc.com',
  phone: '(602) 555-0500',
  domain: 'prospect.alreadyherellc.com',
  messageType: 'intro_email',
  offer: 'Field Operations Workflow Review',
  messageBody: 'Quick note about operational bottlenecks.',
  status: 'sent',
  nextAction: 'Schedule discovery call',
  nextFollowUpDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  assignedTo: 'sales@alreadyherellc.com'
};

const writes = buildOutreachRecords(input);
assert.ok(writes.some((w) => w.table === 'organizations'));
assert.ok(writes.some((w) => w.table === 'contacts'));
assert.ok(writes.some((w) => w.table === 'outreach'));
assert.ok(writes.some((w) => w.table === 'followups'));

const result = await store.executeWrites(writes);
assert.equal(result.ok, true);

const outreachId = writes.find((w) => w.table === 'outreach').id;
const outreach = await store.getRecord('outreach', outreachId);
assert.equal(outreach.status, 'sent');
assert.equal(outreach.company, 'Prospect Co');
assert.equal(outreach.email, 'warm@prospect.alreadyherellc.com');

const followups = await store.queryTable('followups', 100);
const matched = followups.find((f) => f.related_record_id === outreachId);
assert.ok(matched, 'followup should be linked to outreach');
assert.equal(matched.purpose, 'Outreach follow-up: Field Operations Workflow Review — Warm Prospect (Prospect Co)');

console.log('outreach tests passed');
