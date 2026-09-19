export type PartnerFirstCandidateType =
  | 'paid_work'
  | 'vendor_partner'
  | 'field_service_partner'
  | 'automation_only'
  | 'system_blocker';

export interface PartnerFirstCandidate {
  id: string;
  name: string;
  type: PartnerFirstCandidateType;
  immediatePaidWorkPotential: number; // 0-10
  recurringVendorPotential: number; // 0-10
  fieldServiceFit: number; // 0-10
  routeStackingFit: number; // 0-10
  workflowLearningValue: number; // 0-10
  automationExpansionPotential: number; // 0-10
  attributionQuality: number; // 0-10
  speedToCash: number; // 0-10
  lowMarginRisk: number; // 0-10; higher is worse
  paymentEnforcementRisk: number; // 0-10; higher is worse
  systemBlockerSeverity?: number; // 0-10
}

export interface PartnerFirstRankedCandidate extends PartnerFirstCandidate {
  score: number;
  rankReason: string;
  recommendedMotion:
    | 'repair_blocker_first'
    | 'pursue_paid_work_first'
    | 'pursue_vendor_relationship_first'
    | 'sell_automation_after_relationship'
    | 'automation_first';
}

const clamp = (value: number) => Math.max(0, Math.min(10, value));

export function scorePartnerFirstCandidate(candidate: PartnerFirstCandidate): number {
  const blocker = clamp(candidate.systemBlockerSeverity ?? 0);
  if (candidate.type === 'system_blocker' && blocker >= 8) {
    return 1000 + blocker * 10;
  }

  const paidWork = clamp(candidate.immediatePaidWorkPotential) * 6;
  const speed = clamp(candidate.speedToCash) * 5;
  const recurring = clamp(candidate.recurringVendorPotential) * 4;
  const fieldFit = clamp(candidate.fieldServiceFit) * 4;
  const routeFit = clamp(candidate.routeStackingFit) * 2;
  const learning = clamp(candidate.workflowLearningValue) * 3;
  const automationExpansion = clamp(candidate.automationExpansionPotential) * 2;
  const attribution = clamp(candidate.attributionQuality) * 2;
  const riskPenalty = clamp(candidate.lowMarginRisk) * 3 + clamp(candidate.paymentEnforcementRisk) * 2;
  const automationOnlyPenalty = candidate.type === 'automation_only' ? 18 : 0;

  return paidWork + speed + recurring + fieldFit + routeFit + learning + automationExpansion + attribution - riskPenalty - automationOnlyPenalty;
}

export function recommendedPartnerFirstMotion(candidate: PartnerFirstCandidate): PartnerFirstRankedCandidate['recommendedMotion'] {
  if (candidate.type === 'system_blocker' && (candidate.systemBlockerSeverity ?? 0) >= 8) return 'repair_blocker_first';
  if (candidate.immediatePaidWorkPotential >= 7 && candidate.speedToCash >= 6) return 'pursue_paid_work_first';
  if (candidate.recurringVendorPotential >= 7 && candidate.fieldServiceFit >= 6) return 'pursue_vendor_relationship_first';
  if (candidate.workflowLearningValue >= 6 && candidate.automationExpansionPotential >= 6) return 'sell_automation_after_relationship';
  return 'automation_first';
}

export function rankPartnerFirstCandidates(candidates: PartnerFirstCandidate[]): PartnerFirstRankedCandidate[] {
  return candidates
    .map((candidate) => {
      const recommendedMotion = recommendedPartnerFirstMotion(candidate);
      const score = scorePartnerFirstCandidate(candidate);
      const rankReason =
        recommendedMotion === 'repair_blocker_first'
          ? 'Revenue-system blocker outranks sales activity.'
          : recommendedMotion === 'pursue_paid_work_first'
            ? 'Fast paid work is available; earn the relationship before selling automation.'
            : recommendedMotion === 'pursue_vendor_relationship_first'
              ? 'Recurring vendor/field-service relationship has higher immediate and network value than a software-only pitch.'
              : recommendedMotion === 'sell_automation_after_relationship'
                ? 'Use field work to learn the workflow, then sell automation against observed friction.'
                : 'No strong paid-work/vendor path was identified; automation-first is acceptable.';
      return { ...candidate, score, recommendedMotion, rankReason };
    })
    .sort((a, b) => b.score - a.score);
}

export const PARTNER_FIRST_DOCTRINE = {
  northStar: '$500/day cash generation first, then recurring vendor relationships, then automation expansion.',
  order: [
    'Critical revenue-system blocker that prevents collection or attribution',
    'Direct paid work Already Here LLC can perform now',
    'Recurring vendor / overflow / subcontract relationship',
    'Work-first relationship that exposes workflow pain and creates automation proof',
    'Automation-only sale when no credible paid-work relationship exists'
  ],
  automationRule: 'Do not lead with AI when Already Here can first earn trust through paid field work. Sell automation after observing and quantifying real workflow friction.',
  approvalRule: 'Discovery, scoring, drafting, and local persistence may run automatically. Sending outreach, accepting work, submitting forms, moving money, credential changes, and production changes remain approval-gated.'
} as const;
