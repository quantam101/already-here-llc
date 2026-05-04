import { NextResponse } from "next/server";
import {
  dispatchFieldLabels,
  getDispatchEnvStatus,
  getMissingDispatchEnvVars,
  sanitizeDispatchPayload,
  validateDispatchPayload,
  type DispatchPayload,
} from "../../../lib/dispatch";

export const runtime = "nodejs";

const operationalFallbackRecipients = ["alreadyherellc@gmail.com"] as const;

type ResendSuccess = {
  id?: string;
};

type ResendError = {
  message?: string;
  error?: string;
  name?: string;
};

function textOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseEmailList(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map(normalizeEmail)
    .filter((email) => email.includes("@") && email.includes("."));
}

function uniqueEmails(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeEmail))).filter(Boolean);
}

function getDispatchRecipients() {
  return uniqueEmails([
    ...parseEmailList(textOrEmpty(process.env.DISPATCH_TO_EMAIL)),
    ...operationalFallbackRecipients,
  ]);
}

function htmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPlainText(payload: DispatchPayload, submittedAt: string) {
  const lines = [
    "New Already Here LLC dispatch request",
    `Submitted: ${submittedAt}`,
    "",
    ...Object.entries(dispatchFieldLabels).map(([field, label]) => {
      const value = payload[field as keyof DispatchPayload] || "Not provided";
      return `${label}: ${value}`;
    }),
  ];

  return lines.join("\n");
}

function formatHtml(payload: DispatchPayload, submittedAt: string) {
  const rows = Object.entries(dispatchFieldLabels)
    .map(([field, label]) => {
      const value = payload[field as keyof DispatchPayload] || "Not provided";
      return `<tr><th style="text-align:left;padding:8px;border:1px solid #cbd5e1;background:#f8fafc;vertical-align:top;">${htmlEscape(
        label,
      )}</th><td style="padding:8px;border:1px solid #cbd5e1;vertical-align:top;">${htmlEscape(
        value,
      )}</td></tr>`;
    })
    .join("");

  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;"><h1>New Already Here LLC dispatch request</h1><p><strong>Submitted:</strong> ${htmlEscape(
    submittedAt,
  )}</p><table style="border-collapse:collapse;width:100%;max-width:900px;">${rows}</table></body></html>`;
}

function buildSubject(payload: DispatchPayload) {
  const priority = payload.priority || "Dispatch";
  const company = payload.company || "Unknown company";
  const serviceType = payload.serviceType || "Service request";
  const requestedDate = payload.requestedDate || "Date not set";

  return `${priority} dispatch request | ${company} | ${serviceType} | ${requestedDate}`;
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "dispatch",
    env: getDispatchEnvStatus(),
    recipientFallback: true,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const body = await readJson(request);
  const payload = sanitizeDispatchPayload(body);
  const validation = validateDispatchPayload(payload);

  if (validation.invalidFields.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Dispatch request is missing required fields.",
        fieldErrors: validation.fieldErrors,
        invalidFields: validation.invalidFields,
      },
      { status: 400 },
    );
  }

  const recipients = getDispatchRecipients();
  const requesterEmail = normalizeEmail(payload.email);
  const requesterCopy = requesterEmail && !recipients.includes(requesterEmail) ? [requesterEmail] : [];
  const missingEnvVars = getMissingDispatchEnvVars().filter((name) => name !== "DISPATCH_TO_EMAIL");

  if (missingEnvVars.length > 0 || recipients.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        message: `Dispatch delivery is not configured. Missing environment variables: ${missingEnvVars.join(
          ", ",
        )}.`,
      },
      { status: 500 },
    );
  }

  const resendApiKey = textOrEmpty(process.env.RESEND_API_KEY);
  const from = textOrEmpty(process.env.DISPATCH_FROM_EMAIL);
  const siteUrl = textOrEmpty(process.env.NEXT_PUBLIC_SITE_URL);
  const submittedAt = new Date().toISOString();

  const resendPayload = {
    from,
    to: recipients,
    cc: requesterCopy,
    reply_to: payload.email,
    subject: buildSubject(payload),
    text: `${formatPlainText(payload, submittedAt)}\n\nSource: ${siteUrl}/dispatch`,
    html: `${formatHtml(
      payload,
      submittedAt,
    )}<p style="font-family:Arial,Helvetica,sans-serif;color:#475569;"><strong>Source:</strong> ${htmlEscape(
      `${siteUrl}/dispatch`,
    )}</p>`,
  };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
      cache: "no-store",
    });

    const responseJson = (await response.json().catch(() => null)) as ResendSuccess | ResendError | null;

    if (!response.ok) {
      const upstreamMessage =
        responseJson && "message" in responseJson
          ? responseJson.message
          : responseJson && "error" in responseJson
            ? responseJson.error
            : "Resend rejected the dispatch email.";

      return NextResponse.json(
        {
          ok: false,
          message: upstreamMessage || "Resend rejected the dispatch email.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Dispatch request delivered to the Already Here LLC dispatch inbox.",
      resendId: responseJson && "id" in responseJson ? responseJson.id : undefined,
      recipientCount: recipients.length + requesterCopy.length,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Dispatch request could not be delivered because the email provider request failed.",
      },
      { status: 502 },
    );
  }
}
