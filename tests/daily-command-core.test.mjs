import assert from 'assert';
import { getDailyCommandResponse, getEcosystemStatusResponse, getSwarmCapability } from '../lib/daily-command-core.ts';

const baseline = getDailyCommandResponse({ prompt: 'Review command readiness.' });
assert.equal(baseline.ok, true);
assert.equal(baseline.zeroDependency, true);
assert.equal(baseline.service, 'already-here-daily-command');
assert.equal(baseline.mode, 'local_first');
assert.ok(baseline.summary.length > 0);
assert.ok(baseline.queuedActions.length >= 1);

// Swarm engine is surfaced into the daily command response, local-first + zero-spend by default.
assert.equal(baseline.swarm.engine, 'vhll-multi-agent-swarm');
assert.equal(baseline.swarm.route, 'local_swarm');
assert.equal(baseline.swarm.zeroSpend, true);
assert.equal(baseline.swarm.failover, 'cloud_to_local');
assert.ok(baseline.swarm.parallelism >= 1);

// Offline / quota-locked stay on the local swarm with zero spend.
assert.equal(getSwarmCapability('offline_survivable').route, 'local_swarm');
assert.equal(getSwarmCapability('quota_locked').zeroSpend, true);

// Only the online-accelerated mode opts into the cloud swarm route.
const cloudSwarm = getSwarmCapability('online_accelerated');
assert.equal(cloudSwarm.route, 'cloud_swarm');
assert.equal(cloudSwarm.zeroSpend, false);
assert.ok(cloudSwarm.parallelism >= baseline.swarm.parallelism);

const offline = getDailyCommandResponse({ prompt: 'Check offline behavior', forceOffline: true });
assert.equal(offline.mode, 'offline_survivable');
assert.equal(offline.status.external, 'offline');
assert.equal(offline.zeroDependency, true);

const quota = getDailyCommandResponse({ prompt: 'Check quota lock', quotaLock: true });
assert.equal(quota.mode, 'quota_locked');
assert.equal(quota.status.external, 'quota_locked');

const ecosystemOffline = getEcosystemStatusResponse({ forceOffline: true });
assert.equal(ecosystemOffline.ok, true);
assert.equal(ecosystemOffline.service, 'already-here-ecosystem-status');
assert.equal(ecosystemOffline.mode, 'offline_survivable');
assert.equal(ecosystemOffline.available, false);
assert.ok(Object.keys(ecosystemOffline.externalSystems).length >= 1);

const ecosystemQuota = getEcosystemStatusResponse({ quotaLock: true });
assert.equal(ecosystemQuota.mode, 'quota_locked');
assert.equal(ecosystemQuota.available, true);
assert.ok(ecosystemQuota.failures.includes('Paid and remote systems blocked'));

console.log('daily command core tests passed');
