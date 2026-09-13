import assert from 'assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalId, canonicalSlug, normalizePhone } from '../lib/canonical-ids.ts';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

const fixture = JSON.parse(readFileSync(new URL('../data/seven-send-attribution.json', import.meta.url), 'utf8'));
assert.equal(fixture.sends.length, fixture.expectedMatches);
assert.equal(new Set(fixture.sends.map((send) => send.recipient.toLowerCase())).size, fixture.sends.length, 'recipients unique');
assert.equal(new Set(fixture.sends.map((send) => send.providerMessageId)).size, fixture.sends.length, 'message ids unique');
const knownCompanies = ['ENTECH', 'Iron Mountain', 'US Card Solutions', 'PayCompass', 'Phoenix Techforce', 'Southwest Access', 'Westech'];
for (const name of knownCompanies) {
  assert.ok(fixture.sends.some((send) => send.company.includes(name)), `fixture covers ${name}`);
}
for (const send of fixture.sends) {
  assert.match(send.providerMessageId, /^[0-9a-f]{16}$/);
  assert.ok(Number.isInteger(send.sheetRow) && send.sheetRow > 1, 'sheetRow points at a data row');
  assert.equal(send.sheet.company, send.company, 'company copied verbatim from sheet');
  assert.equal(send.sheet.outreach_date, '2026-09-12');
  assert.equal(send.sheet.follow_up_due, '2026-09-15');
  assert.match(send.sheet.outreach_status, /^Sent - /);
  const sheetEmails = `${send.sheet.primary_email ?? ''};${send.sheet.secondary_email ?? ''}`.toLowerCase().split(';').map((email) => email.trim());
  assert.ok(sheetEmails.includes(send.recipient.toLowerCase()), `recipient ${send.recipient} appears on sheet row ${send.sheetRow}`);
  assert.equal(new Date(`${send.sheet.outreach_date}T00:00:00Z`).toISOString().slice(0, 10), send.sentAt.slice(0, 10), 'Gmail send date matches sheet outreach date');
  assert.match(send.rfcMessageId, /^<.+@mail\.gmail\.com>$/);
  assert.equal(new Date(send.sentAt).toISOString(), send.sentAt);
  assert.equal(new Date(Number(BigInt(`0x${send.providerMessageId}`) >> 20n)).toISOString(), send.sentAt, 'sentAt derives from Gmail id');
}

const workDir = mkdtempSync(join(tmpdir(), 'seven-send-'));
const dbPath = join(workDir, 'canonical.db');
const baseEnv = { ...process.env, CANONICAL_STORE_TYPE: 'sqlite', CANONICAL_SQLITE_PATH: dbPath };
delete baseEnv.OCI_CANONICAL_URL;
delete baseEnv.OCI_CANONICAL_API_KEY;
delete baseEnv.CANONICAL_REMOTE_URL;
delete baseEnv.CANONICAL_REMOTE_API_KEY;

function runBackfill(args = [], env = baseEnv) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-sqlite', '--experimental-strip-types', '--import', './tests/register-next-alias.mjs', 'data/seven-send-backfill.mjs', ...args],
    { env, encoding: 'utf8' }
  );
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

