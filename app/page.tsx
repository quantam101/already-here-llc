import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
  description:
    'Phoenix-based onsite infrastructure execution and technical field operations partner for MSPs, vendors, commercial sites, retail environments, and critical systems. NIST SP 800-171 aligned. SAM.gov registered. Project coverage available nationwide.',
  alternates: {
    canonical: 'https://www.alreadyherellc.com',
  },
  openGraph: {
    title: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
    description:
      'Phoenix-based onsite infrastructure execution and technical field operations. NIST SP 800-171 aligned. SAM.gov registered.',
    url: 'https://www.alreadyherellc.com',
    siteName: 'Already Here LLC',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
    description:
      'Phoenix-based onsite infrastructure execution and technical field operations. NIST SP 800-171 aligned. SAM.gov registered.',
  },
}

const proofMetrics = [
  {
    stat: '40%',
    label: 'Ticket Reduction',
    detail:
      'Stabilized a chaotic 50-endpoint commercial network within 30 days, reducing weekly support tickets by 40% through structured remediation and full documentation.',
  },
  {
    stat: '99.2%',
    label: 'Inventory Accuracy',
    detail:
      'RFID infrastructure deployment — 55 readers, 61 data runs, 4 APs, 2 HP Aruba switches. Chandler Fashion Center US0275. Inventory accuracy improved from 83% to 99.2%.',
  },
  {
    stat: '< 4 hrs',
    label: 'Dispatch to Onsite',
    detail:
      'Same-day dispatch capability across Phoenix metro for confirmed scopes. Field closeout documentation returned within 2 hours of task completion.',
  },
  {
    stat: '0',
    label: 'Critical Go-Live Incidents',
    detail:
      'Zero critical incidents across all multi-site deployments. Pre-flight verification, structured execution, and immediate escalation protocols prevent surprise failures.',
  },
]

const complianceFrameworks = [
  {
    name: 'NIST SP 800-171',
    detail:
      'Field operations and documentation practices aligned to NIST SP 800-171 CUI handling requirements — relevant for federal prime and subcontractor dispatch chains.',
  },
  {
    name: 'CMMC Level 1 Baseline',
    detail:
      'Operational discipline maps to CMMC Level 1 practices: access control, media protection, and physical protection controls applied to all field engagements.',
  },
  {
    name: 'CIS Controls Aligned',
    detail:
      'Network troubleshooting, endpoint work, and infrastructure tasks follow CIS Controls-aligned field procedures for asset inventory and configuration management.',
  },
  {
    name: 'SAM.gov Active',
    detail:
      'Active federal registration. UEI available for qualified procurement buyers. NAICS: 541512, 541519, 561499, 238210. ADVOSB certification in pursuit.',
  },
]

const physicalLayer = [
  {
    title: 'Structured Cabling & Validation',
    items: [
      'Cat 5e / 6 / 6A installation and certification',
      'Cable tray, conduit, and pathway work',
      'Punch-down, termination, and labeling',
      'TDR / Fluke field testing and closeout reporting',
    ],
  },
  {
    title: 'Network Closet & IDF Engineering',
    items: [
      'Rack installation, cable management, and documentation',
      'Patch panel organization and labeling',
      'Switch and UPS placement and grounding verification',
      'Before / after photography and rack diagram delivery',
    ],
  },
  {
    title: 'Physical Access & Facility Systems',
    items: [
      'Access control hardware installation and commissioning',
      'Door hardware and credential reader positioning',
      'Camera and sensor mounting — low-voltage adjacent',
      'Physical security layer documentation for IT closeout packages',
    ],
  },
  {
    title: 'Site Survey & Ground-Truth Verification',
    items: [
      'Pre-deployment walkthrough and scope validation',
      'As-built documentation and discrepancy reporting',
      'Wi-Fi survey and AP placement verification',
      'Physical layer sign-off before logical configuration',
    ],
  },
]

