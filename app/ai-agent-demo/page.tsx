import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Live AI Web Agent Demo',
  description:
    'See how the Already Here AI Web Agent captures website leads, qualifies quote requests, scores urgency, and routes structured owner alerts for service businesses.',
  alternates: { canonical: 'https://www.alreadyherellc.com/ai-agent-demo' },
  openGraph: {
    title: 'Live AI Web Agent Demo | Already Here LLC',
    description:
      'A prospect-facing demo of AI website lead capture, qualification, owner alerting, and structured lead records.',
    url: 'https://www.alreadyherellc.com/ai-agent-demo',
    siteName: 'Already Here LLC',
    type: 'website'
  }
};

const demoSteps = [
  {
    title: 'Open the agent',
    body: 'Use the AI Web Agent button in the lower-right corner. The demo is the same capture flow used for real proposal requests.'
  },
  {
    title: 'Answer the intake questions',
    body: 'The agent collects contact information, business type, urgency, budget, current lead problem, and what the buyer wants captured or routed.'
  },
  {
    title: 'Lead is scored and routed',
    body: 'The system validates the request, grades the opportunity, creates a lead ID, and routes a structured owner alert with a JSON lead record.'
  },
  {
    title: 'Owner follows up faster',
    body: 'The business receives a cleaner lead than a generic contact form and can respond with the right next action.'
  }
] as const;

const sampleRows = [
  ['Lead ID', 'AIA-20260609Z-DEMO1234'],
  ['Grade / score', 'A / 88'],
  ['Next action', 'Call within 15 minutes and offer Growth Agent.'],
  ['Business type', 'Garage door repair company'],
  ['Urgency', 'This week'],
  ['Budget', '$2,500 - $5,000'],
  ['Current lead problem', 'After-hours quote requests are missed or answered late.'],
  ['Captured goal', 'Qualify service type, city, urgency, phone, email, and route hot jobs to the owner.']
] as const;

const useCases = [
  'Locksmith and access-control lead capture',
  'Garage door emergency quote intake',
  'HVAC, plumbing, and electrical service inquiries',
  'Property manager maintenance intake',
  'MSP and IT service request qualification',
  'White-label AI intake for agencies or MSPs'
] as const;

const resourceLinks = [
  { href: '/ai-agent-ebook', label: 'Read Ebook', body: 'Buyer guide explaining why service businesses lose website leads and how the agent fixes the intake gap.' },
  { href: '/ai-agent-resources', label: 'Open Resources', body: 'Sales content hub with target verticals, prospect links, and call talking points.' },
  { href: '/blog/ai-website-agent-missed-leads-service-businesses', label: 'Read Blog', body: 'Blog post explaining the missed-lead problem and how AI website intake improves owner response.' }
] as const;

export default function AiAgentDemoPage() {
  return (
    <div className="proof-light bg-white">
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-12 py-16 lg:grid-cols-[1fr_0.85fr] lg:py-24">
          <div>
            <span className="eyebrow proof-label">Live client demo</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
              See how an AI website agent captures and routes service leads.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              This page shows the exact Already Here LLC AI Web Agent offer prospects can review before buying. The agent captures lead details, qualifies urgency, scores the opportunity, and routes a structured owner alert instead of relying on a weak contact form.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#try" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
                Try the Demo
              </a>
              <Link href="/ai-agent" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                View Packages
              </Link>
            </div>
          </div>

          <div className="card p-8" data-proof-surface>
            <p className="grid-label proof-label">Send prospects here</p>
            <h2 className="mt-4 text-2xl font-semibold text-navy">Demo link</h2>
            <p className="mt-4 break-words rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm font-semibold text-slate-700" data-proof-border>
              https://www.alreadyherellc.com/ai-agent-demo
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Use this link in outreach, calls, proposals, and follow-ups when a buyer asks what the AI Web Agent looks like in practice.
            </p>
          </div>
        </div>
      </section>

      <section id="try" className="container-shell py-16">
        <span className="eyebrow proof-label">How to test it</span>
        <h2 className="section-title mt-5">The working demo is in the lower-right corner.</h2>
        <p className="section-copy proof-muted">
          The button labeled AI Web Agent opens the real intake flow. A full submission creates an actual Already Here LLC proposal request, so prospects should use real contact information only when they want follow-up.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {demoSteps.map((step) => (
            <article key={step.title} className="card p-6" data-proof-surface>
              <h3 className="text-xl font-semibold text-navy">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell grid gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <span className="eyebrow proof-label">Example output</span>
            <h2 className="section-title mt-5">What the owner receives after a lead is captured.</h2>
            <p className="section-copy proof-muted">
              The value is not the chat window. The value is the structured record: urgency, budget, problem, buyer details, lead score, and the next recommended action.
            </p>
          </div>
          <div className="card overflow-hidden" data-proof-surface>
            <div className="border-b border-borderBrand bg-[#071B34] px-6 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Sample owner alert</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">New AI Web Agent Lead</h3>
            </div>
            <div className="divide-y divide-borderBrand">
              {sampleRows.map(([label, value]) => (
                <div key={label} className="grid gap-2 px-6 py-4 sm:grid-cols-[0.36fr_0.64fr]">
                  <p className="text-sm font-semibold text-navy">{label}</p>
                  <p className="text-sm leading-6 text-slate-600">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16">
        <span className="eyebrow proof-label">Best-fit examples</span>
        <h2 className="section-title mt-5">Where this demo applies immediately.</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <div key={useCase} className="rounded-2xl border border-borderBrand bg-white px-4 py-4 text-sm font-semibold text-slate-700" data-proof-border>
              {useCase}
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell py-16">
          <span className="eyebrow proof-label">Supporting content</span>
          <h2 className="section-title mt-5">Use the demo with the ebook, blog, and resources hub.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {resourceLinks.map((resource) => (
              <article key={resource.href} className="card flex flex-col p-6" data-proof-surface>
                <p className="flex-1 text-sm leading-7 text-slate-600">{resource.body}</p>
                <Link href={resource.href} className="mt-5 inline-flex justify-center rounded-full border border-borderBrand px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                  {resource.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-borderBrand bg-white">
        <div className="container-shell grid gap-8 py-16 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="eyebrow proof-label">Close path</span>
            <h2 className="section-title mt-5">Use the demo, then quote the package.</h2>
            <p className="section-copy proof-muted">
              After the buyer understands the flow, move to the package page and recommend Launch Agent for a single website, Growth Agent for routing and follow-up, or Network Agent for multi-location and dispatch-style workflows.
            </p>
          </div>
          <Link href="/ai-agent#pricing" className="link-ring inline-flex justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white">
            View AI Agent Pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
