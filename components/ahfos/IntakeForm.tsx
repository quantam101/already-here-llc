'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function IntakeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    zip: '',
    assetCategory: '',
    assetMake: '',
    assetModel: '',
    serialNumber: '',
    urgency: 'normal',
    preferredSchedule: '',
    problemDescription: '',
    photos: '',
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name: form.name,
      company: form.company,
      email: form.email,
      phone: form.phone,
      address: {
        line1: form.line1,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: 'US',
      },
      assetCategory: form.assetCategory,
      assetMake: form.assetMake,
      assetModel: form.assetModel,
      serialNumber: form.serialNumber,
      urgency: form.urgency,
      preferredSchedule: form.preferredSchedule,
      problemDescription: form.problemDescription,
      photos: form.photos.split('\n').map((u) => u.trim()).filter(Boolean),
    };

    try {
      const res = await fetch('/api/ahfos/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({ message: 'Request failed.' }))) as { message?: string };
      if (!res.ok) throw new Error(data.message || 'Request failed.');
      router.push('/portal');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-navy">Request service</h1>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Full name <span className="text-action">*</span>
          <input required value={form.name} onChange={(e) => update('name', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Company
          <input value={form.company} onChange={(e) => update('company', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Email <span className="text-action">*</span>
          <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Phone <span className="text-action">*</span>
          <input required value={form.phone} onChange={(e) => update('phone', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
          Site address <span className="text-action">*</span>
          <input required value={form.line1} onChange={(e) => update('line1', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          City <span className="text-action">*</span>
          <input required value={form.city} onChange={(e) => update('city', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            State <span className="text-action">*</span>
            <input required value={form.state} onChange={(e) => update('state', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            ZIP <span className="text-action">*</span>
            <input required value={form.zip} onChange={(e) => update('zip', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Asset category
          <input value={form.assetCategory} onChange={(e) => update('assetCategory', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" placeholder="POS, router, printer, medical device..." />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Asset make
          <input value={form.assetMake} onChange={(e) => update('assetMake', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Asset model
          <input value={form.assetModel} onChange={(e) => update('assetModel', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Serial / asset tag
          <input value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Urgency
          <select value={form.urgency} onChange={(e) => update('urgency', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm">
            <option value="normal">Normal</option>
            <option value="same-day">Same day</option>
            <option value="emergency">Emergency / down</option>
            <option value="quote">Quote request</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Preferred schedule
          <input value={form.preferredSchedule} onChange={(e) => update('preferredSchedule', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" placeholder="ASAP, tomorrow AM, flexible" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
          Problem description <span className="text-action">*</span>
          <textarea required rows={5} value={form.problemDescription} onChange={(e) => update('problemDescription', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
          Photo URLs (one per line)
          <textarea rows={3} value={form.photos} onChange={(e) => update('photos', e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" placeholder="https://example.com/photo1.jpg" />
        </label>
      </div>

      <button type="submit" disabled={loading} className="mt-8 w-full rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white hover:bg-navy disabled:opacity-50">
        {loading ? 'Submitting...' : 'Submit service request'}
      </button>
    </form>
  );
}
