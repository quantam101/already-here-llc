import type { Metadata } from 'next';
import Link from 'next/link';
import { AiAgentLeadForm } from '@/components/AiAgentLeadForm';
import { aiAgentIndustries, aiAgentPackages } from '@/lib/ai-agent-products';

export const metadata: Metadata = {
  title: 'AI Website Chatbox and Lead Capture Agent Setup',
  description:
    'Already Here LLC builds AI website chatboxes, lead capture agents, quote intake flows, owner alert systems, and free trial demos for service businesses that need more qualified opportunities.',
  alternates: { canonical: 'https://www.alreadyherellc.com/ai-agent' },
  openGraph: {
    title: 'AI Website Chatbox and Lead Capture Agent Setup | Already Here LLC',
    description:
      'AI website chatbox setup with lead qualification, quote intake, owner alerts, free trial demo intake, and monthly optimization.',
    url: 'https://www.alreadyherellc.com/ai-agent',
    siteName: 'Already Here LLC',
    type: 'website'
  }
};

const outcomes = [
  'Watch the agent capture a lead, ask qualifying questions, and produce a structured lead record.',
  'See how quote intake, urgency, budget, service type, and contact details are collected before the owner responds.',
  'Verify owner alert and lead routing behavior before buying a paid setup.',
  'Use the same core system as a resellable AI agent offer for other local businesses.'
];

const workflow = [
  { title: 'Demo intake', body: 'Collect business type, website, desired agent behavior, trial path, routing needs, and required demo questions.' },
  { title: 'Presentation', body: 'Show how the agent captures visitors, qualifies the request, creates a lead record, and routes the opportunity.' },
  { title: 'Trial review', body: 'Review the lead record, owner alert, buyer experience, and conversion path before committing to paid setup.' },
  { title: 'Launch', body: 'Install the page, widget, or intake route after access, approvals, routing, and monthly management terms are confirmed.' }
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
    answer: 'Start with the free demo, prove lead capture, then sell Launch Agent or Growth Agent with monthly optimization.'
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
              Watch an AI website agent turn visitors into qualified opportunities before buying.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Already Here LLC builds productized AI website agents for service businesses that need better quote intake,
              missed-lead recovery, owner alerts, and monthly conversion improvement without hiring a full-time sales coordinator.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#free-trial" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
                Start Free Trial / Demo
              </a>
              <a href="#pricing" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                View Paid Packages
              </a>
            </div>
          </div>

          <div className="card p-8" data-proof-surface>
            <p className="grid-label proof-label">Revenue mechanism</p>
            <h2 className="mt-4 text-2xl font-semibold text-navy">Free demo first. Setup fee plus monthly management after fit is proven.</h2>
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

      <section id="free-trial" className="container-shell py-16 lg:py-24">
        <div className="mb-10 max-w-3xl">
          <span className="eyebrow proof-label">Free trial / automated presentation</span>
          <h2 className="section-title mt-5">Choose what the AI Web Agent should demonstrate.</h2>
          <p className="section-copy proof-muted">
            This form is separate from Field Dispatch and Project RFQ. It only collects AI Web Agent demo requirements, trial preferences, lead-routing needs, and business context.
          </p>
        </div>
        <AiAgentLeadForm />
      </section>

      <section className="border-y border-borderBrand bg-white" id="pricing">
        <div className="container-shell py-16">
          <span className="eyebrow proof-label">Paid packages</span>
          <h2 className="section-title mt-5">Three offers available after the trial/demo path.</h2>
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
                <a href="#free-trial" className="mt-6 inline-flex justify-center rounded-full bg-action px-5 py-3 text-sm font-semibold text-white">
                  Start with Demo
                </a>
              </article>
            ))}
          </div>
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
        <h2 className="section-title mt-5">Demo, prove, launch, review, repeat.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {workflow.map((step) => (
            <div key={step.title} className="card p-6" data-proof-surface>
              <h3 className="text-xl font-semibold text-navy">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="eyebrow proof-label">Sales rule</span>
            <h2 className="section-title mt-5">Do not sell abstract AI. Demonstrate the working revenue path.</h2>
            <p className="section-copy proof-muted">
              The buyer should be able to watch the agent capture a prospect, ask useful questions, route the lead, and create a usable record.
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
            <h3 className="text-2xl font-semibold text-navy">Buyer proof</h3>
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
