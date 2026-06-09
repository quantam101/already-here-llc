'use client';

import { FormEvent, useMemo, useState } from 'react';

const starterMessages = [
  'I qualify website visitors, quote requests, missed leads, and dispatch-style service requests.',
  'For most service businesses, the fastest offer is Launch Agent at $997 setup plus $197 per month.',
  'For higher lead volume or routing logic, Growth Agent starts at $1,997 setup plus $397 per month.'
];

const budgetOptions = ['Under $1,000', '$1,000 - $2,500', '$2,500 - $5,000', '$5,000+'];
const urgencyOptions = ['Today', 'This week', 'This month', 'Researching'];
const packageOptions = ['Launch Agent', 'Growth Agent', 'Network Agent', 'Need recommendation'];

type LeadForm = {
  fullName: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  businessType: string;
  packageInterest: string;
  urgency: string;
  budget: string;
  currentLeadProblem: string;
  goals: string;
  websiteTrap: string;
};

const initialForm: LeadForm = {
  fullName: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  businessType: '',
  packageInterest: 'Need recommendation',
  urgency: 'This week',
  budget: '$1,000 - $2,500',
  currentLeadProblem: '',
  goals: '',
  websiteTrap: ''
};

function buildAdvisorText(form: LeadForm): string {
  const problem = `${form.businessType} ${form.currentLeadProblem} ${form.goals}`.toLowerCase();
  if (form.packageInterest === 'Network Agent' || problem.includes('multi') || problem.includes('dispatch')) {
    return 'Recommended path: Network Agent. You need routing, approval gates, escalation, and lead records that can support recurring operations.';
  }
  if (form.packageInterest === 'Growth Agent' || problem.includes('missed') || problem.includes('quote') || problem.includes('follow')) {
    return 'Recommended path: Growth Agent. The money is in missed-lead recovery, quote routing, and follow-up discipline.';
  }
  return 'Recommended path: Launch Agent. Start with a fast website chatbox, owner alerts, and quote intake, then upgrade once lead volume justifies it.';
}

export function RevenueAgentWidget() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LeadForm>(initialForm);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');
  const advisorText = useMemo(() => buildAdvisorText(form), [form]);

  function updateField<K extends keyof LeadForm>(key: K, value: LeadForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setResult('');

    try {
      const response = await fetch('/api/ai-agent-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sourcePath: window.location.pathname })
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string; leadId?: string; grade?: string; score?: number };
      if (!response.ok || !payload.leadId) throw new Error(payload.message || 'Lead submission failed.');
      setStatus('success');
      setResult(`Received. Lead ${payload.leadId} is graded ${payload.grade ?? 'queued'} with score ${payload.score ?? 'pending'}.`);
      setForm(initialForm);
    } catch (error) {
      setStatus('error');
      setResult(error instanceof Error ? error.message : 'Submission failed.');
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] max-w-[calc(100vw-2.5rem)]">
      {open ? (
        <section className="w-[380px] max-w-full overflow-hidden rounded-3xl border border-[#20314a] bg-[#07111f] shadow-2xl" aria-label="AI website agent lead capture">
          <div className="border-b border-[#20314a] bg-[#040a14] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fb6ff]">Already Here AI Web Agent</p>
                <h2 className="mt-2 text-lg font-semibold text-white">Turn visitors into qualified leads.</h2>
              </div>
              <button type="button" className="rounded-full border border-white/20 px-3 py-1 text-sm text-white" onClick={() => setOpen(false)} aria-label="Close AI Web Agent">
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {starterMessages.map((message) => (
                <p key={message} className="rounded-2xl border border-[#20314a] bg-white/5 px-3 py-2 text-sm leading-6 text-[#e5edf7]">{message}</p>
              ))}
            </div>
          </div>

          <form onSubmit={submitLead} className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
            <input className="hidden" tabIndex={-1} autoComplete="off" value={form.websiteTrap} onChange={(event) => updateField('websiteTrap', event.target.value)} aria-hidden="true" />

            <div className="grid gap-3 sm:grid-cols-2">
              <input required placeholder="Name" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} className="rounded-2xl border px-3 py-3 text-sm" />
              <input required placeholder="Company" value={form.company} onChange={(event) => updateField('company', event.target.value)} className="rounded-2xl border px-3 py-3 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input required type="email" placeholder="Email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="rounded-2xl border px-3 py-3 text-sm" />
              <input required placeholder="Phone" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} className="rounded-2xl border px-3 py-3 text-sm" />
            </div>
            <input placeholder="Website" value={form.website} onChange={(event) => updateField('website', event.target.value)} className="w-full rounded-2xl border px-3 py-3 text-sm" />
            <input required placeholder="Business type" value={form.businessType} onChange={(event) => updateField('businessType', event.target.value)} className="w-full rounded-2xl border px-3 py-3 text-sm" />

            <div className="grid gap-3 sm:grid-cols-3">
              <select value={form.packageInterest} onChange={(event) => updateField('packageInterest', event.target.value)} className="rounded-2xl border px-3 py-3 text-sm">
                {packageOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={form.urgency} onChange={(event) => updateField('urgency', event.target.value)} className="rounded-2xl border px-3 py-3 text-sm">
                {urgencyOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <select value={form.budget} onChange={(event) => updateField('budget', event.target.value)} className="rounded-2xl border px-3 py-3 text-sm">
                {budgetOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>

            <textarea placeholder="Current lead problem" value={form.currentLeadProblem} onChange={(event) => updateField('currentLeadProblem', event.target.value)} className="min-h-20 w-full rounded-2xl border px-3 py-3 text-sm" />
            <textarea required placeholder="What should the agent capture, qualify, book, or route?" value={form.goals} onChange={(event) => updateField('goals', event.target.value)} className="min-h-24 w-full rounded-2xl border px-3 py-3 text-sm" />

            <p className="rounded-2xl border border-[#20314a] bg-white/5 px-3 py-3 text-sm leading-6 text-[#e5edf7]">{advisorText}</p>

            <button disabled={status === 'submitting'} type="submit" className="w-full rounded-2xl bg-[#1b66ff] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {status === 'submitting' ? 'Submitting...' : 'Request AI Agent Proposal'}
            </button>
            {result ? <p className={status === 'error' ? 'text-sm text-red-200' : 'text-sm text-[#b8c4d6]'}>{result}</p> : null}
          </form>
        </section>
      ) : (
        <button type="button" className="rounded-full border border-[#8fb6ff]/60 bg-[#1b66ff] px-5 py-3 text-sm font-semibold text-white shadow-2xl" onClick={() => setOpen(true)}>
          AI Web Agent
        </button>
      )}
    </div>
  );
}
