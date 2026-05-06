import assert from "node:assert/strict";
import {
  attributeConversions,
  optimizeKeywords,
  xpoMarketingGovernance,
} from "../lib/xpo-marketing-optimizer.ts";

const keywordResults = optimizeKeywords([
  {
    term: "Phoenix POS field service technician",
    platform: "google_ads",
    intent: "local",
    avgMonthlySearches: 260,
    cpc: 7.5,
    clicks: 40,
    conversions: 6,
    spend: 300,
    revenue: 2400,
  },
  {
    term: "free POS install training course",
    platform: "google_ads",
    avgMonthlySearches: 900,
    cpc: 2.1,
    clicks: 100,
    conversions: 0,
    spend: 210,
    revenue: 0,
  },
  {
    term: "Arizona smart hands network support",
    platform: "google_ads",
    avgMonthlySearches: 140,
    cpc: 8,
    clicks: 25,
    conversions: 2,
    spend: 200,
    revenue: 1200,
  },
]);

assert.equal(keywordResults[0].recommendation, "scale");
assert.equal(keywordResults[0].normalizedTerm, "phoenix pos field service technician");
assert.ok(keywordResults[0].score > keywordResults[1].score);
assert.equal(keywordResults.find((row) => row.term.includes("free"))?.recommendation, "negative");

const touchpoints = [
  {
    id: "tp_1",
    userId: "u_1",
    platform: "google_ads",
    campaignId: "g_1",
    campaignName: "Phoenix POS Search",
    keyword: "phoenix pos field service",
    eventType: "click",
    timestamp: "2026-05-01T12:00:00Z",
    cost: 9,
  },
  {
    id: "tp_2",
    userId: "u_1",
    platform: "meta",
    campaignId: "m_1",
    campaignName: "Retargeting",
    eventType: "engagement",
    timestamp: "2026-05-02T12:00:00Z",
    cost: 3,
  },
  {
    id: "tp_3",
    userId: "u_1",
    platform: "google_ads",
    campaignId: "g_1",
    campaignName: "Phoenix POS Search",
    keyword: "phoenix pos field service",
    eventType: "click",
    timestamp: "2026-05-03T12:00:00Z",
    cost: 11,
  },
  {
    id: "tp_old",
    userId: "u_1",
    platform: "tiktok",
    campaignId: "t_1",
    campaignName: "Old Awareness",
    eventType: "view",
    timestamp: "2026-01-01T12:00:00Z",
    cost: 1,
  },
];

const attribution = attributeConversions(
  touchpoints,
  [
    {
      id: "conv_1",
      userId: "u_1",
      timestamp: "2026-05-04T12:00:00Z",
      value: 1500,
      type: "sale",
    },
  ],
  30,
);

assert.equal(attribution.model, "position_time_decay_v1");
assert.equal(attribution.conversionCount, 1);
assert.equal(attribution.totalConversionValue, 1500);
assert.equal(attribution.credits.length, 3);
assert.equal(attribution.credits.some((credit) => credit.touchpointId === "tp_old"), false);
assert.equal(Math.round(attribution.credits.reduce((sum, credit) => sum + credit.credit, 0) * 1000) / 1000, 1);
assert.equal(Math.round(attribution.credits.reduce((sum, credit) => sum + credit.attributedValue, 0)), 1500);
assert.ok(attribution.platformTotals[0].attributedValue > 0);
assert.ok(xpoMarketingGovernance.restrictedActions.includes("Do not change ad budgets automatically."));

console.log("xpo marketing optimizer tests passed");
