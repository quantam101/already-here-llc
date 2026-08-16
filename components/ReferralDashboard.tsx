"use client";

import { useState } from "react";

interface ReferralStats {
  code: string;
  link: string;
  conversions: number;
  totalRevenueCents: number;
  totalRewardsCents: number;
}

type Status = "idle" | "loading" | "done" | "error";

export function ReferralDashboard() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<ReferralStats | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not load referral code.");
      }
      setStats(data.stats);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function copyLink() {
    if (stats?.link) navigator.clipboard.writeText(stats.link);
  }

  function formatCurrency(cents: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  }

  if (status === "done" && stats) {
    return (
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-borderBrand bg-soft p-5">
          <p className="text-sm font-semibold text-navy">Your referral code</p>
          <p className="mt-2 text-3xl font-semibold text-action">{stats.code}</p>
          <p className="mt-1 text-sm text-slate-600">Give this to renters at checkout.</p>
        </div>
        <div className="rounded-2xl border border-borderBrand bg-soft p-5">
          <p className="text-sm font-semibold text-navy">Your shareable link</p>
          <p className="mt-2 break-all text-sm text-slate-700">{stats.link}</p>
          <button
            type="button"
            onClick={copyLink}
            className="mt-3 inline-flex items-center rounded-full bg-action px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy"
          >
            Copy link
          </button>
        </div>
        <div className="rounded-2xl border border-borderBrand bg-soft p-5 md:col-span-2">
          <p className="text-sm font-semibold text-navy">Activity</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-borderBrand bg-white p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-500">Conversions</p>
              <p className="mt-1 text-2xl font-semibold text-action">{stats.conversions}</p>
            </div>
            <div className="rounded-xl border border-borderBrand bg-white p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-500">Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-action">{formatCurrency(stats.totalRevenueCents)}</p>
            </div>
            <div className="rounded-xl border border-borderBrand bg-white p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-500">Rewards</p>
              <p className="mt-1 text-2xl font-semibold text-action">{formatCurrency(stats.totalRewardsCents)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="mt-10 card p-8">
      <form onSubmit={submit} className="flex flex-col gap-4 sm:flex-row">
        <label htmlFor="referral-email" className="sr-only">Email address</label>
        <input
          id="referral-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-full border border-borderBrand bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-action"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="link-ring inline-flex shrink-0 items-center justify-center rounded-full bg-action px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-navy disabled:opacity-60"
        >
          {status === "loading" ? "Loading..." : "Get my referral code"}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-3 text-sm text-red-600">{error || "Could not load referral code."}</p>
      )}
      <p className="mt-4 text-sm text-slate-600">
        Enter the email you used at intake. We will create or retrieve your referral code and show your shareable link and activity.
      </p>
    </section>
  );
}
