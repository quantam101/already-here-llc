#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const COMMIT = process.argv.includes('--commit');
const SEED = process.argv.includes('--seed');
const FIXTURE_PATH = fileURLToPath(new URL('./seven-send-attribution.json', import.meta.url));

const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
const EXPECTED_MATCHES = Number(fixture.expectedMatches);
const SOURCE = String(fixture.source ?? '').trim();
const SENDS = Array.isArray(fixture.sends) ? fixture.sends : [];

if (!Number.isInteger(EXPECTED_MATCHES) || SENDS.length !== EXPECTED_MATCHES) {
  throw new Error(`Fixture ${FIXTURE_PATH} must contain exactly ${EXPECTED_MATCHES} sends (found ${SENDS.length}).`);
}
if (!SOURCE) {
  throw new Error(`Fixture ${FIXTURE_PATH} must declare a non-empty source.`);
}

const ATTRIBUTION_FIELDS = [
  ['provider_message_id', 'providerMessageId'],
  ['provider_thread_id', 'providerThreadId'],
  ['rfc_message_id', 'rfcMessageId'],
];

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

function sendDay(value) {
  const ms = Date.parse(String(value ?? ''));
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : '';
}

function sameInstant(value, expected) {
  const actualMs = Date.parse(String(value ?? ''));
  const expectedMs = Date.parse(String(expected ?? ''));
  return Number.isFinite(actualMs) && Number.isFinite(expectedMs) && actualMs === expectedMs;
}

function seedSourceId(send) {
  return `partner_pipeline:row:${send.sheetRow}`;
}

// A recipient can legitimately have several outreach rows. Attribution is writable only when
// the row carries an exact send identity: the Gmail message id, the fixture source id, or the
// exact send timestamp. Date-only / same-day matches intentionally fail closed.
function isSameSend(row, send) {
  if (String(row.provider_message_id ?? '').trim() === send.providerMessageId) return true;
  if (String(row.source_id ?? '').trim() === seedSourceId(send)) return true;
  return [row.sent_at, row.created_at].some((stamp) => sameInstant(stamp, send.sentAt));
}

function configureStoreAliases() {
  const remoteUrl = process.env.CANONICAL_REMOTE_URL?.trim();
  const remoteApiKey = process.env.CANONICAL_REMOTE_API_KEY?.trim();
  if (remoteUrl && remoteApiKey) {
    process.env.OCI_CANONICAL_URL ||= remoteUrl;
    process.env.OCI_CANONICAL_API_KEY ||= remoteApiKey;
  }
}

function assertRealStoreConfigured() {
  const hasRemote = Boolean(
    (process.env.CANONICAL_REMOTE_URL || process.env.OCI_CANONICAL_URL) &&
    (process.env.CANONICAL_REMOTE_API_KEY || process.env.OCI_CANONICAL_API_KEY)
  );
  const hasSqlite = Boolean(
    process.env.CANONICAL_STORE_TYPE === 'sqlite' && process.env.CANONICAL_SQLITE_PATH
  );
  const hasUpstash = Boolean(
    process.env.CANONICAL_STORE_TYPE === 'upstash' &&
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );

  if (!hasRemote && !hasSqlite && !hasUpstash) {
    throw new Error(
      'Refusing to run seven-send backfill without a real canonical store. Configure CANONICAL_REMOTE_URL + CANONICAL_REMOTE_API_KEY (preferred), legacy OCI_CANONICAL_URL + OCI_CANONICAL_API_KEY, CANONICAL_STORE_TYPE=upstash + UPSTASH_REDIS_REST_URL/TOKEN, or CANONICAL_STORE_TYPE=sqlite + CANONICAL_SQLITE_PATH.'
    );
  }
}

function attributionRecord(send, verifiedAt) {
  return {
    provider: 'gmail',
    provider_message_id: send.providerMessageId,
    provider_thread_id: send.providerThreadId,
    rfc_message_id: send.rfcMessageId,
    attribution_status: 'backfilled_verified',
    attribution_verified_at: verifiedAt,
    source_event_key: `gmail:${send.providerMessageId}`,
  };
}

const REQUIRED_SHEET_FIELDS = ['outreach_status', 'retainer_path', 'next_action', 'follow_up_due', 'contact_owner'];

function sheetRow(send) {
  const sheet = send.sheet ?? {};
  const missing = REQUIRED_SHEET_FIELDS.filter((field) => !String(sheet[field] ?? '').trim());
  if (missing.length > 0 || !Number.isInteger(send.sheetRow)) {
    throw new Error(`Fixture row for ${send.company} is missing sheet data (${[...missing, ...(Number.isInteger(send.sheetRow) ? [] : ['sheetRow'])].join(', ')}); refusing to seed.`);
  }
  if (!/^Sent\b/.test(sheet.outreach_status)) {
    throw new Error(`Fixture row for ${send.company} has outreach_status "${sheet.outreach_status}", not a sent outreach; refusing to seed.`);
  }
  return sheet;
}

async function buildSeedWrites(send, buildOutreachRecords, verifiedAt, store) {
  const sheet = sheetRow(send);
  const writes = buildOutreachRecords({
    source: SOURCE,
    sourceId: seedSourceId(send),
    channel: 'email',
    fullName: send.company,
    company: send.company,
    email: send.recipient,
    phone: send.phone,
    domain: send.domain,
    messageType: sheet.outreach_status.replace(/^Sent\s*-\s*/, ''),
    offer: sheet.retainer_path,
    status: 'sent',
    nextAction: sheet.next_action,
    nextFollowUpDate: sheet.follow_up_due,
    assignedTo: sheet.contact_owner,
    submittedAt: send.sentAt,
  });

  const kept = [];
  for (const write of writes) {
    if (write.table === 'outreach') {
      kept.push({
        ...write,
        record: {
          ...write.record,
          sent_at: send.sentAt,
          sheet_row: send.sheetRow,
          sheet: send.sheet,
          ...attributionRecord(send, verifiedAt),
        },
      });
      continue;
    }
    // Existing organizations/contacts keep their established data; seeding only fills gaps.
    if ((write.table === 'organizations' || write.table === 'contacts') && (await store.getRecord(write.table, write.id))) {
      continue;
    }
    kept.push(write);
  }
  return kept;
}

