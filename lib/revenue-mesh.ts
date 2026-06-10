export type RevenueLane =
  | 'premium_dispatch'
  | 'local_cash_backup'
  | 'dispatch_partner'
  | 'ai_automation_offer'
  | 'retainer_procurement'
  | 'payment_protection';

export type RevenueGrade = 'A' | 'B' | 'C' | 'Avoid';

export type RevenueOpportunityInput = {
  id?: string;
  source: string;
  title: string;
  lane?: RevenueLane;
  location?: string;
  schedule?: string;
  buyer?: string;
  contactRoute?: string;
  fixedPay?: number;
  rate?: number;
  estimatedHours?: number;
  travelMiles?: number;
  scope?: string;
  requirements?: string[];
  risks?: string[];
  urgency?: 'same_day' | 'next_day' | 'this_week' | 'pipeline';
  expectedSetupFee?: number;
  expectedMonthlyRevenue?: number;
  recurringPotential?: boolean;
};

export type ProductizedRevenueOffer = {
  id: string;
  name: string;
  lane: RevenueLane;
  setupFee: number;
  monthlyFee: number;
  buyer: string;
  painSignal: string;
  delivery: string;
  proofMetric: string;
  approvalBoundary: string;
};

export type ScoredRevenueOpportunity = RevenueOpportunityInput & {
  id: string;
  lane: RevenueLane;
  grade: RevenueGrade;
  score: number;
  dispatchValue: number;
  effectiveHourly: number;
  estimatedHours: number;
  expectedSetupFee: number;
  expectedMonthlyRevenue: number;
  riskFlags: string[];
  nextAction: string;
  counterMessage?: string;
  outreachDraft?: string;
};

export type TaskReplacementRecommendation = {
  trigger: string;
  taskToDowngrade: string;
  replacementTaskTitle: string;
  replacementSchedule: string;
  expectedIncomeLane: RevenueLane;
  reason: string;
  approvalRequired: string;
};

export type RevenueMeshPlan = {
  generatedAt: string;
  cashFloorTarget: number;
  premiumTargetHourly: number;
  minimumDispatchValue: number;
  status: 'ready_to_execute' | 'backup_stack_required' | 'revenue_system_failure';
  summary: string;
  dailyStack: ScoredRevenueOpportunity[];
  backupStack: ScoredRevenueOpportunity[];
  productizedOffers: ProductizedRevenueOffer[];
  approvalGate: {
    required: true;
    blockedActions: string[];
  };
  taskReplacement?: TaskReplacementRecommendation;
};

export const revenueMeshOperatingRules = {
  cashFloorTarget: 500,
  premiumTargetHourly: 65,
  minimumDispatchValue: 130,
  preferredFlatDispatch: 200,
  maximumDefaultRadiusMiles: 60,
  blockedActions: [
    'accepting work orders',
    'sending outreach',
    'submitting counters',
    'submitting bids',
    'signing agreements',
    'moving money',
    'changing credentials',
    'publishing client claims without approval'
  ]
} as const;

