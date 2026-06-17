import assert from 'assert';
import {
  buildDailyCommandItem,
  getDailyCommandSuperAiCapability,
  runDailyCommandSuperAiOperation
} from '../lib/daily-command-super-ai.ts';
import { getDailyCommandResponse } from '../lib/daily-command-core.ts';

const capability = getDailyCommandSuperAiCapability();
assert.equal(capability.engine, 'already-here-super-ai-orchestrator');
assert.equal(capability.controlModel, 'super_ai_runs_one_operation_agents');
assert.equal(capability.zeroSpend, true);
assert.equal(capability.approvalGate, true);
assert.ok(capability.agents.length >= 5);

const operations = new Set(capability.agents.map((agent) => agent.operation));
assert.equal(operations.size, capability.agents.length);

const item = buildDailyCommandItem({
  prompt: 'urgent same-day dispatch revenue opportunity by noon $500',
  estimatedValue: 500
});
assert.equal(item.priority, 'P0');
assert.equal(item.lane, 'Dispatch');

const summary = runDailyCommandSuperAiOperation({
  operation: 'summarize_daily_command_queue',
  prompt: 'urgent same-day dispatch revenue opportunity by noon $500',
  estimatedValue: 500
});
assert.equal(summary.ok, true);
assert.equal(summary.approvalRequired, true);
assert.ok(summary.summary.includes('Super AI Daily Command queue'));
assert.ok(summary.blockedActions.includes('send_email'));

const blocked = runDailyCommandSuperAiOperation({
  operation: 'evaluate_daily_command_security_gate',
  requestedAction: 'send_email'
});
assert.equal(blocked.approvalRequired, true);
assert.ok(blocked.summary.includes('Blocked pending owner approval'));

const daily = getDailyCommandResponse({ prompt: 'Review $500 dispatch revenue opportunity.' });
assert.equal(daily.superAi.engine, 'already-here-super-ai-orchestrator');
assert.equal(daily.superAiQueue.approvalRequired, true);

console.log('daily command super ai tests passed');
