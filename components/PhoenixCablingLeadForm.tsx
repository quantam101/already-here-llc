'use client';

import { useState, type FormEvent } from 'react';

type State = 'idle' | 'sending' | 'sent' | 'error';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20';
const labelClass = 'block text-sm font-medium text-slate-100';

export function PhoenixCablingLeadForm() {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');
  const [receiptSent, setReceiptSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setMessage('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const params = new URLSearchParams(window.location.search);
    const payload = {
      fullName: String(data.get('fullName') || ''),
      company: String(data.get('company') || ''),
      email: String(data.get('email') || ''),
      siteZip: String(data.get('siteZip') || ''),
      projectType: String(data.get('projectType') || ''),
      projectStage: String(data.get('projectStage') || ''),
      marketingConsent: data.get('marketingConsent') === 'yes',
      website: String(data.get('website') || ''),
      utmSource: params.get('utm_source') || '',
      utmCampaign: params.get('utm_campaign') || ''
    };
    try {
      const res = await fetch('/api/phoenix-cabling-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
      const result = await res.json() as { ok?: boolean; message?: string; receiptSent?: boolean };
      if (!res.ok || !result.ok) throw new Error(result.message || 'Submission could not be delivered.');
      setReceiptSent(Boolean(result.receiptSent));
      setState('sent');
      form.reset();
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-slate-900 p-6 sm:p-8" role="status" aria-live="polite">
        <h2 className="text-2xl font-bold text-white">Your checklist is ready.</h2>
        <p className="mt-3 text-slate-300">
          Your request was received. {receiptSent ? 'We also sent the guide to your email address.' : 'Download it here; an email receipt could not be confirmed.'}
        </p>
        <a className="mt-6 block rounded-lg bg-amber-400 px-5 py-3 text-center font-bold text-slate-950 hover:bg-amber-300" href="/api/phoenix-cabling-guide" target="_blank" rel="noopener noreferrer">
          Open the free PDF checklist
        </a>
        <a className="mt-4 block text-center text-sm font-semibold text-amber-300 underline underline-offset-4" href="/rfq">Request a project scope review</a>
        <p className="mt-5 text-xs text-slate-400">No appointment or project obligation was created by requesting this guide.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8" aria-label="Request the free Phoenix cabling guide">
      <h2 className="text-xl font-bold text-white">Get the free PDF guide</h2>
      <p className="text-sm leading-6 text-slate-300">Complete the short form and receive an immediate download link. No sales appointment is required.</p>
      <div>
        <label className={labelClass} htmlFor="cabling-full-name">Your name *</label>
        <input className={inputClass} id="cabling-full-name" name="fullName" required autoComplete="name" maxLength={120} placeholder="Full name"/>
      </div>
      <div>
        <label className={labelClass} htmlFor="cabling-company">Company *</label>
        <input className={inputClass} id="cabling-company" name="company" required autoComplete="organization" maxLength={160} placeholder="Business or project organization"/>
      </div>
      <div>
        <label className={labelClass} htmlFor="cabling-email">Business email *</label>
        <input className={inputClass} id="cabling-email" name="email" type="email" required autoComplete="email" maxLength={160} placeholder="you@company.com"/>
      </div>
      <div>
        <label className={labelClass} htmlFor="cabling-location">Project ZIP or Valley city *</label>
        <input className={inputClass} id="cabling-location" name="siteZip" required maxLength={80} placeholder="85004, Downtown Phoenix"/>
      </div>
      <div>
        <label className={labelClass} htmlFor="cabling-type">Project type *</label>
        <select className={inputClass} id="cabling-type" name="projectType" required defaultValue="">
          <option value="" disabled>Select a project type</option>
          <option>Office build-out</option>
          <option>Warehouse expansion</option>
          <option>Network upgrade</option>
          <option>Other / not sure</option>
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="cabling-stage">When is your project? *</label>
        <select className={inputClass} id="cabling-stage" name="projectStage" required defaultValue="">
          <option value="" disabled>Select your project stage</option>
          <option>Active project</option>
          <option>Planning</option>
          <option>Researching</option>
        </select>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-slate-700 p-3">
        <input className="mt-1 h-4 w-4 shrink-0" id="cabling-marketing" name="marketingConsent" type="checkbox" value="yes"/>
        <label className="text-xs leading-5 text-slate-300" htmlFor="cabling-marketing">
          Optional: Send me additional project-planning tips and service updates by email. I understand I may opt out of future marketing. This is not required to download the guide.
        </label>
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="cabling-website">Leave this field blank</label>
        <input id="cabling-website" name="website" tabIndex={-1} autoComplete="off"/>
      </div>
      <button disabled={state === 'sending'} className="w-full rounded-lg bg-amber-400 px-5 py-3.5 font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60" type="submit">
        {state === 'sending' ? 'Submitting your request…' : 'Get the free checklist'}
      </button>
      {state === 'error' && <p className="text-sm text-red-300" role="alert">{message} You can reach us at <a href="mailto:dispatch@alreadyherellc.com" className="underline">dispatch@alreadyherellc.com</a>.</p>}
      <p className="text-center text-xs leading-5 text-slate-400">
        Guide delivery is separate from marketing permission. Your details are used to deliver the requested guide and respond to project inquiries. See our <a className="underline" href="/privacy">privacy policy</a>.
      </p>
    </form>
  );
}
