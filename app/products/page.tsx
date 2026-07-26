import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Done-for-You Products & On-Site Services | Already Here LLC',
  description: 'Automation templates, AI prompt packs, SEO toolkits, and on-site Phoenix IT assessments — buy instantly or book online.',
  alternates: { canonical: 'https://www.alreadyherellc.com/products' }
};

const digitalProducts = [
  {
    name: 'Complete Automation Bundle — All 5 Tools',
    price: '$89.99',
    description: 'Get every automation toolkit in one bundle and save. Includes prompts, SEO templates, social content, POD design prompts, and the real estate copywriting kit.',
    cta: 'Buy the bundle',
    href: 'https://alreadyhere.gumroad.com/l/fsbseb'
  },
  {
    name: 'AI Business Prompt Pack',
    price: '$27',
    description: '500+ production-tested AI prompts for copywriting, sales emails, social media, product descriptions, and cold outreach.',
    cta: 'Buy now',
    href: 'https://alreadyhere.gumroad.com/l/grsiib'
  },
  {
    name: 'Programmatic SEO Starter Kit',
    price: '$29',
    description: 'City-page SEO templates, keyword research for 500 US cities, schema markup snippets, and a step-by-step deployment guide.',
    cta: 'Buy now',
    href: 'https://alreadyhere.gumroad.com/l/azdev'
  },
  {
    name: 'Social Media Content Engine',
    price: '$17',
    description: '30-day AI content calendar with 180 prompts for Instagram, TikTok, LinkedIn, X/Twitter, and Facebook.',
    cta: 'Buy now',
    href: 'https://alreadyhere.gumroad.com/l/dyiyh'
  },
  {
    name: 'POD Design Prompt Bundle',
    price: '$22',
    description: 'AI art generation system for print-on-demand sellers: Midjourney + Stable Diffusion prompts for 20 niches.',
    cta: 'Buy now',
    href: 'https://alreadyhere.gumroad.com/l/zwztrcc'
  },
  {
    name: 'Real Estate Copywriting Kit',
    price: '$19',
    description: '100 plug-and-play property listing templates for agents and investors: luxury, starter, commercial, vacation rental, and land.',
    cta: 'Buy now',
    href: 'https://alreadyhere.gumroad.com/l/bxwrdt'
  },
  {
    name: 'Email List Gold Mine',
    price: '$17.99',
    description: 'Templates and prompts to build and monetize a newsletter list using free tools.',
    cta: 'Buy now',
    href: 'https://alreadyhere.gumroad.com/l/ujctf'
  }
];

const fieldServices = [
  {
    name: 'Arizona Infrastructure Assessment (Full Site, On-Site)',
    price: '$1,500',
    description: 'One-day on-site technology assessment for one Arizona site: network, power, racks, endpoints, wiring closets, and physical security.',
    cta: 'Book assessment',
    href: 'https://alreadyhere.gumroad.com/l/fyaryu'
  },
  {
    name: 'Phoenix Network Health Assessment (On-Site)',
    price: '$750',
    description: 'On-site network assessment in the Phoenix metro: switching, cabling, rack condition, Wi-Fi coverage, and ISP handoff.',
    cta: 'Book assessment',
    href: 'https://alreadyhere.gumroad.com/l/rrnqyql'
  },
  {
    name: 'Smart Hands Half-Day Block — Phoenix',
    price: '$400',
    description: 'Four hours of directed on-site technical work in the Phoenix metro: rack and stack, cable moves, device swaps, smart hands.',
    cta: 'Book smart hands',
    href: 'https://alreadyhere.gumroad.com/l/iezxvf'
  }
];

function ProductCard({ product }: { product: typeof digitalProducts[number] }) {
  return (
    <div className="card flex flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-navy">{product.name}</h3>
        <span className="whitespace-nowrap rounded-full bg-action/10 px-3 py-1 text-sm font-semibold text-action">
          {product.price}
        </span>
      </div>
      <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
        {product.description}
      </p>
      <a
        href={product.href}
        target="_blank"
        rel="noopener sponsored"
        className="link-ring mt-6 inline-flex items-center justify-center rounded-full bg-action px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy"
      >
        {product.cta}
      </a>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <main>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow">Products & services</span>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
            Automation toolkits, templates, and on-site Phoenix field services.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Buy ready-made digital products and book on-site assessments 24/7. Every
            purchase is processed through Gumroad and includes the tools we use to run
            Already Here LLC and ProfitEngine.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/ai-receptionist"
              className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action"
            >
              AI receptionist service
            </Link>
            <Link
              href="/services-catalog"
              className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action"
            >
              Full service catalog
            </Link>
          </div>
        </div>
      </section>

      <section className="container-shell py-16">
        <h2 className="text-2xl font-semibold text-navy">Digital products</h2>
        <p className="mt-2 text-slate-600">Download instantly. Use forever.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {digitalProducts.map((p) => (
            <ProductCard key={p.href} product={p} />
          ))}
        </div>
      </section>

      <section className="border-t border-borderBrand container-shell py-16">
        <h2 className="text-2xl font-semibold text-navy">Arizona on-site services</h2>
        <p className="mt-2 text-slate-600">
          Book online and we&apos;ll contact you within one business day to schedule.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {fieldServices.map((p) => (
            <ProductCard key={p.href} product={p} />
          ))}
        </div>
      </section>

      <section className="border-t border-borderBrand bg-soft">
        <div className="container-shell py-12">
          <p className="text-sm text-slate-600">
            <em>
              Disclosure: Some links on this page are Gumroad product links. Already
              Here LLC may earn a commission on qualifying purchases at no extra cost to
              you.
            </em>
          </p>
        </div>
      </section>
    </main>
  );
}
