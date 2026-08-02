'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type JobDetail = {
  id: string;
  status: string;
  priority: string;
  trade: string;
  skill: string;
  estimatedDurationMinutes: number;
  intake: { problemDescription: string; urgency: string; preferredSchedule: string };
  dispatcherPacket: { summary: string; suggestedParts: string[]; riskFlags: string[] };
  checklist: Array<{ id: string; text: string; checked: boolean; checkedAt?: string }>;
  workNotes: string;
  labor: Array<{ id: string; description: string; hours: number; rateCents: number }>;
  materials: Array<{ id: string; description: string; quantity: number; unitCostCents: number; partNumber?: string }>;
  recommendations: string[];
  beforePhotos: Array<{ id: string; url: string; kind: string; caption: string; uploadedAt: string; uploadedBy: string }>;
  afterPhotos: Array<{ id: string; url: string; kind: string; caption: string; uploadedAt: string; uploadedBy: string }>;
  signature?: { name: string; signedAt: string };
  invoice: { status: string; totalCents: number };
  review: { status: string };
};

export function TechnicianJobView({ jobId, user }: { jobId: string; user: { id: string; name: string; roles: string[] } }) {
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newLabor, setNewLabor] = useState({ description: '', hours: '', rateCents: '' });
  const [newMaterial, setNewMaterial] = useState({ description: '', quantity: '1', unitCostCents: '', partNumber: '' });
  const [beforeUrl, setBeforeUrl] = useState('');
  const [afterUrl, setAfterUrl] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [warrantyDays, setWarrantyDays] = useState('30');
  const [newRecommendation, setNewRecommendation] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/ahfos/jobs/${jobId}`);
        const data = (await res.json()) as { ok: boolean; job?: JobDetail; message?: string };
        if (!data.ok) throw new Error(data.message || 'Failed to load job.');
        setJob(data.job!);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job.');
      }
    })();
  }, [jobId]);

  async function patchJob(patch: Partial<JobDetail>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/ahfos/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { ok: boolean; job?: JobDetail; message?: string };
      if (!res.ok) throw new Error(data.message || 'Update failed.');
      setJob(data.job!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCheck(id: string) {
    if (!job) return;
    const next = job.checklist.map((item) =>
      item.id === id ? { ...item, checked: !item.checked, checkedAt: new Date().toISOString() } : item,
    );
    await patchJob({ checklist: next });
  }

  async function saveNotes() {
    if (!job) return;
    await patchJob({ workNotes: job.workNotes });
  }

  async function addLabor() {
    if (!job || !newLabor.description) return;
    const line = {
      id: crypto.randomUUID(),
      description: newLabor.description,
      hours: Number(newLabor.hours) || 0,
      rateCents: Math.round(Number(newLabor.rateCents) * 100) || 0,
    };
    await patchJob({ labor: [...job.labor, line] });
    setNewLabor({ description: '', hours: '', rateCents: '' });
  }

  async function addMaterial() {
    if (!job || !newMaterial.description) return;
    const line = {
      id: crypto.randomUUID(),
      description: newMaterial.description,
      quantity: Number(newMaterial.quantity) || 1,
      unitCostCents: Math.round(Number(newMaterial.unitCostCents) * 100) || 0,
      partNumber: newMaterial.partNumber,
    };
    await patchJob({ materials: [...job.materials, line] });
    setNewMaterial({ description: '', quantity: '1', unitCostCents: '', partNumber: '' });
  }

  async function addPhoto(kind: 'before' | 'after') {
    if (!job) return;
    const url = kind === 'before' ? beforeUrl : afterUrl;
    if (!url) return;
    const photo = { id: crypto.randomUUID(), kind, url, caption: `${kind} photo`, uploadedAt: new Date().toISOString(), uploadedBy: user.id };
    const key = kind === 'before' ? 'beforePhotos' : 'afterPhotos';
    await patchJob({ [key]: [...job[key], photo] } as unknown as Partial<JobDetail>);
    if (kind === 'before') setBeforeUrl('');
    else setAfterUrl('');
  }

  async function addRecommendation() {
    if (!job || !newRecommendation) return;
    await patchJob({ recommendations: [...job.recommendations, newRecommendation] });
    setNewRecommendation('');
  }

  async function closeout() {
    if (!job) return;
    if (!signatureName) {
      setError('Customer signature name is required to close out.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/ahfos/jobs/${jobId}/agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'closeout',
          payload: {
            workNotes: job.workNotes,
            labor: job.labor,
            materials: job.materials,
            recommendations: job.recommendations,
            warrantyDays: Number(warrantyDays) || 30,
            signatureName,
            beforePhotos: job.beforePhotos.map((p) => p.url),
            afterPhotos: job.afterPhotos.map((p) => p.url),
          },
        }),
      });
      const data = (await res.json()) as { ok: boolean; job?: JobDetail; message?: string };
      if (!res.ok) throw new Error(data.message || 'Closeout failed.');
      setJob(data.job!);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Closeout failed.');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="container-shell py-16 text-red-400">{error}</p>;
  if (!job) return <p className="container-shell py-16 text-slate-300">Loading job...</p>;

  const closed = job.status === 'completed' || job.status === 'closed';

  return (
    <div className="container-shell py-6 lg:py-10">
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">{job.status}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">{job.priority}</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-navy">{job.trade}</h1>
        <p className="mt-1 text-sm text-slate-600">{job.dispatcherPacket.summary}</p>
        <p className="mt-4 text-sm text-slate-700">{job.intake.problemDescription}</p>
        {job.dispatcherPacket.riskFlags.length > 0 && (
          <ul className="mt-4 list-disc pl-5 text-sm text-red-600">
            {job.dispatcherPacket.riskFlags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
      </div>

      <section className="card mt-6 p-5">
        <h2 className="text-lg font-semibold text-navy">Checklist</h2>
        <div className="mt-4 grid gap-3">
          {job.checklist.map((item) => (
            <label key={item.id} className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={item.checked}
                disabled={closed}
                onChange={() => toggleCheck(item.id)}
                className="mt-0.5"
              />
              <span className={item.checked ? 'line-through text-slate-400' : ''}>{item.text}</span>
            </label>
          ))}
          {job.checklist.length === 0 && <p className="text-sm text-slate-500">No checklist yet. Dispatcher can run the technician agent to build one.</p>}
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-lg font-semibold text-navy">Work notes</h2>
        <textarea
          value={job.workNotes}
          disabled={closed}
          onChange={(e) => setJob((j) => (j ? { ...j, workNotes: e.target.value } : j))}
          rows={5}
          className="mt-4 w-full rounded-2xl border border-borderBrand px-4 py-3 text-sm"
        />
        {!closed && (
          <button onClick={saveNotes} disabled={saving} className="mt-3 rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-navy disabled:opacity-50">
            Save notes
          </button>
        )}
      </section>

      {!closed && (
        <>
          <section className="card mt-6 p-5">
            <h2 className="text-lg font-semibold text-navy">Labor</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <input placeholder="Description" value={newLabor.description} onChange={(e) => setNewLabor({ ...newLabor, description: e.target.value })} className="rounded-2xl border border-borderBrand px-3 py-2 text-sm sm:col-span-2" />
              <input placeholder="Hours" type="number" step="0.1" value={newLabor.hours} onChange={(e) => setNewLabor({ ...newLabor, hours: e.target.value })} className="rounded-2xl border border-borderBrand px-3 py-2 text-sm" />
              <input placeholder="Hourly rate $" type="number" value={newLabor.rateCents} onChange={(e) => setNewLabor({ ...newLabor, rateCents: e.target.value })} className="rounded-2xl border border-borderBrand px-3 py-2 text-sm" />
            </div>
            <button onClick={addLabor} className="mt-3 rounded-full border border-borderBrand px-4 py-2 text-sm font-semibold text-slate-300 hover:border-action hover:text-action">Add labor line</button>
            {job.labor.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {job.labor.map((l) => (
                  <li key={l.id}>{l.description} — {l.hours}h @ ${(l.rateCents / 100).toFixed(2)}/h</li>
                ))}
              </ul>
            )}
          </section>

          <section className="card mt-6 p-5">
            <h2 className="text-lg font-semibold text-navy">Materials / parts</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              <input placeholder="Description" value={newMaterial.description} onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })} className="rounded-2xl border border-borderBrand px-3 py-2 text-sm sm:col-span-2" />
              <input placeholder="Qty" type="number" value={newMaterial.quantity} onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })} className="rounded-2xl border border-borderBrand px-3 py-2 text-sm" />
              <input placeholder="Unit cost $" type="number" value={newMaterial.unitCostCents} onChange={(e) => setNewMaterial({ ...newMaterial, unitCostCents: e.target.value })} className="rounded-2xl border border-borderBrand px-3 py-2 text-sm" />
              <input placeholder="Part #" value={newMaterial.partNumber} onChange={(e) => setNewMaterial({ ...newMaterial, partNumber: e.target.value })} className="rounded-2xl border border-borderBrand px-3 py-2 text-sm" />
            </div>
            <button onClick={addMaterial} className="mt-3 rounded-full border border-borderBrand px-4 py-2 text-sm font-semibold text-slate-300 hover:border-action hover:text-action">Add material line</button>
            {job.materials.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {job.materials.map((m) => (
                  <li key={m.id}>{m.description} — {m.quantity} @ ${(m.unitCostCents / 100).toFixed(2)} {m.partNumber && `(${m.partNumber})`}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="card mt-6 p-5">
            <h2 className="text-lg font-semibold text-navy">Photos</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-slate-700">Before photo URL</label>
                <div className="mt-2 flex gap-2">
                  <input value={beforeUrl} onChange={(e) => setBeforeUrl(e.target.value)} className="flex-1 rounded-2xl border border-borderBrand px-3 py-2 text-sm" />
                  <button onClick={() => addPhoto('before')} className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-navy">Add</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">After photo URL</label>
                <div className="mt-2 flex gap-2">
                  <input value={afterUrl} onChange={(e) => setAfterUrl(e.target.value)} className="flex-1 rounded-2xl border border-borderBrand px-3 py-2 text-sm" />
                  <button onClick={() => addPhoto('after')} className="rounded-full bg-action px-4 py-2 text-sm font-semibold text-white hover:bg-navy">Add</button>
                </div>
              </div>
            </div>
            {job.beforePhotos.length > 0 && <p className="mt-3 text-sm text-slate-600">Before: {job.beforePhotos.length}</p>}
            {job.afterPhotos.length > 0 && <p className="mt-3 text-sm text-slate-600">After: {job.afterPhotos.length}</p>}
          </section>

          <section className="card mt-6 p-5">
            <h2 className="text-lg font-semibold text-navy">Recommendations</h2>
            <div className="mt-3 flex gap-2">
              <input value={newRecommendation} onChange={(e) => setNewRecommendation(e.target.value)} className="flex-1 rounded-2xl border border-borderBrand px-3 py-2 text-sm" />
              <button onClick={addRecommendation} className="rounded-full border border-borderBrand px-4 py-2 text-sm font-semibold text-slate-300 hover:border-action hover:text-action">Add</button>
            </div>
            {job.recommendations.length > 0 && (
              <ul className="mt-4 list-disc pl-5 text-sm text-slate-700">
                {job.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="card mt-6 p-5">
            <h2 className="text-lg font-semibold text-navy">Closeout</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Customer signature name
                <input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} className="rounded-2xl border border-borderBrand px-3 py-2 text-sm" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Warranty days
                <input type="number" value={warrantyDays} onChange={(e) => setWarrantyDays(e.target.value)} className="rounded-2xl border border-borderBrand px-3 py-2 text-sm" />
              </label>
            </div>
            <button onClick={closeout} disabled={saving} className="mt-5 w-full rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white hover:bg-navy disabled:opacity-50">
              {saving ? 'Closing out...' : 'Complete closeout'}
            </button>
          </section>
        </>
      )}

      {closed && (
        <section className="card mt-6 p-5">
          <h2 className="text-lg font-semibold text-navy">Job closed</h2>
          <p className="mt-2 text-sm text-slate-600">Signed by {job.signature?.name} on {new Date(job.signature!.signedAt).toLocaleString()}.</p>
          <p className="mt-2 text-sm text-slate-600">Invoice: {job.invoice.status} — ${(job.invoice.totalCents / 100).toFixed(2)}</p>
          <p className="text-sm text-slate-600">Review: {job.review.status}</p>
        </section>
      )}
    </div>
  );
}