async function withStore(fn) {
  const previous = {
    CANONICAL_STORE_TYPE: process.env.CANONICAL_STORE_TYPE,
    CANONICAL_SQLITE_PATH: process.env.CANONICAL_SQLITE_PATH,
  };
  process.env.CANONICAL_STORE_TYPE = 'sqlite';
  process.env.CANONICAL_SQLITE_PATH = dbPath;
  resetCanonicalStore();
  try {
    return await fn(getCanonicalStore());
  } finally {
    resetCanonicalStore();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

try {
  const noStoreEnv = { ...baseEnv };
  delete noStoreEnv.CANONICAL_STORE_TYPE;
  delete noStoreEnv.CANONICAL_SQLITE_PATH;
  const refused = runBackfill(['--seed', '--commit'], noStoreEnv);
  assert.equal(refused.code, 1, 'refuses to run without a real store');
  assert.match(refused.stderr, /Refusing to run seven-send backfill/);

  const emptyDry = runBackfill();
  assert.equal(emptyDry.code, 2, 'dry-run against an empty store exits non-zero');
  assert.match(emptyDry.stdout, /summary matched=0 seeded=0 skipped=7 expected=7 mode=dry-run/);
  assert.equal((emptyDry.stdout.match(/^SKIP /gm) ?? []).length, 7);

  const emptyCommit = runBackfill(['--commit']);
  assert.equal(emptyCommit.code, 2, 'commit without --seed never inserts');
  await withStore(async (store) => assert.equal((await store.queryAll()).length, 0, 'no writes on skip'));

  const seedDry = runBackfill(['--seed']);
  assert.equal(seedDry.code, 0);
  assert.match(seedDry.stdout, /summary matched=0 seeded=7 skipped=0 expected=7 mode=dry-run\+seed/);
  assert.match(seedDry.stdout, /No writes performed/);
  await withStore(async (store) => assert.equal((await store.queryAll()).length, 0, 'seed dry-run performs no writes'));

  // A recipient with an outreach row from a different send is never matched nor seeded over.
  const otherSend = fixture.sends[2];
  await withStore(async (store) => {
    await store.executeWrites([
      {
        table: 'outreach',
        id: 'outreach_other_campaign',
        action: 'insert',
        record: { id: 'outreach_other_campaign', email: otherSend.recipient, status: 'sent', sent_at: '2026-09-20T15:00:00.000Z', created_at: '2026-09-20T15:00:00.000Z' },
      },
    ]);
  });
  const otherCampaign = runBackfill(['--seed', '--commit']);
  assert.equal(otherCampaign.code, 2, 'a recipient-only match from another send fails closed');
  assert.match(otherCampaign.stdout, /SKIP .*1 outreach row\(s\) for recipient but none with the exact .* send identity/);
  assert.match(otherCampaign.stdout, /summary matched=0 seeded=6 skipped=1/);
  await withStore(async (store) => {
    const rows = await store.queryTable('outreach');
    assert.equal(rows.length, 1, 'skip aborts every write');
    assert.equal(rows[0].provider_message_id, undefined, 'unrelated row receives no attribution');
    await store.executeWrites([
      { table: 'outreach', id: 'outreach_other_campaign', action: 'upsert', record: { sent_at: '2026-09-12T23:59:59.000Z' } },
    ]);
  });

  const sameDayOther = runBackfill(['--seed', '--commit']);
  assert.equal(sameDayOther.code, 2, 'same-day recipient-only outreach still fails closed');
  assert.match(sameDayOther.stdout, /summary matched=0 seeded=6 skipped=1/);
  await withStore(async (store) => {
    const row = await store.getRecord('outreach', 'outreach_other_campaign');
    assert.equal(row.provider_message_id, undefined, 'same-day unrelated row receives no attribution');
    await store.executeWrites([
      { table: 'outreach', id: 'outreach_other_campaign', action: 'upsert', record: { sent_at: otherSend.sentAt } },
    ]);
  });

  const otherResolved = runBackfill(['--seed']);
  assert.match(otherResolved.stdout, /summary matched=1 seeded=6 skipped=0/, 'exact timestamp identifies the send');
  await withStore(async (store) => {
    await store.executeWrites([
      { table: 'outreach', id: 'outreach_other_campaign', action: 'insert', record: { id: 'outreach_other_campaign', email: 'nobody@example.invalid', created_at: '2026-09-20T15:00:00.000Z' } },
    ]);
  });

  // Pre-existing organizations/contacts keep their established data when the outreach is seeded.
  const existingSend = fixture.sends[3];
  const existingOrgId = canonicalId('org', canonicalSlug(existingSend.company));
  await withStore(async (store) => {
    await store.executeWrites([
      {
        table: 'organizations',
        id: existingOrgId,
        action: 'insert',
        record: { id: existingOrgId, name: existingSend.company, organization_type: 'customer', aliases: ['Legacy Alias'], source: 'crm', created_at: '2026-01-01T00:00:00.000Z' },
      },
    ]);
  });

  const seedCommit = runBackfill(['--seed', '--commit']);
  assert.equal(seedCommit.code, 0, seedCommit.stdout + seedCommit.stderr);
  assert.match(seedCommit.stdout, /COMMIT PASS: updated 0 and seeded 7 outreach rows/);

  await withStore(async (store) => {
    const existingOrg = await store.getRecord('organizations', existingOrgId);
    assert.equal(existingOrg.organization_type, 'customer', 'existing org classification untouched');
    assert.deepEqual(existingOrg.aliases, ['Legacy Alias']);
    assert.equal(existingOrg.source, 'crm');
    assert.equal(existingOrg.created_at, '2026-01-01T00:00:00.000Z');

    const outreach = (await store.queryTable('outreach')).filter((row) => row.id !== 'outreach_other_campaign');
    assert.equal(outreach.length, 7);
    assert.equal((await store.queryTable('organizations')).length, 7);
    assert.equal((await store.queryTable('contacts')).length, 7);
    const followups = await store.queryTable('followups');
    assert.equal(followups.length, 7);
    for (const send of fixture.sends) {
      const row = outreach.find((candidate) => candidate.email === send.recipient.toLowerCase());
      assert.ok(row, `outreach row for ${send.recipient}`);
      assert.equal(row.company, send.company);
      assert.equal(row.status, 'sent');
      assert.equal(row.channel, 'email');
      assert.equal(row.source, fixture.source);
      assert.equal(row.source_id, `partner_pipeline:row:${send.sheetRow}`);
      assert.equal(row.message_type, send.sheet.outreach_status.replace(/^Sent - /, ''));
      assert.equal(row.offer, send.sheet.retainer_path);
      assert.equal(row.next_action, send.sheet.next_action);
      assert.equal(row.next_follow_up_date, send.sheet.follow_up_due);
      assert.equal(row.assigned_to, send.sheet.contact_owner);
      assert.equal(row.phone, normalizePhone(send.phone));
      assert.equal(row.domain, send.domain);
      assert.equal(row.sent_at, send.sentAt);
      assert.equal(row.sheet_row, send.sheetRow);
      assert.deepEqual(row.sheet, send.sheet, 'verbatim sheet row preserved');
      assert.equal(row.created_at, send.sentAt);
      assert.equal(row.provider, 'gmail');
      assert.equal(row.provider_message_id, send.providerMessageId);
      assert.equal(row.provider_thread_id, send.providerThreadId);
      assert.equal(row.rfc_message_id, send.rfcMessageId);
      assert.equal(row.attribution_status, 'backfilled_verified');
      assert.equal(row.source_event_key, `gmail:${send.providerMessageId}`);
      assert.ok(followups.some((followup) => followup.related_record_id === row.id), 'follow-up linked to outreach');
    }
  });

  const matchDry = runBackfill();
  assert.equal(matchDry.code, 0);
  assert.match(matchDry.stdout, /summary matched=7 seeded=0 skipped=0 expected=7 mode=dry-run/);

  const matchCommit = runBackfill(['--commit']);
  assert.equal(matchCommit.code, 0);
  assert.match(matchCommit.stdout, /COMMIT PASS: updated 7 and seeded 0 outreach rows/);

  const seedAgain = runBackfill(['--seed', '--commit']);
  assert.equal(seedAgain.code, 0, 'seed is idempotent once rows exist');
  assert.match(seedAgain.stdout, /summary matched=7 seeded=0 skipped=0/);
  await withStore(async (store) => assert.equal((await store.queryTable('outreach')).length, 8, 'no duplicate rows'));

  const target = fixture.sends[0];
  await withStore(async (store) => {
    const row = (await store.queryTable('outreach')).find((candidate) => candidate.email === target.recipient.toLowerCase());
    await store.executeWrites([
      { table: 'outreach', id: row.id, action: 'upsert', record: { provider_message_id: 'ffffffffffffffff' } },
    ]);
  });
  const conflict = runBackfill(['--seed', '--commit']);
  assert.equal(conflict.code, 2, 'conflicting attribution fails closed even with --seed --commit');
  assert.match(conflict.stdout, new RegExp(`SKIP  ${target.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} .*existing provider_message_id conflicts with fixture`));
  assert.match(conflict.stdout, /summary matched=6 seeded=0 skipped=1/);
  await withStore(async (store) => {
    const row = (await store.queryTable('outreach')).find((candidate) => candidate.email === target.recipient.toLowerCase());
    assert.equal(row.provider_message_id, 'ffffffffffffffff', 'conflicting row left untouched');
  });

  const duplicateEmail = fixture.sends[1];
  await withStore(async (store) => {
    await store.executeWrites([
      { table: 'outreach', id: 'outreach_duplicate', action: 'insert', record: { id: 'outreach_duplicate', email: duplicateEmail.recipient.toUpperCase(), sent_at: duplicateEmail.sentAt } },
    ]);
  });
  const ambiguous = runBackfill(['--seed']);
  assert.equal(ambiguous.code, 2);
  assert.match(ambiguous.stdout, /ambiguous recipient: 2 outreach rows match the exact send identity/);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

console.log('seven-send-backfill tests passed');
