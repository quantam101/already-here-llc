export const siteConfig = {
  name: 'Already Here LLC',
  shortName: 'Already Here',
  tagline: 'Onsite Infrastructure Execution',
  heroTitle: 'Arizona Onsite IT Field Execution for MSPs, Retail, and Infrastructure Teams',
  heroDescription:
    'Already Here LLC delivers onsite remediation, smart hands support, network troubleshooting, rollout recovery, and infrastructure execution across Arizona. We solve the technical issues remote teams cannot close remotely.',
  positioning:
    'Already Here LLC provides onsite infrastructure execution and technical field operations for MSPs, commercial sites, retail environments, and critical systems across Arizona.',
  description:
    'Phoenix-based onsite infrastructure execution and technical field operations partner for MSPs, vendors, commercial sites, retail environments, and critical systems across Arizona.',
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
  trustBar: ['A+ BBB Rating', 'Operating Since 2013', 'Phoenix-Based', 'Commercial & Multi-Site Support', 'Rapid Onsite Dispatch'],
  ein: '46-4403432'
};

export const serviceGroups = [
  {
    title: 'Technical Field Operations',
    description:
      'Structured onsite execution for MSPs, vendors, and infrastructure teams that need a reliable field operator on site.',
    items: ['Smart hands support', 'Dispatch execution', 'Site verification', 'Technical closeout'],
    bestFit: 'Remote teams and prime vendors that need local field execution without building Arizona headcount.'
  },
  {
    title: 'Onsite Infrastructure Execution',
    description:
      'Network, rack, endpoint, AP, low-voltage-adjacent, and site infrastructure tasks executed with clear documentation.',
    items: ['Router and SD-WAN support', 'AP and Wi-Fi troubleshooting', 'Rack / stack / iDRAC support', 'Infrastructure remediation'],
    bestFit: 'MSPs, network operators, and infrastructure teams needing disciplined onsite work.'
  },
  {
    title: 'Retail and Commercial Technology Support',
    description:
      'Field support for POS, payment devices, printers, endpoints, kiosks, store systems, and commercial technology environments.',
    items: ['POS / payment device swaps', 'Endpoint refresh work', 'Printer replacement', 'Kiosk and store technology support'],
    bestFit: 'Retail, QSR, hospitality, and multi-site commercial operators across Arizona.'
  },
  {
    title: 'Rollout Recovery and Remediation',
    description:
      'Revisit work, failed closeout recovery, post-install troubleshooting, and ground-truth verification for remote project teams.',
    items: ['Rollout recovery', 'Revisit work', 'Post-install troubleshooting', 'Closeout correction'],
    bestFit: 'Program managers and vendors with open issues that cannot be resolved remotely.'
  },
  {
    title: 'Critical Systems Field Support',
    description:
      'Professional onsite support for healthcare-adjacent, controlled-access, infrastructure, and compliance-sensitive commercial environments.',
    items: ['Controlled-access site work', 'Healthcare-adjacent support', 'Data center support', 'Critical system verification'],
    bestFit: 'Organizations that need field-ready technical execution in professional environments.'
  },
  {
    title: 'Surveys and Site Assessment',
    description:
      'Operational site assessments, infrastructure surveys, closeout photos, and documentation for planning and remediation decisions.',
    items: ['Infrastructure assessments', 'RFID and AP surveys', 'Documentation capture', 'Site readiness verification'],
    bestFit: 'Teams that need ground truth before dispatching parts, approving change orders, or closing a project.'
  }
] as const;

export const buyerReasons = [
  'Enterprise-ready field execution language and process discipline without consumer repair-shop positioning.',
  'Technical field operations for MSPs, vendors, commercial sites, retail environments, and critical systems across Arizona.',
  'Structured closeout documentation with photos, field notes, equipment observations, and next-step escalation when required.',
  'Government/vendor capable profile with SDVOSB certification, SAM.gov registration, commercial insurance, and Arizona operating history.'
] as const;

export const documentedWorkTypes = [
  'Smart hands support',
  'Network troubleshooting',
  'Onsite remediation',
  'Rollout recovery',
  'Infrastructure assessment',
  'POS installs and upgrades',
  'Payment device replacement',
  'Thin-client replacement',
  'HDD / SSD replacement',
  'Desktop / laptop refresh work',
  'LAN migration support',
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
  'MSP client sites',
  'Commercial sites',
  'Retail',
  'QSR / restaurant',
  'Hospitality',
  'Healthcare',
  'Enterprise / office',
  'AV / media environments',
  'Data center / infrastructure',
  'Critical systems environments'
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
  'Springerville'
] as const;

export const audience = [
  {
    title: 'MSPs and network operators',
    description:
      'Extend Arizona coverage for smart hands, network troubleshooting, router work, site visits, documentation collection, and remediation without carrying local headcount.'
  },
  {
    title: 'Vendors and prime contractors',
    description:
      'Use Already Here LLC as the onsite execution layer when the scope, parts, and ticket flow are defined and the missing piece is reliable field completion.'
  },
  {
    title: 'Retail and commercial operators',
    description:
      'Support multi-site technology programs, POS work, endpoint refreshes, store modernization, rollout recovery, and commercial infrastructure tasks.'
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
  'Technical field operations',
  'Smart hands support',
  'Onsite infrastructure execution',
  'Network troubleshooting',
  'Rollout recovery',
  'Remediation / revisit',
  'POS / store tech',
  'Survey / site verification',
  'Healthcare / controlled environment',
  'Government / SDVOSB set-aside',
  'Critical systems support'
] as const;

export const representativeWork = [
  {
    client: 'National QSR chain',
    tag: 'POS / Retail',
    scope: 'POS hardware installation across 4 locations, Mesa AZ metro. NCR Voyix-issued scope. Confirmed closeout with photo documentation delivered same day.'
  },
  {
    client: 'Enterprise infrastructure vendor',
    tag: 'Infrastructure',
    scope: 'HPE Alletra MP deployment — Chandler, AZ data center. Rack, cable, and verification. Multi-day engagement with structured closeout.'
  },
  {
    client: 'National retail brand',
    tag: 'Rollout / Survey',
    scope: 'RFID reader survey — 55 readers, 4 APs, 61 data runs, HP Aruba switches. Chandler Fashion Center US0275. Full structured field execution with documentation.'
  },
  {
    client: 'Medical device OEM',
    tag: 'Healthcare',
    scope: 'GE Healthcare Giraffe / MIC NICU equipment calibration across multiple healthcare sites, Western US. Access-sensitive, documentation-required environments.'
  },
  {
    client: 'National MSP',
    tag: 'Smart Hands',
    scope: 'GoDaddy Phoenix campus block storage installs — multi-site smart-hands coordination with structured closeout per ticket.'
  },
  {
    client: 'National QSR chain (NCR)',
    tag: 'POS / Retail',
    scope: 'Starbucks POS upgrade execution — NCR Voyix WO. Mesa AZ. Pre-flight, install, and documented closeout.'
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
