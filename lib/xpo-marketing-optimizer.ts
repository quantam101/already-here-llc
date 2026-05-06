export type PaidMediaPlatform =
  | "google_ads"
  | "meta"
  | "tiktok"
  | "linkedin"
  | "microsoft_ads"
  | "native"
  | "other";

export type KeywordIntent = "commercial" | "transactional" | "local" | "research" | "competitor" | "negative";

export type MatchType = "exact" | "phrase" | "broad" | "negative_exact" | "negative_phrase";

export type KeywordCandidate = {
  term: string;
  campaign?: string;
  adGroup?: string;
  platform?: PaidMediaPlatform;
  intent?: KeywordIntent;
  matchType?: MatchType;
  avgMonthlySearches?: number;
  cpc?: number;
  conversions?: number;
  clicks?: number;
  impressions?: number;
  spend?: number;
  revenue?: number;
  source?: string;
};

export type KeywordOptimizationResult = KeywordCandidate & {
  score: number;
  recommendation: "scale" | "test" | "hold" | "pause" | "negative";
  normalizedTerm: string;
  reasons: string[];
};

export type Touchpoint = {
  id: string;
  userId: string;
  platform: PaidMediaPlatform;
  campaignId?: string;
  campaignName?: string;
  adSetId?: string;
  adGroupId?: string;
  adId?: string;
  keyword?: string;
  eventType: "impression" | "click" | "engagement" | "view" | "lead" | "purchase" | "qualified_lead";
  timestamp: string;
  cost?: number;
};

export type ConversionEvent = {
  id: string;
  userId: string;
  timestamp: string;
  value: number;
  type: "lead" | "qualified_lead" | "sale" | "repeat_sale";
};

export type AttributionCredit = {
  touchpointId: string;
  platform: PaidMediaPlatform;
  campaignId?: string;
  campaignName?: string;
  keyword?: string;
  credit: number;
  attributedValue: number;
  model: "position_time_decay_v1";
};

export type AttributionSummary = {
  model: "position_time_decay_v1";
  generatedAt: string;
  conversionCount: number;
  totalConversionValue: number;
  credits: AttributionCredit[];
  platformTotals: Array<{
    platform: PaidMediaPlatform;
    credit: number;
    attributedValue: number;
  }>;
  campaignTotals: Array<{
    platform: PaidMediaPlatform;
    campaignId?: string;
    campaignName?: string;
    credit: number;
    attributedValue: number;
  }>;
};

