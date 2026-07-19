import assert from "node:assert/strict";
import test from "node:test";

import {
  AiActionInputSchema,
  ContactInputSchema,
  LeadInputSchema,
  OpportunityInputSchema,
  OrganizationInputSchema,
  ReviewActionInputSchema,
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

test("lead input enforces confidence and priority boundaries", () => {
  const valid = LeadInputSchema.parse({
    lane: "dispatch",
    title: "Emergency network outage",
    source: "website",
    urgency: "emergency",
    priority: "P0",
    aiConfidence: 0.94,
  });

  assert.equal(valid.priority, "P0");
  assert.throws(() => LeadInputSchema.parse({
    lane: "dispatch",
    title: "Invalid confidence",
    source: "website",
    aiConfidence: 1.2,
  }));
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
