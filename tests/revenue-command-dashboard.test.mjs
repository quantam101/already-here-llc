import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-dashboard-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'dashboard.sqlite3');

const { persistDatabaseReadyWrites, closeDatabase } = await import('../lib/revenue-command-db.ts');
const { buildRevenueCommandDashboard } = await import('../lib/revenue-command-dashboard.ts');

const now = '2026-08-10T17:00:00.000Z';
await persistDatabaseReadyWrites([
  {
    table: 'opportunities', id: 'opp_dash_1', action: 'insert', record: {
      id: 'opp_dash_1', lane: 'Hauling', title: 'Same-day haul', priority: 'P0', score: 90,
      estimated_value_cents: 65000, status: 'under_review', blocker: '', next_action: 'Quote',
      created_at: now, updated_at: now
    }
  },
  {
    table: 'reviews', id: 'review_dash_1', action: 'insert', record: {
      id: 'review_dash_1', target_table: 'opportunities', target_id: 'opp_dash_1', action: 'review',
      decision: 'queued', approval_required: 1, created_at: now, updated_at: now
    }
  },
  {
    table: 'dispatches', id: 'dispatch_dash_1', action: 'insert', record: {
      id: 'dispatch_dash_1', dispatch_status: 'scheduled', created_at: now, updated_at: now
    }
  },
  {
    table: 'route_stacks', id: 'route_dash_1', action: 'insert', record: {
      id: 'route_dash_1', status: 'draft', created_at: now, updated_at: now
    }
  },
  {
    table: 'hauling_jobs', id: 'haul_dash_1', action: 'insert', record: {
      id: 'haul_dash_1', status: 'queued_for_review', created_at: now, updated_at: now
    }
  },
  {
    table: 'ai_actions', id: 'ai_dash_1', action: 'insert', record: {
      id: 'ai_dash_1', approval_required: 1, created_at: now, updated_at: now
    }
  },
  {
    table: 'ai_memory', id: 'memory_dash_1', action: 'insert', record: {
      id: 'memory_dash_1', observation: 'Hauling lead', created_at: now, updated_at: now
    }
  },
  {
    table: 'payments', id: 'payment_dash_1', action: 'insert', record: {
      id: 'payment_dash_1', opportunity_id: 'opp_dash_1', payment_amount_cents: 65000,
      payment_status: 'completed', created_at: now, updated_at: now
    }
  },
  {
    table: 'system_health_signals', id: 'health_dash_1', action: 'insert', record: {
      id: 'health_dash_1', service: 'daily-revenue', status: 'failing', severity: 'high', created_at: now, updated_at: now
    }
  }
]);

const dashboard = buildRevenueCommandDashboard(new Date('2026-08-10T19:00:00.000Z'));
assert.equal(dashboard.phoenixDate, '2026-08-10');
assert.equal(dashboard.database.durable, true);
assert.equal(dashboard.revenue.paidTodayCents, 65000);
assert.equal(dashboard.revenue.targetTodayCents, 50000);
assert.equal(dashboard.revenue.targetGapCents, 0);
assert.equal(dashboard.pipeline.opportunities, 1);
assert.equal(dashboard.pipeline.open, 1);
assert.equal(dashboard.pipeline.p0, 1);
assert.equal(dashboard.pipeline.pendingReview, 1);
assert.equal(dashboard.operations.dispatchesOpen, 1);
assert.equal(dashboard.operations.routeStacksDraft, 1);
assert.equal(dashboard.operations.haulingOpen, 1);
assert.equal(dashboard.ai.actions, 1);
assert.equal(dashboard.ai.pendingActions, 1);
assert.equal(dashboard.ai.memoryRecords, 1);
assert.equal(dashboard.engineering.failingHealthSignals, 1);
assert.equal(dashboard.topOpportunities[0].id, 'opp_dash_1');

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });
console.log('revenue command dashboard tests passed');
