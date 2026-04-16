export const siteConfig = {
  name: "Already Here LLC",
  shortName: "Already Here",
  description:
    "Phoenix-based field execution partner for vendors, MSPs, remote support teams, healthcare operators, and multi-site rollout teams needing onsite smart hands, laptop and endpoint work, server and data-center activity, drive swaps, port changes, surveys, remediation, and clean closeout across Arizona project markets.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.alreadyherellc.com",
  phoneHref: "tel:+16020000000",
  phoneDisplay: "Dispatch number available on request",
  email: "dispatch@alreadyherellc.com",
  city: "Phoenix, Arizona"
};

export const serviceGroups = [
  {
    title: 'Remote support team assist and onsite execution',
    description:
      'Work with remote support teams on bridge calls, laptop and endpoint troubleshooting, step-by-step field execution, and clean onsite follow-through when the remote team needs reliable hands on site.',
    items: [
      'Remote team coordination',
      'Laptop and endpoint triage',
      'Bridge-call execution',
      'Hands-on onsite follow-through'
    ]
  },
  {
    title: 'Smart hands, servers, and data-center field work',
    description:
      'Eyes-and-hands onsite support for racks, servers, storage, drive swaps, port changes, re-cabling, and physically present data-center or MDF / IDF work that remote teams cannot complete alone.',
    items: [
      'Smart hands / eyes-on-hands',
      'Server and storage checks',
      'Drive swaps',
      'Port changes and patching'
    ]
  },
  {
    title: 'Store technology, branch systems, and field remediation',
    description:
      'Field execution for payment devices, POS-related hardware, thin clients, printers, workstations, branch devices, and follow-up remediation when rollout or break-fix work needs onsite completion.',
    items: [
      'POS / payment device swaps',
      'Thin-client and workstation work',
      'Printer replacement and configuration',
      'Remediation and revisit activity'
    ]
  },
  {
    title: 'Healthcare, biomed, and regulated-site support',
    description:
      'Current field experience includes healthcare and biomed-related environments where device handling, access constraints, and documentation discipline matter.',
    items: [
      'Biomed-adjacent field support',
      'Healthcare environment execution',
      'Documentation-aware closeout',
      'Structured onsite communication'
    ]
  },
  {
    title: 'New technology builds, rollouts, and upgrades',
    description:
      'Support for new technology deployment, staged rollout work, upgrade programs, and scoped field execution tied to modernization or expansion projects.',
    items: [
      'Rollout / install support',
      'Technology build activity',
      'Upgrade programs',
      'RFID / modernization support'
    ]
  }
] as const;

export const buyerReasons = [
  'Phoenix-based field execution with broader Arizona project support based on scope, scheduling, and travel requirements.',
  'Structured closeout documentation so dispatch teams can close the ticket with usable notes, photos, and field details.',
  'Commercially insured and positioned for vendor, MSP, remote support, healthcare, and multi-site operator workflows.',
  'Current or recent field experience includes GE HealthCare, McKesson, HPE, Starbucks, and current H&M RFID upgrade work.'
] as const;

export const documentedWorkTypes = [
  'Remote support team coordination',
  'Laptop triage and onsite assist',
  'Smart hands support',
  'Server checks and basic field service',
  'HDD / SSD replacement',
  'Drive swaps',
  'Port changes and patching',
  'Rack / stack / iDRAC work',
  'POS installs and upgrades',
  'Payment device replacement',
  'Thin-client replacement',
  'Desktop / laptop refresh work',
  'LAN migration support',
  'Healthcare-related field assignments',
  'Biomed-adjacent support activity',
  'Store modernization troubleshooting',
  'RFID rollout and upgrade support',
  'DMB / site surveys',
  'Starlink surveys and installs',
  'Digital kitchen conversion work',
  'Cisco SD-WAN decommissioning activity',
  'Cradlepoint installs',
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
  'Healthcare',
  'Biomed-adjacent environments',
  'Enterprise / office',
  'Data center / MDF / IDF',
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
      'Use Already Here LLC when the scope, parts, and dispatch logic are already defined and the missing piece is dependable onsite execution and clean follow-through.'
  },
  {
    title: 'MSPs and remote support teams',
    description:
      'Extend coverage for laptop work, hands-on troubleshooting, bridge-call execution, smart hands tasks, server checks, port changes, documentation collection, and follow-up remediation.'
  },
  {
    title: 'Healthcare, biomed, and regulated-site teams',
    description:
      'Support healthcare and biomed-adjacent field activity where access constraints, device handling, communication, and closeout discipline matter.'
  },
  {
    title: 'Multi-site rollout and modernization teams',
    description:
      'Support regional builds, revisits, RFID upgrades, hardware swaps, site verification, and documentation-heavy field activity across Arizona project markets.'
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
  'Remote support team assist / laptop work',
  'Smart hands / eyes-on-hands onsite',
  'Server / data center / storage work',
  'Drive swap / hardware replacement',
  'Network / port / rack changes',
  'Biomed / healthcare device support',
  'Rollout / install / upgrade support',
  'RFID / modernization / new technology build',
  'Survey / site verification'
] as const;
