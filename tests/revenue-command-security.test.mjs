import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-security-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'revenue-command.json');

const { getRecord, getDatabaseStats, closeDatabase } = await import('../lib/revenue-command-db.ts');
const { recordSecurityFinding, assignRole } = await import('../lib/revenue-command-security.ts');

const finding = await recordSecurityFinding({
  findingType: 'unauthenticated_write',
  severity: 'medium',
  resource: '/api/revenue-command-spine/intake',
  description: 'Intake endpoint writes to the owned store and must be rate limited and validated.',
  remediation: 'Rate limiting and size clamps are active; monitor for abuse.'
});
assert.equal(finding.ok, true);
assert.ok(getRecord('security_findings', finding.id));

const role = await assignRole({
  contactId: 'contact_test_owner',
  roleName: 'owner',
  grantedBy: 'system'
});
assert.equal(role.ok, true);
assert.ok(getRecord('user_roles', role.id));

const stats = getDatabaseStats();
assert.ok(stats.security_findings >= 1);
assert.ok(stats.roles >= 1);
assert.ok(stats.user_roles >= 1);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });

console.log('revenue command security tests passed');
