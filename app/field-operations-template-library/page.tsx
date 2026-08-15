import { Metadata } from 'next';
import { StripePaymentButton } from '@/components/StripePaymentButton';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Field Operations Template Library — Already Here LLC',
  description: 'Vendor-neutral CSV and Markdown templates for work orders, technician intake, asset registers, closeout checklists, and quote-to-cash workflows. Own your operating process regardless of the software stack.'
};

const baseUrl = siteConfig.url.replace(/\/$/, '');

const schema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Field Operations Template Library',
  description: 'Vendor-neutral field operations templates for work orders, technician intake, asset registers, closeout, and quote-to-cash.',
  brand: { '@type': 'Brand', name: 'Already Here LLC' },
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '49.00',
      priceCurrency: 'USD',
      priceValidUntil: '2027-08-15',
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/field-operations-template-library`
    },
    {
      '@type': 'Offer',
      name: 'Professional',
      price: '129.00',
      priceCurrency: 'USD',
      priceValidUntil: '2027-08-15',
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/field-operations-template-library`
    },
    {
      '@type': 'Offer',
      name: 'Company',
      price: '349.00',
      priceCurrency: 'USD',
      priceValidUntil: '2027-08-15',
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/field-operations-template-library`
    }
  ]
};

const files = [
  { label: 'Work order template', file: 'work-order-template.csv' },
  { label: 'Technician intake template', file: 'technician-intake-template.csv' },
  { label: 'Asset register template', file: 'asset-register-template.csv' },
  { label: 'Closeout checklist', file: 'closeout-checklist.md' },
  { label: 'Quote-to-cash checklist', file: 'quote-to-cash-checklist.md' }
];

const tiers = [
  {
    name: 'Starter',
    priceCents: 4900,
    price: '$49',
    description: 'Core templates for a single operator or small crew.',
    features: ['Work order template', 'Technician intake template', 'Closeout checklist']
  },
  {
    name: 'Professional',
    priceCents: 12900,
    price: '$129',
    description: 'Full template set plus asset register and quote-to-cash checklist.',
    features: ['All Starter files', 'Asset register template', 'Quote-to-cash checklist', 'Email support']
  },
  {
    name: 'Company',
    priceCents: 34900,
    price: '$349',
    description: 'Multi-user license plus custom deployment guidance.',
    features: ['All Professional files', 'Multi-site license', '1-hour implementation walkthrough', '60 days of async support']
  }
];

export default function FieldOperationsTemplateLibraryPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="border-b border-borderBrand bg-soft">
        <div className="container-shell py-16 lg:py-24">
          <p className="eyebrow">Owned Digital Product</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">Field Operations Template Library</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Vendor-neutral CSV and Markdown templates you own. Import them into any spreadsheet, CRM, Notion, Airtable, or custom system. The process stays yours even when the software changes.
          </p>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="card p-8 sm:p-10">
            <h2 className="section-title text-navy">What is included</h2>
            <ul className="mt-6 grid gap-3">
              {files.map((item) => (
                <li key={item.file} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-action" />
                  <span>{item.label} — <a href={`/templates/field-operations/${item.file}`} download className="text-action hover:underline">preview download</a></span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-6 text-slate-600">
              Preview files are ungated samples. Paid tiers include a license to use all templates commercially across your organization and optional implementation support.
            </p>
          </div>

          <div className="card p-8 sm:p-10">
            <h2 className="section-title text-navy">How it works</h2>
            <ol className="mt-6 grid list-decimal gap-3 pl-5 text-sm text-slate-700">
              <li>Select the tier that matches your team size and support needs.</li>
              <li>Complete checkout. You will be redirected to a download page.</li>
              <li>Download the CSV and Markdown files immediately.</li>
              <li>Import into your existing tools or use as-is.</li>
            </ol>
          </div>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div key={tier.name} className="flex flex-col rounded-3xl border border-borderBrand bg-white p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-navy">{tier.name}</h3>
              <p className="mt-2 text-3xl font-semibold text-navy">{tier.price}</p>
              <p className="mt-2 text-sm text-slate-600">{tier.description}</p>
              <ul className="mt-6 flex-1 grid gap-2 text-sm text-slate-700">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="text-action">&#10003;</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <StripePaymentButton
                  amount={tier.priceCents}
                  productName={`Field Operations Template Library — ${tier.name}`}
                  description={`${tier.name} tier: ${tier.features.join(', ')}`}
                  successPath="/thank-you?download=field-ops"
                  cancelPath="/field-operations-template-library"
                  metadata={{ tier: tier.name, product: 'field-operations-template-library' }}
                >
                  Buy {tier.name} — {tier.price}
                </StripePaymentButton>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          All purchases are processed securely through Stripe. Prices are one-time unless otherwise noted. Templates are delivered as immediate downloads.
        </p>
      </section>
    </main>
  );
}
