import type { Metadata } from 'next';
import Link from 'next/link';
import { siteConfig } from '@/lib/site';
import { addOnItems, baseInclusions, ownerResponsibilities, proDeliveryKit, rentalPricing, renterResponsibilities, replacementFees } from '@/lib/scooter-rental';

export const metadata: Metadata = {
  title: 'Scooter Rental Terms & Replacement Fees',
  description: 'Rental terms, maintenance policy, Pro Delivery Kit, waitlist/deposit policy, and itemized equipment replacement fee schedule for Already Here LLC gig delivery scooter rentals.',
  alternates: { canonical: '/scooter-rentals/terms' }
};

export default function ScooterRentalTermsPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Rental Terms</span>
      <h1 className="section-title mt-5">Scooter rental terms & replacement fees.</h1>
      <p className="section-copy">
        These terms summarize the rental agreement every approved driver signs before taking possession. They are not a substitute for the full contract.
      </p>

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Pricing & deposit</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-borderBrand bg-soft p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Weekly rate</p>
            <p className="mt-2 text-2xl font-semibold text-action">${rentalPricing.weeklyRate}</p>
          </div>
          <div className="rounded-2xl border border-borderBrand bg-soft p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Monthly rate</p>
            <p className="mt-2 text-2xl font-semibold text-action">${rentalPricing.monthlyRate}</p>
            <p className="mt-1 text-xs text-slate-500">Effective ~${rentalPricing.monthlyEffectiveWeekly}/week</p>
          </div>
          <div className="rounded-2xl border border-borderBrand bg-soft p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Onboarding charge</p>
            <p className="mt-2 text-2xl font-semibold text-action">${rentalPricing.onboardingCharge}</p>
            <p className="mt-1 text-xs text-slate-500">${rentalPricing.firstWeekRent} rent + ${rentalPricing.securityDeposit} deposit</p>
          </div>
          <div className="rounded-2xl border border-borderBrand bg-soft p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Pro Delivery Kit</p>
            <p className="mt-2 text-2xl font-semibold text-action">${proDeliveryKit.weekly}</p>
            <p className="mt-1 text-xs text-slate-500">/week</p>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-navy">Included with every rental</h2>
          <ul className="mt-4 grid gap-3">
            {baseInclusions.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="text-action">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-navy">Optional add-ons</h2>
          <ul className="mt-4 grid gap-3">
            {addOnItems.map((item) => (
              <li key={item.name} className="flex items-start justify-between gap-4 text-sm text-slate-700">
                <span>{item.name}</span>
                <span className="shrink-0">+${item.weekly}/week{item.purchase ? ` · $${item.purchase}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Pro Delivery Kit</h2>
        <p className="mt-2 text-sm text-slate-600">
          A bundled weekly add-on for drivers who want every delivery-focused accessory installed before handoff. Contents:
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {proDeliveryKit.contents.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="text-action">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">
          Kit items are fleet property and must be returned with the scooter. Replacement fees for kit items are listed in the fee schedule below.
        </p>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="card p-8">
          <h2 className="text-2xl font-semibold text-navy">Owner responsibilities</h2>
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
          <h2 className="text-2xl font-semibold text-navy">Renter responsibilities</h2>
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

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Reservation, waitlist & deposit policy</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p><strong>Availability:</strong> Fleet size is limited. The website shows how many scooters are currently available. A request does not guarantee a scooter until the rental agreement is signed and the onboarding payment is received.</p>
          <p><strong>Waitlist:</strong> When no scooter is available, you may join the waitlist. The waitlist is first-come, first-served based on completed applications and deposit payment.</p>
          <p><strong>Pre-pay deposit:</strong> You may pay the ${rentalPricing.securityDeposit} security deposit at any time to lock your place. It is refundable if you decline the offered scooter or if no scooter becomes available within 30 days.</p>
          <p><strong>Onboarding charge:</strong> Approved drivers pay ${rentalPricing.onboardingCharge} before pickup (${rentalPricing.firstWeekRent} first week rent + ${rentalPricing.securityDeposit} deposit).</p>
          <p><strong>Referral credit:</strong> Current renters who refer a new driver receive a $25 account credit after the referred driver completes four paid weeks. Referral codes are entered at intake and tracked in the renter record.</p>
        </div>
      </section>

      <section className="mt-12 card p-8">
        <h2 className="text-2xl font-semibold text-navy">Itemized replacement fee schedule</h2>
        <p className="mt-2 text-sm text-slate-600">
          Fees are deducted from the ${rentalPricing.securityDeposit} security deposit first. Any amount above the deposit is charged to the card on file.
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-borderBrand">
          <table className="w-full text-sm">
            <thead className="bg-soft">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-navy">Equipment / Accessory</th>
                <th className="px-4 py-3 text-left font-semibold text-navy">Fee</th>
                <th className="px-4 py-3 text-left font-semibold text-navy">Notes</th>
              </tr>
            </thead>
            <tbody>
              {replacementFees.map((row) => (
                <tr key={row.item} className="border-t border-borderBrand">
                  <td className="px-4 py-3 text-slate-700">{row.item}</td>
                  <td className="px-4 py-3 font-semibold text-action">${row.fee}</td>
                  <td className="px-4 py-3 text-slate-500">{row.note}</td>
                </tr>
              ))}
              <tr className="border-t border-borderBrand">
                <td className="px-4 py-3 text-slate-700">Total vehicle loss / theft</td>
                <td className="px-4 py-3 font-semibold text-action">FMV or deductible</td>
                <td className="px-4 py-3 text-slate-500">Renter is liable for fair market value ($1,200–$2,200) or the commercial insurance deductible.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
        <strong>Important:</strong> This page is a summary. Every renter must sign the full rental agreement before taking possession. The agreement includes commercial insurance requirements, GPS tracking consent, geofence and immobilization terms, and full liability provisions. Questions?{' '}
        <Link href="/scooter-rentals" className="text-action underline">
          Submit a rental request
        </Link>{' '}
        and we will contact you.
      </section>

      <section className="mt-8 rounded-2xl border border-borderBrand bg-soft p-6 text-sm leading-6 text-slate-700">
        <strong>Billing and payment questions:</strong> Contact{' '}
        <a href={`mailto:${siteConfig.billingEmail}`} className="text-action underline">
          {siteConfig.billingEmail}
        </a>{' '}
        for invoices, deposits, W-9 requests, and vendor setup.
      </section>
    </div>
  );
}
