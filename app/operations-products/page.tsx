import type { Metadata } from 'next';
import Link from 'next/link';
import catalog from '@/data/phase-2-product-catalog.json';

export const metadata: Metadata = {
  title: 'Field Operations Products & Automation Systems',
  description:
    'Field-tested templates, trackers, intake systems, closeout kits, dispatch tools, and implementation services for technicians, contractors, mechanics, MSPs, and field-service businesses.'
};

const tierLabels: Record<string, string> = {
  basic: 'Basic',
  professional: 'Professional',
  company_license: 'Company License',
  configuration: 'Configured for Your Business',
  implementation: 'Full Implementation',
  monthly_support: 'Managed Support'
};

export default function OperationsProductsPage() {
  const products = [...catalog.products].sort((a, b) => a.priority - b.priority);

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Already Here LLC Field Operations Products',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Service',
        name: product.name,
        description: product.problem,
        provider: { '@type': 'Organization', name: 'Already Here LLC' }
      }
    }))
  };

  return (
    <div className="bg-[#F5F8FC] text-[#071B34]">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <section className="bg-[#071B34] text-white">
        <div className="container-shell py-20 sm:py-24">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#7DB0FF]">Field Operations Product Suite</p>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
            Working systems for real field-service operations.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
            Mobile-ready templates, job-profit tracking, mechanic intake, low-voltage closeout, technician dispatch, configuration, implementation, and managed support. Built from actual field requirements and designed to reduce missing information, weak documentation, and lost follow-up.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/rfq" className="link-ring rounded-full bg-[#1B66FF] px-6 py-3 text-center font-semibold text-white hover:bg-white hover:text-[#071B34]">
              Request a Workflow Assessment
            </Link>
            <a href="#products" className="link-ring rounded-full border border-white/40 px-6 py-3 text-center font-semibold text-white hover:bg-white/10">
              Review Products and Pricing
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-[#D7E0EB] bg-white">
        <div className="container-shell grid gap-6 py-8 sm:grid-cols-3">
          {[
            ['Zero-cost discovery', 'We begin by reviewing the workflow and defining what must be fixed before recommending software.'],
            ['Proof-of-work first', 'Systems are tested internally or with sanitized records before customer deployment.'],
            ['You own the deliverables', 'Configured forms, trackers, source files, exports, and documentation remain usable outside a single vendor.']
          ].map(([title, body]) => (
            <div key={title}>
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#44546A]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="products" className="container-shell py-16 sm:py-20">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1B66FF]">Owned products and services</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Choose the asset, configuration, or complete implementation.</h2>
          <p className="mt-4 leading-7 text-[#44546A]">
            Pricing below is a starting scope. Final pricing depends on workflow complexity, data volume, integrations, training, and support requirements.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {products.map((product) => (
            <article key={product.id} className="rounded-3xl border border-[#D7E0EB] bg-white p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1B66FF]">Priority {product.priority}</p>
                  <h3 className="mt-2 text-2xl font-bold">{product.name}</h3>
                </div>
                <span className="rounded-full bg-[#E8F0FF] px-3 py-1 text-xs font-semibold text-[#174EA6]">Mobile + Desktop</span>
              </div>

              <p className="mt-4 leading-7 text-[#44546A]">{product.problem}</p>
              <p className="mt-4 text-sm"><span className="font-semibold">Best for:</span> {product.target_buyer}</p>

              <div className="mt-6">
                <h4 className="font-bold">Included deliverables</h4>
                <ul className="mt-3 grid gap-2 text-sm text-[#34445A] sm:grid-cols-2">
                  {product.deliverables.map((deliverable) => (
                    <li key={deliverable} className="rounded-xl bg-[#F5F8FC] px-3 py-2">{deliverable}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-[#D7E0EB]">
                {Object.entries(product.pricing).map(([tier, price]) => (
                  <div key={tier} className="flex items-center justify-between gap-4 border-b border-[#E5EBF2] px-4 py-3 last:border-b-0">
                    <span className="text-sm font-medium">{tierLabels[tier] ?? tier}</span>
                    <span className="font-bold text-[#174EA6]">{price}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={`/rfq?product=${encodeURIComponent(product.id)}`} className="link-ring rounded-full bg-[#1B66FF] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-[#071B34]">
                  Request This Product
                </Link>
                <Link href="/contact" className="link-ring rounded-full border border-[#9AA9BC] px-5 py-3 text-center text-sm font-semibold hover:border-[#1B66FF]">
                  Ask a Question
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="container-shell grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1B66FF]">How implementation works</p>
            <h2 className="mt-3 text-3xl font-bold">From operational problem to a working system.</h2>
            <ol className="mt-7 grid gap-4">
              {[
                ['1', 'Workflow review', 'Identify current tools, information gaps, manual steps, risks, and required outcomes.'],
                ['2', 'Configuration plan', 'Select the product tier, define data fields, approvals, integrations, security, and ownership.'],
                ['3', 'Build and validation', 'Configure the system using sanitized data, test mobile and desktop behavior, and correct failures.'],
                ['4', 'Launch and training', 'Deliver source files, operating instructions, staff training, and support boundaries.'],
                ['5', 'Optimization', 'Measure adoption, incomplete records, response time, job margin, and follow-up completion.']
              ].map(([number, title, body]) => (
                <li key={number} className="grid grid-cols-[2.5rem_1fr] gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#071B34] font-bold text-white">{number}</span>
                  <div>
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#44546A]">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="rounded-3xl bg-[#071B34] p-8 text-white">
            <h2 className="text-2xl font-bold">Start with an operations assessment.</h2>
            <p className="mt-4 leading-7 text-white/80">
              We review one process, identify the revenue and documentation gaps, and recommend the smallest system that solves the problem without unnecessary software or recurring expense.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/85">
              <li>Current workflow and tool inventory</li>
              <li>Manual-step and risk analysis</li>
              <li>Recommended product and implementation tier</li>
              <li>Data, security, and approval requirements</li>
              <li>Prioritized deployment plan</li>
            </ul>
            <Link href="/rfq" className="link-ring mt-8 block rounded-full bg-white px-5 py-3 text-center font-semibold text-[#071B34] hover:bg-[#7DB0FF]">
              Request Assessment
            </Link>
          </aside>
        </div>
      </section>

      <section className="container-shell py-12 text-sm leading-6 text-[#5A687A]">
        <p>
          Product and service descriptions are operational guidance, not legal, accounting, tax, engineering, electrical, safety-certification, or compliance advice. Software referral relationships, where approved and used, will be disclosed clearly. No third-party partner status is claimed on this page.
        </p>
      </section>
    </div>
  );
}
