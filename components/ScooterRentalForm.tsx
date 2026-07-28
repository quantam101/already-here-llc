'use client';

import { FormEvent, useState } from 'react';
import { addOnItems, fleetAvailability, proDeliveryKit, rentalPricing } from '@/lib/scooter-rental';

export function ScooterRentalForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'weekly'>('monthly');
  const [proKitSelected, setProKitSelected] = useState(true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch('/api/scooter-rental', { method: 'POST', body: formData });
      const payload = (await response.json().catch(() => null)) as { message?: string; rentalId?: string } | null;
      if (!response.ok) throw new Error(payload?.message || 'Rental request could not be submitted.');
      form.reset();
      setSelectedPlan('monthly');
      setProKitSelected(true);
      setMessage(`Request received. Reference: ${payload?.rentalId ?? 'pending'}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Rental request could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  const depositNotice = fleetAvailability.availableNow > 0
    ? `Onboarding charge: $${rentalPricing.onboardingCharge} ($${rentalPricing.firstWeekRent} rent + $${rentalPricing.securityDeposit} deposit) due after approval.`
    : 'No scooter is currently available. You can join the waitlist; check the box below to pre-pay a $150 deposit now and lock the next available unit.';

  return (
    <form className="card p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="rounded-2xl border border-borderBrand bg-soft p-5">
        <p className="text-sm font-semibold text-navy">Fleet status</p>
        <p className="mt-1 text-sm text-slate-600">
          {fleetAvailability.availableNow} of {fleetAvailability.totalUnits} scooters available.
          {fleetAvailability.availableNow === 0 ? ' Waitlist is open.' : ''}
        </p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          Full name <span className="text-action">*</span>
          <input name="fullName" autoComplete="name" required maxLength={120} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Email <span className="text-action">*</span>
          <input name="email" type="email" autoComplete="email" required maxLength={160} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Phone <span className="text-action">*</span>
          <input name="phone" type="tel" autoComplete="tel" required maxLength={40} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          City <span className="text-action">*</span>
          <input name="city" required maxLength={120} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          State <span className="text-action">*</span>
          <input name="state" required defaultValue="Arizona" maxLength={40} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          ZIP code
          <input name="zipCode" maxLength={20} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Driver&apos;s license number <span className="text-action">*</span>
          <input name="licenseNumber" required maxLength={80} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Delivery platforms <span className="text-action">*</span>
          <input name="deliveryPlatforms" required maxLength={200} placeholder="e.g. DoorDash, Uber Eats, Grubhub" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
      </div>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Preferred rental plan <span className="text-action">*</span>
        <select
          name="rentalPlan"
          required
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value as 'monthly' | 'weekly')}
          className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink"
        >
          <option value="monthly">Monthly — $550/month (recommended, ~$137.50/week, priority availability)</option>
          <option value="weekly">Weekly — $155/week (flexible)</option>
        </select>
      </label>

      <section className="mt-6 rounded-2xl border border-action/30 bg-action/5 p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="proDeliveryKit"
            value="true"
            checked={proKitSelected}
            onChange={(e) => setProKitSelected(e.target.checked)}
            className="mt-1"
          />
          <div>
            <span className="text-sm font-semibold text-navy">Add the Pro Delivery Kit — ${proDeliveryKit.weekly}/week</span>
            <p className="mt-1 text-sm text-slate-600">{proDeliveryKit.contents.join(', ')}. {proDeliveryKit.savingsCopy}.</p>
          </div>
        </label>
      </section>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-navy">Optional individual add-ons</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {addOnItems.map((item) => (
            <label key={item.name} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-soft p-4 text-sm text-slate-700">
              <input type="checkbox" name="addOns" value={item.name} className="mt-1" />
              <span>
                {item.name}
                <span className="block text-xs text-slate-500">+${item.weekly}/week{item.purchase ? ` · $${item.purchase} to buy` : ''}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Start date <span className="text-action">*</span>
        <input name="startDate" type="date" required className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
      </label>

      {fleetAvailability.availableNow === 0 ? (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <label className="flex items-start gap-3 text-sm text-amber-900">
            <input type="checkbox" name="joinWaitlist" value="true" className="mt-1" />
            <span>Join the waitlist and pre-pay the $150 security deposit now to lock the next available scooter. This deposit is refundable if you decline the unit.</span>
          </label>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-borderBrand bg-soft p-5">
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" name="payDepositNow" value="true" className="mt-1" />
          <span>Pre-pay the $150 security deposit now to reserve my spot immediately after approval (recommended when availability is tight).</span>
        </label>
      </section>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Referral code (optional)
        <input name="referralCode" maxLength={80} placeholder="If a current renter referred you, enter their code" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
      </label>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Additional details <span className="text-action">*</span>
        <textarea name="notes" rows={5} required maxLength={2000} placeholder="Describe your delivery schedule, experience, and anything that affects fit." className="link-ring rounded-3xl border border-borderBrand bg-white px-4 py-3 text-sm leading-6 text-ink" />
      </label>

      <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        Do not submit Social Security numbers, bank information, insurance policy numbers, or other sensitive identity data. License, insurance, and payment verification are completed later through an approved process.
      </div>

      <div className="mt-6 rounded-2xl border border-borderBrand bg-soft p-5">
        <p className="text-sm text-slate-700"><strong>Deposit / charge summary</strong></p>
        <p className="mt-1 text-sm text-slate-600">{depositNotice}</p>
        <p className="mt-2 text-sm text-slate-600">
          Selected plan: <strong className="text-navy">{selectedPlan === 'monthly' ? `$${rentalPricing.monthlyRate}/month` : `$${rentalPricing.weeklyRate}/week`}</strong>
          {proKitSelected ? ` + Pro Delivery Kit $${proDeliveryKit.weekly}/week` : ''}
        </p>
      </div>

      <div className="mt-6 grid gap-3 text-sm text-slate-700">
        <label className="flex items-start gap-3"><input type="checkbox" name="consentContact" value="true" required className="mt-1" /><span>I authorize Already Here LLC to contact me about scooter rental availability and next steps.</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consentData" value="true" required className="mt-1" /><span>I consent to this information being retained for rental screening and matching.</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consentTerms" value="true" required className="mt-1" /><span>I have read the rental terms and agree to the onboarding charge and refundable deposit if approved.</span></label>
      </div>

      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="mt-8 flex flex-col gap-4 border-t border-borderBrand pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">Submitting this form does not create a rental agreement. Every rental requires license verification, insurance review, scooter availability confirmation, and a signed contract.</p>
        <button type="submit" disabled={submitting} className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-70">{submitting ? 'Submitting...' : fleetAvailability.availableNow > 0 ? 'Reserve Scooter' : 'Join Waitlist'}</button>
      </div>
    </form>
  );
}
