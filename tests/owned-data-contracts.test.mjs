import assert from "node:assert/strict";
import test from "node:test";

import {
  AiActionInputSchema,
  ContactInputSchema,
  DispatchInputSchema,
  LeadInputSchema,
  OpportunityInputSchema,
  OrganizationInputSchema,
  RevenueEventInputSchema,
  ReviewActionInputSchema,
  buildLeadDedupeKey,
} from "../lib/owned-data/contracts.ts";

test("organization input accepts a valid prospect", () => {
  const parsed = OrganizationInputSchema.parse({
    legalName: "Phoenix Managed Services",
    organizationType: "prospect",
    website: "https://example.com",
    metadata: { lane: "field_service" },
  });

  assert.equal(parsed.organizationType, "prospect");
});

test("contact input requires an identity field", () => {
  assert.throws(() => ContactInputSchema.parse({ contactType: "prospect", metadata: {} }));
});

test("lead input enforces lane, confidence, and priority boundaries", () => {
  const valid = LeadInputSchema.parse({
    lane: "dispatch",
    title: "Emergency network outage",
    source: "website",
    urgency: "emergency",
    priority: "P0",
    aiConfidence: 0.94,
  });

  assert.equal(valid.priority, "P0");
  assert.equal(valid.serviceLocation.countryCode, "US");
  assert.throws(() => LeadInputSchema.parse({
    lane: "diesel",
    title: "Unsupported lane",
    source: "website",
  }));
  assert.throws(() => LeadInputSchema.parse({
    lane: "dispatch",
    title: "Invalid confidence",
    source: "website",
    aiConfidence: 1.2,
  }));
});

test("lead dedupe key prefers stable external identifiers", () => {
  assert.equal(buildLeadDedupeKey({
    source: "Gmail",
    sourceExternalId: " Message-123 ",
    lane: "dispatch",
    title: "Ignored title",
  }), "gmail:message-123");

  assert.equal(buildLeadDedupeKey({
    source: "Website",
    lane: "field_service",
    title: "  Network   Health Assessment ",
  }), "website:field_service:network health assessment");
});

test("opportunity probability remains normalized", () => {
  const parsed = OpportunityInputSchema.parse({
    lane: "field_service",
    title: "Arizona coverage retainer",
    expectedValue: 2000,
    probability: 0.7,
  });

  assert.equal(parsed.stage, "qualified");
  assert.throws(() => OpportunityInputSchema.parse({
    lane: "field_service",
    title: "Invalid opportunity",
    probability: 101,
  }));
});

test("AI actions are pending recommendations, not direct execution commands", () => {
  const parsed = AiActionInputSchema.parse({
    agentName: "receptionist",
    actionType: "draft_reply",
    entityType: "lead",
    recommendation: { subject: "Response", body: "Draft only" },
    confidence: 0.88,
  });

  assert.equal(parsed.actionType, "draft_reply");
});

test("review actions allow controlled owner decisions", () => {
  for (const action of ["review", "approve", "reject", "pass", "reply", "assign", "schedule", "dispatch", "archive", "escalate"]) {
    const parsed = ReviewActionInputSchema.parse({
      entityType: "lead",
      action,
      payload: {},
    });
    assert.equal(parsed.action, action);
  }
});

test("dispatch scheduling rejects reversed time windows", () => {
  const valid = DispatchInputSchema.parse({
    lane: "field_service",
    serviceType: "Network health assessment",
    serviceLocation: { city: "Phoenix", state: "AZ", postalCode: "85007" },
    scheduledStart: "2026-07-20T16:00:00.000Z",
    scheduledEnd: "2026-07-20T20:00:00.000Z",
    quotedAmount: 750,
  });
  assert.equal(valid.serviceLocation.countryCode, "US");

  assert.throws(() => DispatchInputSchema.parse({
    serviceType: "Invalid schedule",
    serviceLocation: { city: "Phoenix", state: "AZ", postalCode: "85007" },
    scheduledStart: "2026-07-20T20:00:00.000Z",
    scheduledEnd: "2026-07-20T16:00:00.000Z",
  }));
});

test("revenue events permit refunds but reject invalid currency", () => {
  const refund = RevenueEventInputSchema.parse({
    lane: "products",
    eventType: "refund",
    amount: -30,
    currency: "USD",
  });
  assert.equal(refund.amount, -30);

  assert.throws(() => RevenueEventInputSchema.parse({
    lane: "products",
    eventType: "paid",
    amount: 30,
    currency: "US",
  }));
});
