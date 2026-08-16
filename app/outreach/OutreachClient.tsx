'use client';

import { useMemo, useState } from 'react';

type OutreachRecord = {
  id: string;
  full_name: string;
  company: string;
  email: string | null;
  phone: string | null;
  channel: string;
  message_type: string;
  offer: string;
  status: string;
  next_action: string | null;
  next_follow_up_date: string | null;
  created_at: string;
};

type FormState = {
  source: string;
  channel: string;
  fullName: string;
  company: string;
  email: string;
  phone: string;
  domain: string;
  messageType: string;
  offer: string;
  messageBody: string;
  status: string;
  nextAction: string;
  nextFollowUpDate: string;
  assignedTo: string;
};

const initialForm: FormState = {
  source: 'outreach_ui',
  channel: 'email',
  fullName: '',
  company: '',
  email: '',
  phone: '',
  domain: '',
  messageType: 'warm_customer',
  offer: 'Managed Operations Support',
  messageBody: '',
  status: 'draft',
  nextAction: '',
  nextFollowUpDate: '',
  assignedTo: ''
};

const offers = [
  'Managed Operations Support',
  'Field Operations Workflow Review',
  'Field Operations Implementation',
  'Equipment Lifecycle Assessment',
  'Asset Register + QR Deployment',
  'Website & Cloud Operations',
  'AutoWorks Mechanic Intake',
  'Field Operations Template Library',
  'Partner / Affiliate Program',
  'Technician Network'
];

const channels = ['email', 'phone', 'social', 'sms', 'in_person', 'vendor', 'other'];
const statuses = ['draft', 'ready', 'sent', 'responded', 'meeting', 'proposal', 'won', 'lost', 'no_response', 'do_not_contact'];
const messageTypes = ['warm_customer', 'new_prospect', 'partner_vendor', 'technician_recruiting', 'referral'];

