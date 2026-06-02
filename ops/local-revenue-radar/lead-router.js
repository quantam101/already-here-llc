import { scoreLead, ROUTES } from './lead-scoring-engine.js';

const ROUTE_STATUSES = Object.freeze({
  [ROUTES.DO_IT]: 'CALL',
  [ROUTES.REFER_IT]: 'REFER',
  [ROUTES.SELL_IT]: 'SELL',
  [ROUTES.SUBCONTRACT_IT]: 'REFER',
  [ROUTES.IGNORE_IT]: 'REJECT'
});

export function routeLead(lead) {
  const scoring = scoreLead(lead);

  return {
    ...scoring,
    status: ROUTE_STATUSES[scoring.route] ?? 'QUALIFY',
    nextAction: nextActionForRoute(scoring.route, lead),
    guardrails: guardrailsForLead(lead)
  };
}

export function nextActionForRoute(route, lead) {
  if (route === ROUTES.DO_IT) return 'Human review: verify scope, insurance, schedule, and quote before any customer contact.';
  if (route === ROUTES.REFER_IT) return `Match to vetted partner for ${lead.categoryId}; do not represent certifications not held.`;
  if (route === ROUTES.SELL_IT) return 'Package as opt-in referral opportunity only after consent and source terms are verified.';
  if (route === ROUTES.SUBCONTRACT_IT) return 'Confirm subcontractor availability and written operating authority before quoting.';
  return 'Archive with rejection reason; do not pursue.';
}

export function guardrailsForLead(lead) {
  const guardrails = ['No auto-bidding', 'No third-party contact without human approval'];

  if (lead.sourcePolicy === 'manual_or_authorized_api_only') {
    guardrails.push('Manual intake or authorized API only');
  }

  if (lead.requiresCertification === true) {
    guardrails.push('Certification must be verified before quoting');
  }

  return guardrails;
}
