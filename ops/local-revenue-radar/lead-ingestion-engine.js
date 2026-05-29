import crypto from 'node:crypto';
import { routeLead } from './lead-router.js';

const SAFE_MANUAL_SOURCE_TYPES = new Set(['manual_intake', 'first_party_form']);
const BLOCKED_SOURCE_IDS = new Set(['facebook-marketplace', 'nextdoor']);

function normalizeText(value) {
  return String(value ?? '').trim();
}

function stableId(input) {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}

function sourceById(sourcesConfig, sourceId) {
  return sourcesConfig.sources.find((source) => source.id === sourceId);
}

function categoryForLead(sourcesConfig, lead) {
  if (lead.categoryId) return lead.categoryId;
  const text = `${lead.title ?? ''} ${lead.description ?? ''}`.toLowerCase();
  const matchedCategory = sourcesConfig.categories.find((category) =>
    category.terms.some((term) => text.includes(term.toLowerCase()))
  );
  return matchedCategory?.id ?? 'default';
}

function scoresFromLead(rawLead, sourcesConfig) {
  const distanceMiles = Number(rawLead.distanceMiles ?? sourcesConfig.home_market.max_default_radius_miles);
  const urgencyHours = Number(rawLead.urgencyHours ?? 72);
  const estimatedRevenue = Number(rawLead.estimatedRevenue ?? 0);
  const marginPercent = Number(rawLead.marginPercent ?? 0);
  const risk = Number(rawLead.risk ?? 50);

  return {
    revenue: Math.min(100, Math.round(estimatedRevenue / 15)),
    margin: Math.max(0, Math.min(100, Math.round(marginPercent))),
    urgency: Math.max(0, Math.min(100, Math.round(100 - urgencyHours))),
    equipment_match: Number(rawLead.equipmentMatch ?? 50),
    skill_match: Number(rawLead.skillMatch ?? 50),
    distance: Math.max(0, Math.min(100, Math.round(100 - (distanceMiles / sourcesConfig.home_market.max_default_radius_miles) * 100))),
    repeatability: Number(rawLead.repeatability ?? 30),
    risk
  };
}

export function validateLeadInput(rawLead, sourcesConfig) {
  const errors = [];
  const source = sourceById(sourcesConfig, rawLead.sourceId);

  if (!source) errors.push(`Unknown sourceId: ${rawLead.sourceId}`);
  if (!normalizeText(rawLead.title)) errors.push('Lead title is required.');
  if (!normalizeText(rawLead.serviceArea)) errors.push('serviceArea is required.');
  if (source && BLOCKED_SOURCE_IDS.has(source.id) && !SAFE_MANUAL_SOURCE_TYPES.has(source.type)) {
    errors.push(`${source.id} may only be used for manual intake or authorized API records.`);
  }
  if (source?.allowed_use?.includes('manual_or_authorized_api_only') && rawLead.intakeChannel === 'scrape') {
    errors.push(`${source.id} does not allow scraping.`);
  }
  if (rawLead.autoBid === true || rawLead.autoContact === true) {
    errors.push('Automatic bidding or third-party contact is not allowed.');
  }

  return { valid: errors.length === 0, errors, source };
}

export function ingestLead(rawLead, sourcesConfig) {
  const validation = validateLeadInput(rawLead, sourcesConfig);
  if (!validation.valid) {
    return {
      accepted: false,
      errors: validation.errors,
      rawLead
    };
  }

  const lead = {
    id: rawLead.id ?? `lrr_${stableId(rawLead)}`,
    title: normalizeText(rawLead.title),
    description: normalizeText(rawLead.description),
    sourceId: rawLead.sourceId,
    sourcePolicy: validation.source.allowed_use,
    intakeChannel: rawLead.intakeChannel ?? validation.source.type,
    categoryId: categoryForLead(sourcesConfig, rawLead),
    serviceArea: normalizeText(rawLead.serviceArea),
    estimatedRevenue: Number(rawLead.estimatedRevenue ?? 0),
    distanceMiles: Number(rawLead.distanceMiles ?? sourcesConfig.home_market.max_default_radius_miles),
    evidenceUrl: normalizeText(rawLead.evidenceUrl),
    capabilities: rawLead.capabilities ?? sourcesConfig.asset_profile.capabilities,
    requiresCertification: rawLead.requiresCertification === true,
    certificationHeld: rawLead.certificationHeld === true,
    requiresPartner: rawLead.requiresPartner === true,
    scores: scoresFromLead(rawLead, sourcesConfig),
    compliance: {
      restrictedSource: validation.source.allowed_use?.includes('manual_or_authorized_api_only') && rawLead.intakeChannel === 'rss'
    },
    createdAt: rawLead.createdAt ?? new Date().toISOString()
  };

  return {
    accepted: true,
    lead,
    routing: routeLead(lead)
  };
}

export function ingestLeads(rawLeads, sourcesConfig) {
  return rawLeads.map((lead) => ingestLead(lead, sourcesConfig));
}
