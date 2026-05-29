import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const scoringRules = require('./opportunity-scoring-rules.json');

const ROUTES = Object.freeze({
  DO_IT: 'DO_IT',
  REFER_IT: 'REFER_IT',
  SELL_IT: 'SELL_IT',
  SUBCONTRACT_IT: 'SUBCONTRACT_IT',
  IGNORE_IT: 'IGNORE_IT'
});

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function weightedAverage(inputs, weights) {
  let weightedTotal = 0;
  let weightTotal = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const rawValue = key === 'risk_inverse' ? 100 - clampScore(inputs.risk) : inputs[key];
    weightedTotal += clampScore(rawValue) * weight;
    weightTotal += weight;
  }

  return weightTotal === 0 ? 0 : Math.round(weightedTotal / weightTotal);
}

function hasRequiredCapability(lead, rule) {
  if (!rule.requiredCapabilities?.length) return true;
  const capabilities = new Set(lead.capabilities ?? []);
  return rule.requiredCapabilities.every((capability) => capabilities.has(capability));
}

function routeFromScore(score, lead, rule) {
  if (lead.disallowed === true || lead.authorizedUse === false) return ROUTES.IGNORE_IT;
  if (score < scoringRules.thresholds.ignoreBelow) return ROUTES.IGNORE_IT;
  if (lead.requiresCertification === true && lead.certificationHeld !== true) return ROUTES.REFER_IT;
  if (!hasRequiredCapability(lead, rule)) return ROUTES.REFER_IT;
  if (lead.requiresPartner === true) return ROUTES.SUBCONTRACT_IT;
  if (score >= scoringRules.thresholds.doItAt) return ROUTES.DO_IT;
  if (score >= scoringRules.thresholds.referAt) return ROUTES.REFER_IT;
  return ROUTES.SELL_IT;
}

export function getCategoryRule(categoryId, rules = scoringRules) {
  return rules.categories.find((category) => category.id === categoryId) ?? rules.categories.find((category) => category.id === 'default');
}

export function scoreLead(lead, rules = scoringRules) {
  const categoryRule = getCategoryRule(lead.categoryId, rules);
  const baseScore = weightedAverage(lead.scores ?? lead, rules.weights);
  const priorityBoost = Number(categoryRule?.priorityBoost ?? 0);
  const compliancePenalty = lead.compliance?.restrictedSource === true ? rules.penalties.restrictedSource : 0;
  const missingEvidencePenalty = lead.evidenceUrl || lead.intakeChannel === 'manual' ? 0 : rules.penalties.missingEvidenceUrl;
  const score = clampScore(baseScore + priorityBoost - compliancePenalty - missingEvidencePenalty);

  return {
    score,
    route: routeFromScore(score, lead, categoryRule),
    categoryRuleId: categoryRule?.id ?? 'default',
    factors: {
      baseScore,
      priorityBoost,
      compliancePenalty,
      missingEvidencePenalty
    }
  };
}

export function classify(score) {
  const normalizedScore = clampScore(score);
  if (normalizedScore >= scoringRules.thresholds.doItAt) return ROUTES.DO_IT;
  if (normalizedScore >= scoringRules.thresholds.referAt) return ROUTES.REFER_IT;
  if (normalizedScore >= scoringRules.thresholds.sellAt) return ROUTES.SELL_IT;
  return ROUTES.IGNORE_IT;
}

export { ROUTES };
