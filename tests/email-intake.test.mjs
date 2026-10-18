// Email takeout intake tests: mbox parsing, classification, canonical writes.
import assert from 'node:assert/strict';
import { getCanonicalStore, resetCanonicalStore } from '../lib/canonical-store.ts';

const { parseEmail, splitMbox, classifyEmail, ingestEmails } = await import('../lib/email-intake.ts');

resetCanonicalStore();

const FN_MSG = `From no-reply@fieldnation.com Mon Jan 05 12:00:00 2026
From: "Field Nation" <no-reply@fieldnation.com>
To: stephenfranklin47@gmail.com
Subject: Work order WO-778123 completed - deliverables approved
Date: Mon, 05 Jan 2026 12:00:00 -0500
Message-ID: <fn-123@fieldnation.com>
Content-Type: multipart/mixed; boundary="bb1"

--bb1
Content-Type: text/plain

Your work order WO-778123 has been completed and approved. Closeout received.
--bb1
Content-Type: application/pdf; name="closeout-778123.pdf"
Content-Disposition: attachment; filename="closeout-778123.pdf"

BASE64DATA
--bb1--`;

const WM_MSG = `From notifications@workmarket.com Tue Feb 10 09:30:00 2026
From: WorkMarket <notifications@workmarket.com>
To: alreadyherellc@gmail.com
Subject: Invoice paid for assignment 99182
Date: Tue, 10 Feb 2026 09:30:00 -0500
Message-ID: <wm-9@workmarket.com>
Content-Type: text/plain

Payment of $250.00 was issued for assignment 99182.
`;

const PERSONAL = `From friend@example.com Wed Mar 01 08:00:00 2026
From: Friend <friend@example.com>
Subject: lunch tomorrow
Date: Wed, 01 Mar 2026 08:00:00 -0500
Message-ID: <p-1@example.com>

see you at noon
`;

const msgs = splitMbox(`${FN_MSG}\n${WM_MSG}\n${PERSONAL}`);
assert.equal(msgs.length, 3, 'mbox splits into 3 messages');

const parsed = msgs.map(parseEmail).filter(Boolean);
assert.equal(parsed.length, 3);
const fn = parsed.find((m) => m.from_email.includes('fieldnation'));
assert.equal(fn.subject.includes('WO-778123'), true);
assert.deepEqual(fn.attachments, ['closeout-778123.pdf']);

const classified = parsed.map(classifyEmail);
const cfn = classified.find((c) => c.from_email.includes('fieldnation'));
assert.equal(cfn.source, 'field_nation');
assert.equal(cfn.signal, 'closeout_evidence');
assert.equal(cfn.work_order_ref, 'WO-778123');
const cwm = classified.find((c) => c.from_email.includes('workmarket'));
assert.equal(cwm.source, 'work_market');
assert.equal(cwm.signal, 'invoice');
const cp = classified.find((c) => c.from_email === 'friend@example.com');
assert.equal(cp.source, 'gmail');
assert.equal(cp.signal, 'generic');

const store = getCanonicalStore();
const res = await ingestEmails(classified, store);
assert.equal(res.scanned, 3);
assert.equal(res.skipped, 1, 'personal email skipped');
assert.equal(res.imported_jobs, 2);
assert.equal(res.contacts, 2);
assert.equal(res.evidence, 2);

const jobs = await store.queryTable('jobs', 10);
assert.equal(jobs.length, 2);
const fnJob = jobs.find((j) => j.platform === 'field_nation');
assert.equal(fnJob.status, 'completed');
assert.equal(fnJob.source_ref, 'WO-778123');
assert.equal(fnJob.photo_count, 1);
assert.ok(fnJob.evidence_message_id);
const wmJob = jobs.find((j) => j.platform === 'work_market');
assert.equal(wmJob.status, 'invoiced');

const evidence = await store.queryTable('closeout_evidence', 10);
assert.equal(evidence.length, 2);
assert.ok(evidence.every((e) => e.message_id && e.job_id));

// Idempotent: re-ingesting merges, no duplicates.
const res2 = await ingestEmails(classified, store);
assert.equal(res2.imported_jobs, 2);
assert.equal((await store.queryTable('jobs', 10)).length, 2);

console.log('email-intake tests passed');
