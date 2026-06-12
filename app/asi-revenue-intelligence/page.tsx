import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ASI Revenue Intelligence Engine | Already Here LLC',
  description: 'Local-first revenue intelligence, dispatch scoring, retainer targeting, and company database orchestration for field-service operators, MSPs, vendors, and small businesses.',
  alternates: { canonical: 'https://www.alreadyherellc.com/asi-revenue-intelligence' },
  openGraph: {
    title: 'ASI Revenue Intelligence Engine | Already Here LLC',
    description: 'Turn scattered work orders, vendor messages, procurement paths, and field history into owned revenue intelligence.',
    url: 'https://www.alreadyherellc.com/asi-revenue-intelligence',
    siteName: 'Already Here LLC',
    type: 'website'
  }
};

const capabilities = [
  'Scores field work against a $500 minimum daily revenue floor',
  'Builds an owned company, contact, issue, fix, recurrence, and pricing database',
  'Creates approval-gated counters, replies, retainer pitches, and project next actions',
  'Runs local-first with offline queueing and cloud/API failover',
  'Supports dispatch, project/SOW, retainer, procurement, MSP overflow, POS, access control, network, healthcare equipment, and decommissioning workflows',
  'Identifies software opportunities such as AI intake, missed-call capture, dispatch triage, internal messaging, and business-network referrals'
] as const;

const buyerFits = [
  'MSPs needing Phoenix-area overflow and emergency onsite coverage',
  'Retail/POS vendors needing reliable local dispatch and closeout',
  'Access-control and low-voltage contractors needing field capacity',
  'Property managers and storage operators with recurring cleanout or technology support needs',
  'Small businesses losing revenue through weak intake, follow-up, scheduling, or quote tracking',
  'Municipal and enterprise buyers needing documented local field execution and project coordination'
] as const;

export default function ASIRevenueIntelligencePage() {
  return (
    <main>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow">Revenue intelligence product layer</span>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl lg:text-6xl">
            ASI Revenue Intelligence Engine for field service, retainers, projects, and business-network automation.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Already Here LLC uses the ASI engine to normalize work orders, vendor messages, procurement paths, public leads, and field history into a structured revenue database. The system is designed to find same-day income, expose repeat buyer pain, and convert operational patterns into retainers, software products, and private business-network relationships.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
              Request an ASI Workflow Review
            </Link>
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
              Request Dispatch Coverage
            </Link>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <span className="eyebrow">Core capabilities</span>
        <h2 className="section-title mt-5">The database becomes the revenue asset.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((capability) => (
            <div key={capability} className="card p-6">
              <p className="text-sm leading-7 text-slate-700">{capability}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-soft">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow">Buyer fit</span>
          <h2 className="section-title mt-5">Built for recurring operational pain, not one-off noise.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {buyerFits.map((fit) => (
              <div key={fit} className="card p-6">
                <p className="text-sm leading-7 text-slate-700">{fit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="card p-8 lg:p-10">
          <span className="eyebrow">Commercial model</span>
          <h2 className="section-title mt-5">Deploy internally first, then sell as a workflow engine.</h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-700">
            The optimized product structure is a standalone orchestration core connected through secure adapters. That keeps the engine sellable, protects client-specific workflows, and allows Already Here LLC to use the same intelligence layer across field dispatch, retainer targeting, project management, AI intake, vendor routing, and internal business-network messaging.
          </p>
        </div>
      </section>
    </main>
  );
}
