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
          <p className="hero-sub">Already Here LLC delivers onsite remediation, smart hands support, network troubleshooting, rollout recovery, and infrastructure execution from Phoenix for Arizona and qualified project sites nationwide. We solve the technical issues remote teams cannot close remotely — from the concrete up to the cloud.</p>
          <div className="btn-group">
            <Link href="/dispatch" className="btn btn-primary">Request Dispatch</Link>
            <Link href="/rfq" className="btn btn-secondary">Request Project Quote</Link>
            <Link href="/capability-statement" className="btn btn-ghost">Capability Statement</Link>
          </div>
          <div className="trust-bar">
            {['A+ BBB Rating','Operating Since 2013','Phoenix-Based','SAM.gov Registered','NIST SP 800-171 Aligned','CMMC Baseline Ready','Commercially Insured'].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Hardened Proof of Execution</h2>
          <p className="section-sub">Documented field activity — not capability claims. Specific outcomes from real engagements, anonymized per client agreements.</p>
          <div className="kpi-grid">
            {[
              { stat: '40%', label: 'Ticket Reduction', detail: 'Stabilized a chaotic 50-endpoint commercial network within 30 days, reducing weekly support tickets by 40% through structured remediation and full documentation.' },
              { stat: '99.2%', label: 'Inventory Accuracy', detail: 'RFID infrastructure deployment — 55 readers, 61 data runs, 4 APs, 2 HP Aruba switches. Chandler Fashion Center US0275. Inventory accuracy improved from 83% to 99.2%.' },
              { stat: '< 4 hrs', label: 'Dispatch to Onsite', detail: 'Same-day dispatch capability across Phoenix metro for confirmed scopes. Field closeout documentation returned within 2 hours of task completion.' },
              { stat: '0', label: 'Critical Go-Live Incidents', detail: 'Zero critical incidents across all multi-site deployments. Pre-flight verification, structured execution, and immediate escalation protocols prevent surprise failures.' },
            ].map((m) => (
              <div key={m.st
