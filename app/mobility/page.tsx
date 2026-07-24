import type { Metadata } from 'next';
import { MobilityMarketplaceForm } from '@/components/MobilityMarketplaceForm';

export const metadata: Metadata = {
  title: 'Mobility Marketplace',
  description: 'Connect unused vehicles, scooter renters, delivery drivers, fleet partners, and businesses needing extra vehicles or delivery capacity through Already Here LLC.',
  alternates: { canonical: '/mobility' }
};

const paths = [
  {
    title: 'Put an unused vehicle to work',
    copy: 'Vehicle owners can explore rental, lease, managed-fleet, revenue-share, or sale opportunities after ownership, condition, registration, insurance, and written terms are reviewed.'
  },
  {
    title: 'Find extra vehicles or drivers',
    copy: 'Businesses can request short-term vehicle capacity, drivers with vehicles, route support, courier coverage, or overflow delivery support.'
  },
  {
    title: 'Rent a scooter or delivery vehicle',
    copy: 'Individuals can register interest in personal transportation, DoorDash, Uber Eats, local courier work, or short-term mobility.'
  },
  {
    title: 'Partner as a fleet or vendor',
    copy: 'Rental companies, dealers, repair shops, courier firms, restaurants, property operators, and fleet owners can propose structured collaboration.'
  }
];

export default function MobilityPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Already Here Mobility</span>
      <h1 className="section-title mt-5">Match unused vehicles with real transportation and delivery demand.</h1>
      <p className="section-copy">
        This marketplace connects vehicle owners, scooter renters, delivery drivers, fleet partners, and businesses that need extra vehicles or delivery capacity. Every opportunity is screened before any rental, sale, delivery, fleet, or revenue-sharing agreement is accepted.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {paths.map((path) => (
          <section key={path.title} className="card p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-navy">{path.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{path.copy}</p>
          </section>
        ))}
      </div>

      <section className="mt-12 rounded-3xl border border-borderBrand bg-navy p-7 text-white sm:p-9">
        <h2 className="text-2xl font-semibold">How matching works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ['1', 'Submit', 'Tell us what vehicle, delivery capacity, scooter, driver, or business need you have.'],
            ['2', 'Screen', 'We review ownership, fit, schedule, geography, condition, scope, budget, and risk.'],
            ['3', 'Match', 'Qualified supply and demand records are compared in the operating database.'],
            ['4', 'Approve', 'No transaction begins until the parties approve written pricing, insurance, responsibility, and operating terms.']
          ].map(([number, title, copy]) => (
            <div key={number} className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <div className="text-sm font-bold text-white/60">{number}</div>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/75">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <span className="eyebrow">Supply and demand intake</span>
          <h2 className="section-title mt-4">Tell us what you have or what you need.</h2>
        </div>
        <MobilityMarketplaceForm />
      </section>
    </div>
  );
}
