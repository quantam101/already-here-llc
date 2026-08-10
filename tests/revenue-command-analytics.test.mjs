import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-analytics-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'analytics.sqlite3');

const { persistDatabaseReadyWrites, listRecords, closeDatabase } = await import('../lib/revenue-command-db.ts');
const { recordAnalyticsEvent, buildAcquisitionFunnel } = await import('../lib/revenue-command-analytics.ts');

const now = '2026-08-10T17:00:00.000Z';
await recordAnalyticsEvent({ source: 'google', module: 'website', action: 'page_view', pagePath: '/dispatch', sessionId: 'session-1', occurredAt: now });
await persistDatabaseReadyWrites([
  { table: 'leads', id: 'lead_analytics_1', action: 'insert', record: { id: 'lead_analytics_1', source_channel: 'google', created_at: now, updated_at: now } },
  { table: 'opportunities', id: 'opp_analytics_1', action: 'insert', record: { id: 'opp_analytics_1', lead_id: 'lead_analytics_1', lane: 'Dispatch', estimated_value_cents: 75000, status: 'paid', created_at: now, updated_at: now } },
  { table: 'payments', id: 'payment_analytics_1', action: 'insert', record: { id: 'payment_analytics_1', opportunity_id: 'opp_analytics_1', payment_amount_cents: 75000, payment_status: 'completed', created_at: now, updated_at: now } }
]);

assert.equal(listRecords('analytics_events', 10).length, 1);
const funnel = buildAcquisitionFunnel();
const google = funnel.sources.find((row) => row.source === 'google');
assert.ok(google);
assert.equal(google.touches, 1);
assert.equal(google.leads, 1);
assert.equal(google.opportunities, 1);
assert.equal(google.paidRevenueCents, 75000);
assert.equal(google.conversionRate, 1);
assert.equal(google.revenuePerOpportunityCents, 75000);
assert.equal(funnel.totals.paidRevenueCents, 75000);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });
console.log('revenue command analytics tests passed');
