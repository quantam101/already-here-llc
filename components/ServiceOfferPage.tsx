import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site';
import { StripePaymentButton } from './StripePaymentButton';

export interface ServiceOffer {
  slug: string;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  problem: string[];
  outcome: string[];
  scope: string[];
  exclusions: string[];
  startingPrice: string;
  startingPriceCents: number;
  productName: string;
  cta: string;
  faq: Array<{ question: string; answer: string }>;
  disclosure: string;
}

export function createOfferMetadata(offer: ServiceOffer): Metadata {
  return {
    title: `${offer.name} | ${siteConfig.name}`,
    description: offer.description,
    alternates: { canonical: `/${offer.slug}` },
    openGraph: {
      title: `${offer.name} | ${siteConfig.name}`,
      description: offer.description,
      url: `/${offer.slug}`,
      siteName: siteConfig.name,
      type: 'website'
    }
  };
}

export default function ServiceOfferPage({ offer }: { offer: ServiceOffer }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: offer.name,
    description: offer.description,
    brand: { '@type': 'Brand', name: siteConfig.name },
    offers: {
      '@type': 'Offer',
      price: (offer.startingPriceCents / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${siteConfig.url}/${offer.slug}`
    }
  };

  return (
    <div className="bg-soft text-ink">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow">{offer.eyebrow}</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
            {offer.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            {offer.description}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <StripePaymentButton
              amount={offer.startingPriceCents}
              productName={offer.productName}
              description={offer.description}
              successPath={`/thank-you?offer=${offer.slug}`}
              cancelPath={`/${offer.slug}`}
              metadata={{ offer: offer.slug }}
            >
              {offer.cta}
            </StripePaymentButton>
            <Link
              href="/rfq"
              className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy transition hover:border-action hover:text-action"
            >
              Request a custom quote
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Starting at {offer.startingPrice}. Final scope confirmed before work begins.
          </p>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="card p-8 sm:p-10">
            <h2 className="section-title text-navy">Problem we solve</h2>
            <ul className="mt-6 grid gap-4">
              {offer.problem.map((item) => (
                <li key={item} className="flex gap-3 text-slate-700">
                  <span className="text-action">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card bg-navy p-8 text-white sm:p-10">
            <h2 className="section-title text-white">Outcome</h2>
            <ul className="mt-6 grid gap-4">
              {offer.outcome.map((item) => (
                <li key={item} className="flex gap-3 text-white/80">
                  <span className="text-[#7DB0FF]">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="section-title text-navy">Scope</h2>
              <ul className="mt-6 grid gap-3">
                {offer.scope.map((item) => (
                  <li key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-3 text-sm leading-6 text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="section-title text-navy">Exclusions</h2>
              <ul className="mt-6 grid gap-3">
                {offer.exclusions.map((item) => (
                  <li key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-3 text-sm leading-6 text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="card p-8 sm:p-10">
          <h2 className="section-title text-navy">Frequently asked questions</h2>
          <div className="mt-6 grid gap-6">
            {offer.faq.map(({ question, answer }) => (
              <div key={question}>
                <h3 className="font-semibold text-navy">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <div className="card bg-navy p-8 text-white sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-2xl font-semibold">Ready to start?</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/80">
                  Book the starting price now and we will confirm final scope, schedule, and deliverables before any work begins.
                </p>
              </div>
              <StripePaymentButton
                amount={offer.startingPriceCents}
                productName={offer.productName}
                description={offer.description}
                successPath={`/thank-you?offer=${offer.slug}`}
                cancelPath={`/${offer.slug}`}
                metadata={{ offer: offer.slug }}
              >
                {offer.cta}
              </StripePaymentButton>
            </div>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            {offer.disclosure}
          </p>
        </div>
      </section>
    </div>
  );
}
