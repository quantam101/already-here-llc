'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

const acceptedFileTypes = ['application/pdf', 'image/jpeg', 'image/png'];
const maxFileSize = 10 * 1024 * 1024;

type SubmitState = { error: string | null; success: boolean };

export function RFQForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<SubmitState>({ error: null, success: false });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ error: null, success: false });

    const form = event.currentTarget;
    const sourceData = new FormData(form);

    if (String(sourceData.get('website') || '').trim()) {
      setState({ error: 'Submission rejected.', success: false });
      return;
    }

    const required = ['fullName', 'company', 'email', 'projectLocation', 'projectScope', 'timeline'];
    for (const field of required) {
      if (!String(sourceData.get(field) || '').trim()) {
        setState({ error: 'Complete all required RFQ fields before submitting.', success: false });
        return;
      }
    }

    const email = String(sourceData.get('email') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState({ error: 'Use a valid business email address.', success: false });
      return;
    }

    const attachment = sourceData.get('attachment');
    if (attachment instanceof File && attachment.size > 0) {
      if (!acceptedFileTypes.includes(attachment.type)) {
        setState({ error: 'Attachment must be a PDF, JPG, or PNG file.', success: false });
        return;
      }
      if (attachment.size > maxFileSize) {
        setState({ error: 'Attachment must be 10 MB or smaller.', success: false });
        return;
      }
    }

    const message = [
      'RFQ / Project-based bid request',
      '',
      `Project scope: ${String(sourceData.get('projectScope') || '').trim()}`,
      `Timeline / bid deadline: ${String(sourceData.get('timeline') || '').trim()}`,
      `Locations / site count: ${String(sourceData.get('projectLocation') || '').trim()}`,
      `Estimated site count: ${String(sourceData.get('siteCount') || '').trim() || 'Not specified'}`,
      `Required closeout: ${String(sourceData.get('closeoutRequirements') || '').trim() || 'Not specified'}`,
      `Access constraints: ${String(sourceData.get('accessConstraints') || '').trim() || 'Not specified'}`,
      `Budget / rate guidance: ${String(sourceData.get('budget') || '').trim() || 'Not specified'}`,
      '',
      `Additional notes: ${String(sourceData.get('notes') || '').trim() || 'None'}`
    ].join('\n');

    const dispatchData = new FormData();
    dispatchData.set('fullName', String(sourceData.get('fullName') || '').trim());
    dispatchData.set('company', String(sourceData.get('company') || '').trim());
    dispatchData.set('email', email);
    dispatchData.set('phone', String(sourceData.get('phone') || '').trim());
    dispatchData.set('siteCity', String(sourceData.get('projectLocation') || '').trim());
    dispatchData.set('siteZip', '');
    dispatchData.set('serviceType', 'RFQ / project-based bid');
    dispatchData.set('requestedDate', '');
    dispatchData.set('requestedTime', '');
    dispatchData.set('requestedWindow', String(sourceData.get('timeline') || '').trim());
    dispatchData.set('ticketNumber', String(sourceData.get('rfqNumber') || '').trim());
    dispatchData.set('message', message);

    if (attachment instanceof File && attachment.size > 0) {
      dispatchData.set('attachment', attachment, attachment.name);
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/dispatch', { method: 'POST', body: dispatchData });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message || 'RFQ request could not be submitted.');
      form.reset();
      setState({ error: null, success: true });
      router.push('/thank-you');
    } catch (error) {
      setState({ error: error instanceof Error ? error.message : 'RFQ request could not be submitted.', success: false });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="card p-6 sm:p-8" onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">Full name <span className="text-action">*</span><input name="fullName" required autoComplete="name" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Company <span className="text-action">*</span><input name="company" required autoComplete="organization" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Business email <span className="text-action">*</span><input name="email" type="email" required autoComplete="email" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Phone<input name="phone" type="tel" autoComplete="tel" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Project location / sites <span className="text-action">*</span><input name="projectLocation" required placeholder="City, market, region, or list of sites" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Estimated site count<input name="siteCount" inputMode="numeric" placeholder="1, 5, 20+, TBD" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Timeline / bid deadline <span className="text-action">*</span><input name="timeline" required placeholder="Target start date, deadline, rollout window" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">RFQ / project reference<input name="rfqNumber" placeholder="Optional PO, RFQ, ticket, or bid reference" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" /></label>
      </div>
      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">Project scope <span className="text-action">*</span><textarea name="projectScope" required rows={6} placeholder="Work type, equipment, deliverables, assumptions, travel needs, and what must be priced." className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" /></label>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-navy">Closeout requirements<textarea name="closeoutRequirements" rows={4} placeholder="Photos, labels, serials, signoff, test results, ticket notes." className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" /></label>
        <label className="grid gap-2 text-sm font-medium text-navy">Access constraints<textarea name="accessConstraints" rows={4} placeholder="After-hours access, escort, badge, lift, ladder, parking, site contact." className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" /></label>
      </div>
      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">Budget / rate guidance<input name="budget" placeholder="Optional target rate, NTE, or pricing model" className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" /></label>
      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">Additional notes<textarea name="notes" rows={4} className="link-ring rounded-3xl border border-borderBrand px-4 py-3 text-sm leading-6 text-ink" /></label>
      <label className="mt-6 grid gap-2 text-sm font-medium text-navy">Attachment<input name="attachment" type="file" accept=".pdf,.jpg,.jpeg,.png" className="link-ring rounded-2xl border border-dashed border-borderBrand bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" /><span className="text-xs font-normal text-slate-500">Accepted: PDF, JPG, JPEG, PNG. Max 10 MB.</span></label>
      {state.error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div> : null}
      {state.success ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">RFQ submitted successfully.</div> : null}
      <div className="mt-8 flex flex-col gap-4 border-t border-borderBrand pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-slate-500">RFQs route through the same dispatch record system and receive a dispatch ID for tracking.</p>
        <button type="submit" disabled={isSubmitting} className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? 'Submitting...' : 'Submit RFQ'}</button>
      </div>
    </form>
  );
}
