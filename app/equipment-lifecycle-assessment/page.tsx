import ServiceOfferPage, { createOfferMetadata, ServiceOffer } from '@/components/ServiceOfferPage';

const offer: ServiceOffer = {
  slug: 'equipment-lifecycle-assessment',
  name: 'Equipment Lifecycle Assessment',
  eyebrow: 'Asset operations service',
  title: 'Track the tools, equipment, and vehicles that make your operation possible.',
  description:
    'A structured assessment of how your business tracks asset intake, assignment, inspection, maintenance, calibration, repair, and replacement. You receive a register framework, QR-tagging plan, and a clear path to reduce loss and downtime.',
  problem: [
    'Assets are purchased, assigned, and moved without a single source of truth.',
    'Inspection, calibration, and maintenance dates are tracked in spreadsheets or not at all.',
    'Technicians lose time locating tools or confirming which equipment is job-ready.',
    'Replacement decisions are reactive instead of based on cost and usage history.',
    'Compliance and warranty documentation are scattered across locations.'
  ],
  outcome: [
    'A current-state asset lifecycle map.',
    'A proposed canonical asset register structure.',
    'QR-tag and inspection schedule recommendations.',
    'Priority list of assets to formalize first.',
    'Scope for a managed asset register deployment if you choose to proceed.'
  ],
  scope: [
    'Asset categories: tools, equipment, vehicles, IT assets, test equipment, safety gear.',
    'Lifecycle stage review: intake, assignment, inspection, maintenance, calibration, repair, retirement.',
    'Current tracking method and data source audit.',
    'QR identifier and mobile intake recommendation.',
    'Maintenance/calibration cadence and responsibility map.',
    'One follow-up call to review findings.'
  ],
  exclusions: [
    'Physical QR tags, labels, or scanning hardware.',
    'Full register build and data entry; scoped separately.',
    'Official certification or calibration services requiring accredited authority.',
    'Integration development with ERP or asset-management APIs.'
  ],
  startingPrice: '$199',
  startingPriceCents: 19900,
  productName: 'Equipment Lifecycle Assessment',
  cta: 'Book Equipment Assessment — $199',
  faq: [
    {
      question: 'Who is this for?',
      answer:
        'Contractors, technicians, fleet operators, MSPs, inspectors, mechanics, and any field-service business that depends on tools, vehicles, or test equipment and wants to reduce loss and downtime.'
    },
    {
      question: 'What do I receive?',
      answer:
        'A written lifecycle assessment, recommended asset register structure, QR-tag plan, and prioritized implementation scope. Full register build is available as a separate service.'
    },
    {
      question: 'How long does it take?',
      answer:
        'Most assessments are completed within 3 business days of receiving the asset information we request.'
    },
    {
      question: 'Can I get a refund?',
      answer:
        'If we cannot complete the assessment due to missing access or information, we will refund or reschedule. Otherwise, the starting fee covers the time reserved for the assessment.'
      }
    ],
    disclosure:
      'Starting price covers the assessment and deliverables. QR tags, hardware, travel, data entry, and implementation work are quoted separately. Final scope is confirmed before any work begins. Official certification or calibration must be performed by the appropriately accredited provider.'
};

export const metadata = createOfferMetadata(offer);

export default function EquipmentLifecycleAssessmentPage() {
  return <ServiceOfferPage offer={offer} />;
}
