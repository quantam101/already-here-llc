export const siteConfig = {
  name: 'Already Here LLC',
  shortName: 'Already Here',
  description:
    'Phoenix-based onsite infrastructure execution and technical field operations partner for MSPs, vendors, commercial sites, retail environments, and critical systems, with project coverage available nationwide depending on scope.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://alreadyherellc.com',
  phoneHref: 'tel:+16028822920',
  phoneDisplay: '(602) 882-2920',
  phoneNote: 'Dispatch and infrastructure assessment',
  email: 'dispatch@alreadyherellc.com',
  city: 'Phoenix, Arizona',
  address: {
    street: '429 N 18th Dr',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85007',
    full: '429 N 18th Dr, Phoenix, AZ 85007'
  },
  certifications: ['SDVOSB', 'Commercially Insured', 'SAM.gov Registered'],
  trustBar: ['A+ BBB Rating', 'Operating Since 2013', 'Phoenix-Based', 'Commercial & Multi-Site Support', 'Rapid Onsite Dispatch']
};

export const serviceGroups = [
  {
    title: 'Dispatch and recurring field support',
    description:
      'Single-site dispatches, recurring visits, post-install follow-through, and remediation work that needs clear onsite ownership and clean closeout.',
    items: ['Break/fix dispatches', 'Recurring site visits', 'Post-modernization support', 'Revisit and remediation work'],
    bestFit: 'Vendors and MSPs with defined scope that need dependable onsite execution without managing local headcount in every project market.'
  },
  {
    title: 'Store technology and endpoint work',
    description:
      'Field execution for payment devices, POS-related hardware, thin clients, workstations, printers, and other store technology tasks.',
    items: ['POS / payment device swaps', 'Thin-client and endpoint refresh work', 'Printer replacement and configuration', 'Windows device support'],
    bestFit: 'Retail, QSR, hospitality, and multi-site commercial operators running defined technology programs.'
  },
  {
    title: 'Network and infrastructure field activity',
    description:
      'Onsite support for managed routers, Cradlepoint installs, AP replacement revisits, low-voltage testing, rack/stack tasks, and related infrastructure work.',
    items: ['Managed router installs', 'Cradlepoint and SD-WAN-related work', 'Wi-Fi and AP troubleshooting', 'Rack / stack / iDRAC support'],
    bestFit: 'MSPs and network operators needing smart-hands coverage for infrastructure work.'
  },
  {
    title: 'Healthcare and controlled environment field work',
    description:
      'Field execution in access-sensitive and compliance-adjacent environments including medical facilities, data centers, and controlled-access sites.',
    items: ['Healthcare-adjacent field assignments', 'NICU and medical device support', 'Data center rack/stack', 'Controlled-access site execution'],
    bestFit: 'Healthcare-adjacent operators and enterprise teams that need documented, professional field execution in controlled environments.'
  },
  {
    title: 'Surveys, AV, and site verification',
    description:
      'Operational site assessments, DMB and field surveys, AV/media troubleshooting, TV signal restoration, and site verification for larger project teams.',
    items: ['Site surveys', 'DMB / documentation surveys', 'AV / media troubleshooting', 'Site verification and closeout photos'],
    bestFit: 'Rollout teams and project managers that need ground-truth verification and documentation from the field.'
  },
  {
    title: 'Rollout and modernization support',
    description:
      'Multi-site rollout execution, store modernization cleanup, revisit work after missed items, and post-rollout troubleshooting.',
    items: ['Multi-site rollout execution', 'Store modernization cleanup', 'Revisit after missed items', 'Post-rollout troubleshooting'],
    bestFit: 'Program managers running modernization programs who need a reliable onsite execution layer.'
  }
] as const;

export const buyerReasons = [
  'Reliable onsite execution for defined technical dispatches without consumer repair-shop positioning.',
  'Technical field operations for MSPs, vendors, commercial sites, retail environments, and critical systems.',
  'Structured closeout documentation with photos, field notes, equipment observations, and next-step escalation when required.',
  'Procurement-ready profile with SDVOSB certification, SAM.gov registration, commercial insurance, and operating history.'
] as const;

export const documentedWorkTypes = [
  'POS installs and upgrades',
  'Payment device replacement',
  'Thin-client replacement',
  'HDD / SSD replacement',
  'Desktop / laptop refresh work',
  'LAN migration support',
  'Smart hands support',
  'DMB / site surveys',
  'Healthcare-related field assignments',
  'Store modernization troubleshooting',
  'Starlink surveys and installs',
  'Digital kitchen conversion work',
  'Cisco SD-WAN decommissioning activity',
  'Cradlepoint installs',
  'Rack / stack / iDRAC work',
  'Printer replacement / configuration',
  'AV / media troubleshooting',
  'TV signal restoration',
  'Managed router installs',
  'Wi-Fi troubleshooting',
  'Low-voltage testing',
  'Site verification',
  'Exterior router mounting',
  'Automated locker system installs',
  'RFID reader surveys',
  'Medical device calibration support'
] as const;

