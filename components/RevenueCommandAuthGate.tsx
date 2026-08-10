'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

const protectedPrefixes = ['/revenue-command', '/command-center', '/operations', '/dc'];

export function RevenueCommandAuthGate() {
  const pathname = usePathname();
  const protectedRoute = useMemo(() => protectedPrefixes.some((prefix) => pathname?.startsWith(prefix)), [pathname]);
  const loginRoute = pathname?.startsWith('/revenue-command/login') === true;
  const [status, setStatus] = useState<'checking' | 'authorized' | 'required' | 'unconfigured'>('checking');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!protectedRoute || loginRoute) return;
    let active = true;
    fetch('/api/revenue-command-spine/auth', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!active) return;
        if (response.ok && body.authenticated) setStatus('authorized');
        else if (body.code === 'INTERNAL_TOKEN_NOT_CONFIGURED') setStatus('unconfigured');
        else setStatus('required');
      })
      .catch(() => active && setStatus('required'));
    return () => { active = false; };
  }, [loginRoute, protectedRoute]);

  if (!protectedRoute || loginRoute || status === 'authorized') return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || submitting) return;
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/revenue-command-spine/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Authorization failed.');
      setStatus('authorized');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authorization failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04101f]/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#07111f] p-7 text-white shadow-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Already Here internal operations</p>
        <h2 className="mt-2 text-2xl font-semibold">Revenue Command access</h2>
        {status === 'checking' ? (
          <p className="mt-4 text-sm leading-6 text-slate-300">Checking secure internal session.</p>
        ) : status === 'unconfigured' ? (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
            Internal access is fail-closed because REVENUE_COMMAND_INTERNAL_TOKEN is not configured. Configure it only through the approved deployment secret manager before using Revenue Command with operational data.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm text-slate-300">
              Internal access token
              <input
                type="password"
                autoComplete="current-password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-action focus:ring-2 focus:ring-action/30"
                required
                minLength={16}
              />
            </label>
            {message ? <p className="text-sm text-red-300">{message}</p> : null}
            <button
              type="submit"
              disabled={submitting || token.length < 16}
              className="w-full rounded-2xl bg-action px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Authorizing' : 'Open Revenue Command'}
            </button>
            <p className="text-xs leading-5 text-slate-400">The token is submitted only to the same-origin authentication endpoint. A signed HttpOnly session cookie is used afterward; the token is not stored in browser storage.</p>
          </form>
        )}
      </div>
    </div>
  );
}
