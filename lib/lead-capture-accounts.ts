export type LeadCaptureAccount = {
  id: string;
  accountName: string;
  ownerName: string;
  businessName: string;
  status: 'active_internal_proof';
  website: string;
  phone: string;
  publicEmail: string;
  adminCopyEmail: string;
  offer: string;
  positioning: string;
  pricingPosition: string;
  accountRoutes: {
    publicOfferPath: string;
    intakeAnchor: string;
    fieldDispatchPath: string;
    projectQuotePath: string;
  };
  leadCategories: readonly string[];
  requiredLeadFields: readonly string[];
  proofMetrics: readonly string[];
  routingRules: readonly string[];
  followUpRules: readonly string[];
};

export const leadCaptureStatusValues = [
  'New',
  'Needs Review',
  'Quoted',
  'Follow-Up Sent',
  'Booked',
  'Completed',
  'Lost',
  'Nurture',
  'Spam / Bad Lead'
] as const;

export const alreadyHereLeadCaptureAccount = {
  id: 'AH-AI-LEAD-CAPTURE-001',
  accountName: 'Already Here LLC — AI Lead Capture',
  ownerName: 'Stephen Franklin',
  businessName: 'Already Here LLC',
  status: 'active_internal_proof',
  website: 'https://alreadyherellc.com/ai-lead-capture',
  phone: '(602) 882-2920',
  publicEmail: 'dispatch@alreadyherellc.com',
  adminCopyEmail: 'dispatch@alreadyherellc@gmail.com',
  offer: 'AI Lead Capture for service businesses',
  positioning:
    'Already Here LLC uses its own AI Lead Capture account first, then turns the documented intake, routing, follow-up, and conversion process into a sellable system for service businesses.',
  pricingPosition:
    'Low or no upfront setup may be available for qualified businesses. The AI rental can be paid from revenue the system helps capture, recover, and convert when tracking rules are agreed in advance.',
  accountRoutes: {
    publicOfferPath: '/ai-lead-capture',
    intakeAnchor: '/ai-lead-capture#pilot-intake',
    fieldDispatchPath: '/dispatch',
    projectQuotePath: '/rfq'
  },
  leadCategories: [
    'AI lead capture demo',
    'Website chatbox lead capture',
    'Missed-call recovery',
    'Quote intake and qualification',
    'Booking or dispatch triage',
    'After-hours service intake',
    'Owner alert and lead routing',
    'Lead dashboard and proof tracking',
    'Follow-up scripts and monthly optimization',
    'Performance-aligned pilot review'
  ],
  requiredLeadFields: [
    'Name',
    'Phone',
    'Email',
    'Business or company',
    'Website or domain when available',
    'Business type',
    'Lead problem being solved',
    'Service or offer the AI should capture',
    'Routing destination',
    'Urgency',
    'Preferred pilot path'
  ],
  proofMetrics: [
    'Lead source',
    'Response time',
    'Qualified or unqualified',
    'Estimated job value',
    'Follow-up count',
    'Booked or not booked',
    'Revenue generated',
    'Lost reason',
    'Case-study permission status'
  ],
  routingRules: [
    'A-grade leads require phone follow-up within 15 minutes when Stephen is available.',
    'B-grade leads receive same-day follow-up with setup questions and a demo path.',
    'C-grade leads are qualified before quoting or committing implementation time.',
    'No automatic pricing, availability, licensing, guarantee, or same-day commitment is made unless defined in the account profile.',
    'Outbound automation remains approval-gated until opt-in, authorization, and operating rules are confirmed.'
  ],
  followUpRules: [
    'Lead with proof: show the buyer a working capture, qualification, routing, and lead-record flow before selling the package.',
    'Position the first demo around the buyer’s highest-value missed lead type.',
    'Use Launch Agent for simple one-location intake, Growth Agent for follow-up and routing, and Network Agent for dispatch, reseller, or multi-location workflows.',
    'Track every lead outcome before claiming public proof results.'
  ]
} as const satisfies LeadCaptureAccount;

export const leadCaptureAccountRegistry = [alreadyHereLeadCaptureAccount] as const;