export const environments = [
  'Retail',
  'QSR / restaurant',
  'Hospitality',
  'Healthcare',
  'Enterprise / office',
  'AV / media environments',
  'Data center / infrastructure',
  'Infrastructure-related project environments'
] as const;

export const markets = [
  'Phoenix',
  'Tempe',
  'Chandler',
  'Scottsdale',
  'Glendale',
  'Mesa',
  'Peoria',
  'Avondale',
  'Buckeye',
  'Goodyear',
  'Surprise',
  'Litchfield Park',
  'Carefree',
  'Page',
  'Quartzsite',
  'San Luis',
  'Springerville',
  'Nationwide project coverage by scope'
] as const;

export const audience = [
  {
    title: 'Vendors and prime contractors',
    description:
      'Use Already Here LLC as a field execution partner when the scope, parts, and dispatch logic are already defined and the missing piece is dependable onsite follow-through.'
  },
  {
    title: 'MSPs and network operators',
    description:
      'Extend coverage for site visits, smart hands tasks, router work, troubleshooting, documentation collection, and follow-up remediation without overpromising unsupported SLAs.'
  },
  {
    title: 'Multi-site operators and rollout teams',
    description:
      'Support rollouts, revisits, site verification, hardware swaps, and documentation-heavy field activity across qualified project markets.'
  },
  {
    title: 'Government primes and SDVOSB set-aside buyers',
    description:
      'Already Here LLC is SDVOSB-certified and SAM.gov registered. Eligible for set-aside, sole-source, and subcontracting opportunities under federal and state procurement programs.'
  }
] as const;

export const closeoutItems = [
  'Arrival / departure notes',
  'Action summary and field observations',
  'Photos when permitted',
  'Part swap or equipment notes',
  'Escalation notes for unresolved items',
  'Usable closeout language for the client-side ticket'
] as const;

export const dispatchTypes = [
  'Dispatch / break-fix',
  'Recurring field support',
  'Rollout / install support',
  'Remediation / revisit',
  'POS / store tech',
  'Networking / Wi-Fi',
  'AV / media',
  'Survey / site verification',
  'Healthcare / controlled environment',
  'Government / SDVOSB set-aside',
  'Infrastructure-related onsite work'
] as const;

export const representativeWork = [
  {
    client: 'National QSR chain',
    tag: 'POS / Retail',
    scope: 'POS hardware installation across multiple commercial locations with same-day closeout documentation.'
  },
  {
    client: 'Enterprise infrastructure vendor',
    tag: 'Infrastructure',
    scope: 'Data center infrastructure deployment support including rack, cable, and verification activity.'
  },
  {
    client: 'National retail brand',
    tag: 'Rollout / Survey',
    scope: 'RFID reader and AP survey execution with structured field documentation.'
  },
  {
    client: 'Medical device OEM',
    tag: 'Healthcare',
    scope: 'Healthcare-adjacent equipment support in access-sensitive, documentation-required environments.'
  },
  {
    client: 'National MSP',
    tag: 'Smart Hands',
    scope: 'Campus smart-hands coordination with structured closeout per ticket.'
  },
  {
    client: 'National QSR chain',
    tag: 'POS / Retail',
    scope: 'POS upgrade execution with pre-flight, install support, and documented closeout.'
  }
] as const;

export const naicsCodes = [
  { code: '541512', desc: 'Computer Systems Design Services' },
  { code: '541519', desc: 'Other Computer-Related Services' },
  { code: '238210', desc: 'Electrical Contractors and Other Wiring Installation Contractors' },
  { code: '811212', desc: 'Computer and Office Machine Repair and Maintenance' },
  { code: '541611', desc: 'Administrative Management and General Management Consulting Services' }
] as const;

export const pricingTiers = [
  { label: 'Standard dispatch', value: 'Quote on submission', note: 'Scope, travel, and closeout requirements determine rate' },
  { label: 'Urgent / same-day', value: 'Premium rate applies', note: 'Same-day requests carry a priority surcharge' },
  { label: 'Bundled / recurring', value: 'Volume pricing available', note: 'Multi-site and recurring programs qualify for negotiated rates' }
] as const;
