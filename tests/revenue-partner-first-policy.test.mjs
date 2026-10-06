import assert from 'assert';
import {
  PARTNER_FIRST_DOCTRINE,
  rankPartnerFirstCandidates,
  recommendedPartnerFirstMotion,
  scorePartnerFirstCandidate
} from '../lib/revenue-partner-first-policy.ts';

const paidWork = {
  id: 'paid-work',
  name: 'Field-service vendor opportunity',
  type: 'paid_work',
  immediatePaidWorkPotential: 10,
  recurringVendorPotential: 9,
  fieldServiceFit: 10,
  routeStackingFit: 8,
  workflowLearningValue: 8,
  automationExpansionPotential: 8,
  attributionQuality: 8,
  speedToCash: 10,
  lowMarginRisk: 2,
  paymentEnforcementRisk: 2
};

const automationOnly = {
  id: 'automation-only',
  name: 'Cold AI software pitch',
  type: 'automation_only',
  immediatePaidWorkPotential: 2,
  recurringVendorPotential: 3,
  fieldServiceFit: 1,
  routeStackingFit: 0,
  workflowLearningValue: 4,
  automationExpansionPotential: 9,
  attributionQuality: 8,
  speedToCash: 4,
  lowMarginRisk: 2,
  paymentEnforcementRisk: 3
};

const blocker = {
  id: 'blocker',
  name: 'Payment capture outage',
  type: 'system_blocker',
  immediatePaidWorkPotential: 0,
  recurringVendorPotential: 0,
  fieldServiceFit: 0,
  routeStackingFit: 0,
  workflowLearningValue: 0,
  automationExpansionPotential: 0,
  attributionQuality: 0,
  speedToCash: 0,
  lowMarginRisk: 0,
  paymentEnforcementRisk: 0,
  systemBlockerSeverity: 10
};

assert.equal(PARTNER_FIRST_DOCTRINE.order[1], 'Direct paid work Already Here LLC can perform now');
assert.equal(recommendedPartnerFirstMotion(paidWork), 'pursue_paid_work_first');
assert.equal(recommendedPartnerFirstMotion(blocker), 'repair_blocker_first');
assert.ok(scorePartnerFirstCandidate(paidWork) > scorePartnerFirstCandidate(automationOnly));

const ranked = rankPartnerFirstCandidates([automationOnly, paidWork, blocker]);
assert.equal(ranked[0].id, 'blocker');
assert.equal(ranked[1].id, 'paid-work');
assert.equal(ranked[2].id, 'automation-only');
assert.equal(ranked[1].recommendedMotion, 'pursue_paid_work_first');

console.log('partner-first revenue policy tests passed');
