import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RUNTIME_API_URL =
  process.env.RUNTIME_API_URL?.trim() ||
  "https://profitengine-runtime.onrender.com";

export async function POST(req: Request) {
  let email = "";
  let firstName = "";
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim();
    firstName = String(body.first_name ?? "").trim().slice(0, 80);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid request" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "valid email required" }, { status: 400 });
  }
  try {
    const r = await fetch(`${RUNTIME_API_URL}/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, first_name: firstName }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const data = await r.json();
    return NextResponse.json(
      { ok: Boolean(data.ok), error: data.ok ? undefined : "subscription failed — try again later" },
      { status: data.ok ? 200 : 502 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "subscription service unavailable" },
      { status: 502 },
    );
  }
}
