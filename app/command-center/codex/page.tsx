'use client';

import { useEffect, useState } from 'react';

interface CodexEvent {
  id: string;
  source: string;
  module: string;
  change_type: string;
  description: string;
  status: string;
  evidence_json?: string;
  created_at?: string;
}

interface CatchCorrectEvent {
  id: string;
  source: string;
  failure_type: string;
  evidence: string;
  proposed_correction: string;
  verification_status: string;
  related_codex_id?: string;
  created_at?: string;
}

export default function CodexControlPlane() {
  const [codex, setCodex] = useState<CodexEvent[]>([]);
  const [catchCorrect, setCatchCorrect] = useState<CatchCorrectEvent[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');

  const fetchData = async () => {
    const res = await fetch('/api/codex');
    const data = await res.json();
    setCodex(data.codexEvents || []);
    setCatchCorrect(data.catchCorrectEvents || []);
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0);
    return () => clearTimeout(timer);
  }, []);

  const postEvent = async (body: Record<string, unknown>) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-internal-api-key'] = apiKey;
    const res = await fetch('/api/codex', { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      setStatus(`Error: ${err.error}`);
      return false;
    }
    setStatus('Saved');
    await fetchData();
    return true;
  };

  const handleCodexSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const body = {
      type: 'codex',
      source: (form.elements.namedItem('source') as HTMLInputElement).value,
      module: (form.elements.namedItem('module') as HTMLInputElement).value,
      changeType: (form.elements.namedItem('changeType') as HTMLInputElement).value,
      description: (form.elements.namedItem('description') as HTMLTextAreaElement).value,
      status: (form.elements.namedItem('status') as HTMLSelectElement).value,
    };
    await postEvent(body);
  };

  const handleCatchCorrectSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const body = {
      type: 'catch-correct',
      source: (form.elements.namedItem('source') as HTMLInputElement).value,
      failureType: (form.elements.namedItem('failureType') as HTMLInputElement).value,
      evidence: (form.elements.namedItem('evidence') as HTMLTextAreaElement).value,
      proposedCorrection: (form.elements.namedItem('proposedCorrection') as HTMLTextAreaElement).value,
      verificationStatus: (form.elements.namedItem('verificationStatus') as HTMLSelectElement).value,
    };
    await postEvent(body);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Codex Changelog + Catch/Correct Control Plane</h1>

      <section className="mb-8 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <h2 className="text-lg font-semibold mb-2">API Key</h2>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="x-internal-api-key (required if AHFOS_INTERNAL_API_KEY is set)"
          className="w-full p-2 rounded bg-slate-800 border border-slate-700"
        />
        {status && <p className="text-sm text-amber-400 mt-2">{status}</p>}
      </section>

      <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleCodexSubmit} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
          <h2 className="text-lg font-semibold">Record Changelog</h2>
          <input name="source" placeholder="Source" required className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          <input name="module" placeholder="Module" required className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          <input name="changeType" placeholder="Change type" required className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          <textarea name="description" placeholder="Description" required className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          <select name="status" className="w-full p-2 rounded bg-slate-800 border border-slate-700">
            <option value="open">open</option>
            <option value="in_progress">in_progress</option>
            <option value="verified">verified</option>
            <option value="closed">closed</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-sky-600 rounded font-semibold">Save Changelog</button>
        </form>

        <form onSubmit={handleCatchCorrectSubmit} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
          <h2 className="text-lg font-semibold">Record Catch/Correct</h2>
          <input name="source" placeholder="Source" required className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          <input name="failureType" placeholder="Failure type" required className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          <textarea name="evidence" placeholder="Evidence" required className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          <textarea name="proposedCorrection" placeholder="Proposed correction" required className="w-full p-2 rounded bg-slate-800 border border-slate-700" />
          <select name="verificationStatus" className="w-full p-2 rounded bg-slate-800 border border-slate-700">
            <option value="pending">pending</option>
            <option value="verified">verified</option>
            <option value="rejected">rejected</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-emerald-600 rounded font-semibold">Save Catch/Correct</button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Changelog Events ({codex.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="p-2 text-left">Module</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {codex.map((event) => (
                <tr key={event.id} className="border-b border-slate-800">
                  <td className="p-2">{event.module}</td>
                  <td className="p-2">{event.change_type}</td>
                  <td className="p-2">{event.status}</td>
                  <td className="p-2">{event.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Catch/Correct Events ({catchCorrect.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800">
                <th className="p-2 text-left">Source</th>
                <th className="p-2 text-left">Failure</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Proposed Correction</th>
              </tr>
            </thead>
            <tbody>
              {catchCorrect.map((event) => (
                <tr key={event.id} className="border-b border-slate-800">
                  <td className="p-2">{event.source}</td>
                  <td className="p-2">{event.failure_type}</td>
                  <td className="p-2">{event.verification_status}</td>
                  <td className="p-2">{event.proposed_correction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
