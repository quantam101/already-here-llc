'use client';

import Link from 'next/link';
import { useState, FormEvent, ChangeEvent } from 'react';

interface FormState {
  customerName: string;
  company: string;
  email: string;
  phone: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  mileage: string;
  licensePlate: string;
  color: string;
  locationAddress: string;
  locationCity: string;
  locationState: string;
  locationZip: string;
  complaint: string;
  warningLights: string;
  batteryCondition: string;
  existingDamage: string;
  serviceType: string;
  requestedDate: string;
  requestedWindow: string;
}

const initialState: FormState = {
  customerName: '',
  company: '',
  email: '',
  phone: '',
  year: '',
  make: '',
  model: '',
  vin: '',
  mileage: '',
  licensePlate: '',
  color: '',
  locationAddress: '',
  locationCity: '',
  locationState: '',
  locationZip: '',
  complaint: '',
  warningLights: '',
  batteryCondition: '',
  existingDamage: '',
  serviceType: 'mechanic_intake',
  requestedDate: '',
  requestedWindow: ''
};

export default function AutoworksPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    const payload = {
      source: 'autoworks_web',
      channel: 'web',
      customerName: form.customerName,
      company: form.company,
      email: form.email,
      phone: form.phone,
      vehicle: {
        year: form.year ? Number(form.year) : undefined,
        make: form.make,
        model: form.model,
        vin: form.vin,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        licensePlate: form.licensePlate,
        color: form.color
      },
      locationAddress: form.locationAddress,
      locationCity: form.locationCity,
      locationState: form.locationState,
      locationZip: form.locationZip,
      complaint: form.complaint,
      condition: {
        warningLights: form.warningLights.split(/[,;]+/).map((s) => s.trim()).filter(Boolean),
        batteryCondition: form.batteryCondition,
        existingDamage: form.existingDamage
      },
      serviceType: form.serviceType,
      requestedDate: form.requestedDate,
      requestedWindow: form.requestedWindow,
      estimatedValueCents: 0
    };

    try {
      const response = await fetch('/api/autoworks/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({ error: 'Invalid response' }));

      if (response.ok && data.ok) {
        setResult({
          type: 'success',
          message: `Intake recorded. Job ID: ${data.jobId}. ${data.matchCandidates ?? 0} technician candidate(s) matched.`,
          jobId: data.jobId
        });
        setForm(initialState);
      } else {
        setResult({ type: 'error', message: data.error || 'Submission failed. Please check required fields.' });
      }
    } catch {
      setResult({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-ink">
      <section className="border-b border-borderBrand bg-soft">
        <div className="container-shell py-16 lg:py-24">
          <Link href="/services" className="text-sm font-medium text-action hover:underline">&larr; Services</Link>
          <p className="mt-6 eyebrow">AutoWorks / Mechanic Intake</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">Mobile mechanic intake</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Submit vehicle details, symptoms, and location. We write the record to the canonical graph, match available mobile technicians, and follow up with a quote before any work is authorized.
          </p>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-20">
        <form onSubmit={handleSubmit} className="mx-auto max-w-5xl rounded-3xl border border-borderBrand bg-white p-6 sm:p-10">
          <input type="text" name="websiteTrap" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

          <h2 className="text-xl font-semibold text-navy">Customer</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-navy">Full name <span className="text-action">*</span><input name="customerName" required autoComplete="name" maxLength={120} value={form.customerName} onChange={update('customerName')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Vehicle owner or fleet contact" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">Company / fleet <span className="text-action">*</span><input name="company" required autoComplete="organization" maxLength={160} value={form.company} onChange={update('company')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Business or personal name" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">Email <span className="text-action">*</span><input name="email" type="email" required autoComplete="email" maxLength={160} value={form.email} onChange={update('email')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="you@company.com" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">Phone <span className="text-action">*</span><input name="phone" type="tel" required autoComplete="tel" inputMode="tel" maxLength={40} value={form.phone} onChange={update('phone')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="(602) 555-0100" /></label>
          </div>

          <h2 className="mt-10 text-xl font-semibold text-navy">Vehicle</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-navy">Year <span className="text-action">*</span><input name="year" type="number" required min="1900" max="2100" value={form.year} onChange={update('year')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="2012" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">Make <span className="text-action">*</span><input name="make" required maxLength={80} value={form.make} onChange={update('make')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Honda" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">Model <span className="text-action">*</span><input name="model" required maxLength={80} value={form.model} onChange={update('model')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Accord" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">VIN<input name="vin" maxLength={17} value={form.vin} onChange={update('vin')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="1HGCM82633A123456" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">Mileage<input name="mileage" type="number" min="0" value={form.mileage} onChange={update('mileage')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="112000" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">License plate<input name="licensePlate" maxLength={20} value={form.licensePlate} onChange={update('licensePlate')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="ABC123" /></label>
          </div>

          <h2 className="mt-10 text-xl font-semibold text-navy">Vehicle location</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-navy">Address<input name="locationAddress" autoComplete="street-address" maxLength={160} value={form.locationAddress} onChange={update('locationAddress')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="456 Oak St" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">City <span className="text-action">*</span><input name="locationCity" required maxLength={80} value={form.locationCity} onChange={update('locationCity')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Phoenix" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">State <span className="text-action">*</span><input name="locationState" required maxLength={2} value={form.locationState} onChange={update('locationState')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="AZ" /></label>
            <label className="grid gap-2 text-sm font-medium text-navy">ZIP<input name="locationZip" maxLength={10} value={form.locationZip} onChange={update('locationZip')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="85007" /></label>
          </div>

          <h2 className="mt-10 text-xl font-semibold text-navy">Condition and request</h2>
          <div className="mt-6 grid gap-6">
            <label className="grid gap-2 text-sm font-medium text-navy">What is the vehicle doing or warning you about? <span className="text-action">*</span><textarea name="complaint" required rows={4} maxLength={2000} value={form.complaint} onChange={update('complaint')} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400" placeholder="Check engine light, rough idle, poor acceleration..." /></label>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-navy">Warning lights<input name="warningLights" maxLength={240} value={form.warningLights} onChange={update('warningLights')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="check engine, maintenance required, ABS" /></label>
              <label className="grid gap-2 text-sm font-medium text-navy">Battery condition<select name="batteryCondition" value={form.batteryCondition} onChange={update('batteryCondition')} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink"><option value="">Unknown</option><option value="Good">Good</option><option value="Weak">Weak</option><option value="Dead">Dead</option></select></label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-navy">Existing damage or notes<textarea name="existingDamage" rows={3} maxLength={1200} value={form.existingDamage} onChange={update('existingDamage')} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink placeholder:text-slate-400" placeholder="Minor scratches, prior work, parts replaced, etc." /></label>
            <div className="grid gap-6 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-navy">Service type<select name="serviceType" value={form.serviceType} onChange={update('serviceType')} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink"><option value="mechanic_intake">Mechanic intake</option><option value="diagnostics">Diagnostics</option><option value="maintenance">Maintenance</option><option value="repair">Repair</option><option value="fleet_maintenance">Fleet maintenance</option><option value="pre_purchase_inspection">Pre-purchase inspection</option></select></label>
              <label className="grid gap-2 text-sm font-medium text-navy">Preferred date<input name="requestedDate" type="date" value={form.requestedDate} onChange={update('requestedDate')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" /></label>
              <label className="grid gap-2 text-sm font-medium text-navy">Preferred window<input name="requestedWindow" maxLength={80} value={form.requestedWindow} onChange={update('requestedWindow')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="morning, afternoon, evening" /></label>
            </div>
          </div>

          {result ? (
            <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${result.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              {result.message}
            </div>
          ) : null}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={loading} className="link-ring inline-flex items-center justify-center rounded-full bg-navy px-8 py-4 text-sm font-semibold text-white transition hover:bg-action disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Submitting...' : 'Submit intake'}
            </button>
            <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-navy transition hover:border-action hover:text-action">
              Request a custom quote
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            A mobile technician will review the record and contact you before any diagnostic or repair work begins.
          </p>
        </form>
      </section>
    </main>
  );
}
