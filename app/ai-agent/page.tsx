import type { Metadata } from 'next';
import Link from 'next/link';
import { aiAgentIndustries, aiAgentPackages } from '@/lib/ai-agent-products';

export const metadata: Metadata = {
  title: 'AI Website Chatbox and Lead Capture Agent Setup',
  description:
    'Already Here LLC builds AI website chatboxes, lead capture agents, quote intake flows, and owner alert systems for service businesses that need more qualified opportunities.',
  alternates: { canonical: 'https://www.alreadyherellc.com/ai-agent' },
  openGraph: {
    title: 'AI Website Chatbox and Lead Capture Agent Setup | Already Here LLC',
    description:
      'Productized AI website chatbox setup with lead qualification, quote intake, owner alerts, and monthly optimization.',
    url: 'https://www.alreadyherellc.com/ai-agent',
    siteName: 'Already Here LLC',
    type: 'website'
  }
};

const outcomes = [
  'Capture leads after hours instead of losing them to voicemail or abandoned forms.',
  'Qualify service type, location, urgency, budget, and contact details before the owner responds.',
  'Route hot opportunities to the right inbox with a lead record attached.',
  'Use the same core system as a resellable AI agent offer for other local businesses.'
];

const workflow = [
  { title: 'Intake', body: 'Collect business type, services, lead routing, offer details, operating area, and required approval rules.' },
  { title: 'Build', body: 'Deploy the chatbox, lead capture flow, scoring logic, receipt confirmation, and owner alert path.' },
  { title: 'Launch', body: 'Install the widget or page route, run smoke tests, and verify the lead record reaches the business owner.' },
  { title: 'Optimize', body: 'Review lead quality, missed opportunities, objections, and conversion leakage each month.' }
];

const faqs = [
  {
    question: 'Is this a generic chatbot?',
    answer: 'No. The first version is a revenue agent focused on lead capture, quote intake, qualification, routing, and follow-up readiness.'
  },
  {
    question: 'Does it send messages without approval?',
    answer: 'No. Operational and outbound actions stay approval-gated unless a client explicitly scopes an approved automation path.'
  },
  {
    question: 'Can this be installed on an existing website?',
    answer: 'Yes. The agent can be installed as a page, widget, or embedded intake path depending on the client site and access level.'
  },
  {
    question: 'What is the fastest path to revenue?',
    answer: 'Start with Launch Agent for one business vertical, prove lead capture, then sell Growth Agent for routing, follow-up, and monthly optimization.'
  }
];

export default function AiAgentPage() {
  return (
    <div className="proof-light bg-white">
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-12 py-16 lg:grid-cols-[1fr_0.9fr] lg:py-24">
          <div>
            <span className="eyebrow proof-label">AI Web Agent Offer</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
              Website chatbox and lead capture agent built to turn visitors into qualified opportunities.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Already Here LLC builds productized AI website agents for service businesses that need better quote intake,
              missed-lead recovery, owner alerts, and monthly conversion improvement without hiring a full-time sales coordinator.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#pricing" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
                View Pricing
              </a>
              <a href="#request" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                Request Proposal
              </a>
            </div>
          </div>

          <div className="card p-8" data-proof-surface>
            <p className="grid-label proof-label">Revenue mechanism</p>
            <h2 className="mt-4 text-2xl font-semibold text-navy">Setup fee plus monthly management.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              The sellable system is not the chat window. The sellable system is the intake, qualification, routing,
              recordkeeping, follow-up readiness, and monthly improvement loop.
            </p>
            <div className="mt-6 grid gap-3">
              {outcomes.map((outcome) => (
                <div key={outcome} className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm leading-6 text-slate-700" data-proof-border>
                  {outcome}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16" id="pricing">
        <span className="eyebrow proof-label">Packages</span>
        <h2 className="section-title mt-5">Three offers that can be sold immediately.</h2>
        <p className="section-copy proof-muted">
          Pricing is designed to sit below enterprise support platforms while still producing meaningful setup and recurring revenue.
        </p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {aiAgentPackages.map((item) => (
            <article key={item.id} className="card flex flex-col p-6" data-proof-surface>
              <p className="grid-label proof-label">{item.name}</p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <h3 className="text-3xl font-semibold text-navy">{item.setup}</h3>
                <p className="pb-1 text-sm font-semibold text-slate-600">{item.monthly}</p>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.bestFor}</p>
              <p className="mt-3 text-sm font-semibold text-navy">{item.delivery}</p>
              <ul className="mt-5 flex-1 space-y-3">
                {item.includes.map((feature) => (
                  <li key={feature} className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm leading-6 text-slate-700" data-proof-border>
                    {feature}
                  </li>
                ))}
              </ul>
              <a href="#request" className="mt-6 inline-flex justify-center rounded-full bg-action px-5 py-3 text-sm font-semibold text-white">
                Request {item.name}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell py-16">
          <span className="eyebrow proof-label">Target buyers</span>
          <h2 className="section-title mt-5">Start with businesses where missed leads have direct cash value.</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {aiAgentIndustries.map((industry) => (
              <div key={industry} className="rounded-2xl border border-borderBrand bg-white px-4 py-4 text-sm font-semibold text-slate-700" data-proof-border>
                {industry}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-16">
        <span className="eyebrow proof-label">Build cycle</span>
        <h2 className="section-title mt-5">Create, setup, market, sell, review, repeat.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {workflow.map((step) => (
            <div key={step.title} className="card p-6" data-proof-surface>
              <h3 className="text-xl font-semibold text-navy">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="request" className="border-y border-borderBrand bg-white">
        <div className="container-shell grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="eyebrow proof-label">Request proposal</span>
            <h2 className="section-title mt-5">Use the AI Web Agent button in the lower-right corner to submit the first lead.</h2>
            <p className="section-copy proof-muted">
              The widget on this site is the working product demo. It qualifies the buyer, scores the opportunity, sends the lead record,
              and returns a lead ID when delivery is configured.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/rfq" className="link-ring inline-flex justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-700">
                Project RFQ
              </Link>
              <Link href="/dispatch" className="link-ring inline-flex justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-700">
                Field Dispatch
              </Link>
            </div>
          </div>
          <div className="card p-6" data-proof-surface>
            <h3 className="text-2xl font-semibold text-navy">Sales rule</h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Do not sell abstract AI. Sell fewer missed calls, faster quote response, cleaner lead routing, and a visible owner alert every time a prospect asks for service.
            </p>
            <div className="mt-6 grid gap-3">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-borderBrand bg-white p-4" data-proof-border>
                  <h4 className="text-sm font-semibold text-navy">{faq.question}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
