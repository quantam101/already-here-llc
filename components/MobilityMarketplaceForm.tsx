'use client';

import { FormEvent, useState } from 'react';

const interests = [
  ['sell_vehicle', 'Sell a vehicle'],
  ['rent_vehicle', 'Rent a vehicle to another person or business'],
  ['lease_vehicle', 'Lease a vehicle'],
  ['revenue_share', 'Revenue-share collaboration'],
  ['managed_fleet', 'Managed fleet arrangement'],
  ['delivery_capacity', 'Provide delivery capacity'],
  ['driver_with_vehicle', 'Driver with vehicle'],
  ['vehicle_without_driver', 'Vehicle without driver'],
  ['scooter_rental', 'Rent a scooter'],
  ['doordash', 'DoorDash use'],
  ['uber_eats', 'Uber Eats use'],
  ['local_courier', 'Local courier work'],
  ['business_delivery_overflow', 'Business delivery overflow']
] as const;

export function MobilityMarketplaceForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch('/api/mobility', { method: 'POST', body: formData });
      const payload = (await response.json().catch(() => null)) as { message?: string; mobilityId?: string } | null;
      if (!response.ok) throw new Error(payload?.message || 'Mobility request could not be submitted.');
      form.reset();
      setMessage(`Request received. Reference: ${payload?.mobilityId ?? 'pending'}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Mobility request could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          I am a <span className="text-action">*</span>
          <select name="participantType" required defaultValue="" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            <option value="" disabled>Select one</option>
            <option value="vehicle_owner">Vehicle owner with an unused vehicle</option>
            <option value="vehicle_seller">Vehicle owner interested in selling</option>
            <option value="business_needs_vehicles">Business needing extra vehicles</option>
            <option value="business_needs_deliveries">Business needing delivery overflow</option>
            <option value="driver_needs_vehicle">Driver needing a vehicle or scooter</option>
            <option value="scooter_renter">Personal scooter renter</option>
            <option value="fleet_partner">Fleet, dealer, rental, or mobility partner</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Full name <span className="text-action">*</span>
          <input name="fullName" autoComplete="name" required maxLength={120} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Company
          <input name="company" autoComplete="organization" maxLength={160} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Email <span className="text-action">*</span>
          <input name="email" type="email" autoComplete="email" required maxLength={160} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Phone <span className="text-action">*</span>
          <input name="phone" type="tel" autoComplete="tel" required maxLength={40} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          City <span className="text-action">*</span>
          <input name="city" required maxLength={120} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          State <span className="text-action">*</span>
          <input name="state" required defaultValue="Arizona" maxLength={40} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          ZIP code
          <input name="zipCode" maxLength={20} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-navy">Collaboration interests <span className="text-action">*</span></legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {interests.map(([value, label]) => (
            <label key={value} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-soft p-4 text-sm text-slate-700">
              <input type="checkbox" name="interests" value={value} className="mt-1" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="mt-8 rounded-3xl border border-borderBrand bg-soft p-5">
        <h2 className="text-lg font-semibold text-navy">Vehicle information</h2>
        <p className="mt-1 text-sm text-slate-600">Complete this section when offering or selling a vehicle.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <input name="vehicleType" maxLength={80} placeholder="Vehicle type" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
          <input name="vehicleYear" maxLength={10} placeholder="Year" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
          <input name="vehicleMake" maxLength={80} placeholder="Make" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
          <input name="vehicleModel" maxLength={80} placeholder="Model" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
          <input name="mileage" maxLength={40} placeholder="Mileage" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
          <input name="askingPrice" maxLength={80} placeholder="Asking price or preferred payment" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </div>
        <textarea name="vehicleCondition" rows={4} maxLength={1500} placeholder="Condition, known issues, availability, registration, insurance, and preferred arrangement." className="mt-5 w-full link-ring rounded-3xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
      </section>

      <section className="mt-8 rounded-3xl border border-borderBrand bg-soft p-5">
        <h2 className="text-lg font-semibold text-navy">Business vehicle or delivery need</h2>
        <p className="mt-1 text-sm text-slate-600">Complete this section when your company needs vehicles, drivers, courier support, or overflow deliveries.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <input name="vehiclesNeeded" type="number" min="0" max="1000" placeholder="Number of vehicles needed" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
          <input name="vehicleTypesNeeded" maxLength={300} placeholder="Vehicle types needed" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
          <input name="serviceArea" maxLength={300} placeholder="Service area or routes" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
          <input name="schedule" maxLength={300} placeholder="Schedule, days, hours, or start date" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
          <input name="deliveryVolume" maxLength={300} placeholder="Estimated delivery volume" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
          <input name="budget" maxLength={200} placeholder="Budget or target rate" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </div>
        <textarea name="cargoRequirements" rows={4} maxLength={1500} placeholder="Cargo size, weight, temperature control, equipment, driver requirements, pickup/return procedures, and other constraints." className="mt-5 w-full link-ring rounded-3xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
      </section>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Additional details <span className="text-action">*</span>
        <textarea name="notes" rows={6} required maxLength={3000} placeholder="Describe what you have, what you need, timing, preferred collaboration structure, and anything that affects fit." className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" />
      </label>

      <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        Do not submit title numbers, driver-license numbers, Social Security numbers, bank information, insurance policy numbers, or other sensitive identity data. Ownership, insurance, registration, driving eligibility, pricing, and contract terms are verified later through an approved process.
      </div>

      <div className="mt-6 grid gap-3 text-sm text-slate-700">
        <label className="flex items-start gap-3"><input type="checkbox" name="consentContact" value="true" required className="mt-1" /><span>I authorize Already Here LLC to contact me regarding mobility, vehicle, delivery, rental, purchase, or partnership opportunities.</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consentData" value="true" required className="mt-1" /><span>I consent to this information being retained and compared with matching supply or demand records.</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consentTruth" value="true" required className="mt-1" /><span>I certify that the information provided is accurate and that I am authorized to discuss the vehicle or business need submitted.</span></label>
      </div>

      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="mt-8 flex flex-col gap-4 border-t border-borderBrand pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">Submitting this form does not create a rental, employment, purchase, delivery, brokerage, fleet, or revenue-sharing agreement. Every match requires separate review and written approval.</p>
        <button type="submit" disabled={submitting} className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-70">{submitting ? 'Submitting...' : 'Submit Mobility Request'}</button>
      </div>
    </form>
  );
}
