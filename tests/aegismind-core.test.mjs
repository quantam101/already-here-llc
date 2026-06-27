import assert from "node:assert/strict";
import { runAegisMindRevenueIntelligence, scoreProspect } from "../lib/aegismind-core.ts";

const highIntentProspect = {
  source: "manual-test",
  company: "Phoenix Rapid Junk Removal",
  niche: "junk_removal",
  location: "Phoenix, AZ",
  title: "Call for quote same day cleanouts",
  body: "Customers call for quote, request same day booking, send photos, need appointment scheduling, and expect follow up. Website has intake friction, no clear upload form, and tracking is needed for booked job attribution and monthly success fee reporting.",
  observedSignals: ["call for quote", "photos", "booking friction", "follow up", "booked job tracking"],
};

const lowIntentProspect = {
  source: "manual-test",
  company: "Static Brochure Company",
  niche: "general",
  location: "Remote",
  title: "About us",
  body: "This is a basic informational page with no service call, appointment, lead, estimate, dispatch, or quote context.",
  observedSignals: [],
};

const highScore = scoreProspect(highIntentProspect);
assert.equal(highScore.passesGate, true);
assert.equal(highScore.recommendedOffer, "AI photo-quote and missed-call junk-removal intake agent");
assert.match(highScore.pricingModel, /monthly support/);

const lowScore = scoreProspect(lowIntentProspect);
assert.equal(lowScore.passesGate, false);

const result = runAegisMindRevenueIntelligence([lowIntentProspect, highIntentProspect]);
assert.equal(result.systemEngine, "AegisMind Core v4.1 Revenue Intelligence");
assert.equal(result.optimizationHistory.length, 4);
assert.equal(result.rankedProspects[0].company, "Phoenix Rapid Junk Removal");
assert.equal(result.rejectedProspects[0].company, "Static Brochure Company");

console.log("AegisMind revenue intelligence contract passed");
