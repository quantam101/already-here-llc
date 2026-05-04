// app/api/dispatch/route.ts
import { NextResponse } from "next/server";
import {
  dispatchFieldLabels,
  getDispatchEnvStatus,
  getMissingDispatchEnvVars,
  sanitizeDispatchPayload,
  validateDispatchPayload,
  type DispatchFieldName,
  type DispatchPayload,
} from "@/lib/dispatch";

export const runtime = "nodejs";

type DispatchApiResponse =
  | {
      ok: true;
      message: string;
      resendId?: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Partial<Record<DispatchFieldName, string>>;
    };

function fieldValue(payload: DispatchPayload, key: DispatchFieldName) {
  const label = dispatchFieldLabels[key];
  const value = payload[key] || "Not provided";
  return `${label}: ${value}`;
}

function buildDispatchEmail(payload: DispatchPayload) {
  const subject = [
    "Already Here LLC Dispatch Request",
    payload.priority || "Priority not set",
    payload.company || "Company not provided",
    payload.serviceType || "Service not provided",
    payload.requestedDate || "Date not provided",
  ].join(" | ");

  const text = [
    "New Already Here LLC Dispatch Request",
    "",
    `Submitted At: ${new Date().toISOString()}`,
    "Source: https://www.alreadyherellc.com/dispatch",
    "",
    "Requester",
    fieldValue(payload, "fullName"),
    fieldValue(payload, "company"),
    fieldValue(payload, "email"),
    fieldValue(payload, "phone"),
    "",
    "Site and Schedule",
    fieldValue(payload, "fullSiteAddress"),
    fieldValue(payload, "state"),
    fieldValue(payload, "siteCount"),
    fieldValue(payload, "travelLikely"),
    fieldValue(payload, "requestedDate"),
    fieldValue(payload, "requestedWindow"),
    fieldValue(payload, "dueByTime"),
    fieldValue(payload, "serviceType"),
    fieldValue(payload, "priority"),
    fieldValue(payload, "ticketReference"),
    "",
    "Onsite Contact",
    fieldValue(payload, "onsiteContactName"),
    fieldValue(payload, "onsiteContactPhone"),
    fieldValue(payload, "onsiteContactEmail"),
    "",
    "Billing Contact",
    fieldValue(payload, "billingContactName"),
    fieldValue(payload, "billingContactPhone"),
    fieldValue(payload, "billingContactEmail"),
    "",
    "Scope and Execution Notes",
    fieldValue(payload, "liftRequired"),
    fieldValue(payload, "toolsRequired"),
    fieldValue(payload, "oneLineScopeSummary"),
    fieldValue(payload, "bridgeDetails"),
    fieldValue(payload, "accessNotes"),
    fieldValue(payload, "closeoutRequirements"),
  ].join("\n");

  return { subject, text };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "dispatch",
    env: getDispatchEnvStatus(),
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<DispatchApiResponse>(
      {
        ok: false,
        message: "Invalid JSON payload.",
      },
      { status: 400 },
    );
  }

  const payload = sanitizeDispatchPayload(body);
  const validation = validateDispatchPayload(payload);

  if (validation.invalidFields.length > 0) {
    return NextResponse.json<DispatchApiResponse>(
      {
        ok: false,
        message: "Review the highlighted required fields before sending the dispatch request.",
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 },
    );
  }

  const missingEnv = getMissingDispatchEnvVars();

  if (missingEnv.length > 0) {
    return NextResponse.json<DispatchApiResponse>(
      {
        ok: false,
        message: `Dispatch delivery is not configured. Missing environment variables: ${missingEnv.join(", ")}.`,
      },
      { status: 500 },
    );
  }

  const dispatchTo = process.env.DISPATCH_TO_EMAIL as string;
  const dispatchFrom = process.env.DISPATCH_FROM_EMAIL as string;
  const resendApiKey = process.env.RESEND_API_KEY as string;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL as string;
  const email = buildDispatchEmail(payload);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: dispatchFrom,
        to: dispatchTo,
        subject: email.subject,
        text: `${email.text}\n\nSite URL: ${siteUrl}`,
        reply_to: payload.email,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error("[dispatch:resend-error]", {
        status: response.status,
        errorText,
      });

      return NextResponse.json<DispatchApiResponse>(
        {
          ok: false,
          message:
            "Dispatch delivery failed after validation. Please contact dispatch@alreadyherellc.com directly.",
        },
        { status: 502 },
      );
    }

    const result = (await response.json()) as { id?: string };

    return NextResponse.json<DispatchApiResponse>({
      ok: true,
      message:
        "Dispatch request submitted for delivery to our dispatch inbox. Watch for follow-up if the request is accepted.",
      resendId: result.id,
    });
  } catch (error) {
    console.error("[dispatch:unexpected-error]", error);

    return NextResponse.json<DispatchApiResponse>(
      {
        ok: false,
        message:
          "Dispatch delivery failed before the request could be submitted. Please try again in a minute.",
      },
      { status: 500 },
    );
  }
}
