import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-reconcile-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'reconcile.sqlite3');

const { buildRevenueIntakeProof } = await import('../lib/revenue-command-intake.ts');
const { persistDatabaseReadyWrites, listRecords, getRecord, closeDatabase } = await import('../lib/revenue-command-db.ts');
const { reconcileLeadIdentity } = await import('../lib/revenue-command-reconcile.ts');

const proof = buildRevenueIntakeProof({
  source: 'website',
  fullName: 'Dana Buyer',
  company: 'Phoenix Managed Services LLC',
  email: 'Dana.Buyer@example.com',
  phone: '(602) 555-0101',
  title: 'Network support request',
  body: 'Need smart hands support in Phoenix.',
  location: 'Phoenix, AZ',
  serviceType: 'Field network support',
  estimatedValueCents: 75000,
  submittedAt: '2026-08-10T16:00:00.000Z'
});
const persisted = await persistDatabaseReadyWrites(proof.databaseReadyWrites);
assert.equal(persisted.errors.length, 0);

const lead = listRecords('leads', 20)[0];
assert.ok(lead);
const legacyContactId = String(lead.contact_id);
const legacyOrganizationId = String(lead.organization_id);

const result = await reconcileLeadIdentity(String(lead.id));
assert.equal(result.ok, true);
assert.ok(result.canonicalContactId);
assert.ok(result.canonicalOrganizationId);

const updatedLead = getRecord('leads', String(lead.id));
assert.equal(updatedLead.canonical_contact_id, result.canonicalContactId);
assert.equal(updatedLead.canonical_organization_id, result.canonicalOrganizationId);
assert.equal(updatedLead.contact_id, result.canonicalContactId);
assert.equal(updatedLead.organization_id, result.canonicalOrganizationId);

const opportunity = listRecords('opportunities', 20)[0];
assert.equal(opportunity.contact_id, result.canonicalContactId);
assert.equal(opportunity.organization_id, result.canonicalOrganizationId);

if (legacyContactId !== result.canonicalContactId) {
  assert.equal(getRecord('contacts', legacyContactId)?.canonical_contact_id, result.canonicalContactId);
  assert.equal(getRecord('contacts', legacyContactId)?.superseded_by_canonical, true);
}
if (legacyOrganizationId !== result.canonicalOrganizationId) {
  assert.equal(getRecord('organizations', legacyOrganizationId)?.canonical_organization_id, result.canonicalOrganizationId);
  assert.equal(getRecord('organizations', legacyOrganizationId)?.superseded_by_canonical, true);
}

const second = await reconcileLeadIdentity(String(lead.id));
assert.equal(second.ok, true);
assert.equal(second.canonicalContactId, result.canonicalContactId);
assert.equal(second.canonicalOrganizationId, result.canonicalOrganizationId);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });
console.log('revenue command reconcile tests passed');
