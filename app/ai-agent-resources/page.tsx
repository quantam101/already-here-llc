import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Web Agent Sales Resources',
  description:
    'Demo links, buyer talk tracks, and prospect content for the Already Here LLC AI Web Agent offer.',
  alternates: { canonical: 'https://www.alreadyherellc.com/ai-agent-resources' },
  openGraph: {
    title: 'AI Web Agent Sales Resources | Already Here LLC',
    description: 'Prospect-facing content for AI website lead capture, quote intake, and owner alert routing.',
    url: 'https://www.alreadyherellc.com/ai-agent-resources',
    siteName: 'Already Here LLC',
    type: 'website'
  }
};

const prospectLinks = [
  {
    title: 'Live demo',
    href: '/ai-agent-demo',
    body: 'Send this first when a prospect asks what the AI Web Agent looks like in practice.'
  },
  {
    title: 'Ebook',
    href: '/ai-agent-ebook',
    body: 'Use this guide before or after a call to explain the business case for AI lead capture.'
  },
  {
    title: 'Packages',
    href: '/ai-agent#pricing',
    body: 'Use this page when the buyer is ready to compare Launch, Growth, and Network Agent options.'
  },
  {
    title: 'Implementation checklist',
    href: '/blog/ai-lead-capture-implementation-checklist',
    body: 'Use this blog post to explain the practical launch process and safe operating boundaries.'
  }
] as const;

const verticalAngles = [
  ['Locksmiths and access control', 'Emergency urgency, high missed-call value, and strong fit for service-type and location qualification.'],
  ['Garage door companies', 'Repair and replacement inquiries often need fast callback and basic issue qualification.'],
  ['HVAC, plumbing, and electrical', 'High-value service requests justify better quote intake and owner alerts.'],
  ['Property managers', 'Maintenance requests need structured intake, urgency, property details, and vendor routing.'],
  ['MSPs and IT providers', 'Strong fit for white-label lead intake, support inquiry capture, and dispatch-style request records.'],
  ['Clinics and wellness offices', 'Appointment inquiries and pre-screening questions can be captured before staff follow-up.']
] as const;

const talkTracks = [
  'This is not a generic chatbot. It is a quote-intake and lead-routing system.',
  'The goal is fewer missed leads, faster owner response, and cleaner information before the callback.',
  'The first version captures and routes leads. It does not promise pricing, scheduling, or dispatch without approved rules.',
  'If one closed customer is worth more than the setup fee, one recovered lead can justify the install.'
] as const;

export default function AiAgentResourcesPage() {
  return (
    <div className="proof-light bg-white">
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow proof-label">Sales enablement</span>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
            AI Web Agent resources for demos, follow-up, and sales conversations.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Use this page as the content hub for the Already Here LLC AI Web Agent offer. It connects the live demo, ebook, pricing, implementation checklist, vertical angles, and call language.
          </p>
        </div>
      </section>

      <section className="container-shell py-16">
        <span className="eyebrow proof-label">Prospect links</span>
        <h2 className="section-title mt-5">Send these links based on buyer stage.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {prospectLinks.map((link) => (
            <article key={link.href} className="card flex flex-col p-6" data-proof-surface>
              <h3 className="text-xl font-semibold text-navy">{link.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{link.body}</p>
              <Link href={link.href} className="mt-5 inline-flex justify-center rounded-full bg-action px-5 py-3 text-sm font-semibold text-white">
                Open
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell py-16">
          <span className="eyebrow proof-label">Target verticals</span>
          <h2 className="section-title mt-5">Prioritize businesses where one lead has real cash value.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {verticalAngles.map(([title, body]) => (
              <article key={title} className="card p-6" data-proof-surface>
                <h3 className="text-xl font-semibold text-navy">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-16">
        <span className="eyebrow proof-label">Talk track</span>
        <h2 className="section-title mt-5">Use these points on calls.</h2>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {talkTracks.map((track) => (
            <div key={track} className="rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm leading-6 text-slate-700" data-proof-border>
              {track}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-borderBrand bg-white">
        <div className="container-shell grid gap-8 py-16 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="eyebrow proof-label">Revenue action</span>
            <h2 className="section-title mt-5">Send the demo, then move to pricing.</h2>
            <p className="section-copy proof-muted">
              The fastest sales path is demo link, website review, package recommendation, scope approval, install, test, and monthly optimization.
            </p>
          </div>
          <Link href="/ai-agent-demo" className="link-ring inline-flex justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white">
            Send Demo Link
          </Link>
        </div>
      </section>
    </div>
  );
}
