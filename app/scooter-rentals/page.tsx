import type { Metadata } from 'next';
import Link from 'next/link';
import { ScooterRentalForm } from '@/components/ScooterRentalForm';
import { addOnItems, baseInclusions, fleetFinancials, ownerResponsibilities, rentalPricing, renterResponsibilities } from '@/lib/scooter-rental';

export const metadata: Metadata = {
  title: 'Gig Delivery Scooter Rentals',
  description: 'Turnkey scooter rentals for DoorDash, Uber Eats, Grubhub, and local courier drivers in Phoenix. $155/week includes cargo box, GPS tracker, lock, mount, vest, and maintenance.',
  alternates: { canonical: '/scooter-rentals' }
};

export default function ScooterRentalsPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Already Here Mobility</span>
      <h1 className="section-title mt-5">Turnkey scooter rentals for gig delivery drivers.</h1>
      <p className="section-copy">
        Street-legal, insured, commercially equipped scooters rented directly to active DoorDash, Uber Eats, Grubhub, and courier drivers. Pay one weekly rate. We handle maintenance, insurance, and inspections.
      </p>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-navy">Weekly rental — $155/week</h2>
          <p className="mt-2 text-sm text-slate-600">Billed every Monday in advance. No surprises, no platform-subcontractor tax confusion.</p>
          <ul className="mt-6 grid gap-3">
            {baseInclusions.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="text-action">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-2xl border border-borderBrand bg-soft p-5">
            <p className="text-sm text-slate-600">
              <strong className="text-navy">Onboarding:</strong> $305 total = ${rentalPricing.firstWeekRent} first week + ${rentalPricing.securityDeposit} refundable security deposit.
            </p>
          </div>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-navy">Monthly rental — $550/month</h2>
          <p className="mt-2 text-sm text-slate-600">30-day agreement. Effective ~$137.50/week. Best for drivers who want a locked-in rate and priority availability.</p>
          <div className="mt-8 rounded-2xl border border-borderBrand bg-soft p-5">
            <h3 className="text-sm font-semibold text-navy">Why rent from Already Here LLC?</h3>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600">
              <li>• No ownership risk or repair surprise bills</li>
              <li>• Hard-mounted cargo box built for delivery bags</li>
              <li>• Hardwired GPS tracker + geofence protection</li>
              <li>• DOT helmet and safety vest included</li>
              <li>• Free routine inspections every 1,000 miles or 30 days</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Optional add-ons</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {addOnItems.map((item) => (
            <div key={item.name} className="rounded-2xl border border-borderBrand bg-soft p-5">
              <h3 className="text-sm font-semibold text-navy">{item.name}</h3>
              <p className="mt-2 text-2xl font-semibold text-action">+${item.weekly}<span className="text-sm font-normal text-slate-500">/week</span></p>
              {item.purchase ? <p className="mt-1 text-xs text-slate-500">or ${item.purchase} to purchase</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-navy">What we cover</h2>
          <ul className="mt-4 grid gap-3">
            {ownerResponsibilities.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="text-action">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-navy">What the driver covers</h2>
          <ul className="mt-4 grid gap-3">
            {renterResponsibilities.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="text-action">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12 card bg-navy p-8 text-white sm:p-10">
        <h2 className="text-2xl font-semibold">Fleet economics at a glance</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Weekly gross income (3 scooters)', `$${fleetFinancials.weeklyGrossFullFleet.toFixed(2)}`],
            ['Monthly gross revenue', `$${fleetFinancials.monthlyGrossFullFleet.toLocaleString()}`],
            ['Monthly overhead', `$${fleetFinancials.monthlyOverhead}`],
            ['Net monthly profit', `$${fleetFinancials.netMonthlyProfitFullFleet.toLocaleString()}`]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-wider text-white/60">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm leading-6 text-white/75">
          Upfront equipment and inventory cost for the 3-scooter fleet is ${fleetFinancials.upfrontEquipmentTotal}. At full utilization, this is recovered in under two weeks.
        </p>
      </section>

      <section className="mt-12 card p-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <span className="eyebrow">Rental intake</span>
            <h2 className="section-title mt-4">Request a scooter.</h2>
            <p className="section-copy">
              Complete the form to check availability. We screen every driver for a valid license, active delivery account, and fit before confirming a scooter.
            </p>
            <div className="mt-6 rounded-2xl border border-borderBrand bg-soft p-5">
              <h3 className="text-sm font-semibold text-navy">Next steps after submitting</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-slate-600">
                <li>We review your license, delivery platforms, and requested start date.</li>
                <li>You receive a rental agreement and inspection checklist.</li>
                <li>Pay the $305 onboarding charge ($155 rent + $150 deposit).</li>
                <li>Pick up the scooter, add-ons, and safety kit.</li>
              </ol>
            </div>
            <p className="mt-6 text-sm text-slate-600">
              Read the{' '}
              <Link href="/scooter-rentals/terms" className="text-action underline">
                rental terms and replacement fee schedule
              </Link>{' '}
              before applying.
            </p>
          </div>
          <ScooterRentalForm />
        </div>
      </section>
    </div>
  );
}
