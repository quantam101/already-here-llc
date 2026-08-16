"use client";

import { useState } from "react";

const partnerTypes = [
  { value: "msp", label: "MSP / IT provider" },
  { value: "vendor", label: "National vendor / integrator" },
  { value: "prime_contractor", label: "Prime contractor" },
  { value: "retail", label: "Retail / restaurant technology team" },
  { value: "other", label: "Other" }
];

type Status = "idle" | "submitting" | "done" | "error";

export function PartnerSignup() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    contactEmail: "",
    type: "msp",
    website: "",
    phone: "",
    notes: ""
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ referralCode?: string } | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setError("");
    try {
      const response = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not submit partner application.");
      }
      setResult({ referralCode: data.referralCode });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "done" && result) {
    return (
      <div className="mt-10 rounded-2xl border border-borderBrand bg-soft p-6 text-center">
        <h3 className="text-lg font-semibold text-navy">Application received</h3>
        <p className="mt-2 text-sm text-slate-700">
          Thank you. We will review your partner application and activate your referral code within one business day.
        </p>
        {result.referralCode && (
          <p className="mt-4 text-sm text-slate-600">
            Proposed referral code: <span className="font-semibold text-action">{result.referralCode}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-10 grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="partner-name" className="block text-sm font-semibold text-navy">Contact name</label>
          <input
            id="partner-name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="mt-2 w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-action"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label htmlFor="partner-company" className="block text-sm font-semibold text-navy">Company</label>
          <input
            id="partner-company"
            required
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
            className="mt-2 w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-action"
            placeholder="Acme IT"
          />
        </div>
        <div>
          <label htmlFor="partner-email" className="block text-sm font-semibold text-navy">Email</label>
          <input
            id="partner-email"
            type="email"
            required
            value={form.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
            className="mt-2 w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-action"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label htmlFor="partner-phone" className="block text-sm font-semibold text-navy">Phone</label>
          <input
            id="partner-phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="mt-2 w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-action"
            placeholder="(602) 555-0100"
          />
        </div>
      </div>
      <div>
        <label htmlFor="partner-type" className="block text-sm font-semibold text-navy">Partner type</label>
        <select
          id="partner-type"
          value={form.type}
          onChange={(e) => update("type", e.target.value)}
          className="mt-2 w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-action"
        >
          {partnerTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="partner-website" className="block text-sm font-semibold text-navy">Website</label>
        <input
          id="partner-website"
          type="url"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
          className="mt-2 w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-action"
          placeholder="https://example.com"
        />
      </div>
      <div>
        <label htmlFor="partner-notes" className="block text-sm font-semibold text-navy">Notes</label>
        <textarea
          id="partner-notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-borderBrand bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-action"
          placeholder="Tell us about the work you send or the overflow you need covered."
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy disabled:opacity-60"
        >
          {status === "submitting" ? "Submitting..." : "Apply to partner"}
        </button>
      </div>
      {status === "error" && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