function normalizeKeyword(term: string) {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeRate(numerator = 0, denominator = 0) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function optimizeKeywords(candidates: KeywordCandidate[]): KeywordOptimizationResult[] {
  return candidates
    .map((candidate) => {
      const normalizedTerm = normalizeKeyword(candidate.term);
      const clicks = candidate.clicks ?? 0;
      const spend = candidate.spend ?? 0;
      const conversions = candidate.conversions ?? 0;
      const revenue = candidate.revenue ?? 0;
      const cvr = safeRate(conversions, clicks);
      const roas = safeRate(revenue, spend);
      const cpa = conversions > 0 ? spend / conversions : spend > 0 ? spend : 0;
      const hasLocalModifier = /\b(phoenix|scottsdale|tempe|mesa|chandler|glendale|arizona|az)\b/.test(normalizedTerm);
      const hasBuyerIntent = /\b(dispatch|field service|smart hands|pos|kiosk|network|rollout|cabling|onsite|technician|repair|install|installation)\b/.test(normalizedTerm);
      const negativeIntent = /\b(free|jobs|salary|training|course|diy|template|pdf only|definition)\b/.test(normalizedTerm);

      const reasons: string[] = [];
      let score = 0;

      if (hasBuyerIntent) {
        score += 28;
        reasons.push("buyer-intent language");
      }
      if (hasLocalModifier) {
        score += 18;
        reasons.push("local service-area modifier");
      }
      if (cvr > 0) {
        score += clamp(cvr * 120, 0, 22);
        reasons.push("conversion history present");
      }
      if (roas > 0) {
        score += clamp(roas * 7, 0, 18);
        reasons.push("revenue efficiency present");
      }
      if ((candidate.avgMonthlySearches ?? 0) > 0) {
        score += clamp(Math.log10((candidate.avgMonthlySearches ?? 0) + 1) * 5, 0, 12);
        reasons.push("search demand present");
      }
      if ((candidate.cpc ?? 0) > 15 && conversions === 0) {
        score -= 18;
        reasons.push("high CPC without conversion evidence");
      }
      if (negativeIntent || candidate.intent === "negative") {
        score = Math.min(score, 8);
        reasons.push("negative or low-buyer-intent language");
      }
      if (cpa > 0 && revenue > 0 && cpa > revenue) {
        score -= 15;
        reasons.push("CPA exceeds tracked revenue value");
      }

      const finalScore = Number(clamp(score).toFixed(2));
      const recommendation: KeywordOptimizationResult["recommendation"] = negativeIntent
        ? "negative"
        : finalScore >= 70
          ? "scale"
          : finalScore >= 45
            ? "test"
            : finalScore >= 25
              ? "hold"
              : spend > 0
                ? "pause"
                : "negative";

      return {
        ...candidate,
        normalizedTerm,
        score: finalScore,
        recommendation,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function hoursBetween(a: string, b: string) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60);
}

function touchWeight(touchpoint: Touchpoint, conversion: ConversionEvent, pathLength: number, index: number) {
  const hours = hoursBetween(touchpoint.timestamp, conversion.timestamp);
  const recency = Math.exp(-hours / (24 * 14));
  const position = pathLength === 1 ? 1 : index === 0 || index === pathLength - 1 ? 1.35 : 1;
  const action = touchpoint.eventType === "click" ? 1.35 : touchpoint.eventType === "engagement" ? 1.15 : touchpoint.eventType === "view" ? 0.95 : 0.65;
  return recency * position * action;
}

export function attributeConversions(touchpoints: Touchpoint[], conversions: ConversionEvent[], lookbackDays = 30): AttributionSummary {
  const credits: AttributionCredit[] = [];

  for (const conversion of conversions) {
    const conversionTime = new Date(conversion.timestamp).getTime();
    const path = touchpoints
      .filter((touchpoint) => {
        if (touchpoint.userId !== conversion.userId) return false;
        const time = new Date(touchpoint.timestamp).getTime();
        const ageDays = (conversionTime - time) / (1000 * 60 * 60 * 24);
        return ageDays >= 0 && ageDays <= lookbackDays;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (path.length === 0) continue;

    const weights = path.map((touchpoint, index) => touchWeight(touchpoint, conversion, path.length, index));
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;

    path.forEach((touchpoint, index) => {
      const credit = weights[index] / totalWeight;
      credits.push({
        touchpointId: touchpoint.id,
        platform: touchpoint.platform,
        campaignId: touchpoint.campaignId,
        campaignName: touchpoint.campaignName,
        keyword: touchpoint.keyword,
        credit,
        attributedValue: conversion.value * credit,
        model: "position_time_decay_v1",
      });
    });
  }

  const platformMap = new Map<PaidMediaPlatform, { credit: number; attributedValue: number }>();
  const campaignMap = new Map<string, { platform: PaidMediaPlatform; campaignId?: string; campaignName?: string; credit: number; attributedValue: number }>();

  for (const credit of credits) {
    const platformTotal = platformMap.get(credit.platform) ?? { credit: 0, attributedValue: 0 };
    platformTotal.credit += credit.credit;
    platformTotal.attributedValue += credit.attributedValue;
    platformMap.set(credit.platform, platformTotal);

    const campaignKey = `${credit.platform}:${credit.campaignId ?? credit.campaignName ?? "unknown"}`;
    const campaignTotal = campaignMap.get(campaignKey) ?? {
      platform: credit.platform,
      campaignId: credit.campaignId,
      campaignName: credit.campaignName,
      credit: 0,
      attributedValue: 0,
    };
    campaignTotal.credit += credit.credit;
    campaignTotal.attributedValue += credit.attributedValue;
    campaignMap.set(campaignKey, campaignTotal);
  }

  return {
    model: "position_time_decay_v1",
    generatedAt: new Date().toISOString(),
    conversionCount: conversions.length,
    totalConversionValue: conversions.reduce((sum, conversion) => sum + conversion.value, 0),
    credits,
    platformTotals: Array.from(platformMap.entries())
      .map(([platform, total]) => ({
        platform,
        credit: Number(total.credit.toFixed(4)),
        attributedValue: Number(total.attributedValue.toFixed(2)),
      }))
      .sort((a, b) => b.attributedValue - a.attributedValue),
    campaignTotals: Array.from(campaignMap.values())
      .map((total) => ({
        ...total,
        credit: Number(total.credit.toFixed(4)),
        attributedValue: Number(total.attributedValue.toFixed(2)),
      }))
      .sort((a, b) => b.attributedValue - a.attributedValue),
  };
}

export const xpoMarketingGovernance = {
  productionMode: "deterministic-first",
  aiRole: "summarization-and-recommendation-only-until-approved",
  restrictedActions: [
    "Do not change ad budgets automatically.",
    "Do not publish ads automatically.",
    "Do not upload customer lists automatically.",
    "Do not alter platform pixels, conversion APIs, or attribution windows without approval.",
    "Do not make medical, financial, housing, employment, or discriminatory targeting recommendations.",
  ],
};