function printRow(result) {
  const marker = result.status.padEnd(5);
  const id = result.outreachId ?? '-';
  console.log(`${marker} ${result.company} | ${result.recipient} | outreach=${id}${result.reason ? ` | ${result.reason}` : ''}`);
}

configureStoreAliases();
assertRealStoreConfigured();

const { getCanonicalStore } = await import('../lib/canonical-store.ts');
const { buildOutreachRecords } = await import('../lib/outreach.ts');
const store = getCanonicalStore();

try {
  const outreachRows = await store.queryTable('outreach', 10000);
  const results = [];

  for (const send of SENDS) {
    const recipient = normalizeEmail(send.recipient);
    const recipientRows = outreachRows.filter((row) => normalizeEmail(row.email) === recipient);
    const matches = recipientRows.filter((row) => isSameSend(row, send));

    if (matches.length === 0 && recipientRows.length > 0) {
      results.push({
        ...send,
        recipient,
        status: 'SKIP',
        reason: `${recipientRows.length} outreach row(s) for recipient but none with the exact ${send.sentAt} send identity; resolve manually`,
      });
      continue;
    }

    if (matches.length === 0) {
      if (SEED) {
        sheetRow(send);
        results.push({ ...send, recipient, status: 'SEED', reason: `no outreach row; will create org/contact/outreach/followup from sheet row ${send.sheetRow}` });
      } else {
        results.push({ ...send, recipient, status: 'SKIP', reason: 'no outreach row with exact normalized recipient (use --seed to create)' });
      }
      continue;
    }

    if (matches.length > 1) {
      results.push({ ...send, recipient, status: 'SKIP', reason: `ambiguous recipient: ${matches.length} outreach rows match the exact send identity` });
      continue;
    }

    const row = matches[0];
    const outreachId = String(row.id ?? row._canonical_id ?? '').trim();
    if (!outreachId) {
      results.push({ ...send, recipient, status: 'SKIP', reason: 'matched row has no canonical id' });
      continue;
    }

    const conflicting = ATTRIBUTION_FIELDS.find(([field, fixtureKey]) => {
      const current = String(row[field] ?? '').trim();
      return current && current !== send[fixtureKey];
    });

    if (conflicting) {
      results.push({
        ...send,
        recipient,
        outreachId,
        status: 'SKIP',
        reason: `existing ${conflicting[0]} conflicts with fixture`,
      });
      continue;
    }

    results.push({ ...send, recipient, outreachId, row, status: 'MATCH' });
  }

  for (const result of results) printRow(result);

  const matched = results.filter((result) => result.status === 'MATCH');
  const seeded = results.filter((result) => result.status === 'SEED');
  const skipped = results.filter((result) => result.status === 'SKIP');
  const mode = `${COMMIT ? 'commit' : 'dry-run'}${SEED ? '+seed' : ''}`;
  console.log(`\nsummary matched=${matched.length} seeded=${seeded.length} skipped=${skipped.length} expected=${EXPECTED_MATCHES} mode=${mode}`);

  if (matched.length + seeded.length !== EXPECTED_MATCHES || skipped.length > 0) {
    process.exitCode = 2;
  } else if (!COMMIT) {
    console.log(
      seeded.length > 0
        ? `DRY-RUN PASS: ${matched.length} recipients matched, ${seeded.length} would be seeded. No writes performed.`
        : 'DRY-RUN PASS: all seven production recipients matched exactly one existing outreach row. No writes performed.'
    );
  } else {
    const verifiedAt = new Date().toISOString();
    const writes = matched.map((result) => ({
      table: 'outreach',
      id: result.outreachId,
      action: 'upsert',
      record: attributionRecord(result, verifiedAt),
    }));

    for (const result of seeded) {
      const seedWrites = await buildSeedWrites(result, buildOutreachRecords, verifiedAt, store);
      result.outreachId = seedWrites.find((write) => write.table === 'outreach').id;
      writes.push(...seedWrites);
    }

    const writeResult = await store.executeWrites(writes);
    if (!writeResult.ok || writeResult.failed.length > 0) {
      throw new Error(`Backfill write failed: ${JSON.stringify(writeResult.failed)}`);
    }

    const verificationFailures = [];
    for (const result of [...matched, ...seeded]) {
      const observed = await store.getRecord('outreach', result.outreachId);
      if (!observed) {
        verificationFailures.push(`${result.outreachId}: missing after write`);
        continue;
      }
      if (normalizeEmail(observed.email) !== result.recipient) {
        verificationFailures.push(`${result.outreachId}: recipient not immediately observable`);
      }
      for (const [field, fixtureKey] of ATTRIBUTION_FIELDS) {
        if (String(observed[field] ?? '') !== result[fixtureKey]) {
          verificationFailures.push(`${result.outreachId}: ${field} not immediately observable`);
        }
      }
    }

    if (verificationFailures.length > 0) {
      throw new Error(`Post-write causal verification failed: ${verificationFailures.join('; ')}`);
    }

    console.log(`COMMIT PASS: updated ${matched.length} and seeded ${seeded.length} outreach rows; all immediately verified.`);
  }
} finally {
  store.close();
}
