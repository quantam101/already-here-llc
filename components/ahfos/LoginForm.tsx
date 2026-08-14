'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm({ redirectTo = '/portal' }: { redirectTo?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ahfos/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({ message: 'Login failed.' }))) as { message?: string };
      if (!res.ok) throw new Error(data.message || 'Login failed.');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card mx-auto max-w-md p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-navy">Sign in</h1>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <label className="mt-6 grid gap-2 text-sm font-semibold text-slate-700">
        Email
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
        Password
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm" />
      </label>
      <button type="submit" disabled={loading} className="mt-6 w-full rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white hover:bg-navy disabled:opacity-50">
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
