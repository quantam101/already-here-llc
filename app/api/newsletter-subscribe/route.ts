import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RUNTIME_API_URL =
  process.env.RUNTIME_API_URL?.trim() ||
  "https://profitengine-runtime.onrender.com";

function isValidEmail(value: string): boolean {
  if (value.length > 254) return false;
  const at = value.indexOf("@");
  if (at <= 0 || at === value.length - 1) return false;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (domain.length > 253 || !domain.includes(".")) return false;
  const tld = domain.slice(domain.lastIndexOf(".") + 1);
  return Boolean(local) && Boolean(tld);
}

export async function POST(req: Request) {
  let email = "";
  let firstName = "";
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      email = String(form.get("email") ?? "").trim();
      firstName = String(form.get("first_name") ?? "").trim().slice(0, 80);
    } else {
      const body = await req.json();
      email = String(body.email ?? "").trim();
      firstName = String(body.first_name ?? "").trim().slice(0, 80);
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid request" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
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