export const productizedRevenueOffers: ProductizedRevenueOffer[] = [
  {
    id: 'ai-missed-call-receptionist',
    name: 'AI Missed-Call and Quote Capture Agent',
    lane: 'ai_automation_offer',
    setupFee: 997,
    monthlyFee: 197,
    buyer: 'local service businesses that lose revenue when calls, quote requests, and website visitors are not handled fast enough',
    painSignal: 'missed calls, delayed callbacks, weak quote intake, low after-hours capture, or no structured website lead flow',
    delivery: 'install a website lead-capture route or embedded widget, qualify the visitor, route the owner alert, and send a prospect receipt after approval',
    proofMetric: 'qualified leads captured, response time reduced, owner-ready lead records created',
    approvalBoundary: 'drafts and recommendations are generated automatically; outbound sends and paid setup begin only after owner approval'
  },
  {
    id: 'field-tech-closeout-assistant',
    name: 'Field Tech Closeout Assistant',
    lane: 'dispatch_partner',
    setupFee: 2500,
    monthlyFee: 397,
    buyer: 'MSPs, low-voltage contractors, POS vendors, printer firms, AV companies, and dispatch groups',
    painSignal: 'slow closeout notes, rejected paperwork, missing photos, weak ticket summaries, and delayed billing',
    delivery: 'standardize technician notes, photo checklist, closeout summary, exception flags, and billing-ready export',
    proofMetric: 'fewer rejected closeouts, faster invoicing, cleaner buyer updates',
    approvalBoundary: 'the assistant prepares notes and summaries; final customer/vendor submission remains human-approved'
  },
  {
    id: 'dispatch-partner-coverage-engine',
    name: 'Phoenix Dispatch Partner Coverage Engine',
    lane: 'dispatch_partner',
    setupFee: 1500,
    monthlyFee: 299,
    buyer: 'national vendors and regional service firms needing Phoenix-area 1099/C2C field coverage',
    painSignal: 'open tickets in Phoenix, recurring same-day coverage gaps, low technician reliability, or poor closeout quality',
    delivery: 'coverage intake, rate floor, service fit, availability logic, closeout requirements, and approved partner handoff pack',
    proofMetric: 'qualified dispatch conversations, approved rate floors, repeatable coverage path',
    approvalBoundary: 'partner outreach is drafted and queued; no commitments are made without explicit approval'
  },
  {
    id: 'local-hauling-quote-agent',
    name: 'Local Hauling Quote Intake Agent',
    lane: 'local_cash_backup',
    setupFee: 497,
    monthlyFee: 99,
    buyer: 'hauling, junk removal, delivery, and small-move operators',
    painSignal: 'vague pickup requests, unpriced dump fees, unpaid extra stops, stairs, heavy items, and missed deposits',
    delivery: 'quote intake form, minimum price rules, load details, stairs/heavy-lift flags, deposit language, and owner alert',
    proofMetric: 'cleaner quote requests, fewer low-margin trips, faster booking decisions',
    approvalBoundary: 'pricing recommendations require owner confirmation before quoting the customer'
  }
];

