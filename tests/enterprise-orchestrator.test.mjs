import assert from 'assert';
import {
  buildEnterpriseItem,
  getEnterpriseOrchestratorCapability,
  runEnterpriseOperation,
} from '../lib/global-enterprise-orchestrator.ts';

const capability = getEnterpriseOrchestratorCapability();
assert.equal(capability.engine, 'already-here-global-enterprise-asios');
assert.equal(capability.controlModel, 'super_ai_runs_one_process_agent');
assert.equal(capability.zeroSpend, true);
assert.equal(capability.approvalGate, true);
assert.ok(capability.agents.length >= 17);

const operations = new Set(capability.agents.map((agent) => agent.operation));
assert.equal(operations.size, capability.agents.length);

const urgentItem = buildEnterpriseItem({
  prompt: 'urgent same-day dispatch revenue opportunity by noon $500',
  estimatedValue: 500,
});
assert.equal(urgentItem.priority, 'P0');
assert.equal(urgentItem.lane, 'Field Network');

const revenueItem = buildEnterpriseItem({
  prompt: 'Review $500 revenue pipeline event.',
  estimatedValue: 500,
});
assert.equal(revenueItem.priority, 'P1');
assert.equal(revenueItem.lane, 'Revenue OS');

const fieldItem = buildEnterpriseItem({
  prompt: 'Review $500 dispatch opportunity.',
  estimatedValue: 500,
});
assert.equal(fieldItem.priority, 'P1');
assert.equal(fieldItem.lane, 'Field Network');

const opportunity = runEnterpriseOperation({
  operation: 'scan_opportunities',
  prompt: 'City of Mesa IT support RFI due 2026-09-01',
  estimatedValue: 0,
});
assert.equal(opportunity.ok, true);
assert.equal(opportunity.approvalRequired, true);
assert.ok(opportunity.summary.includes('Opportunity ingested'));
assert.ok(opportunity.blockedActions.includes('send_email'));

const summary = runEnterpriseOperation({
  operation: 'summarize_daily_command',
  prompt: 'Review $500 dispatch revenue opportunity.',
  estimatedValue: 500,
});
assert.equal(summary.ok, true);
assert.ok(summary.summary.includes('Enterprise ASIOS queue'));
assert.equal(summary.approvalRequired, true);

const blocked = runEnterpriseOperation({
  operation: 'evaluate_security_gate',
  requestedAction: 'send_email',
});
assert.equal(blocked.approvalRequired, true);
assert.ok(blocked.summary.includes('Blocked pending owner approval'));

const health = runEnterpriseOperation({
  operation: 'healthcheck_backend',
  source: 'enterprise-test',
});
assert.equal(health.ok, true);
assert.ok(health.summary.includes('healthcheck passed'));

console.log('enterprise orchestrator tests passed');