const caseStudies = [
  {
    tag: 'POS / Retail',
    title: 'National QSR Chain',
    body: 'POS hardware installation across 4 locations, Mesa AZ metro. NCR Voyix-issued scope. Confirmed closeout with photo documentation delivered same day.',
  },
  {
    tag: 'Infrastructure',
    title: 'Enterprise Infrastructure Vendor',
    body: 'HPE Alletra MP deployment — Chandler, AZ data center. Rack, cable, and verification. Multi-day engagement with structured closeout.',
  },
  {
    tag: 'Rollout / RFID',
    title: 'National Retail Brand',
    body: 'RFID reader survey — 55 readers, 4 APs, 61 data runs, HP Aruba switches. Chandler Fashion Center US0275. Inventory accuracy improved from 83% to 99.2%.',
  },
  {
    tag: 'Healthcare',
    title: 'Medical Device OEM',
    body: 'GE Healthcare Giraffe / MIC NICU equipment calibration across multiple healthcare sites, Western US. Access-sensitive, documentation-required environments.',
  },
  {
    tag: 'Smart Hands',
    title: 'National MSP',
    body: 'GoDaddy Phoenix campus block storage installs — multi-site smart-hands coordination with structured closeout per ticket.',
  },
  {
    tag: 'Network Recovery',
    title: 'Commercial Property Operator',
    body: '50-endpoint network stabilization. Chaotic baseline remediated within 30 days. Weekly ticket volume reduced 40% through structured remediation and documentation.',
  },
]

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Phoenix-Based · Operating Since 2013 · SAM.gov Registered</p>
          <h1>
            Phoenix-Based Onsite IT Field Execution for MSPs, Retail, and Infrastructure Teams
          </h1>
          <p className="hero-sub">
            Already Here LLC delivers onsite remediation, smart hands support, network
            troubleshooting, rollout recovery, and infrastructure execution from Phoenix for
            Arizona and qualified project sites nationwide. We solve the technical issues remote
            teams cannot close remotely — from the concrete up to the cloud.
          </p>
          <div className="btn-group">
            <Link href="/dispatch" className="btn btn-primary">Request Dispatch</Link>
            <Link href="/rfq" className="btn btn-secondary">Request Project Quote</Link>
            <Link href="/capability-statement" className="btn btn-ghost">Capability Statement</Link>
          </div>
          <div className="trust-bar">
            {[
              'A+ BBB Rating',
              'Operating Since 2013',
              'Phoenix-Based',
              'SAM.gov Registered',
              'NIST SP 800-171 Aligned',
              'CMMC Baseline Ready',
              'Commercially Insured',
            ].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-alt">
        <div className="container">
          <h2>Hardened Proof of Execution</h2>
          <p className="section-sub">
            Documented field activity — not capability claims. Specific outcomes from real
            engagements, anonymized per client agreements.
          </p>
          <div className="grid-4">
            {proofMetrics.map((m) => (
              <div key={m.stat} className="card card-metric">
                <div className="metric-stat">{m.stat}</div>
                <div className="metric-label">{m.label}</div>
                <p className="metric-detail">{m.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Technical Field Operations</h2>
          <p className="section-sub">
            Structured onsite execution for MSPs, vendors, and infrastructure teams that need a
            reliable field operator on site — from physical layer to endpoint.
          </p>
          <div className="grid-4">
            {[
              {
                title: 'Onsite Infrastructure Execution',
                body: 'Network, rack, endpoint, AP, low-voltage-adjacent, and site infrastructure tasks executed with clear documentation and photo closeout.',
              },
              {
                title: 'Retail & Commercial Technology',
                body: 'Field support for POS, payment devices, printers, endpoints, kiosks, store systems, and commercial technology environments.',
              },
              {
                title: 'Rollout Recovery & Remediation',
                body: 'Revisit work, failed closeout recovery, post-install troubleshooting, and ground-truth verification for remote project teams.',
              },
              {
                title: 'Smart Hands & MSP Support',
                body: 'Extend field coverage for smart hands, network troubleshooting, site visits, documentation collection, and remediation without local headcount.',
              },
            ].map((s) => (
              <div key={s.title} className="card">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
          <div className="section-cta">
            <Link href="/services" className="btn btn-secondary">View All Services</Link>
          </div>
        </div>
      </section>

      <section className="section bg-alt">
        <div className="container">
          <h2>Physical-to-Digital Infrastructure Execution</h2>
          <p className="section-
