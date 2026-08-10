import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-identity-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'identity.sqlite3');

const {
  normalizeEmail,
  normalizePhone,
  normalizeOrganizationName,
  resolveCanonicalIdentity
} = await import('../lib/revenue-command-identity.ts');
const { getRecord, listRecords, closeDatabase } = await import('../lib/revenue-command-db.ts');

assert.equal(normalizeEmail(' Test@Example.COM '), 'test@example.com');
assert.equal(normalizePhone('+1 (602) 555-0100'), '6025550100');
assert.equal(normalizeOrganizationName('Already Here LLC'), 'already here');

const first = await resolveCanonicalIdentity({
  organizationName: 'Phoenix Managed Services LLC',
  organizationType: 'prospect',
  fullName: 'Dana Buyer',
  email: 'Dana.Buyer@example.com',
  phone: '(602) 555-0101',
  roleTitle: 'Operations Manager',
  source: 'website',
  consentStatus: 'opted_in',
  serviceArea: 'Phoenix, AZ',
  observedAt: '2026-08-10T17:00:00.000Z'
});
assert.equal(first.ok, true);
assert.equal(first.organizationCreated, true);
assert.equal(first.contactCreated, true);
assert.ok(first.organizationId);
assert.ok(first.contactId);

const second = await resolveCanonicalIdentity({
  organizationName: 'Phoenix Managed Services, LLC',
  organizationType: 'client',
  fullName: 'Dana Buyer',
  email: 'dana.buyer@EXAMPLE.com',
  source: 'gmail',
  consentStatus: 'contractual',
  observedAt: '2026-08-10T18:00:00.000Z'
});
assert.equal(second.ok, true);
assert.equal(second.organizationCreated, false);
assert.equal(second.contactCreated, false);
assert.equal(second.organizationId, first.organizationId);
assert.equal(second.contactId, first.contactId);
assert.ok(second.matchedBy.includes('organization_name'));
assert.ok(second.matchedBy.includes('email'));
assert.equal(listRecords('organizations', 100).length, 1);
assert.equal(listRecords('contacts', 100).length, 1);

const organization = getRecord('organizations', first.organizationId);
assert.equal(organization.organization_type, 'client');
assert.ok(Array.isArray(organization.source_history));
assert.ok(organization.source_history.includes('website'));
assert.ok(organization.source_history.includes('gmail'));

const contact = getRecord('contacts', first.contactId);
assert.equal(contact.normalized_email, 'dana.buyer@example.com');
assert.equal(contact.normalized_phone, '6025550101');
assert.equal(contact.consent_status, 'contractual');
assert.equal(contact.organization_id, first.organizationId);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });
console.log('revenue command identity tests passed');
