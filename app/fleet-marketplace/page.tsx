import type { Metadata } from 'next';
import Link from 'next/link';
import { MobilityMarketplaceForm } from '@/components/MobilityMarketplaceForm';
import { fleetAvailability, proDeliveryKit, rentalPricing } from '@/lib/scooter-rental';

export const metadata: Metadata = {
  title: 'Vehicle & Fleet Marketplace',
  description: 'List, rent, buy, sell, or partner on vehicles, scooters, trailers, and fleet capacity through Already Here LLC. Connect vehicle owners, businesses, delivery drivers, and fleet operators.',
  alternates: { canonical: '/fleet-marketplace' }
};

const listingTypes = [
  { title: 'Scooter rentals', value: 'delivery scooter rental', price: `From $${rentalPricing.weeklyRate}/week`, cta: 'View scooters', href: '/scooter-rentals' },
  { title: 'Vehicle owner listings', value: 'rent, sell, lease, or revenue-share', price: 'Submit your vehicle', cta: 'List vehicle', href: '#list-vehicle' },
  { title: 'Fleet capacity requests', value: 'business delivery overflow, temp vehicles', price: 'Request capacity', cta: 'Request fleet', href: '#request-capacity' },
  { title: 'Fleet partnerships', value: 'rental companies, dealers, repair shops', price: 'Partner with us', cta: 'Apply', href: '#partner' }
];

const whyMatch = [
  ['Vehicle owners', 'Turn idle cars, trucks, scooters, and trailers into rental or revenue-share income without operating a marketplace yourself.'],
  ['Delivery drivers', 'Rent a scooter or vehicle by the week or month with maintenance and insurance handled.'],
  ['Businesses', 'Reserve extra vehicles or delivery capacity for seasonal spikes, overflow, and special projects.'],
  ['Fleet operators', 'Find vetted partners, maintenance support, and qualified drivers through one operating relationship.']
];

export default function FleetMarketplacePage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Fleet & Mobility</span>
      <h1 className="section-title mt-5">Vehicle & Fleet Marketplace</h1>
      <p className="section-copy">
        Connect idle vehicles, short-term fleet capacity, delivery drivers, and businesses that need transportation. Already Here LLC screens every listing and request before introducing a match.
      </p>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {listingTypes.map((type) => (
          <Link key={type.title} href={type.href} className="card p-6 transition hover:border-action/40 hover:shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-500">{type.value}</p>
            <h2 className="mt-2 text-xl font-semibold text-navy">{type.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{type.price}</p>
            <span className="mt-4 inline-flex rounded-full bg-action px-4 py-2 text-sm font-semibold text-white">{type.cta}</span>
          </Link>
        ))}
      </section>

      <section className="mt-12 rounded-2xl border border-borderBrand bg-soft p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-navy">Available now</p>
            <p className="mt-1 text-sm text-slate-600">
              {fleetAvailability.availableNow} of {fleetAvailability.totalUnits} turnkey delivery scooters available in Phoenix / Tempe / Scottsdale.
            </p>
          </div>
          <Link href="/scooter-rentals" className="link-ring inline-flex rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy">
            Rent a scooter
          </Link>
        </div>
      </section>

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Who the marketplace serves</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {whyMatch.map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-borderBrand bg-soft p-5">
              <h3 className="font-semibold text-navy">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Featured: gig delivery scooter rental</h2>
        <p className="mt-2 text-sm text-slate-600">
          Street-legal, commercially equipped scooters for DoorDash, Uber Eats, Grubhub, and local courier drivers. $550/month or $155/week. Includes cargo box, GPS, lock, mount, vest, and maintenance.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Weekly', `$${rentalPricing.weeklyRate}`],
            ['Monthly', `$${rentalPricing.monthlyRate}`],
            ['Pro Delivery Kit', `$${proDeliveryKit.weekly}/week`],
            ['Onboarding', `$${rentalPricing.onboardingCharge}`]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-borderBrand bg-soft p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-action">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/scooter-rentals" className="link-ring inline-flex rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-navy">
            View scooter rentals
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="card p-8" id="list-vehicle">
          <h2 className="text-2xl font-semibold text-navy">List your vehicle or fleet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Submit a car, truck, scooter, trailer, or specialized fleet vehicle for rent, lease, sale, revenue-share, or managed-fleet partnership. We review ownership, condition, registration, and fit before listing.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-slate-600">
            <li>• Rent or lease by the week or month</li>
            <li>• Revenue-share or managed-fleet arrangement</li>
            <li>• Sale to a qualified buyer or business</li>
            <li>• Fleet overflow partnerships</li>
          </ul>
        </div>
        <div className="card p-8" id="request-capacity">
          <h2 className="text-2xl font-semibold text-navy">Request fleet or delivery capacity</h2>
          <p className="mt-2 text-sm text-slate-600">
            Businesses can request short-term vehicles, delivery overflow support, or a recurring fleet arrangement. We match supply to your schedule, service area, and budget.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-slate-600">
            <li>• Seasonal or surge vehicle capacity</li>
            <li>• Courier and last-mile delivery support</li>
            <li>• Event or project-based transportation</li>
            <li>• Recurring fleet partnership</li>
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <span className="eyebrow">Marketplace intake</span>
          <h2 className="section-title mt-4">List a vehicle, request capacity, or partner as a fleet.</h2>
        </div>
        <MobilityMarketplaceForm />
      </section>
    </div>
  );
}
