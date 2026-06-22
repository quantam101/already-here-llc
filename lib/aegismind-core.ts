export type AegisMindConfig = Readonly<{
  targetScoreThreshold: number;
  optimizationIterations: number;
  maxBodyChars: number;
}>;

export type ProspectDocument = Readonly<{
  source: string;
  company: string;
  niche: string;
  location: string;
  title?: string;
  body: string;
  observedSignals?: string[];
}>;

export type AegisMindScore = Readonly<{
  commercialFitness: number;
  painFitness: number;
  technicalFit: number;
  revenueFit: number;
  compositeIndex: number;
  passesGate: boolean;
  recommendedOffer: string;
  pricingModel: string;
  nextAction: string;
}>;

export type AegisMindResult = Readonly<{
  systemEngine: string;
  configuration: AegisMindConfig;
  optimizationHistory: Array<Readonly<{
    iteration: number;
    commercialBias: number;
    painBias: number;
    technicalBias: number;
    revenueBias: number;
    yieldCount: number;
    meanCompositeIndex: number;
  }>>;
  rankedProspects: Array<ProspectDocument & { score: AegisMindScore }>;
  rejectedProspects: Array<ProspectDocument & { score: AegisMindScore }>;
}>;

export const DEFAULT_AEGISMIND_CONFIG: AegisMindConfig = Object.freeze({
  targetScoreThreshold: 6.5,
  optimizationIterations: 4,
  maxBodyChars: 120000,
});

const COMMERCIAL_TERMS = ["quote", "book", "booking", "dispatch", "service area", "same day", "emergency", "estimate", "appointment", "commercial", "property manager", "maintenance"];
const PAIN_TERMS = ["missed call", "slow response", "call for quote", "no booking", "contact us", "voicemail", "after hours", "communication", "follow up", "callback", "schedule", "photos", "upload", "friction", "outdated", "manual"];
const TECH_TERMS = ["form", "crm", "website", "api", "stripe", "square", "resend", "formspree", "webhook", "dashboard", "route", "ticket", "intake", "automation"];
const REVENUE_TERMS = ["booked job", "lead", "recurring", "monthly", "retainer", "job value", "invoice", "ticket value", "closeout", "attribution", "tracking", "success fee"];

const OFFER_BY_VERTICAL: Record<string, string> = {
  hauling: "AI photo-quote and missed-call hauling intake agent",
  junk_removal: "AI photo-quote and missed-call junk-removal intake agent",
  mobile_mechanic: "Mechanic intake agent with VIN, symptom, location, and arrival-condition capture",
  auto_repair: "AI service-request and missed-call receptionist for repair quote capture",
  hvac: "AI missed-call receptionist and emergency booking triage",
  plumbing: "AI missed-call receptionist and emergency booking triage",
  electrical: "AI missed-call receptionist and job-scope triage",
  msp: "AI helpdesk intake and ticket-routing workflow",
  pos_support: "POS dispatch intake and closeout documentation assistant",
  low_voltage: "Low-voltage RFQ intake and field-tech closeout assistant",
  access_control: "Access-control service intake and closeout assistant",
  cctv: "CCTV quote intake and site-survey assistant",
  healthcare_field_service: "Healthcare field-service dispatch and closeout QA assistant",
  dental_medical: "Missed-call receptionist and appointment-request capture assistant",
  real_estate: "Property lead intake and follow-up automation",
  property_management: "Property cleanout, maintenance, and vendor-routing intake workflow",
  contractor: "RFQ intake and job-routing workflow",
};

export function normalizeText(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replaceAll("-", " ").split(/\s+/).join(" ").trim();
}

function countTerm(body: string, term: string): number {
  let count = 0;
  let offset = 0;
  while (true) {
    const found = body.indexOf(term, offset);
    if (found < 0) return count;
    count += 1;
    offset = found + term.length;
  }
}

