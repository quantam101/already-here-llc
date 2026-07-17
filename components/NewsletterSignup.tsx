"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const r = await fetch("/api/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      setState(data.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-sm leading-6 text-slate-700">
        You&apos;re subscribed — the next issue lands in your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="w-full rounded-full border border-borderBrand bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-action"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="link-ring inline-flex shrink-0 items-center justify-center rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy disabled:opacity-60"
      >
        {state === "sending" ? "Subscribing…" : "Subscribe"}
      </button>
      {state === "error" && (
        <p className="text-xs leading-6 text-red-600 sm:self-center">
          Something went wrong — try again.
        </p>
      )}
    </form>
  );
}
