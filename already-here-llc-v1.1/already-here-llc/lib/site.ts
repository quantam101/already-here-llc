export const siteConfig = {
  name: 'Already Here LLC',
  shortName: 'Already Here',
  tagline: 'Onsite Infrastructure Execution',
  heroTitle: 'Arizona Onsite IT Field Execution for MSPs, Retail, and Infrastructure Teams',
  heroDescription: 'Already Here LLC delivers onsite remediation, smart hands support, network troubleshooting, rollout recovery, and infrastructure execution across Arizona.',
  positioning: 'Already Here LLC provides onsite infrastructure execution and technical field operations for MSPs, commercial sites, retail environments, and critical systems across Arizona.',
  description: 'Phoenix-based onsite infrastructure execution and technical field operations partner for MSPs, vendors, commercial sites, retail environments, and critical systems across Arizona.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://alreadyherellc.com',
  phoneHref: 'tel:+16028822920',
  phoneDisplay: '(602) 882-2920',
  phoneNote: 'Dispatch and infrastructure assessment',
  email: 'dispatch@alreadyherellc.com',
  city: 'Phoenix, Arizona',
  address: { street: '429 N 18th Dr', city: 'Phoenix', state: 'AZ', zip: '85007', full: '429 N 18th Dr, Phoenix, AZ 85007' },
  certifications: ['SDVOSB', 'Commercially Insured', 'SAM.gov Registered'],
  trustBar: ['A+ BBB Rating', 'Operating Since 2013', 'Phoenix-Based', 'Commercial & Multi-Site Support', 'Rapid Onsite Dispatch']
};

export const serviceGroups = [
  { title: 'Technical Field Operations', description: 'Structured onsite execution for MSPs, vendors, and infrastructure teams.', items: ['Smart hands support', 'Dispatch execution', 'Site verification'], bestFit: 'Remote teams needing Arizona field execution.' },
  { title: 'Onsite Infrastructure Execution', description: 'Network, rack, endpoint, AP, and site infrastructure tasks with clear documentation.', items: ['Router support', 'Wi-Fi troubleshooting', 'Infrastructure remediation'], bestFit: 'MSPs and infrastructure teams.' },
  { title: 'Retail and Commercial Technology Support', description: 'Field support for POS, payment devices, endpoints, printers, kiosks, and store systems.', items: ['POS work', 'Endpoint refresh', 'Printer replacement'], bestFit: 'Retail, QSR, hospitality, and commercial operators.' },
  { title: 'Rollout Recovery and Remediation', description: 'Revisit work, failed closeout recovery, and post-install troubleshooting.', items: ['Rollout recovery', 'Revisit work', 'Closeout correction'], bestFit: 'Program managers and vendors.' },
  { title: 'Critical Systems Field Support', description: 'Professional onsite support for controlled-access and infrastructure environments.', items: ['Controlled-access site work', 'Data center support'], bestFit: 'Professional technical environments.' },
  { title: 'Surveys and Site Assessment', description: 'Site assessments, infrastructure surveys, closeout photos, and documentation.', items: ['Infrastructure assessments', 'Documentation capture'], bestFit: 'Teams that need field verification.' }
] as const;

export const buyerReasons = ['Enterprise-ready field execution language and process discipline.', 'Technical field operations across Arizona.', 'Structured closeout documentation.', 'Vendor-ready operating profile.'] as const;
export const documentedWorkTypes = ['Smart hands support', 'Network troubleshooting', 'Onsite remediation', 'Rollout recovery', 'Infrastructure assessment', 'POS installs and upgrades', 'Payment device replacement', 'Endpoint refresh work', 'LAN migration support', 'Site surveys', 'Store modernization troubleshooting', 'Cradlepoint installs', 'Rack / stack support', 'Printer replacement', 'AV / media troubleshooting', 'Managed router installs', 'Wi-Fi troubleshooting', 'Low-voltage testing', 'Site verification', 'RFID reader surveys'] as const;
export const environments = ['MSP client sites', 'Commercial sites', 'Retail', 'QSR / restaurant', 'Hospitality', 'Healthcare', 'Enterprise / office', 'AV / media environments', 'Data center / infrastructure', 'Critical systems environments'] as const;
export const markets = ['Phoenix', 'Tempe', 'Chandler', 'Scottsdale', 'Glendale', 'Mesa', 'Peoria', 'Avondale', 'Buckeye', 'Goodyear', 'Surprise', 'Litchfield Park', 'Carefree', 'Page', 'Quartzsite', 'San Luis', 'Springerville'] as const;
export const audience = [
  { title: 'MSPs and network operators', description: 'Extend Arizona coverage for smart hands, network troubleshooting, router work, site visits, documentation collection, and remediation.' },
  { title: 'Vendors and prime contractors', description: 'Use Already Here LLC as the onsite execution layer when the scope, parts, and ticket flow are defined.' },
  { title: 'Retail and commercial operators', description: 'Support multi-site technology programs, POS work, endpoint refreshes, store modernization, and infrastructure tasks.' },
  { title: 'Procurement teams', description: 'SDVOSB-certified and SAM.gov registered for appropriate subcontracting opportunities.' }
] as const;
export const closeoutItems = ['Arrival / departure notes', 'Action summary and field observations', 'Photos when permitted', 'Part swap or equipment notes', 'Escalation notes for unresolved items', 'Usable closeout language for the client-side ticket'] as const;
export const dispatchTypes = ['Technical field operations', 'Smart hands support', 'Onsite infrastructure execution', 'Network troubleshooting', 'Rollout recovery', 'Remediation / revisit', 'POS / store tech', 'Survey / site verification', 'Healthcare / controlled environment', 'SDVOSB support', 'Critical systems support'] as const;
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
