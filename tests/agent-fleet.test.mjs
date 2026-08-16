import assert from 'node:assert/strict';
import { GET as fleetGet } from '../app/api/agent-fleet/route.ts';
import {
  EXPECTED_AGENT_COUNT,
  EXPECTED_THREAD_COUNT,
  FLEET_REPOS,
  getAgent,
  getAgentFleet,
  getFleetSummary,
  getFleetThreads,
  isFleetRepo,
  verifyAgentFleet
} from '../lib/agent-fleet.ts';

function request(path) {
  return new Request(`http://localhost${path}`);
}

{
  const fleet = getAgentFleet();
  assert.equal(fleet.length, EXPECTED_AGENT_COUNT);
  assert.equal(getFleetThreads().length, EXPECTED_THREAD_COUNT);
  assert.equal(new Set(fleet.map((agent) => agent.id)).size, EXPECTED_AGENT_COUNT);
}

{
  const verification = verifyAgentFleet();
  assert.equal(verification.ok, true, verification.failures.join('; '));
  assert.equal(verification.failed, 0);
  assert.ok(verification.checks.length >= 15);
}

{
  for (const agent of getAgentFleet()) {
    assert.ok(agent.prompt.length >= 120, `${agent.id} prompt too short`);
    assert.ok(agent.tools.length > 0, `${agent.id} has no tools`);
    assert.ok(agent.skills.length > 0, `${agent.id} has no skills`);
    assert.equal(agent.budget.maxCostUsd, 0, `${agent.id} is not zero spend`);
    assert.ok(agent.budget.maxRunsPerDay > 0);
    assert.ok(agent.guardrails.forbiddenActions.includes('paid_api_call'), `${agent.id} allows paid calls`);
    assert.ok(agent.threads.length > 0, `${agent.id} has no threads`);
    for (const thread of agent.threads) {
      assert.equal(thread.agentId, agent.id);
      assert.equal(thread.repo, agent.repo);
      assert.ok(thread.id.startsWith(`${agent.id}::`));
      assert.ok(thread.objective.length > 0 && thread.successSignal.length > 0);
    }
  }
}

{
  // Every target repo carries a deployment, and repo slices sum to the fleet.
  let agents = 0;
  let threads = 0;
  for (const repo of FLEET_REPOS) {
    const slice = getAgentFleet(repo);
    assert.ok(slice.length > 0, `${repo} has no agents`);
    assert.ok(slice.every((agent) => agent.repo === repo));
    agents += slice.length;
    threads += getFleetThreads(repo).length;
  }
  assert.equal(agents, EXPECTED_AGENT_COUNT);
  assert.equal(threads, EXPECTED_THREAD_COUNT);
}

{
  const summary = getFleetSummary();
  assert.equal(summary.agentCount, EXPECTED_AGENT_COUNT);
  assert.equal(summary.threadCount, EXPECTED_THREAD_COUNT);
  assert.equal(summary.maxCostUsd, 0);
  assert.equal(summary.repos.length, FLEET_REPOS.length);
  assert.equal(
    Object.values(summary.cadenceCounts).reduce((total, count) => total + count, 0),
    EXPECTED_THREAD_COUNT
  );
}

{
  assert.equal(isFleetRepo('tradegate2'), true);
  assert.equal(isFleetRepo('not-a-repo'), false);
  assert.equal(getAgent('missing-agent'), undefined);
  assert.equal(getAgent('dc-cost-guard')?.repo, 'daily-command-os');
}

{
  const response = await fleetGet(request('/api/agent-fleet'));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mode, 'strict_zero_spend');
  assert.equal(body.agents.length, EXPECTED_AGENT_COUNT);
  assert.equal(body.summary.threadCount, EXPECTED_THREAD_COUNT);
  assert.equal(body.verification.ok, true);
}

{
  const response = await fleetGet(request('/api/agent-fleet?repo=content'));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.ok(body.agents.every((agent) => agent.repo === 'content'));
}

{
  const response = await fleetGet(request('/api/agent-fleet?repo=nope'));
  assert.equal(response.status, 400);
}

{
  const response = await fleetGet(request('/api/agent-fleet?view=threads&repo=tradegate2'));
  const body = await response.json();
  assert.equal(body.threads.length, getFleetThreads('tradegate2').length);
  assert.ok(body.threads.every((thread) => thread.repo === 'tradegate2'));
}

{
  const response = await fleetGet(request('/api/agent-fleet?view=verify'));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.verification.ok, true);
}

{
  const response = await fleetGet(request('/api/agent-fleet?agent=ah-dispatch-intake'));
  const body = await response.json();
  assert.equal(body.agent.id, 'ah-dispatch-intake');
  assert.equal(body.agent.budget.maxCostUsd, 0);

  const missing = await fleetGet(request('/api/agent-fleet?agent=ghost'));
  assert.equal(missing.status, 404);
}

console.log('agent-fleet tests passed');
