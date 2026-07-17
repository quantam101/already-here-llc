import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Industries Served',
  description: 'Industries served by Already Here LLC: MSPs, retail, healthcare-adjacent environments, data centers, restaurants, government, education, warehouses, and commercial sites.'
};

const industries = [
  { title: 'MSPs and network operators', href: '/industries/msps', body: 'White-label onsite execution for client-site tickets, network checks, AP work, printer support, smart hands, and closeout documentation.' },
  { title: 'National dispatch partners', href: '/industries/national-dispatch', body: 'A standing Arizona bench for national field service companies: your SLAs, your deliverable format, photo-documented closeout every ticket.' },
  { title: 'Restaurants', href: '/industries/restaurants', body: 'POS, payment devices, KDS, printers, digital menu boards, new store surveys, and rollout support for restaurant groups and their tech providers.' },
  { title: 'Retail', href: '/industries/retail', body: 'Store technology assessments, device rollouts, kiosks, signage, cameras, and opening/remodel surveys executed to one standard across sites.' },
  { title: 'Data centers and critical environments', href: '/industries/data-centers', body: 'Smart hands, rack/stack, part swaps, rack audits, asset photos, remote-engineer coordination, and controlled-site closeout.' },
  { title: 'Healthcare', href: '/industries/healthcare', body: 'OEM installs, biomedical inventories, and documentation-heavy support for clinical environments across Arizona.' },
  { title: 'AV and low voltage', href: '/industries/av-low-voltage', body: 'Overflow install labor, CCTV and access control audits, signage, and service calls for AV and security integrators.' },
  { title: 'Government and education', href: '/dispatch', body: 'Procurement-ready field execution for defined onsite technical support, infrastructure, closeout, and project verification scopes.' },
  { title: 'Warehouses and commercial facilities', href: '/dispatch', body: 'RFID, barcode, asset tracking, APs, printers, cameras, cabling checks, site surveys, equipment recovery, and inventory capture.' }
];

export default function IndustriesPage() {
  return (
    <section className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Industries served</span>
      <h1 className="section-title mt-5">Onsite execution for the environments where remote support needs local hands.</h1>
      <p className="section-copy">
        Already Here LLC supports MSP, vendor, commercial, retail, healthcare-adjacent, government, education, warehouse, and critical-infrastructure teams that need field-ready execution with documented closeout.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {industries.map(({ title, href, body }) => (
          <Link key={title} href={href} className="card block p-6 transition hover:border-action">
            <h2 className="text-xl font-semibold text-navy">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-action">Learn more →</span>
          </Link>
        ))}
      </div>

      <section className="mt-12 rounded-3xl border border-borderBrand bg-navy p-8 text-white">
        <h2 className="text-2xl font-semibold">Need coverage for a specific environment?</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80">
          Send the site type, address, scope, access process, required tools, compliance notes, closeout requirements, approved rate, and deadline. Already Here LLC will confirm fit before dispatch.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white hover:text-navy">Request Dispatch</Link>
          <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full border border-white/35 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">Request Project Quote</Link>
        </div>
      </section>
    </section>
  );
}
