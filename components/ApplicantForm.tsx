'use client';

import { FormEvent, useState } from 'react';

const workLanes = [
  'Smart hands / remote hands',
  'Network / AP / router / switch support',
  'POS / printer / kiosk / scanner support',
  'Low-voltage / cabling-adjacent support',
  'Access control / camera / AV support',
  'Healthcare-adjacent field service',
  'Mechanic / light-duty vehicle support',
  'Hauling / trailer support',
  'Project coordination / dispatch',
  'Administrative / operations support'
];

export function ApplicantForm() {
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
      const response = await fetch('/api/applicants', { method: 'POST', body: formData });
      const payload = (await response.json().catch(() => null)) as { message?: string; applicantId?: string } | null;
      if (!response.ok) throw new Error(payload?.message || 'Application could not be submitted.');
      form.reset();
      setMessage(`Application received. Reference: ${payload?.applicantId ?? 'pending'}`);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Application could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card p-6 sm:p-8" onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-6 md:grid-cols-2">
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
          <input name="state" required maxLength={40} defaultValue="Arizona" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          ZIP code
          <input name="zipCode" inputMode="numeric" maxLength={20} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Preferred work relationship <span className="text-action">*</span>
          <select name="workerPath" required defaultValue="" className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
            <option value="" disabled>Select one</option>
            <option value="1099_contractor">1099 contractor / vendor</option>
            <option value="employee">Employee candidate</option>
            <option value="either">Open to either</option>
            <option value="partner_company">Partner company</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Years of experience
          <input name="yearsExperience" type="number" min="0" max="70" step="0.5" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Travel radius in miles <span className="text-action">*</span>
          <input name="travelRadiusMiles" type="number" min="0" max="3000" required defaultValue="50" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Preferred rate or compensation range
          <input name="hourlyRate" maxLength={120} placeholder="$65/hr, project-based, negotiable, etc." className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-navy">Work lanes <span className="text-action">*</span></legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {workLanes.map((lane) => (
            <label key={lane} className="flex items-start gap-3 rounded-2xl border border-borderBrand bg-soft p-4 text-sm text-slate-700">
              <input type="checkbox" name="workLanes" value={lane} className="mt-1" />
              <span>{lane}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Skills and experience <span className="text-action">*</span>
        <textarea name="skills" rows={6} required maxLength={3000} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" placeholder="Describe equipment, platforms, environments, types of jobs, project sizes, and leadership experience." />
      </label>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">
          Certifications and licenses
          <textarea name="certifications" rows={5} maxLength={2000} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Tools and equipment
          <textarea name="tools" rows={5} maxLength={2000} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Availability <span className="text-action">*</span>
          <textarea name="availability" rows={4} required maxLength={1000} placeholder="Days, hours, same-day availability, overnight, weekends, travel." className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-navy">
          Transportation <span className="text-action">*</span>
          <textarea name="transportation" rows={4} required maxLength={500} placeholder="Reliable vehicle, truck, trailer, public transit, travel restrictions." className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" />
        </label>
      </div>

      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">
        Resume or work-history document
        <input name="resume" type="file" accept=".pdf,.doc,.docx" className="link-ring rounded-2xl border border-dashed border-borderBrand bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
        <span className="text-xs font-normal text-slate-500">PDF, DOC, or DOCX. Maximum 5 MB.</span>
      </label>

      <div className="mt-6 rounded-3xl border border-borderBrand bg-soft p-5 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-navy">Do not submit:</p>
        <p className="mt-1">Social Security number, bank information, driver-license number, passport number, medical information, or other sensitive identity data. Those items are requested only later through an approved secure process when legally necessary.</p>
      </div>

      <div className="mt-6 grid gap-3 text-sm text-slate-700">
        <label className="flex items-start gap-3"><input type="checkbox" name="consentContact" value="true" required className="mt-1" /><span>I authorize Already Here LLC to contact me regarding work, contract, partner, or employment opportunities.</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consentData" value="true" required className="mt-1" /><span>I consent to the processing and retention of this information for recruiting, staffing, dispatch, and compliance review.</span></label>
        <label className="flex items-start gap-3"><input type="checkbox" name="consentTruth" value="true" required className="mt-1" /><span>I certify that the information submitted is accurate to the best of my knowledge.</span></label>
      </div>

      {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="mt-8 flex flex-col gap-4 border-t border-borderBrand pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">Submitting an application does not create an employment, contractor, vendor, or work assignment relationship. All classifications, rates, scopes, and onboarding requirements must be separately reviewed and approved.</p>
        <button type="submit" disabled={submitting} className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-70">{submitting ? 'Submitting...' : 'Submit Application'}</button>
      </div>
    </form>
  );
}