export default function OutreachClient({ initialRecords }: { initialRecords: Record<string, unknown>[] }) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [records, setRecords] = useState<OutreachRecord[]>(initialRecords as unknown as OutreachRecord[]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [csvText, setCsvText] = useState('');

  const api = useMemo(() => '/api/outreach', []);

  const load = async () => {
    try {
      const res = await fetch(api, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && Array.isArray(json.records)) {
        setRecords(json.records.slice(0, 50));
      }
    } catch {
      setRecords([]);
    }
  };

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (json.ok) {
        setMessage(`Outreach record created: ${json.outreachId}`);
        setForm(initialForm);
        await load();
      } else {
        setMessage(`Error: ${json.error ?? 'Failed'}`);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  const importCsv = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    setMessage(null);
    const rows = csvText.split('\n').filter(Boolean).map((line) => line.split(',').map((cell) => cell.trim()));
    if (rows.length < 2) {
      setMessage('CSV needs at least a header row and one data row.');
      setLoading(false);
      return;
    }
    const [header, ...data] = rows;
    const getIndex = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    const idxChannel = getIndex('channel');
    const idxFullName = getIndex('fullName');
    const idxCompany = getIndex('company');
    const idxEmail = getIndex('email');
    const idxPhone = getIndex('phone');
    const idxMessageType = getIndex('messageType');
    const idxOffer = getIndex('offer');

    let created = 0;
    let failed = 0;

    for (const row of data) {
      const payload = {
        source: 'outreach_csv_import',
        channel: row[idxChannel] || 'email',
        fullName: row[idxFullName] || '',
        company: row[idxCompany] || '',
        email: row[idxEmail] || undefined,
        phone: row[idxPhone] || undefined,
        messageType: row[idxMessageType] || 'new_prospect',
        offer: row[idxOffer] || 'Managed Operations Support'
      };
      try {
        const res = await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if ((await res.json()).ok) created += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }

    setMessage(`CSV import complete: ${created} created, ${failed} failed.`);
    setCsvText('');
    await load();
    setLoading(false);
  };

  return (
    <main className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Outreach pipeline</span>
      <h1 className="section-title mt-5">Warm contacts, prospects & partners</h1>
      <p className="section-copy">
        Create outreach records manually or import a CSV. Each record normalizes identity, links to one canonical company/contact, and opens a follow-up.
      </p>

      {message ? (
        <div className="mt-6 rounded-2xl border border-action/30 bg-action/5 p-4 text-sm text-navy">
          {message}
        </div>
      ) : null}

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-navy">Add outreach record</h2>
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-navy">Channel
                <select value={form.channel} onChange={update('channel')} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
                  {channels.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-navy">Message type
                <select value={form.messageType} onChange={update('messageType')} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
                  {messageTypes.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-navy">Full name <span className="text-action">*</span>
                <input required value={form.fullName} onChange={update('fullName')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Jane Smith" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-navy">Company <span className="text-action">*</span>
                <input required value={form.company} onChange={update('company')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Acme Logistics" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-navy">Email
                <input type="email" value={form.email} onChange={update('email')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="jane@acme.com" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-navy">Phone
                <input type="tel" value={form.phone} onChange={update('phone')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="(602) 555-0100" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-navy">Domain
              <input value={form.domain} onChange={update('domain')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="acme.com" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-navy">Offer
              <select value={form.offer} onChange={update('offer')} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
                {offers.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-navy">Message body
              <textarea value={form.messageBody} onChange={update('messageBody')} rows={3} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Personalized outreach message or notes" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-navy">Status
                <select value={form.status} onChange={update('status')} className="link-ring rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-ink">
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-navy">Next follow-up
                <input type="datetime-local" value={form.nextFollowUpDate} onChange={update('nextFollowUpDate')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-navy">Next action
              <input value={form.nextAction} onChange={update('nextAction')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="Send proposal, schedule demo, etc." />
            </label>
            <label className="grid gap-2 text-sm font-medium text-navy">Assigned to
              <input value={form.assignedTo} onChange={update('assignedTo')} className="link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400" placeholder="owner@alreadyhere.llc" />
            </label>
            <button type="submit" disabled={loading} className="mt-2 inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white hover:bg-action/90 disabled:opacity-50">
              {loading ? 'Saving...' : 'Create outreach record'}
            </button>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-navy">Import warm contacts</h2>
          <p className="mt-2 text-sm text-slate-600">Paste CSV with columns: channel, fullName, company, email, phone, messageType, offer.</p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={8}
            className="mt-4 w-full link-ring rounded-2xl border border-borderBrand px-4 py-3 text-sm text-ink placeholder:text-slate-400"
            placeholder="channel,fullName,company,email,phone,messageType,offer&#10;email,Jane Smith,Acme Logistics,jane@acme.com,(602) 555-0100,warm_customer,Managed Operations Support"
          />
          <button onClick={importCsv} disabled={loading} className="mt-4 inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50">
            {loading ? 'Importing...' : 'Import CSV'}
          </button>
          <button onClick={load} disabled={loading} className="ml-3 mt-4 inline-flex items-center justify-center rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy hover:bg-navy/5 disabled:opacity-50">
            Refresh
          </button>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-borderBrand bg-soft p-6">
        <h2 className="text-lg font-semibold text-navy">Recent outreach</h2>
        {records.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No outreach records yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-borderBrand text-left text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Channel</th>
                  <th className="py-2 pr-4">Offer</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-borderBrand/50">
                    <td className="py-2 pr-4 font-medium text-navy">{r.full_name}</td>
                    <td className="py-2 pr-4 text-slate-600">{r.company}</td>
                    <td className="py-2 pr-4 text-slate-600">{r.channel}</td>
                    <td className="py-2 pr-4 text-slate-600">{r.offer}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${r.status === 'won' ? 'bg-green-100 text-green-700' : r.status === 'do_not_contact' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600">{r.next_follow_up_date ? new Date(r.next_follow_up_date).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
