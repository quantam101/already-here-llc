#!/usr/bin/env node
// Writes the YouTube video campaign launch sheet (CSV) and shoot sheet (Markdown).
// Local files only: nothing is sent to Google Ads and nothing is spent.
// Usage: npm run campaign:youtube [-- --out exports/youtube-video-campaign]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  auditAllVideoLanes,
  renderLaunchSheetCsv,
  renderShootSheetMarkdown,
  youtubeVideoLanes
} from '../lib/youtube-video-campaign.ts';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outDir = resolve(outIndex >= 0 && args[outIndex + 1] ? args[outIndex + 1] : 'exports/youtube-video-campaign');
const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.alreadyherellc.com';

const audits = auditAllVideoLanes(youtubeVideoLanes);
const failed = audits.filter((audit) => audit.errors.length > 0);
for (const audit of audits) {
  const state = audit.errors.length ? 'ERROR' : audit.launchReady ? 'READY' : 'DRAFT';
  console.log(`${state.padEnd(5)} ${audit.id}`);
  for (const error of audit.errors) console.log(`  error: ${error}`);
  for (const warning of audit.warnings) console.log(`  note:  ${warning}`);
}
if (failed.length) {
  console.error(`\n${failed.length} lane(s) failed validation; nothing written.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'launch-sheet.csv'), renderLaunchSheetCsv(origin, youtubeVideoLanes));
writeFileSync(join(outDir, 'shoot-sheet.md'), renderShootSheetMarkdown(youtubeVideoLanes));
console.log(`\nWrote ${join(outDir, 'launch-sheet.csv')} and ${join(outDir, 'shoot-sheet.md')}`);
