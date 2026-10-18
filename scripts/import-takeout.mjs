#!/usr/bin/env node
/**
 * Import a Google Takeout mbox (or a directory of .eml files) into the
 * completed-work database via POST /api/intake/email.
 *
 * Usage:
 *   node --experimental-strip-types scripts/import-takeout.mjs <file.mbox|dir> \
 *     --url https://www.alreadyherellc.com --key $GINC_ADMIN_KEY [--batch 200] [--dry-run]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseEmail, splitMbox, classifyEmail } from '../lib/email-intake.ts';

const [target, ...flags] = process.argv.slice(2);
if (!target) { console.error('usage: import-takeout.mjs <file.mbox|dir> [--url] [--key] [--batch] [--dry-run]'); process.exit(1); }
const flag = (name, dflt) => { const i = flags.indexOf(name); return i >= 0 ? flags[i + 1] : dflt; };
const url = (flag('--url', process.env.AHL_URL ?? 'https://www.alreadyherellc.com')).replace(/\/$/, '');
const key = flag('--key', process.env.GINC_ADMIN_KEY ?? process.env.AHFOS_INTERNAL_API_KEY ?? '');
const batchSize = Number(flag('--batch', '200'));
const dryRun = flags.includes('--dry-run');

const raws = [];
const st = statSync(target);
if (st.isDirectory()) {
  for (const f of readdirSync(target).filter((f) => f.endsWith('.eml'))) {
    raws.push(readFileSync(join(target, f), 'utf8'));
  }
} else {
  raws.push(...splitMbox(readFileSync(target, 'utf8')));
}

console.log(`Parsing ${raws.length} raw messages from ${target}...`);
const emails = [];
for (const raw of raws) {
  const e = parseEmail(raw);
  if (e) emails.push(e);
}
const classified = emails.map(classifyEmail);
const work = classified.filter((c) => c.source !== 'gmail' && c.signal !== 'generic');
console.log(`Parsed ${emails.length} emails; ${work.length} carry a work signal (field_nation/work_market closeout/assignment/invoice).`);
for (const c of work.slice(0, 10)) {
  console.log(`  [${c.source}/${c.signal}] ${c.subject.slice(0, 70)} <${c.from_email}>`);
}

if (dryRun) { console.log('Dry run — nothing sent.'); process.exit(0); }
if (!key) { console.error('Missing key: pass --key or set GINC_ADMIN_KEY.'); process.exit(1); }

let done = { imported_jobs: 0, contacts: 0, evidence: 0, skipped: 0 };
for (let i = 0; i < emails.length; i += batchSize) {
  const batch = emails.slice(i, i + batchSize);
  const res = await fetch(`${url}/api/intake/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ messages: batch }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    console.error(`Batch ${i}..${i + batch.length} failed: HTTP ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
    process.exit(2);
  }
  for (const k of Object.keys(done)) done[k] += json.result[k] ?? 0;
  console.log(`  sent ${Math.min(i + batchSize, emails.length)}/${emails.length}`);
}
console.log('Import complete:', done);
