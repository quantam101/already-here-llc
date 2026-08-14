'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function RegisterForm({ redirectTo = '/portal' }: { redirectTo?: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ahfos/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, phone, email, password }),
      });
      const data = (await res.json().catch(() => ({ message: 'Registration failed.' }))) as { message?: string };
      if (!res.ok) throw new Error(data.message || 'Registration failed.');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto max-w-md p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-navy">Create account</h1>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <label className="mt-6 grid gap-2 text-sm font-semibold text-slate-700">
        Full name
        <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
        Company
        <input value={company} onChange={(e) => setCompany(e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
        Phone
        <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
        Email
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
        Password
        <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
      </label>
      <button type="submit" disabled={loading} className="mt-6 w-full rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white hover:bg-navy disabled:opacity-50">
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  );
}
