import assert from 'node:assert/strict';
import { triageDispatchRequest } from '../lib/dispatch-triage.ts';

const base = {
  priority: 'Standard',
  serviceType: 'Smart hands support',
  message: 'Replace a failed switch and confirm closeout photos.'
};

// Emergency priority routes to emergency_onsite at max scores.
{
  const triage = triageDispatchRequest({ ...base, priority: 'Emergency' });
  assert.equal(triage.primaryLane, 'emergency_onsite');
  assert.equal(triage.urgencyScore, 95);
  assert.equal(triage.riskScore, 95);
  assert.ok(triage.nextStep.length > 0);
}

// Emergency keywords in the message route to emergency_onsite even at Standard priority.
for (const term of ['outage', 'offline', 'no internet', 'not working', 'emergency']) {
  const triage = triageDispatchRequest({ ...base, message: `Site reports ${term} since this morning.` });
  assert.equal(triage.primaryLane, 'emergency_onsite', `expected emergency_onsite for term "${term}"`);
}

// Remote service types route to remote_support; Urgent bumps scores within the lane.
{
  const remote = triageDispatchRequest({ ...base, serviceType: 'Remote support / administration', message: 'Patch window config drift.' });
  assert.equal(remote.primaryLane, 'remote_support');
  assert.equal(remote.urgencyScore, 40);

  const remoteUrgent = triageDispatchRequest({ ...base, priority: 'Urgent', serviceType: 'Remote Team Support', message: 'Config drift on managed endpoints.' });
  assert.equal(remoteUrgent.primaryLane, 'remote_support');
  assert.equal(remoteUrgent.urgencyScore, 70);
  assert.equal(remoteUrgent.riskScore, 60);
}

// Bridge details mark a request remote-capable.
{
  const triage = triageDispatchRequest({ ...base, bridgeDetails: 'Teams bridge + VPN access provided', message: 'Routine admin work.' });
  assert.equal(triage.primaryLane, 'remote_support');
}

// Urgent onsite work routes to priority_onsite.
{
  const triage = triageDispatchRequest({ ...base, priority: 'Urgent', message: 'Rack swap needed before Friday.' });
  assert.equal(triage.primaryLane, 'priority_onsite');
  assert.equal(triage.urgencyScore, 80);
  assert.equal(triage.riskScore, 70);
}

// Standard onsite work defaults to scheduled_onsite.
{
  const triage = triageDispatchRequest({ ...base, message: 'Quarterly preventative maintenance visit.' });
  assert.equal(triage.primaryLane, 'scheduled_onsite');
  assert.equal(triage.urgencyScore, 45);
  assert.equal(triage.riskScore, 35);
}

// Determinism: identical input produces identical output.
{
  const a = triageDispatchRequest(base);
  const b = triageDispatchRequest({ ...base });
  assert.deepEqual(a, b);
}

console.log('dispatch-triage tests passed');
