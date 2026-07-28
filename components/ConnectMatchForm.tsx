'use client';

import { FormEvent, useState } from 'react';
import { availabilityTypes, connectNeeds, connectRoles, engagementTypes } from '@/lib/connect';

export function ConnectMatchForm() {
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
      const response = await fetch('/api/connect', { method: 'POST', body: formData });
      const payload = (await response.json().catch(() => null)) as { message?: string; connectId?: string } | null;
      if (!response.ok) throw new Error(payload?.message || 'Match request could not be submitted.');
      form.reset();
      setMessage(`Request received. Reference: ${payload?.connectId ?? 'pending'}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Match request could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          I am <span className="text-action">*</span>
          <select name="submissionType" required defaultValue="" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            <option value="" disabled>Select one</option>
            <option value="worker">A person looking for work or contracts</option>
            <option value="business">A business or person needing workers or contractors</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Full name <span className="text-action">*</span>
          <input name="fullName" autoComplete="name" required maxLength={120} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
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
        <label className="grid gap-2 text-sm font-medium text-navy">
          Company (if applicable)
          <input name="company" autoComplete="organization" maxLength={160} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-navy">Role or skill (select all that apply)</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connectRoles.map((role) => (
            <label key={role.id} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-soft p-4 text-sm text-slate-700">
              <input type="checkbox" name="roles" value={role.id} className="mt-1" />
              <span><strong>{role.title}</strong><br /><span className="text-xs text-slate-500">{role.description}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-navy">Need (select all that apply)</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connectNeeds.map((need) => (
            <label key={need.id} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-soft p-4 text-sm text-slate-700">
              <input type="checkbox" name="needs" value={need.id} className="mt-1" />
              <span><strong>{need.title}</strong><br /><span className="text-xs text-slate-500">{need.description}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          Availability
          <select name="availability" defaultValue="" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            <option value="" disabled>Select availability</option>
            {availabilityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Preferred engagement type
          <select name="engagement" defaultValue="" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            <option value="" disabled>Select engagement</option>
            {engagementTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          Experience / skills summary
          <textarea name="experience" rows={4} maxLength={1500} placeholder="Licenses, certifications, equipment operated, years of experience, previous roles, and relevant skills." className="link-ring rounded-3xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Work need / job description
          <textarea name="workNeed" rows={4} maxLength={1500} placeholder="Describe the work, schedule, number of people needed, required skills, pay range, and any equipment or vehicle needs." className="link-ring rounded-3xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink" />
        </label>
      </div>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Additional details <span className="text-action">*</span>
        <textarea name="notes" rows={5} required maxLength={3000} placeholder="Describe what you are looking for, your timing, location, budget or rate expectations, and anything that affects fit." className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" />
      </label>

      <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        Do not submit Social Security numbers, bank information, driver-license numbers, or other sensitive identity data. Background, eligibility, payment, insurance, and contract terms are verified later through an approved process.
      </div>

      <div className="mt-6 grid gap-3 text-sm text-slate-700">
        <label className="flex items-start gap-3"><input type="checkbox" name="consentContact" value="true" required className="mt-1" /><span>I authorize Already Here LLC to contact me about work, contract, or matching opportunities.</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consentData" value="true" required className="mt-1" /><span>I consent to this information being retained and compared with matching supply or demand records.</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consentTruth" value="true" required className="mt-1" /><span>I certify that the information provided is accurate and that I am authorized to seek or offer work/contract opportunities.</span></label>
      </div>

      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="mt-8 flex flex-col gap-4 border-t border-borderBrand pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">Submitting this form does not create an employment, contract, or independent contractor relationship. Every match requires separate review, verification, and a written agreement.</p>
        <button type="submit" disabled={submitting} className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-70">{submitting ? 'Submitting...' : 'Submit Match Request'}</button>
      </div>
    </form>
  );
}
