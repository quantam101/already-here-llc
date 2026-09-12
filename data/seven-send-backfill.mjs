#!/usr/bin/env node

const COMMIT = process.argv.includes('--commit');
const EXPECTED_MATCHES = 7;

const SENDS = [
  {
    company: 'Westech Recyclers',
    recipient: 'info@westechrecyclers.com',
    providerMessageId: '1a095b6af83e7fdb',
    providerThreadId: '1a095b6af83e7fdb',
    rfcMessageId: '<CAHMgaD4Yq2TTehJBu68ZXuprKKn3zAdGuG8nZrh9HMAU1dA7Cw@mail.gmail.com>',
  },
  {
    company: 'Southwest Access & Video',
    recipient: 'service@swaccess.com',
    providerMessageId: '1a095b69eec6fb8d',
    providerThreadId: '1a095b69eec6fb8d',
    rfcMessageId: '<CAHMgaD7rVTYjKapc5db6bcFpc8OjJQhOp+y4qXipCdUDt5qcmw@mail.gmail.com>',
  },
  {
    company: 'Phoenix Techforce',
    recipient: 'support@phoenixtechforce.com',
    providerMessageId: '1a095b686f858d66',
    providerThreadId: '1a095b686f858d66',
    rfcMessageId: '<CAHMgaD5EsJ5quB1JEY9zyF4HhRXLfygKFZTH0iFjdd6aPpaeGA@mail.gmail.com>',
  },
  {
    company: 'Iron Mountain Data Centers',
    recipient: 'datacenters@ironmountain.com',
    providerMessageId: '1a095b66f78732bc',
    providerThreadId: '1a095b66f78732bc',
    rfcMessageId: '<CAHMgaD7HBVG27qvC0OqgbaCOK66ct+n_=TAJWtAhoFq=qT9qxQ@mail.gmail.com>',
  },
  {
    company: 'PayCompass',
    recipient: 'info@paycompass.com',
    providerMessageId: '1a095b66283995a7',
    providerThreadId: '1a095b66283995a7',
    rfcMessageId: '<CAHMgaD7oBq685bq2ddz9WO60rxzVy3=BWm6FcyJM81JHWXE-TQ@mail.gmail.com>',
  },
  {
    company: 'ENTECH Biomedical',
    recipient: 'info@entechbiomedical.com',
    providerMessageId: '1a095b6517f2dc8c',
    providerThreadId: '1a095b6517f2dc8c',
    rfcMessageId: '<CAHMgaD59SUegZ3hC9ThbbHsY_J5QZpBd3Dcwr8HxmmhyV04EaQ@mail.gmail.com>',
  },
  {
    company: 'US Card Solutions',
    recipient: 'partnersupport@uscardsolutions.com',
    providerMessageId: '1a095b64bf945370',
    providerThreadId: '1a095b64bf945370',
    rfcMessageId: '<CAHMgaD7PS+Qi=QGma77xdCvOS740MfQGhen7gHJmXR8hjZnYYA@mail.gmail.com>',
  },
];

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
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

  if (!hasRemote && !hasSqlite) {
    throw new Error(
      'Refusing to run seven-send backfill without a real canonical store. Configure CANONICAL_REMOTE_URL + CANONICAL_REMOTE_API_KEY (preferred), legacy OCI_CANONICAL_URL + OCI_CANONICAL_API_KEY, or CANONICAL_STORE_TYPE=sqlite + CANONICAL_SQLITE_PATH.'
    );
  }
}

function printRow(result) {
  const marker = result.status.padEnd(5);
  const id = result.outreachId ?? '-';
  console.log(`${marker} ${result.company} | ${result.recipient} | outreach=${id}${result.reason ? ` | ${result.reason}` : ''}`);
}

configureStoreAliases();
assertRealStoreConfigured();

const { getCanonicalStore } = await import('../lib/canonical-store.ts');
const store = getCanonicalStore();

try {
  const outreachRows = await store.queryTable('outreach', 10000);
  const results = [];

  for (const send of SENDS) {
    const recipient = normalizeEmail(send.recipient);
    const matches = outreachRows.filter((row) => normalizeEmail(row.email) === recipient);

    if (matches.length === 0) {
      results.push({ ...send, recipient, status: 'SKIP', reason: 'no outreach row with exact normalized recipient' });
      continue;
    }

    if (matches.length > 1) {
      results.push({ ...send, recipient, status: 'SKIP', reason: `ambiguous recipient: ${matches.length} outreach rows` });
      continue;
    }

    const row = matches[0];
    const outreachId = String(row.id ?? row._canonical_id ?? '').trim();
    if (!outreachId) {
      results.push({ ...send, recipient, status: 'SKIP', reason: 'matched row has no canonical id' });
      continue;
    }

    const conflicting = [
      ['provider_message_id', send.providerMessageId],
      ['provider_thread_id', send.providerThreadId],
      ['rfc_message_id', send.rfcMessageId],
    ].find(([field, expected]) => {
      const current = String(row[field] ?? '').trim();
      return current && current !== expected;
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
  const skipped = results.filter((result) => result.status === 'SKIP');
  console.log(`\nsummary matched=${matched.length} skipped=${skipped.length} expected=${EXPECTED_MATCHES} mode=${COMMIT ? 'commit' : 'dry-run'}`);

  if (matched.length !== EXPECTED_MATCHES || skipped.length > 0) {
    process.exitCode = 2;
  } else if (!COMMIT) {
    console.log('DRY-RUN PASS: all seven production recipients matched exactly one existing outreach row. No writes performed.');
  } else {
    const verifiedAt = new Date().toISOString();
    const writes = matched.map((result) => ({
      table: 'outreach',
      id: result.outreachId,
      action: 'upsert',
      record: {
        provider: 'gmail',
        provider_message_id: result.providerMessageId,
        provider_thread_id: result.providerThreadId,
        rfc_message_id: result.rfcMessageId,
        attribution_status: 'backfilled_verified',
        attribution_verified_at: verifiedAt,
        source_event_key: `gmail:${result.providerMessageId}`,
      },
    }));

    const writeResult = await store.executeWrites(writes);
    if (!writeResult.ok || writeResult.failed.length > 0) {
      throw new Error(`Backfill write failed: ${JSON.stringify(writeResult.failed)}`);
    }

    const verificationFailures = [];
    for (const result of matched) {
      const observed = await store.getRecord('outreach', result.outreachId);
      if (!observed) {
        verificationFailures.push(`${result.outreachId}: missing after write`);
        continue;
      }
      if (String(observed.provider_message_id ?? '') !== result.providerMessageId) {
        verificationFailures.push(`${result.outreachId}: provider_message_id not immediately observable`);
      }
      if (String(observed.provider_thread_id ?? '') !== result.providerThreadId) {
        verificationFailures.push(`${result.outreachId}: provider_thread_id not immediately observable`);
      }
      if (String(observed.rfc_message_id ?? '') !== result.rfcMessageId) {
        verificationFailures.push(`${result.outreachId}: rfc_message_id not immediately observable`);
      }
    }

    if (verificationFailures.length > 0) {
      throw new Error(`Post-write causal verification failed: ${verificationFailures.join('; ')}`);
    }

    console.log(`COMMIT PASS: updated and immediately verified ${matched.length} existing outreach rows.`);
  }
} finally {
  store.close();
}
