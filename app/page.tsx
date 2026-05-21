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
            <div className="service-card">
              <h3>SAM.gov Active</h3>
              <p>Active federal registration. UEI available for qualified procurement buyers. NAICS: 541512, 541519, 561499, 238210. ADVOSB certification in pursuit.</p>
            </div>
          </div>
          <p className="compliance-note"><strong>For procurement teams:</strong> Compliance alignment documentation, SAM.gov registration, insurance certificates, and NAICS listings available upon request. <Link href="/rfq">Begin qualification</Link></p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Field Execution Across Environments That Matter</h2>
          <p className="section-sub">Clients include national retail technology vendors, enterprise infrastructure teams, healthcare-adjacent operators, and MSPs across the Phoenix metro and Western US.</p>
          <div className="work-grid">
            <div className="work-card">
              <div className="work-tag">POS / Retail</div>
              <h3>National QSR Chain</h3>
              <p>POS hardware installation across 4 locations, Mesa AZ metro. NCR Voyix-issued scope. Confirmed closeout with photo documentation delivered same day.</p>
            </div>
            <div className="work-card">
              <div className="work-tag">Infrastructure</div>
              <h3>Enterprise Infrastructure Vendor</h3>
              <p>HPE Alletra MP deployment — Chandler, AZ data center. Rack, cable, and verification. Multi-day engagement with structured closeout.</p>
            </div>
            <div className="work-card">
              <div className="work-tag">Rollout / RFID</div>
              <h3>National Retail Brand</h3>
              <p>RFID reader survey — 55 readers, 4 APs, 61 data runs, HP Aruba switches. Chandler Fashion Center US0275. Inventory accuracy improved from 83% to 99.2%.</p>
            </div>
            <div className="work-card">
              <div className="work-tag">Healthcare</div>
              <h3>Medical Device OEM</h3>
              <p>GE Healthcare Giraffe / MIC NICU equipment calibration across multiple healthcare sites, Western US. Access-sensitive, documentation-required environments.</p>
            </div>
            <div className="work-card">
              <div className="work-tag">Smart Hands</div>
              <h3>National MSP</h3>
              <p>GoDaddy Phoenix campus block storage installs — multi-site smart-hands coordination with structured closeout per ticket.</p>
            </div>
            <div className="work-card">
              <div className="work-tag">Network Recovery</div>
              <h3>Commercial Property Operator</h3>
              <p>50-endpoint network stabilization. Weekly ticket volume reduced 40% through structured remediation and documentation within 30 days.</p>
            </div>
          </div>
          <div className="section-actions">
            <Link href="/project-gallery" className="btn btn-secondary">View Project Gallery</Link>
          </div>
        </div>
      </section>

      <section className="section section-cta">
        <div className="container">
          <h2>Need Onsite Infrastructure Execution for a Project Site?</h2>
          <p>Send the scope, target city, schedule window, and any files that matter. Already Here LLC will assess coverage fit and execute the site work cleanly when the dispatch is confirmed.</p>
          <p className="cta-badges">SAM.gov Registered &middot; Commercially Insured &middot; NIST SP 800-171 Aligned &middot; CMMC Baseline Ready &middot; ADVOSB Pursuit</p>
          <div className="btn-group">
            <Link href="/rfq" className="btn btn-primary">Request Project Quote</Link>
            <Link href="/dispatch" className="btn btn-secondary">Request Dispatch</Link>
            <a href="tel:+16028822920" className="btn btn-ghost">(602) 882-2920</a>
          </div>
        </div>
      </section>
    </>
  )
}
