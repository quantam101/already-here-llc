import type { Metadata } from 'next';
import Link from 'next/link';
import { ScooterRentalForm } from '@/components/ScooterRentalForm';
import { addOnItems, baseInclusions, fleetAvailability, fleetFinancials, ownerResponsibilities, proDeliveryKit, rentalPricing, renterResponsibilities } from '@/lib/scooter-rental';

export const metadata: Metadata = {
  title: 'Gig Delivery Scooter Rentals',
  description: 'Turnkey scooter rentals for DoorDash, Uber Eats, Grubhub, and local courier drivers in Phoenix. $550/month or $155/week includes cargo box, GPS tracker, lock, mount, vest, and maintenance.',
  alternates: { canonical: '/scooter-rentals' }
};

export default function ScooterRentalsPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Already Here Mobility</span>
      <h1 className="section-title mt-5">Turnkey scooter rentals for gig delivery drivers.</h1>
      <p className="section-copy">
        Street-legal, insured, commercially equipped scooters rented directly to active DoorDash, Uber Eats, Grubhub, and courier drivers. One weekly rate covers the scooter, gear, maintenance, and unlimited local mileage.
      </p>

      <section className="mt-10 rounded-2xl border border-borderBrand bg-soft p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-navy">Fleet availability</p>
            <p className="mt-1 text-sm text-slate-600">
              {fleetAvailability.availableNow} of {fleetAvailability.totalUnits} scooters available now. {fleetAvailability.availableNow === 0 ? 'Join the waitlist with a $150 pre-pay deposit to lock your spot.' : 'Apply today — first week + deposit required to reserve.'}
            </p>
          </div>
          <div className="shrink-0">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${fleetAvailability.availableNow > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {fleetAvailability.availableNow > 0 ? `${fleetAvailability.availableNow} available` : 'Waitlist open'}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="card p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold text-navy">Weekly rental</h2>
            <span className="rounded-full border border-borderBrand px-3 py-1 text-xs font-semibold text-slate-600">Flexible</span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-action">${rentalPricing.weeklyRate}<span className="text-base font-normal text-slate-500">/week</span></p>
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
              <strong className="text-navy">Onboarding:</strong> ${rentalPricing.onboardingCharge} total = ${rentalPricing.firstWeekRent} first week + ${rentalPricing.securityDeposit} refundable security deposit.
            </p>
          </div>
        </div>

        <div className="card p-8 ring-2 ring-action/30">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl font-semibold text-navy">Monthly rental</h2>
            <span className="rounded-full bg-action px-3 py-1 text-xs font-semibold text-white">Most popular</span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-action">${rentalPricing.monthlyRate}<span className="text-base font-normal text-slate-500">/month</span></p>
          <p className="mt-2 text-sm text-slate-600">30-day agreement. Effective ~${rentalPricing.monthlyEffectiveWeekly}/week — save ${rentalPricing.weeklyRate - rentalPricing.monthlyEffectiveWeekly}/week vs weekly. Best for drivers who want priority availability and a locked-in rate.</p>
          <div className="mt-6 rounded-2xl border border-borderBrand bg-soft p-5">
            <h3 className="text-sm font-semibold text-navy">Monthly perks</h3>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600">
              <li>• Lowest effective weekly rate</li>
              <li>• Priority scooter swap if maintenance is needed</li>
              <li>• First right of refusal on fleet expansions</li>
              <li>• Skip the weekly re-billing reminder</li>
            </ul>
          </div>
          <div className="mt-6 rounded-2xl border border-action/30 bg-action/5 p-5">
            <p className="text-sm text-slate-700">
              <strong>Monthly drivers keep scooters 60% longer.</strong> Monthly billing reduces churn and gives you predictable income — we recommend it at checkout.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Pro Delivery Kit — $25/week</h2>
        <p className="mt-2 text-sm text-slate-600">Bundle the essentials every serious gig driver actually needs. Add it at checkout and we install it before handoff.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proDeliveryKit.contents.map((item) => (
            <div key={item} className="rounded-2xl border border-borderBrand bg-soft p-4 text-sm text-slate-700">
              <span className="text-action">✓</span> {item}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-borderBrand bg-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-navy">Kit value if rented separately</p>
            <p className="text-sm text-slate-600">~${proDeliveryKit.standaloneValue}/week + extras not offered separately</p>
          </div>
          <div className="shrink-0 text-lg font-semibold text-action">{proDeliveryKit.savingsCopy}</div>
        </div>
      </section>

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Optional individual add-ons</h2>
        <p className="mt-2 text-sm text-slate-600">Already have some gear? Add only what you need.</p>
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
          Upfront equipment and inventory cost for the 3-scooter fleet is ${fleetFinancials.upfrontEquipmentTotal}. At full utilization with 50% Pro Delivery Kit attach, net profit approaches $2,000/month and payback is under two weeks.
        </p>
      </section>

      <section className="mt-12 card p-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <span className="eyebrow">Rental intake</span>
            <h2 className="section-title mt-4">Reserve your scooter.</h2>
            <p className="section-copy">
              Monthly is selected by default because it locks in priority availability and the lowest effective rate. If no scooter is available, your submission joins the waitlist with an optional $150 pre-pay deposit to hold the next unit.
            </p>
            <div className="mt-6 rounded-2xl border border-borderBrand bg-soft p-5">
              <h3 className="text-sm font-semibold text-navy">How reservation works</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-slate-600">
                <li>Submit the form with your preferred plan and add-ons.</li>
                <li>We verify your license, delivery platforms, and start date.</li>
                <li>If a scooter is ready, pay onboarding ($305) to reserve.</li>
                <li>If we are full, optionally pre-pay the $150 deposit to lock your spot on the waitlist.</li>
                <li>Pick up the scooter, Pro Delivery Kit (if selected), and safety kit.</li>
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