function densityScore(body: string, terms: string[], bias: number): number {
  const hits = terms.reduce((total, term) => total + countTerm(body, normalizeText(term)), 0);
  return Math.min(10, Math.log1p(hits) * bias);
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function verticalKey(niche: string): string {
  return normalizeText(niche).replaceAll(" ", "_");
}

export function scoreProspect(
  document: ProspectDocument,
  config: AegisMindConfig = DEFAULT_AEGISMIND_CONFIG,
  biases = { commercial: 3.5, pain: 4.5, technical: 3.0, revenue: 4.0 },
): AegisMindScore {
  const body = normalizeText(`${document.company} ${document.niche} ${document.location} ${document.title ?? ""} ${document.body} ${(document.observedSignals ?? []).join(" ")}`).slice(0, config.maxBodyChars);
  const commercialFitness = densityScore(body, COMMERCIAL_TERMS, biases.commercial);
  const painFitness = densityScore(body, PAIN_TERMS, biases.pain);
  const technicalFit = densityScore(body, TECH_TERMS, biases.technical);
  const revenueFit = densityScore(body, REVENUE_TERMS, biases.revenue);
  const compositeIndex = (commercialFitness * 0.25) + (painFitness * 0.35) + (technicalFit * 0.15) + (revenueFit * 0.25);

  return Object.freeze({
    commercialFitness: round4(commercialFitness),
    painFitness: round4(painFitness),
    technicalFit: round4(technicalFit),
    revenueFit: round4(revenueFit),
    compositeIndex: round4(compositeIndex),
    passesGate: compositeIndex >= config.targetScoreThreshold,
    recommendedOffer: OFFER_BY_VERTICAL[verticalKey(document.niche)] ?? "Website lead-capture, quote-intake, and follow-up automation",
    pricingModel: compositeIndex >= 7.5 ? "No setup; monthly support plus booked-job success fee with first-60-day cap" : "Half-price setup plus lower monthly support until tracked lead flow is proven",
    nextAction: "Call owner or dispatch manager first, confirm pain, then send a one-page pilot offer with tracking-link requirements.",
  });
}

export function runAegisMindRevenueIntelligence(
  documents: ProspectDocument[],
  config: AegisMindConfig = DEFAULT_AEGISMIND_CONFIG,
): AegisMindResult {
  const sweeps = [
    { iteration: 1, commercial: 3.0, pain: 3.0, technical: 3.0, revenue: 3.0 },
    { iteration: 2, commercial: 3.5, pain: 4.0, technical: 2.5, revenue: 3.5 },
    { iteration: 3, commercial: 4.0, pain: 4.5, technical: 3.0, revenue: 4.0 },
    { iteration: 4, commercial: 4.0, pain: 5.0, technical: 3.0, revenue: 4.5 },
  ].slice(0, config.optimizationIterations);

  let finalScored = documents.map((document) => ({ document, score: scoreProspect(document, config) }));
  const optimizationHistory = sweeps.map((sweep) => {
    const scored = documents.map((document) => scoreProspect(document, config, sweep));
    finalScored = documents.map((document, index) => ({ document, score: scored[index] }));
    return Object.freeze({
      iteration: sweep.iteration,
      commercialBias: sweep.commercial,
      painBias: sweep.pain,
      technicalBias: sweep.technical,
      revenueBias: sweep.revenue,
      yieldCount: scored.filter((score) => score.passesGate).length,
      meanCompositeIndex: round4(scored.reduce((sum, score) => sum + score.compositeIndex, 0) / Math.max(1, scored.length)),
    });
  });

  const ranked = finalScored.map(({ document, score }) => ({ ...document, score })).sort((a, b) => b.score.compositeIndex - a.score.compositeIndex || a.company.localeCompare(b.company));

  return Object.freeze({
    systemEngine: "AegisMind Core v4.1 Revenue Intelligence",
    configuration: config,
    optimizationHistory,
    rankedProspects: ranked.filter((item) => item.score.passesGate),
    rejectedProspects: ranked.filter((item) => !item.score.passesGate),
  });
}
