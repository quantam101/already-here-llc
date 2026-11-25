#!/usr/bin/env node
/**
 * Backfill area client scans for applicants who applied before auto-prospecting existed.
 *
 * Input: a folder of the "<APP-ID>-applicant-record.json" files the intake form
 * attaches to each applicant email (keep them under data/, which is gitignored),
 * or a single JSON array file.
 *
 *   npm run prospecting:backfill -- --dir data/applicant-records            # dry run: print areas + queries
 *   npm run prospecting:backfill -- --dir data/applicant-records --out .tmp/area-prospecting
 *   AHFOS_INTERNAL_API_KEY=... npm run prospecting:backfill -- --dir data/applicant-records --post https://alreadyherellc.com
 *
 * --post sends only area fields (id, city, state, zip, lanes, radius, travel text)
 * to /api/applicants/area-scan. No names, emails or phones leave this machine.
 * Research only: nothing here contacts a prospect.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { applicantFromRecord, groupApplicantsByArea } from '../lib/area-prospecting.ts';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function loadRecords() {
  const dir = arg('dir');
  const input = arg('input');
  if (dir) {
    return readdirSync(dir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')));
  }
  if (input) {
    const parsed = JSON.parse(readFileSync(input, 'utf8'));
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  console.error('Pass --dir <folder of applicant-record.json files> or --input <file.json>.');
  process.exit(2);
}

const applicants = loadRecords().map(applicantFromRecord).filter((a) => a.applicantId && a.city && a.state);
const groups = groupApplicantsByArea(applicants);

for (const { plan, applicantIds } of groups) {
  const label = plan.skipped ? `SKIP ${plan.city}, ${plan.state} (${plan.skipReason})` : plan.areaLabel;
  console.log(`\n${label} — ${applicantIds.length} applicant(s): ${applicantIds.join(', ')}`);
  if (!plan.skipped) {
    console.log(`  segments: ${plan.targetSegments.join('; ')}`);
    for (const query of plan.queries) console.log(`  query: ${query}`);
  }
}

const out = arg('out');
if (out) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'area-scan-plans.json'), JSON.stringify(groups, null, 2));
  console.log(`\nWrote ${join(out, 'area-scan-plans.json')}`);
}

const base = arg('post');
if (base) {
  const key = process.env.AHFOS_INTERNAL_API_KEY?.trim();
  if (!key) {
    console.error('AHFOS_INTERNAL_API_KEY is required for --post.');
    process.exit(2);
  }
  const areaOnly = applicants.map(({ applicantId, city, state, zipCode, workLanes, travelRadiusMiles, transportation, availability }) => ({
    applicantId, city, state, zipCode, workLanes, travelRadiusMiles, transportation, availability
  }));
  const response = await fetch(new URL('/api/applicants/area-scan', base), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ trigger: 'backfill', applicants: areaOnly })
  });
  const json = await response.json().catch(() => ({}));
  console.log(`\nPOST ${response.status}`, JSON.stringify(json, null, 2));
  if (!response.ok) process.exit(1);
}
