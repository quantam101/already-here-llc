import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Service Business AI Web Agent Playbook',
  description:
    'A practical ebook from Already Here LLC on using AI website agents to capture leads, qualify quote requests, route owner alerts, and reduce missed revenue.',
  alternates: { canonical: 'https://www.alreadyherellc.com/ai-agent-ebook' },
  openGraph: {
    title: 'The Service Business AI Web Agent Playbook | Already Here LLC',
    description:
      'A practical guide for service businesses that need fewer missed leads, cleaner quote intake, and faster owner response.',
    url: 'https://www.alreadyherellc.com/ai-agent-ebook',
    siteName: 'Already Here LLC',
    type: 'article'
  }
};

const chapters = [
  {
    title: 'Chapter 1 — The missed-lead problem',
    body: [
      'Most service businesses do not have a traffic problem first. They have a conversion and response problem. Visitors reach the website, ask vague questions, submit incomplete forms, or leave when they do not get guided quickly.',
      'A missed lead can come from an after-hours inquiry, an incomplete contact form, a slow callback, or a prospect who does not know what information the business needs before quoting.'
    ]
  },
  {
    title: 'Chapter 2 — What an AI Web Agent is',
    body: [
      'An AI Web Agent is a guided intake layer on the website. It asks the qualifying questions a normal contact form skips, captures the buyer problem, and sends the owner a structured lead record.',
      'The first goal is not full automation. The first goal is better capture, cleaner qualification, faster routing, and less revenue leakage.'
    ]
  },
  {
    title: 'Chapter 3 — What the agent should capture',
    body: [
      'A useful lead record should include name, phone, email, service type, city, urgency, budget, problem summary, source page, and the next recommended action.',
      'For dispatch-style businesses, the record can also include site address, equipment notes, photos, access instructions, approval boundaries, and closeout requirements.'
    ]
  },
  {
    title: 'Chapter 4 — Safe automation boundaries',
    body: [
      'The agent should not promise pricing, schedule jobs, dispatch workers, approve work, or take payments unless those rules are explicitly scoped and approved.',
      'The safest first implementation captures and routes. Automation can expand after the business reviews real lead quality and documents clear operating rules.'
    ]
  },
  {
    title: 'Chapter 5 — The return-on-investment test',
    body: [
      'If one closed job is worth more than the setup fee, the AI Web Agent only needs to recover or create one additional quality lead to justify the install.',
      'This is why the offer fits locksmiths, access-control companies, garage door companies, HVAC contractors, plumbers, electricians, appliance repair companies, property managers, MSPs, and local service providers.'
    ]
  },
  {
    title: 'Chapter 6 — Package selection',
    body: [
      'Launch Agent fits a one-location service business that needs fast website lead capture and owner alerts.',
      'Growth Agent fits a company with repeated quote volume, delayed callbacks, stale quotes, or routing by service type, city, urgency, or deal value.',
      'Network Agent fits MSPs, dispatch groups, multi-location operators, technician networks, and white-label reseller partners.'
    ]
  },
  {
    title: 'Chapter 7 — Implementation checklist',
    body: [
      'Before launch, confirm services, service area, lead fields, restricted claims, website platform, alert recipient, package price, monthly management scope, and the approval boundary.',
      'After launch, review the first five leads, improve weak questions, identify bad-fit patterns, tighten the copy, and build reusable vertical templates.'
    ]
  }
] as const;

const checklist = [
  'Define the primary lead type the website should capture.',
  'List the questions an owner needs answered before calling back.',
  'Set the alert destination for owner or dispatcher routing.',
  'Define what the agent must never promise without approval.',
  'Install the website agent or standalone intake page.',
  'Run a controlled test lead and verify owner alert delivery.',
  'Review lead quality weekly and improve the intake questions.'
] as const;

export default function AiAgentEbookPage() {
  return (
    <div className="proof-light bg-white">
      <section className="border-b border-borderBrand bg-white print:border-0">
        <div className="container-shell grid gap-10 py-16 lg:grid-cols-[1fr_0.8fr] lg:py-24">
          <div>
            <span className="eyebrow proof-label">Already Here LLC Ebook</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
              The Service Business AI Web Agent Playbook
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              A practical guide for service businesses that need fewer missed leads, cleaner quote intake, faster owner response, and structured lead records from their website.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row print:hidden">
              <Link href="/ai-agent-demo" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
                Open Live Demo
              </Link>
              <Link href="/ai-agent#pricing" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                View Packages
              </Link>
            </div>
          </div>
          <aside className="card p-8" data-proof-surface>
            <p className="grid-label proof-label">Use as sales content</p>
            <h2 className="mt-4 text-2xl font-semibold text-navy">Send this guide before or after a demo call.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              This ebook explains the business case behind AI lead capture without requiring the prospect to understand AI models, APIs, or software architecture.
            </p>
            <p className="mt-4 break-words rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm font-semibold text-slate-700" data-proof-border>
              https://www.alreadyherellc.com/ai-agent-ebook
            </p>
          </aside>
        </div>
      </section>

      <main className="container-shell py-14 print:py-6">
        <div className="mx-auto max-w-4xl">
          <section className="card p-8 print:border-0 print:shadow-none" data-proof-surface>
            <h2 className="text-2xl font-semibold text-navy">Executive summary</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              A service business website should not act like a passive brochure. It should capture qualified opportunities, ask the basic questions before the owner responds, and route a usable lead record. The AI Web Agent is the intake layer that turns anonymous visitors and weak contact-form submissions into structured follow-up opportunities.
            </p>
          </section>

          <div className="mt-10 space-y-8">
            {chapters.map((chapter) => (
              <section key={chapter.title} className="card p-8 print:border-0 print:shadow-none" data-proof-surface>
                <h2 className="text-2xl font-semibold text-navy">{chapter.title}</h2>
                <div className="mt-4 space-y-4">
                  {chapter.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-slate-600">{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-10 card p-8 print:border-0 print:shadow-none" data-proof-surface>
            <h2 className="text-2xl font-semibold text-navy">Buyer checklist</h2>
            <div className="mt-5 grid gap-3">
              {checklist.map((item) => (
                <div key={item} className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm leading-6 text-slate-700" data-proof-border>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-3xl bg-[#071B34] p-8 text-white print:bg-white print:text-navy">
            <h2 className="text-2xl font-semibold">Next step</h2>
            <p className="mt-4 text-sm leading-7 text-white/80 print:text-slate-700">
              Review the live demo, then choose Launch Agent, Growth Agent, or Network Agent based on lead volume, routing complexity, and follow-up requirements.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row print:hidden">
              <Link href="/ai-agent-demo" className="link-ring inline-flex justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy">
                Open Demo
              </Link>
              <Link href="/ai-agent" className="link-ring inline-flex justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white">
                View Offer
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
