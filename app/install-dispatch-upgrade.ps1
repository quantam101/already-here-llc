# install-dispatch-upgrade.ps1
# Run from the Next.js project root.

$ErrorActionPreference = "Stop"

Write-Host "Installing dispatch upgrade for Already Here LLC..."

npm install nodemailer zod
npm install -D @types/nodemailer

New-Item -ItemType Directory -Force -Path "app/api/dispatch" | Out-Null
New-Item -ItemType Directory -Force -Path "lib/dispatch" | Out-Null
New-Item -ItemType Directory -Force -Path "components/dispatch" | Out-Null

@'
import { z } from "zod";

export const DispatchSchema = z.object({
  requesterFullName: z.string().trim().min(1, "Requester full name is required."),
  requesterCompany: z.string().trim().min(1, "Company is required."),
  requesterEmail: z.string().trim().email("Requester email is invalid."),
  requesterPhone: z.string().trim().min(7, "Requester phone is required."),

  siteAddress: z.string().trim().min(1, "Site address is required."),
  state: z.string().trim().min(1, "State is required."),
  siteCount: z.string().trim().min(1, "Site type is required."),
  travelLikely: z.string().trim().optional().default("Not provided"),
  requestedDate: z.string().trim().min(1, "Requested date is required."),
  requestedWindow: z.string().trim().optional().default("Not provided"),
  dueByTime: z.string().trim().optional().default("Not provided"),
  serviceType: z.string().trim().min(1, "Service type is required."),
  priority: z.string().trim().min(1, "Priority is required."),
  ticketReference: z.string().trim().optional().default("Not provided"),

  siteContactName: z.string().trim().min(1, "Site contact name is required."),
  siteContactPhone: z.string().trim().min(7, "Site contact phone is required."),
  siteContactEmail: z.string().trim().email("Site contact email is invalid.").or(z.literal("")).optional().default(""),

  billingContactName: z.string().trim().optional().default("Not provided"),
  billingContactPhone: z.string().trim().optional().default("Not provided"),
  billingContactEmail: z.string().trim().email("Billing contact email is invalid.").or(z.literal("")).optional().default(""),

  scopeSummary: z.string().trim().min(1, "Scope summary is required."),
  liftRequired: z.string().trim().optional().default("Not provided"),
  toolsRequired: z.string().trim().optional().default("Not provided"),
  remoteBridgeDetails: z.string().trim().optional().default("Not provided"),
  accessNotes: z.string().trim().optional().default("Not provided"),
  closeoutRequirements: z.string().trim().optional().default("Not provided"),
});

export type DispatchPayload = z.infer<typeof DispatchSchema>;

