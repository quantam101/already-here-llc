export type AgentPackageId = 'launch' | 'growth' | 'network';

export type AgentPackage = {
  id: AgentPackageId;
  name: string;
  setup: string;
  monthly: string;
  bestFor: string;
  includes: string[];
  delivery: string;
};

export const aiAgentPackages: AgentPackage[] = [
  {
    id: 'launch',
    name: 'Launch Agent',
    setup: '$997 setup',
    monthly: '$197/mo management',
    bestFor: 'One-location service business that needs website lead capture, missed-call recovery, and quote intake now.',
    delivery: '3-business-day standard implementation after intake, website access, and lead routing are confirmed.',
    includes: [
      'Website chatbox installed on one website or standalone lead-capture page',
      'Lead qualification flow for name, phone, email, service, city, urgency, and budget',
      'Owner or dispatcher email alert with structured lead record',
      'Prospect receipt confirmation after successful lead capture',
      'Monthly copy, question, and conversion review'
    ]
  },
  {
    id: 'growth',
    name: 'Growth Agent',
    setup: '$1,997 setup',
    monthly: '$397/mo management',
    bestFor: 'Service firms with repeat quote volume, delayed callbacks, stale quotes, or multiple service categories.',
    delivery: '5-business-day standard implementation after intake, website access, and lead routing are confirmed.',
    includes: [
      'Everything in Launch Agent',
      'Quote-routing logic by service type, geography, urgency, and estimated deal value',
      'Dashboard-ready CSV and JSON lead records for review and export',
      'Follow-up scripts for missed leads, stale quotes, and after-hours inquiries',
      'Monthly lead-quality optimization review with next action recommendations'
    ]
  },
  {
    id: 'network',
    name: 'Network Agent',
    setup: '$4,500+ setup',
    monthly: '$997+/mo management',
    bestFor: 'Multi-location operators, MSPs, technician networks, vendor dispatch groups, and white-label reseller partners.',
    delivery: 'Scoped implementation after workflow, routing, access, compliance, and escalation review.',
    includes: [
      'Everything in Growth Agent',
      'Multi-location routing, assignment, escalation, and approval-gate rules',
      'Dispatch-style intake with ticket, site, schedule, scope, tools, and closeout fields',
      'White-label MSP or reseller package with scoped branding and handoff rules',
      'Revenue operations review covering conversion leakage, bottlenecks, and reusable vertical templates'
    ]
  }
];

export const aiAgentIndustries = [
  'IT support and MSPs',
  'Locksmiths and access control',
  'Garage door companies',
  'HVAC contractors',
  'Plumbers and electricians',
  'Appliance repair',
  'Hauling and delivery',
  'Roofing and home services',
  'Clinic and wellness intake',
  'Restaurant and retail service',
  'Property managers',
  'Mobile notaries',
  'Real estate investor intake',
  'Field technician networks',
  'White-label agency partners'
] as const;

export type AgentLeadPayload = {
  fullName: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  businessType: string;
  packageInterest: string;
  urgency: string;
  budget: string;
  goals: string;
  currentLeadProblem: string;
  sourcePath: string;
};

export function scoreAgentLead(payload: AgentLeadPayload): { score: number; grade: 'A' | 'B' | 'C'; nextAction: string } {
  let score = 40;
  const text = `${payload.businessType} ${payload.goals} ${payload.currentLeadProblem} ${payload.urgency} ${payload.budget}`.toLowerCase();

  if (payload.phone.trim()) score += 8;
  if (payload.website.trim()) score += 6;
  if (payload.urgency.toLowerCase().includes('today') || payload.urgency.toLowerCase().includes('week')) score += 12;
  if (payload.packageInterest.toLowerCase().includes('growth')) score += 12;
  if (payload.packageInterest.toLowerCase().includes('network')) score += 18;
  if (payload.budget.includes('$1,000') || payload.budget.includes('$2,500') || payload.budget.includes('$5,000')) score += 14;
  if (text.includes('missed') || text.includes('quote') || text.includes('dispatch') || text.includes('booking') || text.includes('lead')) score += 12;
  if (payload.goals.length > 140) score += 6;

  const bounded = Math.max(0, Math.min(100, score));
  if (bounded >= 76) return { score: bounded, grade: 'A', nextAction: 'Call within 15 minutes and offer Growth Agent or Network Agent.' };
  if (bounded >= 58) return { score: bounded, grade: 'B', nextAction: 'Send setup questionnaire and offer Launch Agent.' };
  return { score: bounded, grade: 'C', nextAction: 'Reply with qualification questions before quoting.' };
}
