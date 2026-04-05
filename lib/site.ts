export const siteConfig = {
  name: 'Already Here LLC',
  shortName: 'Already Here',
  description:
    'Phoenix-based field execution partner for vendors, MSPs, and multi-site operators needing onsite support, recurring visits, rollouts, remediation, store technology, networking, AV/media, surveys, and infrastructure-related field work across Arizona project markets.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://alreadyherellc.com',
  phoneHref: 'tel:+16020000000',
  phoneDisplay: 'Dispatch number available on request',
  email: 'dispatch@alreadyherellc.com',
  city: 'Phoenix, Arizona'
};

export const serviceGroups = [
  {
    title: 'Dispatch and recurring field support',
    description:
      'Single-site dispatches, recurring visits, post-install follow-through, and remediation work that needs clear onsite ownership and clean closeout.',
    items: ['Break/fix dispatches', 'Recurring site visits', 'Post-modernization support', 'Revisit and remediation work']
  },
  {
    title: 'Store technology and endpoint work',
    description:
      'Field execution for payment devices, POS-related hardware, thin clients, workstations, printers, and other store technology tasks.',
    items: ['POS / payment device swaps', 'Thin-client and endpoint refresh work', 'Printer replacement and configuration', 'Windows device support']
  },
  {
    title: 'Network and infrastructure field activity',
    description:
      'Onsite support for managed routers, Cradlepoint installs, AP replacement revisits, low-voltage testing, rack/stack tasks, and related infrastructure work.',
    items: ['Managed router installs', 'Cradlepoint and SD-WAN-related work', 'Wi-Fi and AP troubleshooting', 'Rack / stack / iDRAC support']
  },
  {
    title: 'Surveys, AV, and site verification',
    description:
      'Operational site assessments, DMB and field surveys, AV/media troubleshooting, TV signal restoration, and site verification for larger project teams.',
    items: ['Site surveys', 'DMB / documentation surveys', 'AV / media troubleshooting', 'Site verification and closeout photos']
  }
] as const;

export const buyerReasons = [
  'Phoenix-based field execution with broader Arizona project support based on scope, scheduling, and travel requirements.',
  'Structured closeout documentation so dispatch teams can close the ticket with usable notes, photos, and field details.',
  'Commercially insured and positioned for vendor, MSP, and multi-site operator workflows.',
  'Range across retail, restaurant, hospitality, healthcare, enterprise, AV/media, and infrastructure-related environments.'
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
  'Automated locker system installs'
] as const;

export const environments = [
  'Retail',
  'QSR / restaurant',
  'Hospitality',
  'Healthcare',
  'Enterprise / office',
  'AV / media environments',
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
  'Springerville'
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
      'Support regional rollouts, revisits, site verification, hardware swaps, and documentation-heavy field activity across Arizona project markets.'
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
  'Infrastructure-related onsite work'
] as const;