export function valueOrNotProvided(value: unknown): string {
  if (value === null || value === undefined) return "Not provided";

  const cleaned = String(value).trim();

  if (
    !cleaned ||
    cleaned === "-" ||
    cleaned.toLowerCase() === "n/a" ||
    cleaned.toLowerCase() === "na" ||
    cleaned.toLowerCase() === "none"
  ) {
    return "Not provided";
  }

  return cleaned;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatPhone(value: string): string {
  const cleaned = valueOrNotProvided(value);

  if (cleaned === "Not provided") return cleaned;

  const digits = digitsOnly(cleaned);

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return cleaned;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeDispatchPayload(payload: DispatchPayload): DispatchPayload {
  return {
    ...payload,

    requesterFullName: valueOrNotProvided(payload.requesterFullName),
    requesterCompany: valueOrNotProvided(payload.requesterCompany),
    requesterEmail: valueOrNotProvided(payload.requesterEmail),
    requesterPhone: formatPhone(payload.requesterPhone),

    siteAddress: valueOrNotProvided(payload.siteAddress),
    state: valueOrNotProvided(payload.state),
    siteCount: valueOrNotProvided(payload.siteCount),
    travelLikely: valueOrNotProvided(payload.travelLikely),
    requestedDate: valueOrNotProvided(payload.requestedDate),
    requestedWindow: valueOrNotProvided(payload.requestedWindow),
    dueByTime: valueOrNotProvided(payload.dueByTime),
    serviceType: valueOrNotProvided(payload.serviceType),
    priority: valueOrNotProvided(payload.priority),
    ticketReference: valueOrNotProvided(payload.ticketReference),

    siteContactName: valueOrNotProvided(payload.siteContactName),
    siteContactPhone: formatPhone(payload.siteContactPhone),
    siteContactEmail: valueOrNotProvided(payload.siteContactEmail),

    billingContactName: valueOrNotProvided(payload.billingContactName),
    billingContactPhone: formatPhone(payload.billingContactPhone),
    billingContactEmail: valueOrNotProvided(payload.billingContactEmail),

    scopeSummary: valueOrNotProvided(payload.scopeSummary),
    liftRequired: valueOrNotProvided(payload.liftRequired),
    toolsRequired: valueOrNotProvided(payload.toolsRequired),
    remoteBridgeDetails: valueOrNotProvided(payload.remoteBridgeDetails),
    accessNotes: valueOrNotProvided(payload.accessNotes),
    closeoutRequirements: valueOrNotProvided(payload.closeoutRequirements),
  };
}

export function generateDispatchId(dateInput?: string): string {
  const now = dateInput ? new Date(`${dateInput}T12:00:00-07:00`) : new Date();

  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000 + 1000);

  return `AH-${yyyy}${mm}${dd}-${random}`;
}

export function buildDispatchSubject(dispatchId: string, payload: DispatchPayload): string {
  return `${payload.priority} Dispatch Request | ${dispatchId} | ${payload.requesterCompany} | ${payload.serviceType} | ${payload.requestedDate}`;
}
'@ | Set-Content -Encoding UTF8 "lib/dispatch/schema.ts"

@'
import type { DispatchPayload } from "./schema";
import { escapeHtml } from "./schema";

function row(label: string, value: string): string {
  return `
    <tr>
      <th style="text-align:left;padding:8px 10px;border:1px solid #4b5563;background:#1f2937;color:#f9fafb;width:38%;vertical-align:top;">${escapeHtml(label)}</th>
      <td style="padding:8px 10px;border:1px solid #4b5563;color:#f9fafb;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>
  `;
}

function section(title: string, rows: string): string {
  return `
    <h2 style="font-size:18px;margin:24px 0 8px;color:#f9fafb;">${escapeHtml(title)}</h2>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#111827;">
      ${rows}
    </table>
  `;
}

export function buildDispatchEmailHtml(args: {
  dispatchId: string;
  submittedAt: string;
  payload: DispatchPayload;
}): string {
  const { dispatchId, submittedAt, payload } = args;

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#0f172a;color:#f9fafb;padding:24px;">
      <div style="max-width:760px;margin:0 auto;">
        <h1 style="font-size:24px;margin:0 0 12px;">New Dispatch Request</h1>

        ${section(
          "System Details",
          row("Dispatch ID", dispatchId) +
            row("Submitted", submittedAt) +
            row("Source", "AlreadyHereLLC.com Dispatch Form") +
            row("Submission Status", "Delivered")
        )}

        ${section(
          "Requester",
          row("Full Name", payload.requesterFullName) +
            row("Company", payload.requesterCompany) +
            row("Email", payload.requesterEmail) +
            row("Phone", payload.requesterPhone)
        )}

        ${section(
          "Site and Schedule",
          row("Full Site Address", payload.siteAddress) +
            row("State", payload.state) +
            row("Site Type", payload.siteCount) +
            row("Travel Likely", payload.travelLikely) +
            row("Requested Date", payload.requestedDate) +
            row("Requested Window", payload.requestedWindow) +
            row("Due-by Time", payload.dueByTime) +
            row("Service Type", payload.serviceType) +
            row("Priority", payload.priority) +
            row("Ticket / Reference Number", payload.ticketReference)
        )}

        ${section(
          "Site Contact",
          row("Name", payload.siteContactName) +
            row("Phone", payload.siteContactPhone) +
            row("Email", payload.siteContactEmail)
        )}

        ${section(
          "Billing Contact",
          row("Name", payload.billingContactName) +
            row("Phone", payload.billingContactPhone) +
            row("Email", payload.billingContactEmail)
        )}

        ${section(
          "Scope and Execution Notes",
          row("One-Line Scope Summary", payload.scopeSummary) +
            row("Lift Required", payload.liftRequired) +
            row("Tools or Staging Required", payload.toolsRequired) +
            row("Remote Bridge Details", payload.remoteBridgeDetails) +
            row("Access Notes", payload.accessNotes) +
            row("Closeout Requirements", payload.closeoutRequirements)
        )}
      </div>
    </div>
  `;
}

export function buildRequesterConfirmationHtml(args: {
  dispatchId: string;
  payload: DispatchPayload;
}): string {
  const { dispatchId, payload } = args;

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#111827;padding:24px;">
      <div style="max-width:680px;margin:0 auto;">
        <h1 style="font-size:24px;margin:0 0 12px;">We received your dispatch request</h1>

        <p>Thank you. Already Here LLC received your dispatch request.</p>

        <p><strong>Dispatch ID:</strong> ${escapeHtml(dispatchId)}</p>
        <p><strong>Company:</strong> ${escapeHtml(payload.requesterCompany)}</p>
        <p><strong>Service Type:</strong> ${escapeHtml(payload.serviceType)}</p>
        <p><strong>Requested Date:</strong> ${escapeHtml(payload.requestedDate)}</p>
        <p><strong>Priority:</strong> ${escapeHtml(payload.priority)}</p>

        <p>We will review the scope and respond with next steps.</p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />

        <p style="font-size:13px;color:#6b7280;">
          Already Here LLC<br />
          Phoenix, Arizona<br />
          dispatch@alreadyherellc.com
        </p>
      </div>
    </div>
  `;
}
'@ | Set-Content -Encoding UTF8 "lib/dispatch/emailTemplates.ts"

@'
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  DispatchSchema,
  buildDispatchSubject,
  generateDispatchId,
  normalizeDispatchPayload,
} from "@/lib/dispatch/schema";
import {
  buildDispatchEmailHtml,
  buildRequesterConfirmationHtml,
} from "@/lib/dispatch/emailTemplates";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function phoenixTimestamp(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = DispatchSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          errors: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 }
      );
    }

    const payload = normalizeDispatchPayload(parsed.data);
    const dispatchId = generateDispatchId(payload.requestedDate);
    const submittedAt = phoenixTimestamp();
    const subject = buildDispatchSubject(dispatchId, payload);

    const transporter = nodemailer.createTransport({
      host: requireEnv("SMTP_HOST"),
      port: Number(requireEnv("SMTP_PORT")),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: requireEnv("SMTP_USER"),
        pass: requireEnv("SMTP_PASS"),
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"Already Here Dispatch" <${requireEnv("DISPATCH_FROM_EMAIL")}>`,
      to: requireEnv("DISPATCH_TO_EMAIL"),
      replyTo: payload.requesterEmail,
      subject,
      html: buildDispatchEmailHtml({
        dispatchId,
        submittedAt,
        payload,
      }),
    });

    await transporter.sendMail({
      from: `"Already Here Dispatch" <${requireEnv("DISPATCH_FROM_EMAIL")}>`,
      to: payload.requesterEmail,
      replyTo: requireEnv("DISPATCH_TO_EMAIL"),
      subject: `We received your dispatch request | ${dispatchId}`,
      html: buildRequesterConfirmationHtml({
        dispatchId,
        payload,
      }),
    });

    return NextResponse.json({
      ok: true,
      dispatchId,
      message: "Dispatch request submitted successfully.",
    });
  } catch (error) {
    console.error("Dispatch submission failed:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          "Dispatch submission failed. Please try again or contact dispatch@alreadyherellc.com.",
      },
      { status: 500 }
    );
  }
}
'@ | Set-Content -Encoding UTF8 "app/api/dispatch/route.ts"

@'
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false

SMTP_USER=dispatch@alreadyherellc.com
SMTP_PASS=PUT_SECURE_PASSWORD_OR_APP_PASSWORD_HERE

DISPATCH_FROM_EMAIL=dispatch@alreadyherellc.com
DISPATCH_TO_EMAIL=dispatch@alreadyherellc.com

NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
'@ | Set-Content -Encoding UTF8 ".env.dispatch.example"

Write-Host ""
Write-Host "Dispatch backend files installed."
Write-Host ""
Write-Host "Created:"
Write-Host "- app/api/dispatch/route.ts"
Write-Host "- lib/dispatch/schema.ts"
Write-Host "- lib/dispatch/emailTemplates.ts"
Write-Host "- .env.dispatch.example"
Write-Host ""
Write-Host "Next:"
Write-Host "1. Copy .env.dispatch.example values into .env.local or Vercel environment variables."
Write-Host "2. Set SMTP_PASS securely."
Write-Host "3. Make your dispatch form POST to /api/dispatch."
Write-Host "4. Run npm run dev."
Write-Host "5. Submit one test from laptop and one from mobile."