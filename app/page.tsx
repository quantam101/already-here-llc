import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
  description: 'Phoenix-based onsite infrastructure execution and technical field operations partner for MSPs, vendors, commercial sites, retail environments, and critical systems. NIST SP 800-171 aligned. SAM.gov registered.',
  alternates: { canonical: 'https://www.alreadyherellc.com' },
  openGraph: {
    title: 'Already Here LLC | Onsite Infrastructure Execution & Technical Field Operations',
    description: 'Phoenix-based onsite infrastructure execution and technical field operations. NIST SP 800-171 aligned. SAM.gov registered.',
    url: 'https://www.alreadyherellc.com',
    siteName: 'Already Here LLC',
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Phoenix-Based · Operating Since 2013 · SAM.gov Registered</p>
          <h1>Phoenix-Based Onsite IT Field Execution for MSPs, Retail, and Infrastructure Teams</h1>
          <p className="hero-sub">Already Here LLC delivers onsite remediation, smart hands support, network troubleshooting, rollout recovery, and infrastructure execution from Phoenix for Arizona and qualified project sites nationwide. We solve the technical issues remote teams cannot close remotely.</p>
          <div className="btn-group">
            <Link href="/dispatch" className="btn btn-primary">Request Dispatch</Link>
            <Link href="/rfq" className="btn btn-secondary">Request Project Quote</Link>
            <Link href="/capability-statement" className="btn btn-ghost">Capability Statement</Link>
          </div>
          <div className="trust-bar">
            <span>A+ BBB Rating</span>
            <span>Operating Since 2013</span>
            <span>Phoenix-Based</span>
            <span>SAM.gov Registered</span>
            <span>NIST SP 800-171 Aligned</span>
            <span>CMMC Baseline Ready</span>
            <span>Commercially Insured</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Hardened Proof of Execution</h2>
          <p className="section-sub">Documented field activity — not capability claims. Specific outcomes from real engagements, anonymized per client agreements.</p>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-stat">40%</div>
              <div className="kpi-label">Ticket Reduction</div>
              <p className="kpi-detail">Stabilized a chaotic 50-endpoint commercial network within 30 days, reducing weekly support tickets by 40% through structured remediation and documentation.</p>
            </div>
            <div className="kpi-card">
              <div className="kpi-stat">99.2%</div>
              <div className="kpi-label">Inventory Accuracy</div>
              <p className="kpi-detail">RFID infrastructure deployment — 55 readers, 61 data runs, 4 APs, 2 HP Aruba switches. Chandler Fashion Center US0275. Improved from 83% to 99.2%.</p>
            </div>
            <div className="kpi-card">
              <div className="kpi-stat">4 hrs</div>
              <div className="kpi-label">Dispatch to Onsite</div>
              <p className="kpi-detail">Same-day dispatch capability across Phoenix metro for confirmed scopes. Field closeout documentation returned within 2 hours of task completion.</p>
            </div>
            <div className="kpi-card">
              <div className="kpi-stat">0</div>
              <div className="kpi-label">Critical Go-Live Incidents</div>
              <p className="kpi-detail">Zero critical incidents across all multi-site deployments. Pre-flight verification and structured execution prevent surprise failures.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>Technical Field Operations</h2>
          <p className="section-sub">Structured onsite execution for MSPs, vendors, and infrastructure teams that need a reliable field operator on site.</p>
          <div className="services-grid">
            <div className="service-card">
              <h3>Onsite Infrastructure Execution</h3>
              <p>Network, rack, endpoint, AP, low-voltage-adjacent, and site infrastructure tasks executed with clear documentation and photo closeout.</p>
            </div>
            <div className="service-card">
              <h3>Retail and Commercial Technology</h3>
              <p>Field support for POS, payment devices, printers, endpoints, kiosks, store systems, and commercial technology environments.</p>
            </div>
            <div className="service-card">
              <h3>Rollout Recovery and Remediation</h3>
              <p>Revisit work, failed closeout recovery, post-install troubleshooting, and ground-truth verification for remote project teams.</p>
            </div>
            <div className="service-card">
              <h3>Smart Hands and MSP Support</h3>
              <p>Extend field coverage for smart hands, network troubleshooting, site visits, documentation collection, and remediation without local headcount.</p>
            </div>
          </div>
          <div className="section-actions">
            <Link href="/services" className="btn btn-secondary">View All Services</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Physical-to-Digital Infrastructure Execution</h2>
          <p className="section-sub">Already Here LLC is not a remote helpdesk. We are an on-the-ground engineering firm capable of managing a facility from the concrete up to the cloud.</p>
          <div className="services-grid">
            <div className="service-card">
              <h3>Structured Cabling and Validation</h3>
              <ul className="field-list">
                <li>Cat 5e / 6 / 6A installation and certification</li>
                <li>Cable tray, conduit, and pathway work</li>
                <li>Punch-down, termination, and labeling</li>
                <li>TDR / Fluke field testing and closeout reporting</li>
              </ul>
            </div>
            <div className="service-card">
              <h3>Network Closet and IDF Engineering</h3>
              <ul className="field-list">
                <li>Rack installation, cable management, and documentation</li>
                <li>Patch panel organization and labeling</li>
                <li>Switch and UPS placement and grounding verification</li>
                <li>Before and after photography and rack diagram delivery</li>
              </ul>
            </div>
            <div className="service-card">
              <h3>Physical Access and Facility Systems</h3>
              <ul className="field-list">
                <li>Access control hardware installation and commissioning</li>
                <li>Door hardware and credential reader positioning</li>
                <li>Camera and sensor mounting — low-voltage adjacent</li>
                <li>Physical security layer documentation for IT closeout packages</li>
              </ul>
            </div>
            <div className="service-card">
              <h3>Site Survey and Ground-Truth Verification</h3>
              <ul className="field-list">
                <li>Pre-deployment walkthrough and scope validation</li>
                <li>As-built documentation and discrepancy reporting</li>
                <li>Wi-Fi survey and AP placement verification</li>
                <li>Physical layer sign-off before logical configuration</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>Institutional Compliance Alignment</h2>
          <p className="section-sub">Security and management practices mapped to recognized industry standards — relevant for enterprise clients, defense contractors, and municipal buyers.</p>
          <div className="services-grid">
            <div className="service-card">
              <h3>NIST SP 800-171</h3>
              <p>Field operations and documentation practices aligned to NIST SP 800-171 CUI handling requirements — relevant for federal prime and subcontractor dispatch chains.</p>
            </div>
            <div className="service-card">
              <h3>CMMC Level 1 Baseline</h3>
              <p>Operational discipline maps to CMMC Level 1 practices: access control, media protection, and physical protection controls applied to all field engagements.</p>
            </div>
            <div className="service-card">
              <h3>CIS Controls Aligned</h3>
              <p>Network troubleshooting, endpoint work, and infrastructure tasks follow CIS Controls-aligned field procedures for asset inventory and configuration management.</p>
            </div>
            <div classNa
