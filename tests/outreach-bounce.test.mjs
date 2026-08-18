import assert from 'assert';
import { buildOutreachRecords } from '../lib/outreach.ts';
import { buildBounceSuppressionWrites } from '../lib/bounce.ts';
import { parseDSN, isHardBounce } from '../lib/dsn-parser.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

resetCanonicalStore();
const store = getCanonicalStore();

// Seed an outreach record for Leapfrog Arizona
const outreachWrites = buildOutreachRecords({
  source: 'leapfrog_arizona_partnership',
  fullName: 'Michael Burnette',
  company: 'Leapfrog Services',
  email: 'Michael.Burnette@leapfrogservices.com',
  channel: 'email',
  messageType: 'partnership',
  offer: 'Leapfrog Arizona Field Services Partnership',
  status: 'sent',
});

await store.executeWrites(outreachWrites);
const outreachId = outreachWrites.find((w) => w.table === 'outreach').id;
const contactId = outreachWrites.find((w) => w.table === 'contacts').id;

const dsn = `Delivery has failed to these recipients or groups:

Michael.Burnette@leapfrogservices.com

The email address you entered couldn't be found. Please check the recipient's email address and try to resend the message. If the problem continues, please contact your helpdesk.

Remote Server returned '550 5.1.10 RESOLVER.ADR.RecipNotFound; Recipient not found by SMTP address lookup'`;

const parsed = parseDSN(dsn);
assert.equal(parsed.bounceType, 'hard', 'address-not-found should be a hard bounce');
assert.equal(parsed.recipient, 'michael.burnette@leapfrogservices.com');
assert.ok(isHardBounce(parsed), '5.1.10 should be treated as hard bounce');

const bounceWrites = await buildBounceSuppressionWrites({
  email: 'Michael.Burnette@leapfrogservices.com',
  dsn,
  parsed,
  source: 'gmail_dsn',
  outreachId,
}, store);

const bounceResult = await store.executeWrites(bounceWrites);
assert.equal(bounceResult.ok, true);

const contact = await store.getRecord('contacts', contactId);
assert.equal(contact.email_status, 'bounced', 'contact should be marked bounced');
assert.equal(contact.suppressed, true, 'contact should be suppressed');
assert.equal(contact.bounce_count, 1);

const outreach = await store.getRecord('outreach', outreachId);
assert.equal(outreach.status, 'lost', 'outreach should be marked lost after bounce');
assert.ok(outreach.bounce_id, 'outreach should reference bounce record');

console.log('outreach bounce tests passed');
