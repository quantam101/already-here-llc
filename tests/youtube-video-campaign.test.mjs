import assert from 'node:assert/strict';
import {
  IN_FEED_LIMITS,
  auditAllVideoLanes,
  auditVideoLane,
  buildConversionHref,
  buildLandingUrl,
  monthlyCeilingUsd,
  renderLaunchSheetCsv,
  renderShootSheetMarkdown,
  youtubeVideoLanes
} from '../lib/youtube-video-campaign.ts';

const origin = 'https://www.alreadyherellc.com';

// Shipped plan is valid, and nothing is cleared to spend without the owner.
const audits = auditAllVideoLanes();
for (const audit of audits) {
  assert.deepEqual(audit.errors, [], `${audit.id}: ${audit.errors.join('; ')}`);
  assert.equal(audit.launchReady, false, `${audit.id} must not be launch-ready by default`);
}
for (const lane of youtubeVideoLanes) {
  assert.equal(lane.launchApproved, false);
  assert.ok(lane.headline.length <= IN_FEED_LIMITS.headlineMax);
  for (const line of lane.description) assert.ok(line.length <= IN_FEED_LIMITS.descriptionLineMax, line);
  assert.ok(lane.script.lengthSeconds >= IN_FEED_LIMITS.minVideoSeconds);
}
assert.equal(new Set(youtubeVideoLanes.map((lane) => lane.id)).size, youtubeVideoLanes.length);

// Validator catches broken assets.
const base = structuredClone(youtubeVideoLanes[0]);
const broken = {
  ...base,
  headline: 'x'.repeat(101),
  description: ['y'.repeat(36), ''],
  script: { ...base.script, lengthSeconds: 6 },
  landingPath: 'https://evil.example/landing',
  youtubeVideoId: 'bad id!',
  proposedDailyBudgetUsd: 0
};
const brokenAudit = auditVideoLane(broken);
assert.ok(brokenAudit.errors.some((e) => e.startsWith('headline is 101')));
assert.ok(brokenAudit.errors.some((e) => e.startsWith('description line 1 is 36')));
assert.ok(brokenAudit.errors.some((e) => e.includes('description line 2 is empty')));
assert.ok(brokenAudit.errors.some((e) => e.includes('views only count')));
assert.ok(brokenAudit.errors.some((e) => e.startsWith('landingPath')));
assert.ok(brokenAudit.errors.some((e) => e.includes('YouTube ID')));
assert.ok(brokenAudit.errors.some((e) => e.includes('daily budget')));
assert.equal(brokenAudit.launchReady, false);

const excluded = auditVideoLane({ ...base, searchPhrases: [...base.searchPhrases, 'smart hands jobs phoenix'] });
assert.ok(excluded.errors.some((e) => e.includes('excluded word "jobs"')));

// Launch-ready only with a real video and explicit approval.
const ready = auditVideoLane({ ...base, youtubeVideoId: 'dQw4w9WgXcQ', launchApproved: true });
assert.deepEqual(ready.errors, []);
assert.equal(ready.launchReady, true);
assert.equal(auditVideoLane({ ...base, youtubeVideoId: 'dQw4w9WgXcQ' }).launchReady, false);

// Tracked URLs.
const landing = new URL(buildLandingUrl(origin, base, 'v2 cut!'));
assert.equal(landing.origin, origin);
assert.equal(landing.pathname, base.landingPath);
assert.equal(landing.searchParams.get('utm_source'), 'youtube');
assert.equal(landing.searchParams.get('utm_medium'), 'video_infeed');
assert.equal(landing.searchParams.get('utm_campaign'), base.campaignName);
assert.equal(landing.searchParams.get('utm_content'), 'v2cut');

const href = buildConversionHref(base, {
  utm_source: 'youtube',
  utm_campaign: base.campaignName,
  utm_content: 'v1',
  gclid: 'Cj0KCQ_abc-123',
  utm_term: '<script>alert(1)</script>',
  other: 'dropped'
});
const conversion = new URL(href, origin);
assert.equal(conversion.pathname, base.conversionPath);
assert.equal(conversion.searchParams.get('gclid'), 'Cj0KCQ_abc-123');
assert.equal(conversion.searchParams.get('utm_term'), null, 'unsafe values are dropped');
assert.equal(conversion.searchParams.get('other'), null, 'unknown params are dropped');

const bare = new URL(buildConversionHref(base, {}), origin);
assert.equal(bare.searchParams.get('utm_source'), 'youtube');
assert.equal(bare.searchParams.get('utm_campaign'), base.campaignName);

assert.equal(monthlyCeilingUsd({ ...base, proposedDailyBudgetUsd: 7.5 }), 225);

// Exports.
const csv = renderLaunchSheetCsv(origin);
const lines = csv.trim().split('\n');
assert.equal(lines.length, youtubeVideoLanes.length + 1);
assert.ok(lines[0].startsWith('campaign,goal,ad_format,bidding'));
assert.ok(lines.slice(1).every((line) => line.endsWith(',false')), 'every lane exports unapproved');
const shoot = renderShootSheetMarkdown();
for (const lane of youtubeVideoLanes) assert.ok(shoot.includes(lane.script.title));

console.log('youtube-video-campaign: ok');
