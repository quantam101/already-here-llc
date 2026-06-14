import type { Metadata } from 'next';
import Link from 'next/link';
import { AiAgentLeadForm } from '@/components/AiAgentLeadForm';
import { alreadyHereLeadCaptureAccount, leadCaptureStatusValues } from '@/lib/lead-capture-accounts';

export const metadata: Metadata = {
  title: 'AI Lead Capture for Service Businesses',
  description:
    'Already Here LLC builds AI Lead Capture systems for service businesses that need missed-call recovery, quote intake, owner alerts, follow-up readiness, and proof tracking.',
  alternates: { canonical: 'https://www.alreadyherellc.com/ai-lead-capture' },
  openGraph: {
    title: 'AI Lead Capture for Service Businesses | Already Here LLC',
    description:
      'Turn missed calls, quote requests, and after-hours inquiries into structured lead records with owner routing and proof tracking.',
    url: 'https://www.alreadyherellc.com/ai-lead-capture',
    siteName: 'Already Here LLC',
    type: 'website'
  }
};

const workflow = [
  { title: 'Capture', body: 'Collect name, phone, email, business, service need, location, urgency, and preferred next step.' },
  { title: 'Qualify', body: 'Ask the required questions before the owner wastes time chasing an incomplete lead.' },
  { title: 'Route', body: 'Send the lead record to the owner, dispatcher, spreadsheet, CRM-ready export, or approval queue.' },
  { title: 'Follow up', body: 'Prepare owner-approved follow-up scripts for missed leads, stale quotes, and after-hours requests.' },
  { title: 'Prove', body: 'Track source, response time, qualification, booking status, revenue generated, and lost reason.' }
] as const;

const targetIndustries = [
  'IT service and MSPs',
  'Low-voltage, cameras, and access control',
  'Junk removal and hauling',
  'HVAC, plumbing, and electrical',
  'Cleaning and organizing',
  'Property management',
  'Mobile repair and field service',
  'Local contractors and service companies'
] as const;

const account = alreadyHereLeadCaptureAccount;

export default function AiLeadCapturePage() {
  return (
    <div className="proof-light bg-white">
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-12 py-16 lg:grid-cols-[1fr_0.9fr] lg:py-24">
          <div>
            <span className="eyebrow proof-label">AI Lead Capture</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl lg:text-6xl">
              Turn missed calls and quote requests into booked-job opportunities.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Already Here LLC builds AI Lead Capture systems for service businesses that need to capture visitor intent,
              qualify requests, route clean lead records, and follow up before opportunities go cold.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#pilot-intake" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
                Start AI Lead Capture Demo
              </a>
              <a href="#proof-account" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                View Internal Proof Account
              </a>
            </div>
          </div>

          <div className="card p-8" data-proof-surface>
            <p className="grid-label proof-label">Internal proof account</p>
            <h2 className="mt-4 text-2xl font-semibold text-navy">{account.accountName}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{account.positioning}</p>
            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm leading-6 text-slate-700" data-proof-border>
                Account status: Active internal proof account
              </div>
              <div className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm leading-6 text-slate-700" data-proof-border>
                Routing: {account.phone} · {account.publicEmail}
              </div>
              <div className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm leading-6 text-slate-700" data-proof-border>
                Sales rule: use the system ourselves first, document proof, then add outside pilot accounts.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24" id="proof-account">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="eyebrow proof-label">Already Here LLC account</span>
            <h2 className="section-title mt-5">This account is the first proof-of-work lane.</h2>
            <p className="section-copy proof-muted">
              The first objective is to capture AI Lead Capture inquiries for Already Here LLC, route them to Stephen,
              track every lead outcome, and use the resulting data to sell with evidence instead of claims.
            </p>
            <p className="mt-6 rounded-3xl border border-borderBrand bg-soft p-5 text-sm leading-7 text-slate-700">
              {account.pricingPosition}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {account.leadCategories.map((category) => (
              <div key={category} className="rounded-3xl border border-borderBrand bg-white p-5 text-sm font-semibold leading-6 text-slate-700" data-proof-border>
                {category}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow proof-label">How it works</span>
          <h2 className="section-title mt-5">Capture, qualify, route, follow up, and prove the outcome.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-5">
            {workflow.map((step) => (
              <article key={step.title} className="card p-6" data-proof-surface>
                <h3 className="text-xl font-semibold text-navy">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="eyebrow proof-label">Target buyers</span>
            <h2 className="section-title mt-5">Start with service businesses where a missed lead has cash value.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {targetIndustries.map((industry) => (
                <div key={industry} className="rounded-2xl border border-borderBrand bg-white px-4 py-4 text-sm font-semibold text-slate-700" data-proof-border>
                  {industry}
                </div>
              ))}
            </div>
          </div>
          <div className="card p-8" data-proof-surface>
            <h3 className="text-2xl font-semibold text-navy">Proof metrics tracked</h3>
            <div className="mt-6 grid gap-3">
              {account.proofMetrics.map((metric) => (
                <div key={metric} className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm leading-6 text-slate-700" data-proof-border>
                  {metric}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white" id="pilot-intake">
        <div className="container-shell py-16 lg:py-24">
          <div className="mb-10 max-w-3xl">
            <span className="eyebrow proof-label">Pilot intake</span>
            <h2 className="section-title mt-5">Request an AI Lead Capture demo or pilot review.</h2>
            <p className="section-copy proof-muted">
              This intake captures the business context, missed-lead problem, routing need, language preference, and demo path.
              It creates an owner-ready record for Already Here LLC review.
            </p>
          </div>
          <AiAgentLeadForm />
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="eyebrow proof-label">Operating rules</span>
            <h2 className="section-title mt-5">Keep automation controlled until the rules are proven.</h2>
            <p className="section-copy proof-muted">
              The system captures and prepares lead records. It does not make uncontrolled promises about price,
              availability, licensing, guarantees, same-day service, or outbound messaging without approved rules.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={account.accountRoutes.fieldDispatchPath} className="link-ring inline-flex justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-700">
                Field Dispatch
              </Link>
              <Link href={account.accountRoutes.projectQuotePath} className="link-ring inline-flex justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-700">
                Project RFQ
              </Link>
            </div>
          </div>
          <div className="card p-6" data-proof-surface>
            <h3 className="text-2xl font-semibold text-navy">Lead statuses</h3>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {leadCaptureStatusValues.map((status) => (
                <div key={status} className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm font-semibold text-slate-700" data-proof-border>
                  {status}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
