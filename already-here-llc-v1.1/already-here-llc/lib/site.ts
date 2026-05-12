export const siteConfig = {
  name: 'Already Here LLC',
  shortName: 'Already Here',
  tagline: 'Onsite Infrastructure Execution',
  heroTitle: 'Phoenix-Based Onsite IT Field Execution for MSPs, Retail, and Infrastructure Teams',
  heroDescription: 'Already Here LLC delivers onsite remediation, smart hands support, network troubleshooting, rollout recovery, and infrastructure execution from Phoenix for Arizona and qualified project sites nationwide. We solve the technical issues remote teams cannot close remotely.',
  positioning: 'Already Here LLC provides onsite infrastructure execution and technical field operations for MSPs, commercial sites, retail environments, and critical systems from Phoenix with project coverage available nationwide depending on client scope.',
  description: 'Phoenix-based onsite infrastructure execution and technical field operations partner for MSPs, vendors, commercial sites, retail environments, and critical systems, with project coverage available nationwide depending on scope.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://alreadyherellc.com',
  phoneHref: 'tel:+16028822920',
  phoneDisplay: '(602) 882-2920',
  phoneNote: 'Dispatch and infrastructure assessment',
  email: 'dispatch@alreadyherellc.com',
  city: 'Phoenix, Arizona',
  address: { street: '429 N 18th Dr', city: 'Phoenix', state: 'AZ', zip: '85007', full: '429 N 18th Dr, Phoenix, AZ 85007' },
  certifications: ['SDVOSB Eligible', 'Commercially Insured', 'SAM.gov Registered'],
  trustBar: ['A+ BBB Rating', 'Operating Since 2013', 'Phoenix-Based', 'Commercial & Multi-Site Support', 'Rapid Onsite Dispatch']
};

export const serviceGroups = [
  { title: 'Technical Field Operations', description: 'Structured onsite execution for MSPs, vendors, and infrastructure teams that need a reliable field operator on site.', items: ['Smart hands support', 'Dispatch execution', 'Site verification'], bestFit: 'Remote teams and prime vendors that need field execution without building project-market headcount.' },
  { title: 'Onsite Infrastructure Execution', description: 'Network, rack, endpoint, AP, and site infrastructure tasks with clear documentation.', items: ['Router support', 'Wi-Fi troubleshooting', 'Infrastructure remediation'], bestFit: 'MSPs and infrastructure teams needing disciplined onsite work.' },
  { title: 'Retail and Commercial Technology Support', description: 'Field support for POS, payment devices, endpoints, printers, kiosks, and store systems.', items: ['POS work', 'Endpoint refresh', 'Printer replacement'], bestFit: 'Retail, QSR, hospitality, and multi-site commercial operators in qualified regional and project markets.' },
  { title: 'Rollout Recovery and Remediation', description: 'Revisit work, failed closeout recovery, and post-install troubleshooting.', items: ['Rollout recovery', 'Revisit work', 'Closeout correction'], bestFit: 'Program managers and vendors with open issues that cannot be resolved remotely.' },
  { title: 'Critical Systems Field Support', description: 'Professional onsite support for controlled-access and infrastructure environments.', items: ['Controlled-access site work', 'Data center support'], bestFit: 'Organizations that need field-ready technical execution in professional environments.' },
  { title: 'Surveys and Site Assessment', description: 'Site assessments, infrastructure surveys, closeout photos, and documentation.', items: ['Infrastructure assessments', 'Documentation capture'], bestFit: 'Teams that need field verification.' }
] as const;

