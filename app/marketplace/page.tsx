import type { Metadata } from 'next';
import Link from 'next/link';
import { FleetMarketplaceListings } from '@/components/FleetMarketplaceListings';
import { MobilityMarketplaceForm } from '@/components/MobilityMarketplaceForm';
import { fleetAvailability, proDeliveryKit, rentalPricing } from '@/lib/scooter-rental';
import { arrangementTypes, fleetMarketplaceFeatures, howItWorks, marketplaceCategories, marketplaceMission, sampleListings } from '@/lib/fleet-marketplace';

export const metadata: Metadata = {
  title: 'GINC Marketplace — Vehicles, Work, and People',
  description: 'GINC by Already Here LLC — the network for renting, listing, and matching vehicles, equipment, spaces, work, and people across every state.',
  alternates: { canonical: '/marketplace' }
};

export default function MarketplacePage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">GINC Marketplace</span>
      <h1 className="section-title mt-5">One network for vehicles, work, and people.</h1>
      <p className="section-copy">
        {marketplaceMission} Apartments, rooms, storage, and parking are now included too.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row flex-wrap">
        <Link href="/ginc/list" className="link-ring inline-flex rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-navy">
          List an asset
        </Link>
        <Link href="/ginc/work" className="link-ring inline-flex rounded-full border border-action px-6 py-3 text-sm font-semibold text-action hover:bg-action/5">
          Post work / need
        </Link>
        <Link href="/ginc/network" className="link-ring inline-flex rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-600 hover:border-action hover:text-action">
          Browse the network
        </Link>
        <Link href="/scooter-rentals" className="link-ring inline-flex rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-600 hover:border-action hover:text-action">
          Rent a scooter
        </Link>
      </div>

      <section className="mt-12 rounded-2xl border border-borderBrand bg-soft p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-navy">Available now</p>
            <p className="mt-1 text-sm text-slate-600">
              {fleetAvailability.availableNow} of {fleetAvailability.totalUnits} turnkey delivery scooters available in Phoenix / Tempe / Scottsdale. More categories launching as supply is vetted.
            </p>
          </div>
          <Link href="/scooter-rentals" className="link-ring inline-flex rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy">
            Rent a scooter
          </Link>
        </div>
      </section>

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Every category, one marketplace</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {marketplaceCategories.map((category) => (
            <div key={category.id} className="rounded-2xl border border-borderBrand bg-soft p-5">
              <h3 className="font-semibold text-navy">{category.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{category.examples}</p>
              <p className="mt-3 text-xs text-slate-500">{category.audience}</p>
            </div>
          ))}
        </div>
      </section>

      <FleetMarketplaceListings listings={sampleListings} />

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {howItWorks.map(([title, copy]) => (
            <div key={title} className="rounded-2xl border border-borderBrand bg-soft p-5">
              <h3 className="font-semibold text-navy">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Arrangements we support</h2>
        <div className="mt-6 flex flex-wrap gap-3">
          {arrangementTypes.map((type) => (
            <span key={type.id} className="rounded-full border border-borderBrand bg-soft px-4 py-2 text-sm font-medium text-navy">
              {type.label}
            </span>
          ))}
        </div>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fleetMarketplaceFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="text-action">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
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
        <div className="card p-8" id="list-asset">
          <h2 className="text-2xl font-semibold text-navy">List your vehicle, space, or equipment</h2>
          <p className="mt-2 text-sm text-slate-600">
            Cars, trucks, vans, trailers, tractors, UTVs, RVs, food trucks, party buses, bounce houses, water sports, bikes, apartments, rooms, storage, parking — submit any asset for rent, lease, sale, revenue-share, or managed partnership. We review ownership, condition, registration, and insurance before listing.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-slate-600">
            <li>• Set your own schedule and preferred arrangement</li>
            <li>• We screen renters / operators and handle intake</li>
            <li>• Optional maintenance, inspection, and GPS coordination</li>
            <li>• Written agreements and payment terms before handoff</li>
          </ul>
        </div>
        <div className="card p-8" id="request-capacity">
          <h2 className="text-2xl font-semibold text-navy">Request vehicles, spaces, or capacity</h2>
          <p className="mt-2 text-sm text-slate-600">
            Businesses and individuals can request short-term vehicles, seasonal equipment, event rentals, storage, parking, housing, or recurring fleet capacity. We match by category, geography, schedule, and budget.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-slate-600">
            <li>• Delivery, farming, construction, event, camping, fleet, housing, and storage needs</li>
            <li>• One-time, seasonal, or recurring arrangements</li>
            <li>• Vetted supply matched to your requirements</li>
            <li>• Insurance and operating terms confirmed before start</li>
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <span className="eyebrow">Quick intake</span>
          <h2 className="section-title mt-4">List, request, or partner across every category.</h2>
        </div>
        <MobilityMarketplaceForm />
      </section>
    </div>
  );
}
