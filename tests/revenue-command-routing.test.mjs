import assert from 'assert';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const tmpDir = mkdtempSync(join(tmpdir(), 'revenue-command-routing-test-'));
process.env.REVENUE_COMMAND_DB_PATH = join(tmpDir, 'routing.sqlite3');

const {
  buildRouteStack,
  haversineMiles,
  persistRouteStack,
  skillMatchRatio
} = await import('../lib/revenue-command-routing.ts');
const { getRecord, closeDatabase } = await import('../lib/revenue-command-db.ts');

assert.ok(haversineMiles({ latitude: 33.4484, longitude: -112.0740 }, { latitude: 33.4152, longitude: -111.8315 }) > 10);
assert.equal(skillMatchRatio(['network', 'wifi'], ['network']), 1);
assert.equal(skillMatchRatio(['network'], ['network', 'fiber']), 0.5);

const technician = {
  id: 'tech_phx_1',
  latitude: 33.4484,
  longitude: -112.0740,
  skills: ['network', 'wifi', 'smart-hands'],
  availableMinutes: 300
};

const generatedAt = '2026-08-10T16:00:00.000Z';
const candidates = [
  {
    id: 'job_emergency',
    opportunityId: 'opp_emergency',
    lane: 'field_service',
    latitude: 33.4510,
    longitude: -112.0700,
    requiredSkills: ['network'],
    estimatedRevenueCents: 35000,
    estimatedCostCents: 5000,
    estimatedMinutes: 60,
    priority: 'P0',
    slaDueAt: '2026-08-10T16:45:00.000Z'
  },
  {
    id: 'job_stackable',
    opportunityId: 'opp_stackable',
    lane: 'hauling',
    latitude: 33.4600,
    longitude: -112.0600,
    requiredSkills: [],
    estimatedRevenueCents: 22000,
    estimatedCostCents: 7000,
    estimatedMinutes: 75,
    priority: 'P1'
  },
  {
    id: 'job_wrong_skill',
    opportunityId: 'opp_wrong_skill',
    lane: 'field_service',
    latitude: 33.4500,
    longitude: -112.0750,
    requiredSkills: ['fiber-splicing'],
    estimatedRevenueCents: 100000,
    estimatedCostCents: 10000,
    estimatedMinutes: 120,
    priority: 'P0'
  }
];

const stack = buildRouteStack(technician, candidates, generatedAt);
assert.equal(stack.status, 'draft');
assert.equal(stack.stops.length, 2);
assert.equal(stack.stops[0].id, 'job_emergency');
assert.ok(!stack.stops.some((stop) => stop.id === 'job_wrong_skill'));
assert.equal(stack.totalRevenueCents, 57000);
assert.equal(stack.totalCostCents, 12000);
assert.equal(stack.contributionMarginCents, 45000);
assert.ok(stack.totalMiles >= 0);
assert.ok(stack.score > 0);

const persisted = await persistRouteStack(stack);
assert.equal(persisted.persisted, true);
assert.equal(persisted.persistenceErrors.length, 0);
const record = getRecord('route_stacks', persisted.id);
assert.ok(record);
assert.equal(record.technician_id, technician.id);
assert.equal(record.contribution_margin_cents, 45000);
assert.equal(Array.isArray(record.stops), true);

closeDatabase();
rmSync(tmpDir, { recursive: true, force: true });
console.log('revenue command routing tests passed');
