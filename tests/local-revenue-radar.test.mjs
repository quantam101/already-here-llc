import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { ingestLead, ingestLeads, validateLeadInput } from '../ops/local-revenue-radar/lead-ingestion-engine.js';
import { routeLead } from '../ops/local-revenue-radar/lead-router.js';
import { scoreLead, classify } from '../ops/local-revenue-radar/lead-scoring-engine.js';
import { parseRss, filterRssItems, approvedRssSources } from '../ops/local-revenue-radar/rss-monitor.js';
import { exportCrmCsv, exportCrmJson } from '../ops/local-revenue-radar/crm-export.js';
import { readinessSnapshot, summarizePipeline } from '../ops/local-revenue-radar/analytics-engine.js';

const require = createRequire(import.meta.url);
const sourcesConfig = require('../ops/local-revenue-radar/sources.config.json');
const sampleLead = require('../ops/local-revenue-radar/samples/sample-lead.json');
const fieldServiceRadar = require('../ops/local-revenue-radar/field-service-radar.json');

const validation = validateLeadInput(sampleLead, sourcesConfig);
assert.equal(validation.valid, true);

const ingested = ingestLead(sampleLead, sourcesConfig);
assert.equal(ingested.accepted, true);
assert.equal(ingested.lead.categoryId, 'field-service');
assert.equal(ingested.routing.route, 'DO_IT');
assert.equal(ingested.routing.status, 'CALL');

const scoring = scoreLead(ingested.lead);
assert.equal(scoring.route, ingested.routing.route);
assert.equal(classify(84), 'DO_IT');
assert.equal(routeLead(ingested.lead).guardrails.includes('No auto-bidding'), true);

const blockedSocialLead = ingestLead(
  {
    ...sampleLead,
    sourceId: 'facebook-marketplace',
    intakeChannel: 'scrape',
    title: 'Scraped social post',
    serviceArea: 'Tempe, AZ'
  },
  sourcesConfig
);
assert.equal(blockedSocialLead.accepted, false);
assert.match(blockedSocialLead.errors.join(' '), /does not allow scraping/);

const xml = `
  <rss><channel>
    <item>
      <title>POS install smart hands needed</title>
      <description>Retail rollout in Phoenix</description>
      <link>https://example.com/lead-1</link>
      <pubDate>Fri, 29 May 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Licensed electrician required</title>
      <description>Life safety inspection</description>
      <link>https://example.com/lead-2</link>
    </item>
  </channel></rss>
`;
const parsedRss = parseRss(xml, 'craigslist-phoenix-computer-gigs');
assert.equal(parsedRss.length, 2);
assert.equal(filterRssItems(parsedRss, fieldServiceRadar).length, 1);
assert.ok(approvedRssSources(sourcesConfig).every((source) => source.allowed_use === 'public_rss'));

const batch = ingestLeads([sampleLead], sourcesConfig);
const crmJson = exportCrmJson(batch);
const crmCsv = exportCrmCsv(batch);
assert.equal(crmJson[0].route, 'DO_IT');
assert.match(crmCsv, /Phoenix retail POS refresh/);

const summary = summarizePipeline([ingested, blockedSocialLead]);
assert.equal(summary.total, 2);
assert.equal(summary.accepted, 1);
assert.equal(summary.rejected, 1);
assert.equal(readinessSnapshot(summary).hasCallableLeads, true);

console.log('local revenue radar tests passed');
