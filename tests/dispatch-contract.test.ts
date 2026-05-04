import assert from "node:assert/strict";
import {
  dispatchInitialValues,
  getMissingDispatchEnvVars,
  sanitizeDispatchPayload,
  validateDispatchPayload,
} from "../lib/dispatch";
import { GET as dispatchApiGet, POST as dispatchApiPost } from "../app/api/dispatch/route";

const requiredEnv = {
  RESEND_API_KEY: "test",
  DISPATCH_FROM_EMAIL: "dispatch@alreadyherellc.com",
  DISPATCH_TO_EMAIL: "alreadyherellc@gmail.com",
  NEXT_PUBLIC_SITE_URL: "https://www.alreadyherellc.com",
};

type EnvPatch = Record<string, string | undefined>;

async function withEnv<T>(patch: EnvPatch, callback: () => Promise<T>): Promise<T> {
  const originals: EnvPatch = {};

  for (const [key, value] of Object.entries(patch)) {
    originals[key] = process.env[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await callback();
  } finally {
    for (const [key, originalValue] of Object.entries(originals)) {
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
  }
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  const validation = validateDispatchPayload(dispatchInitialValues);
  assert.equal(validation.invalidFields.length, 16);
  assert.equal(
    validation.fieldErrors.fullName,
    "Enter the full name for the person submitting this request.",
  );
  assert.equal(
    validation.fieldErrors.oneLineScopeSummary,
    "Enter a one-line scope summary that explains the work to be performed onsite.",
  );

  const payload = sanitizeDispatchPayload({
    ...dispatchInitialValues,
    fullName: "  Taylor Buyer  ",
    company: "  Already Here LLC  ",
    email: "  TEST@EXAMPLE.COM ",
    phone: " (602) 555-0100 ",
    fullSiteAddress: " 123 Main St ",
    requestedDate: "2026-04-13",
    requestedWindow: "Morning",
    serviceType: "Remote Team Support",
    priority: "Urgent",
    onsiteContactName: "  Jamie Site  ",
    onsiteContactPhone: "602-555-0101",
    onsiteContactEmail: " SITE@EXAMPLE.COM ",
    billingContactName: "  Pat Billing ",
    billingContactPhone: "602-555-0102",
    billingContactEmail: " BILLING@EXAMPLE.COM ",
    oneLineScopeSummary: "  Replace failed device and confirm closeout. ",
  });

  assert.equal(payload.fullName, "Taylor Buyer");
  assert.equal(payload.email, "test@example.com");
  assert.equal(payload.onsiteContactEmail, "site@example.com");
  assert.equal(payload.billingContactEmail, "billing@example.com");
  assert.equal(validateDispatchPayload(payload).invalidFields.length, 0);

  const fullEnv = getMissingDispatchEnvVars({
    ...process.env,
    RESEND_API_KEY: "test",
    DISPATCH_FROM_EMAIL: "dispatch@alreadyherellc.com",
    DISPATCH_TO_EMAIL: "alreadyherellc@gmail.com",
    NEXT_PUBLIC_SITE_URL: "https://www.alreadyherellc.com",
  });

  assert.deepEqual(fullEnv, []);
  assert.deepEqual(
    getMissingDispatchEnvVars({
      ...process.env,
      RESEND_API_KEY: "",
      DISPATCH_FROM_EMAIL: "dispatch@alreadyherellc.com",
      DISPATCH_TO_EMAIL: "",
      NEXT_PUBLIC_SITE_URL: "",
    }),
    ["RESEND_API_KEY", "DISPATCH_TO_EMAIL", "NEXT_PUBLIC_SITE_URL"],
  );

  await withEnv(requiredEnv, async () => {
    const response = await dispatchApiGet();
    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.ok, true);
    assert.equal(json.service, "dispatch");
    assert.equal(json.env.RESEND_API_KEY, true);
    assert.equal(json.env.DISPATCH_FROM_EMAIL, true);
    assert.equal(json.env.DISPATCH_TO_EMAIL, true);
    assert.equal(json.env.NEXT_PUBLIC_SITE_URL, true);
    assert.equal(typeof json.timestamp, "string");
  });

  {
    const response = await dispatchApiPost(jsonRequest({}));
    assert.equal(response.status, 400);
    const json = await response.json();
    assert.equal(json.ok, false);
    assert.equal(typeof json.fieldErrors.fullName, "string");
    assert.equal(typeof json.fieldErrors.oneLineScopeSummary, "string");
  }

  await withEnv(
    {
      RESEND_API_KEY: "",
      DISPATCH_FROM_EMAIL: "",
      DISPATCH_TO_EMAIL: "",
      NEXT_PUBLIC_SITE_URL: "",
    },
    async () => {
      const response = await dispatchApiPost(jsonRequest(payload));
      assert.equal(response.status, 500);
      const json = await response.json();
      assert.equal(json.ok, false);
      assert.ok(json.message.includes("RESEND_API_KEY"));
      assert.ok(json.message.includes("DISPATCH_FROM_EMAIL"));
      assert.ok(json.message.includes("DISPATCH_TO_EMAIL"));
      assert.ok(json.message.includes("NEXT_PUBLIC_SITE_URL"));
    },
  );

  await withEnv(requiredEnv, async () => {
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        assert.equal(url, "https://api.resend.com/emails");

        return new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      };

      const response = await dispatchApiPost(jsonRequest(payload));
      assert.equal(response.status, 502);
      const json = await response.json();
      assert.equal(json.ok, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await withEnv(requiredEnv, async () => {
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        assert.equal(url, "https://api.resend.com/emails");

        return new Response(JSON.stringify({ id: "email_test_id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const response = await dispatchApiPost(jsonRequest(payload));
      assert.equal(response.status, 200);
      const json = await response.json();
      assert.equal(json.ok, true);
      assert.equal(json.resendId, "email_test_id");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  console.log("dispatch contract + api tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
