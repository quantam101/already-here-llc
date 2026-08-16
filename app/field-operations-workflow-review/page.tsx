import ServiceOfferPage, { createOfferMetadata, ServiceOffer } from '@/components/ServiceOfferPage';

const offer: ServiceOffer = {
  slug: 'field-operations-workflow-review',
  name: 'Field Operations Workflow Review',
  eyebrow: 'Revenue operations service',
  title: 'Find the bottlenecks in your intake, dispatch, closeout, and billing workflow.',
  description:
    'A structured review of how a field-service operation captures leads, schedules work, dispatches technicians, documents jobs, communicates with customers, and collects payment. You get a prioritized list of leaks and a concrete plan to fix them.',
  problem: [
    'Leads arrive from email, phone, text, and forms but never enter a single system.',
    'Dispatchers spend time chasing technicians instead of matching jobs to the right person.',
    'Closeout photos and notes are inconsistent, making billing and QA slow.',
    'Customers ask for status updates that should be automatic.',
    'Revenue is delayed because invoices depend on manually completed paperwork.'
  ],
  outcome: [
    'A documented current-state workflow map.',
    'Identified gaps ranked by revenue impact.',
    'A prioritized fix roadmap with effort and payoff estimates.',
    'Recommended intake, dispatch, and closeout templates.',
    'A clear scope for a follow-on implementation if you choose to proceed.'
  ],
  scope: [
    'Intake audit: forms, phone, email, SMS, and referral paths.',
    'Scheduling and dispatch workflow review.',
    'Closeout and documentation standards.',
    'Customer communication and status-update touchpoints.',
    'Billing and accounts-receivable handoff.',
    'One follow-up call to review findings.'
  ],
  exclusions: [
    'Software procurement or licensing costs.',
    'Full implementation; fixed separately if desired.',
    'Onsite travel outside Arizona unless arranged.',
    'Integration development with third-party APIs.'
  ],
  startingPrice: '$149',
  startingPriceCents: 14900,
  productName: 'Field Operations Workflow Review',
  cta: 'Book Workflow Review — $149',
  faq: [
    {
      question: 'Who is this for?',
      answer:
        'Field-service businesses, MSPs, contractors, mechanics, low-voltage installers, hauling operators, and dispatch groups that want a cleaner workflow before buying or building software.'
    },
    {
      question: 'What do I receive?',
      answer:
        'A written workflow map, gap list, and prioritized fix plan. If you want implementation support, we will quote that separately after the review.'
    },
    {
      question: 'How long does it take?',
      answer:
        'Most reviews are completed within 3 business days of receiving the information we request.'
    },
    {
      question: 'Can I get a refund?',
      answer:
        'If we cannot complete the review due to missing access or information, we will refund or reschedule. Otherwise, the starting fee covers the time reserved for the review.'
    }
  ],
  disclosure:
    'Starting price covers the workflow review and deliverables. Travel, additional sites, and implementation work are quoted separately. Final scope is confirmed before any work begins.'
};

export const metadata = createOfferMetadata(offer);

export default function FieldOperationsWorkflowReviewPage() {
  return <ServiceOfferPage offer={offer} />;
}