function normalize(text: string | undefined): string {
  return (text ?? '').trim().toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function currency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function stableId(input: RevenueOpportunityInput): string {
  const source = normalize(input.source).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const title = normalize(input.title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return input.id?.trim() || `${source || 'source'}-${title || 'opportunity'}`.slice(0, 96);
}

function combinedText(input: RevenueOpportunityInput): string {
  return [
    input.source,
    input.title,
    input.buyer,
    input.location,
    input.schedule,
    input.scope,
    ...(input.requirements ?? []),
    ...(input.risks ?? [])
  ]
    .map((value) => value ?? '')
    .join(' ')
    .toLowerCase();
}

function inferLane(input: RevenueOpportunityInput): RevenueLane {
  if (input.lane) return input.lane;

  const text = combinedText(input);
  if (includesAny(text, ['field nation', 'workmarket', 'source support', 'servicepoint', 'techworks', 'ncr', 'server', 'dimm', 'hdd', 'pos', 'ap ', 'wireless', 'cabling', 'smart hands', 'printer'])) {
    return 'premium_dispatch';
  }
  if (includesAny(text, ['hauling', 'junk', 'dump', 'trailer', 'pickup', 'delivery', 'small move', 'appliance'])) {
    return 'local_cash_backup';
  }
  if (includesAny(text, ['msp', 'partner', 'vendor', 'coverage', 'subcontractor', 'low-voltage', 'cctv', 'access control', 'av company'])) {
    return 'dispatch_partner';
  }
  if (includesAny(text, ['ai', 'chatbox', 'lead capture', 'missed-call', 'missed call', 'quote agent', 'booking automation'])) {
    return 'ai_automation_offer';
  }
  if (includesAny(text, ['invoice', 'payment', 'overdue', 'quickbooks', 'stripe', 'square'])) {
    return 'payment_protection';
  }
  return 'retainer_procurement';
}

function defaultSetupFee(lane: RevenueLane): number {
  switch (lane) {
    case 'ai_automation_offer':
      return 997;
    case 'dispatch_partner':
      return 1500;
    case 'local_cash_backup':
      return 497;
    case 'retainer_procurement':
      return 2500;
    case 'payment_protection':
      return 0;
    case 'premium_dispatch':
      return 0;
  }
}

function defaultMonthlyRevenue(lane: RevenueLane): number {
  switch (lane) {
    case 'ai_automation_offer':
      return 197;
    case 'dispatch_partner':
      return 299;
    case 'local_cash_backup':
      return 99;
    case 'retainer_procurement':
      return 500;
    case 'payment_protection':
      return 0;
    case 'premium_dispatch':
      return 0;
  }
}

function buildRiskFlags(input: RevenueOpportunityInput, lane: RevenueLane, dispatchValue: number, effectiveHourly: number, travelMiles: number): string[] {
  const flags = new Set<string>();
  const text = combinedText(input);

  for (const risk of input.risks ?? []) {
    if (risk.trim()) flags.add(risk.trim());
  }

  if (lane === 'premium_dispatch' || lane === 'local_cash_backup') {
    if (dispatchValue > 0 && dispatchValue < revenueMeshOperatingRules.minimumDispatchValue) flags.add('below $130 minimum dispatch value');
    if (effectiveHourly > 0 && effectiveHourly < revenueMeshOperatingRules.premiumTargetHourly) flags.add('below $65/hr effective target');
    if (dispatchValue === 0 && effectiveHourly === 0) flags.add('pay not visible');
  }

  if (travelMiles > revenueMeshOperatingRules.maximumDefaultRadiusMiles) flags.add('outside 60-mile preferred operating radius');
  if (travelMiles > 30 && dispatchValue < 175) flags.add('travel burden requires premium or stacking');
  if (includesAny(text, ['ladder', 'heavy lift', '85-inch', '85 inch', 'tv wall', 'return trip'])) flags.add('premium required for ladder, heavy lift, TV, or return-trip risk');
  if (includesAny(text, ['vague', 'unknown scope', 'to be determined'])) flags.add('scope is not clear enough to accept without clarification');
  if (includesAny(text, ['password reset', 'verification code', 'account locked'])) flags.add('platform or account-access issue may block payment');

  return Array.from(flags);
}

function scoreOpportunity(input: RevenueOpportunityInput, lane: RevenueLane, dispatchValue: number, effectiveHourly: number, expectedSetupFee: number, expectedMonthlyRevenue: number, riskFlags: string[]): number {
  let score = 30;
  const text = combinedText(input);

  if (lane === 'premium_dispatch') score += 18;
  if (lane === 'dispatch_partner') score += 16;
  if (lane === 'ai_automation_offer') score += 18;
  if (lane === 'local_cash_backup') score += 10;
  if (lane === 'retainer_procurement') score += 12;
  if (lane === 'payment_protection') score += 14;

  if (dispatchValue >= revenueMeshOperatingRules.preferredFlatDispatch) score += 18;
  else if (dispatchValue >= revenueMeshOperatingRules.minimumDispatchValue) score += 12;
  else if (dispatchValue > 0) score += 3;

  if (effectiveHourly >= revenueMeshOperatingRules.premiumTargetHourly) score += 12;
  if (expectedSetupFee >= 997) score += 14;
  if (expectedMonthlyRevenue >= 197) score += 10;
  if (input.recurringPotential) score += 12;
  if (input.urgency === 'same_day') score += 10;
  if (input.urgency === 'next_day') score += 8;
  if (input.urgency === 'this_week') score += 6;

  if (includesAny(text, ['phoenix', 'tempe', 'chandler', 'mesa', 'scottsdale', 'glendale'])) score += 8;
  if (includesAny(text, ['server', 'data center', 'dimm', 'hdd', 'smart hands', 'pos', 'printer', 'access control', 'cctv', 'low-voltage', 'wireless', 'ap'])) score += 8;
  if (includesAny(text, ['missed call', 'missed-call', 'quote', 'lead capture', 'after-hours', 'booking', 'dispatch intake'])) score += 10;

  score -= riskFlags.length * 6;
  if (includesAny(text, ['unpaid return', 'free', 'exposure', 'commission only'])) score -= 20;

  return Math.max(0, Math.min(100, score));
}

function gradeOpportunity(score: number, riskFlags: string[], dispatchValue: number, effectiveHourly: number, lane: RevenueLane): RevenueGrade {
  if (riskFlags.some((risk) => risk.includes('platform or account-access'))) return 'Avoid';
  if ((lane === 'premium_dispatch' || lane === 'local_cash_backup') && dispatchValue > 0 && dispatchValue < 90) return 'Avoid';
  if ((lane === 'premium_dispatch' || lane === 'local_cash_backup') && effectiveHourly > 0 && effectiveHourly < 40) return 'Avoid';
  if (score >= 76 && !riskFlags.some((risk) => risk.includes('below'))) return 'A';
  if (score >= 58) return 'B';
  if (score >= 38) return 'C';
  return 'Avoid';
}

function buildCounterMessage(input: RevenueOpportunityInput, dispatchValue: number, estimatedHours: number): string | undefined {
  const lane = inferLane(input);
  if (lane !== 'premium_dispatch' && lane !== 'local_cash_backup') return undefined;
  if (dispatchValue >= revenueMeshOperatingRules.minimumDispatchValue) return undefined;

  const service = input.title.trim() || 'onsite service request';
  const location = input.location?.trim() ? ` in ${input.location.trim()}` : '';
  const hours = Math.max(2, Math.ceil(estimatedHours));

  return [
    `I can support the ${service}${location}.`,
    '',
    `My minimum dispatch rate is ${currency(revenueMeshOperatingRules.minimumDispatchValue)} fixed for up to ${hours} hours onsite, with additional approved onsite time billed at ${currency(revenueMeshOperatingRules.premiumTargetHourly)}/hr.`,
    'I will provide ETA, complete the required onsite work, coordinate with remote support as needed, and submit closeout notes before departure.',
    '',
    'Please approve the revised rate before dispatch.'
  ].join('\n');
}

function buildOutreachDraft(input: RevenueOpportunityInput, lane: RevenueLane, expectedSetupFee: number, expectedMonthlyRevenue: number): string | undefined {
  if (lane !== 'dispatch_partner' && lane !== 'ai_automation_offer' && lane !== 'retainer_procurement') return undefined;

  const company = input.buyer || input.title;
  const offer = lane === 'ai_automation_offer'
    ? 'AI missed-call, quote-capture, and website lead-intake automation'
    : 'Phoenix-area field-service coverage, dispatch support, and closeout quality control';

  return [
    `Hello ${company},`,
    '',
    `Already Here LLC can support ${offer}. I am Phoenix-based and can handle IT, smart-hands, POS, printer, AV, access control, wireless/AP, low-voltage, and structured dispatch closeout work.`,
    '',
    `For a clean starting point, I recommend a scoped pilot at ${currency(expectedSetupFee || revenueMeshOperatingRules.minimumDispatchValue)} setup with ${expectedMonthlyRevenue > 0 ? `${currency(expectedMonthlyRevenue)}/mo management after pilot fit is confirmed` : 'approved per-dispatch rates after fit is confirmed'}.`,
    '',
    'All outbound actions, access changes, client commitments, and production changes remain approval-gated. I can send a capability summary and proposed coverage terms for review.'
  ].join('\n');
}

function buildNextAction(input: RevenueOpportunityInput, grade: RevenueGrade, lane: RevenueLane, riskFlags: string[]): string {
  if (grade === 'Avoid') return 'Pass unless pay, scope, access, travel, and return-trip terms materially improve.';
  if (lane === 'premium_dispatch') return riskFlags.some((risk) => risk.includes('below')) ? 'Counter before accepting. Do not dispatch at posted economics.' : 'Request or accept only after schedule, scope, access, and closeout terms are confirmed.';
  if (lane === 'local_cash_backup') return 'Quote flat-rate with dump fees, labor, stairs, extra stops, and deposit separated before dispatch.';
  if (lane === 'dispatch_partner') return 'Prepare partner outreach and request approved rate floor, service categories, and closeout requirements.';
  if (lane === 'ai_automation_offer') return 'Prepare productized automation outreach and steer to AI Web Agent demo intake.';
  if (lane === 'payment_protection') return 'Prioritize collection, proof, invoice status, and payment follow-up before chasing new low-margin work.';
  return 'Review procurement or retainer fit, then prepare documents only if value and deadline justify the effort.';
}

export function evaluateRevenueOpportunity(input: RevenueOpportunityInput): ScoredRevenueOpportunity {
  const lane = inferLane(input);
  const estimatedHours = Math.max(0.5, input.estimatedHours ?? 2);
  const dispatchValue = Math.max(0, input.fixedPay ?? (input.rate ? input.rate * estimatedHours : 0));
  const effectiveHourly = input.rate ?? (dispatchValue > 0 ? dispatchValue / estimatedHours : 0);
  const expectedSetupFee = Math.max(0, input.expectedSetupFee ?? defaultSetupFee(lane));
  const expectedMonthlyRevenue = Math.max(0, input.expectedMonthlyRevenue ?? defaultMonthlyRevenue(lane));
  const travelMiles = Math.max(0, input.travelMiles ?? 0);
  const riskFlags = buildRiskFlags(input, lane, dispatchValue, effectiveHourly, travelMiles);
  const score = scoreOpportunity(input, lane, dispatchValue, effectiveHourly, expectedSetupFee, expectedMonthlyRevenue, riskFlags);
  const grade = gradeOpportunity(score, riskFlags, dispatchValue, effectiveHourly, lane);

  return {
    ...input,
    id: stableId(input),
    lane,
    estimatedHours,
    dispatchValue,
    effectiveHourly,
    expectedSetupFee,
    expectedMonthlyRevenue,
    riskFlags,
    score,
    grade,
    nextAction: buildNextAction(input, grade, lane, riskFlags),
    counterMessage: buildCounterMessage(input, dispatchValue, estimatedHours),
    outreachDraft: buildOutreachDraft(input, lane, expectedSetupFee, expectedMonthlyRevenue)
  };
}

function byRevenuePriority(a: ScoredRevenueOpportunity, b: ScoredRevenueOpportunity): number {
  const aValue = a.dispatchValue + a.expectedSetupFee + a.expectedMonthlyRevenue * 3 + a.score;
  const bValue = b.dispatchValue + b.expectedSetupFee + b.expectedMonthlyRevenue * 3 + b.score;
  return bValue - aValue;
}

export function buildTaskReplacementRecommendation(trigger: string): TaskReplacementRecommendation {
  return {
    trigger,
    taskToDowngrade: 'training, news, or duplicate summary task that does not produce paid leads, direct partner targets, payment recovery, or a sellable offer',
    replacementTaskTitle: 'Generate 10 daily dispatch partner contacts',
    replacementSchedule: 'Daily at 04:30 America/Phoenix with same-day escalation at noon if no paid work is found',
    expectedIncomeLane: 'dispatch_partner',
    reason: 'Direct vendor relationships create recurring dispatch volume, rate control, and retainer paths faster than passive summaries.',
    approvalRequired: 'Stephen must approve any task disablement, outreach send, rate commitment, partner application, or contract submission.'
  };
}

export function buildRevenueMeshPlan(opportunities: RevenueOpportunityInput[], generatedAt = new Date()): RevenueMeshPlan {
  const scored = opportunities.map(evaluateRevenueOpportunity).sort(byRevenuePriority);
  const dailyStack = scored
    .filter((item) => item.grade === 'A' || (item.grade === 'B' && (item.dispatchValue >= revenueMeshOperatingRules.minimumDispatchValue || item.expectedSetupFee >= 997 || item.expectedMonthlyRevenue >= 197)))
    .slice(0, 5);

  const backupStack = scored
    .filter((item) => item.grade !== 'Avoid' && !dailyStack.some((selected) => selected.id === item.id))
    .slice(0, 5);

  const status = dailyStack.length > 0
    ? 'ready_to_execute'
    : backupStack.length > 0
      ? 'backup_stack_required'
      : 'revenue_system_failure';

  const summary = status === 'ready_to_execute'
    ? `${dailyStack.length} revenue-ready item(s) found. Work from highest expected value first and keep all acceptance/outreach approval-gated.`
    : status === 'backup_stack_required'
      ? `${backupStack.length} backup item(s) found. Premium work is weak; stack only clean, low-risk items and push direct partner or AI automation outreach.`
      : 'No realistic paid work found in the provided set. Replace or escalate a low-yield task into direct dispatch partner acquisition.';

  return {
    generatedAt: generatedAt.toISOString(),
    cashFloorTarget: revenueMeshOperatingRules.cashFloorTarget,
    premiumTargetHourly: revenueMeshOperatingRules.premiumTargetHourly,
    minimumDispatchValue: revenueMeshOperatingRules.minimumDispatchValue,
    status,
    summary,
    dailyStack,
    backupStack,
    productizedOffers: productizedRevenueOffers,
    approvalGate: {
      required: true,
      blockedActions: [...revenueMeshOperatingRules.blockedActions]
    },
    taskReplacement: status === 'revenue_system_failure' ? buildTaskReplacementRecommendation('No premium, backup, partner, AI automation, payment, or retainer opportunity survived scoring.') : undefined
  };
}

export function selectBestProductizedOffer(text: string): ProductizedRevenueOffer {
  const normalized = normalize(text);
  if (includesAny(normalized, ['closeout', 'msp', 'field tech', 'ticket', 'dispatch', 'pos', 'printer', 'low-voltage', 'access control', 'av'])) {
    return productizedRevenueOffers[1];
  }
  if (includesAny(normalized, ['coverage', 'partner', 'subcontractor', 'phoenix', 'technician network'])) {
    return productizedRevenueOffers[2];
  }
  if (includesAny(normalized, ['hauling', 'junk', 'delivery', 'dump', 'trailer'])) {
    return productizedRevenueOffers[3];
  }
  return productizedRevenueOffers[0];
}
