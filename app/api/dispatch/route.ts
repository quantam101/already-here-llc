import { NextRequest, NextResponse } from "next/server.js";
import type { DispatchPayload } from "../../../lib/dispatch.ts";
import {
  getDispatchEnvStatus,
  getMissingDispatchEnvVars,
  sanitizeDispatchPayload,
  validateDispatchPayload,
} from "../../../lib/dispatch.ts";

type ResendSuccessResponse = {
  id?: string;
};

function requestId() {
  return `dispatch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toRecordFromFormData(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, typeof value === "string" ? value : ""])
  );
}

async function readPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return sanitizeDispatchPayload(await request.json());
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    return sanitizeDispatchPayload(toRecordFromFormData(await request.formData()));
  }

  return sanitizeDispatchPayload({});
}

function buildSubject(payload: DispatchPayload) {
  return [
    "Dispatch Request",
    payload.company,
    payload.serviceType,
    payload.priority,
    payload.requestedDate,
  ]
    .filter(Boolean)
    .join(" | ");
}

function buildSections(payload: DispatchPayload) {
  return [
    {
      title: "Requester",
      rows: [
        ["Full name", payload.fullName],
        ["Company", payload.company],
        ["Email", payload.email],
        ["Phone", payload.phone],
      ],
    },
    {
      title: "Site and schedule",
      rows: [
        ["Full site address", payload.fullSiteAddress],
        ["State", payload.state],
        ["One site or multi-site", payload.siteCount || "-"],
        ["Travel likely", payload.travelLikely || "-"],
        ["Requested date", payload.requestedDate],
        ["Requested window", payload.requestedWindow],
        ["Due-by time", payload.dueByTime || "-"],
        ["Service type", payload.serviceType],
        ["Priority", payload.priority],
        ["Ticket or reference number", payload.ticketReference || "-"],
      ],
    },
    {
      title: "Onsite contact",
      rows: [
        ["Name", payload.onsiteContactName],
        ["Phone", payload.onsiteContactPhone],
        ["Email", payload.onsiteContactEmail],
      ],
    },
    {
      title: "Billing contact",
      rows: [
        ["Name", payload.billingContactName],
        ["Phone", payload.billingContactPhone],
        ["Email", payload.billingContactEmail],
      ],
    },
    {
      title: "Scope and execution notes",
      rows: [
        ["One-line scope summary", payload.oneLineScopeSummary],
        ["Lift required", payload.liftRequired || "-"],
        ["Tools or staging required", payload.toolsRequired || "-"],
        ["Remote bridge details", payload.bridgeDetails || "-"],
        ["Access notes", payload.accessNotes || "-"],
        ["Closeout requirements", payload.closeoutRequirements || "-"],
      ],
    },
  ];
}

function buildTextEmail(payload: DispatchPayload) {
  return buildSections(payload)
    .map(
      (section) =>
        `${section.title.toUpperCase()}\n${section.rows
          .map(([label, value]) => `${label}: ${value || "-"}`)
          .join("\n")}`
    )
    .join("\n\n");
}

function buildHtmlEmail(payload: DispatchPayload) {
  const sections = buildSections(payload)
    .map((section) => {
      const rows = section.rows
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;vertical-align:top;width:240px;">
                ${escapeHtml(label)}
              </td>
              <td style="padding:10px 12px;border:1px solid #e2e8f0;vertical-align:top;">
                ${escapeHtml(value || "-")}
              </td>
            </tr>
          `
        )
        .join("");

      return `
        <section style="margin:0 0 24px;">
          <h3 style="margin:0 0 12px;font-size:18px;color:#0f172a;">${escapeHtml(section.title)}</h3>
          <table style="border-collapse:collapse;width:100%;max-width:960px;">
            <tbody>${rows}</tbody>
          </table>
        </section>
      `;
    })
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <h2 style="margin:0 0 16px;">New Dispatch Request</h2>
      ${sections}
    </div>
  `;
}

function logContext(payload: DispatchPayload) {
  return {
    company: payload.company,
    state: payload.state,
    requestedDate: payload.requestedDate,
    requestedWindow: payload.requestedWindow,
    serviceType: payload.serviceType,
    priority: payload.priority,
  };
}

export async function GET() {
  const envStatus = getDispatchEnvStatus();

  return NextResponse.json({
    ok: true,
    service: "dispatch",
    message: "Dispatch API is live. Use POST to submit a dispatch request.",
    env: envStatus,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  const id = requestId();
  console.info("[dispatch] request received", { id, method: request.method });

  try {
    const payload = await readPayload(request);
    const validation = validateDispatchPayload(payload);

    if (validation.invalidFields.length > 0) {
      console.warn("[dispatch] validation failed", {
        id,
        invalidFields: validation.invalidFields,
        ...logContext(payload),
      });

      return NextResponse.json(
        {
          ok: false,
          message: "Dispatch request validation failed. Review the highlighted required fields and submit again.",
          fieldErrors: validation.fieldErrors,
        },
        { status: 400 }
      );
    }

    const missingEnvVars = getMissingDispatchEnvVars();

    if (missingEnvVars.length > 0) {
      console.error("[dispatch] missing env vars", {
        id,
        missingEnvVars,
      });

      return NextResponse.json(
        {
          ok: false,
          message: `Dispatch delivery is unavailable because these environment variables are missing: ${missingEnvVars.join(", ")}.`,
        },
        { status: 500 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY as string;
    const fromEmail = process.env.DISPATCH_FROM_EMAIL as string;
    const toEmail = process.env.DISPATCH_TO_EMAIL as string;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL as string;
    const subject = buildSubject(payload);

    console.info("[dispatch] resend send attempt started", {
      id,
      toEmail,
      fromEmail,
      siteUrl,
      ...logContext(payload),
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: payload.email,
        subject,
        html: buildHtmlEmail(payload),
        text: buildTextEmail(payload),
      }),
    });

    const resendData = (await resendResponse.json().catch(() => null)) as
      | ResendSuccessResponse
      | { message?: string; name?: string }
      | null;

    if (!resendResponse.ok || !resendData || !("id" in resendData) || !resendData.id) {
      console.error("[dispatch] resend send failure", {
        id,
        status: resendResponse.status,
        resendMessage:
          resendData && "message" in resendData ? resendData.message : "No error payload returned",
      });

      return NextResponse.json(
        {
          ok: false,
          message:
            "Dispatch delivery failed on the server. The request was not confirmed as delivered to the dispatch inbox.",
        },
        { status: 502 }
      );
    }

    console.info("[dispatch] resend send success", {
      id,
      resendId: resendData.id,
      ...logContext(payload),
    });

    return NextResponse.json({
      ok: true,
      message:
        "Dispatch request submitted for delivery to the dispatch inbox. Watch for follow-up after the request is reviewed.",
      resendId: resendData.id,
    });
  } catch (error) {
    console.error("[dispatch] resend send failure", {
      id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        ok: false,
        message:
          "Dispatch delivery failed before the request could be completed. Please try again in a minute.",
      },
      { status: 500 }
    );
  }
}
