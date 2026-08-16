import assert from 'node:assert';
import { optimizeRoute } from '../lib/route-stack.ts';

const stops = [
  { id: 'A', type: 'pickup', lat: 33.45, lng: -112.07, revenue: 120, cost: 20, serviceTimeMinutes: 15, windowStart: '2026-08-11T09:00:00Z', windowEnd: '2026-08-11T10:00:00Z' },
  { id: 'B', type: 'dropoff', lat: 33.46, lng: -112.06, revenue: 80, cost: 10, serviceTimeMinutes: 10, windowStart: '2026-08-11T09:30:00Z', windowEnd: '2026-08-11T11:00:00Z' },
  { id: 'C', type: 'service', lat: 33.44, lng: -112.08, revenue: 200, cost: 30, serviceTimeMinutes: 20, skillRequired: 'electrical' },
];

const plan = optimizeRoute({ stops, vehicle: { id: 'v1', type: 'van', skills: ['electrical'], costPerMile: 1.5 } });
assert.strictEqual(plan.sequence.length, 3, 'all feasible stops should be scheduled');
assert(plan.totalContributionMargin > 0, 'contribution margin should be positive');
assert(plan.totalDistanceMiles > 0, 'distance should be positive');
assert(plan.feasibilityScore > 0, 'feasibility score should be positive');

// Test capacity/skill filtering.
const infeasible = optimizeRoute({ stops, vehicle: { id: 'v2', type: 'van', skills: ['plumbing'] } });
assert(infeasible.sequence.length < 3, 'stops requiring missing skill should be excluded');

console.log('route stack tests passed');