export const buyerReasons = ['Reliable onsite execution for defined technical dispatches without consumer repair-shop positioning.', 'Technical field operations for MSPs, vendors, commercial sites, retail environments, and critical systems.', 'Structured closeout documentation with photos, field notes, equipment observations, and next-step escalation when required.', 'Procurement-ready profile with SAM.gov registration, commercial insurance, and active SDVOSB certification pursuit.'] as const;
export const documentedWorkTypes = ['Smart hands support', 'Network troubleshooting', 'Onsite remediation', 'Rollout recovery', 'Infrastructure assessment', 'POS installs and upgrades', 'Payment device replacement', 'Endpoint refresh work', 'LAN migration support', 'Site surveys', 'Store modernization troubleshooting', 'Cradlepoint installs', 'Rack / stack support', 'Printer replacement', 'AV / media troubleshooting', 'Managed router installs', 'Wi-Fi troubleshooting', 'Low-voltage testing', 'Site verification', 'RFID reader surveys'] as const;
export const environments = ['MSP client sites', 'Commercial sites', 'Retail', 'QSR / restaurant', 'Hospitality', 'Healthcare', 'Enterprise / office', 'AV / media environments', 'Data center / infrastructure', 'Critical systems environments'] as const;
export const markets = ['Phoenix', 'Tempe', 'Chandler', 'Scottsdale', 'Glendale', 'Mesa', 'Peoria', 'Avondale', 'Buckeye', 'Goodyear', 'Surprise', 'Litchfield Park', 'Carefree', 'Page', 'Quartzsite', 'San Luis', 'Springerville', 'Nationwide project coverage by scope'] as const;
export const audience = [
  { title: 'MSPs and network operators', description: 'Extend field coverage for smart hands, network troubleshooting, router work, site visits, documentation collection, and remediation without carrying local headcount for every project market.' },
  { title: 'Vendors and prime contractors', description: 'Use Already Here LLC as the onsite execution layer when the scope, parts, and ticket flow are defined.' },
  { title: 'Retail and commercial operators', description: 'Support multi-site technology programs, POS work, endpoint refreshes, store modernization, and infrastructure tasks.' },
  { title: 'Procurement teams', description: 'SAM.gov registered, commercially insured, and SDVOSB-eligible while actively pursuing certification for appropriate subcontracting opportunities.' }
] as const;
export const closeoutItems = ['Arrival / departure notes', 'Action summary and field observations', 'Photos when permitted', 'Part swap or equipment notes', 'Escalation notes for unresolved items', 'Usable closeout language for the client-side ticket'] as const;
export const dispatchTypes = ['Technical field operations', 'Smart hands support', 'Onsite infrastructure execution', 'Network troubleshooting', 'Rollout recovery', 'Remediation / revisit', 'POS / store tech', 'Survey / site verification', 'Healthcare / controlled environment', 'SDVOSB-eligible support', 'Critical systems support'] as const;
export const representativeWork = [
  { client: 'National QSR chain', tag: 'POS / Retail', scope: 'POS hardware installation with documented closeout.' },
  { client: 'Enterprise infrastructure vendor', tag: 'Infrastructure', scope: 'Data center rack, cable, and verification engagement.' },
  { client: 'National retail brand', tag: 'Rollout / Survey', scope: 'RFID reader and AP survey with field documentation.' },
  { client: 'Medical device OEM', tag: 'Healthcare', scope: 'Healthcare-adjacent field support.' },
  { client: 'National MSP', tag: 'Smart Hands', scope: 'Smart-hands coordination with structured closeout.' },
  { client: 'National QSR chain', tag: 'POS / Retail', scope: 'POS upgrade execution with documented closeout.' }
] as const;
export const naicsCodes = [{ code: '541512', desc: 'Computer Systems Design Services' }, { code: '541519', desc: 'Other Computer-Related Services' }, { code: '238210', desc: 'Electrical Contractors and Other Wiring Installation Contractors' }, { code: '811212', desc: 'Computer and Office Machine Repair and Maintenance' }, { code: '541611', desc: 'Administrative Management and General Management Consulting Services' }] as const;
export const pricingTiers = [{ label: 'Standard dispatch', value: 'Quote on submission', note: 'Scope, travel, and closeout requirements determine rate' }, { label: 'Priority dispatch', value: 'Premium rate applies', note: 'Priority requests carry a surcharge' }, { label: 'Bundled / recurring', value: 'Volume pricing available', note: 'Multi-site and recurring programs qualify for negotiated rates' }] as const;
