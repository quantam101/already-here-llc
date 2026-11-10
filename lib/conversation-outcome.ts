/**
 * Conversation-to-Outcome engine.
 *
 * Closes the loop the AI receptionist used to leave open: instead of ending a
 * conversation with "lead received, someone will call you back", the engine
 * checks the request against policy (coverage, service catalog, contact
 * completeness) and executes the outcome inside the same conversation —
 * issuing a quote range, creating a canonical work order with technician
 * matching, or escalating an emergency — then returns a confirmation the
 * customer can act on before the session ends.
 *
 * Zero-spend: uses existing internal endpoints (work-orders, intake). Failover:
 * if work-order creation fails, the outcome degrades to the intake lead email
 * path instead of erroring out.
 */

export type OutcomeKind =
  | 'quote_issued'
  | 'dispatch_created'
  | 'scheduled'
  | 'urgent_escalation'
  | 'out_of_area'
  | 'needs_details';

export type OutcomePolicyCheck = {
  name: string;
  passed: boolean;
  detail: string;
};

export type OutcomeDecision = {
  kind: OutcomeKind;
  serviceId: string;
  serviceLabel: string;
  policyChecks: OutcomePolicyCheck[];
  quoteRangeUsd?: { low: number; high: number };
  responseWindow?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  confirmation: string;
};

export type OutcomeLead = {
  fullName?: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  serviceType?: string;
  service?: string;
  location?: string;
  city?: string;
  zip?: string;
  urgency?: string;
  preferredTime?: string;
  message?: string;
  source?: string;
  leadScore?: string;
  leadState?: string;
};

type ServiceCatalogEntry = {
  id: string;
  label: string;
  keywords: RegExp;
  quoteRangeUsd: { low: number; high: number };
  responseWindow: string;
  workOrderServiceType: string;
};

export const serviceCatalog: ServiceCatalogEntry[] = [
  {
    id: 'network_support',
    label: 'Network support and structured cabling',
    keywords: /network|router|switch|wifi|wi-fi|lan|cabl|ethernet|rack|access point/i,
    quoteRangeUsd: { low: 150, high: 450 },
    responseWindow: 'Same-day or next-business-day onsite window',
    workOrderServiceType: 'network_support'
  },
  {
    id: 'door_access',
    label: 'Door access and physical security',
    keywords: /door|badge|access control|lock|reader|keypad|maglock/i,
    quoteRangeUsd: { low: 200, high: 600 },
    responseWindow: 'Next-business-day onsite window',
    workOrderServiceType: 'door_access'
  },
  {
    id: 'equipment_removal',
    label: 'Equipment removal and decommission',
    keywords: /removal|decommission|haul|dispose|retire|tear ?down/i,
    quoteRangeUsd: { low: 250, high: 900 },
    responseWindow: 'Scheduled onsite window within 3 business days',
    workOrderServiceType: 'equipment_removal'
  },
  {
    id: 'healthcare_equipment',
    label: 'Healthcare equipment field support',
    keywords: /healthcare|medical|mckesson|clinic|hospital|patient/i,
    quoteRangeUsd: { low: 250, high: 750 },
    responseWindow: 'Priority window within 1 business day',
    workOrderServiceType: 'healthcare_equipment'
  },
  {
    id: 'ai_receptionist',
    label: 'AI receptionist and lead-capture setup',
    keywords: /ai receptionist|chat ?box|lead capture|missed call|receptionist/i,
    quoteRangeUsd: { low: 997, high: 4500 },
    responseWindow: 'Remote implementation kickoff within 3 business days',
    workOrderServiceType: 'ai_receptionist_setup'
  },
  {
    id: 'smart_hands',
    label: 'Smart hands and general field support',
    keywords: /.*/,
    quoteRangeUsd: { low: 150, high: 500 },
    responseWindow: 'Standard onsite window within 2 business days',
    workOrderServiceType: 'smart_hands'
  }
];

// Mirrors lib/site.ts `markets`. Arizona metros plus statewide coverage points;
// anything else is evaluated as nationwide-by-scope (MSP/vendor work) or declined.
const coveredCities = [
  'phoenix', 'tempe', 'chandler', 'scottsdale', 'glendale', 'mesa', 'peoria',
  'avondale', 'buckeye', 'goodyear', 'surprise', 'litchfield park', 'carefree',
  'page', 'quartzsite', 'san luis', 'springerville', 'gilbert', 'queen creek',
  'paradise valley', 'fountain hills', 'tolleson', 'el mirage', 'waddell'
];

const EMERGENCY_RE = /emergency|down|outage|urgent|same ?day|asap|critical|offline/i;

function text(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function matchService(lead: OutcomeLead): ServiceCatalogEntry {
  const primary = text(lead.serviceType, lead.service);
  const hit = serviceCatalog.find((entry) => entry.keywords.test(primary));
  if (hit) return hit;
  const secondary = lead.message || '';
  return serviceCatalog.find((entry) => entry.keywords.test(secondary)) || serviceCatalog[serviceCatalog.length - 1];
}

function coverageOf(location: string): 'metro' | 'state' | 'nationwide_scope' | 'unknown' {
  const lower = location.toLowerCase();
  if (!lower.trim()) return 'unknown';
  if (coveredCities.some((city) => lower.includes(city))) return 'metro';
  if (/\b85\d{3}\b/.test(lower) || /\baz\b|arizona/.test(lower)) return 'state';
  if (/nationwide|remote|multi-?site|msp|vendor/i.test(lower)) return 'nationwide_scope';
  return 'unknown';
}

export type ParsedLocation = {
  siteAddress: string;
  siteCity: string;
  siteState: string;
  siteZip?: string;
};

/**
 * Best-effort parse of the freeform location string the conversation collects
 * ("123 Main St, Phoenix AZ 85001" or just "Tempe, AZ"). Returns null when no
 * city/state can be determined — in that case a real work order can't be
 * created and the outcome degrades to quote + intake.
 */
export function parseLocation(location: string): ParsedLocation | null {
  const cleaned = location.trim();
  if (!cleaned) return null;

  const zipMatch = cleaned.match(/\b(\d{5})(?:-\d{4})?\b/);
  const stateMatch = cleaned.match(/\b(AZ|Arizona)\b/i);
  const city = coveredCities.find((c) => cleaned.toLowerCase().includes(c));

  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  let siteCity = city ? city.replace(/\b\w/g, (ch) => ch.toUpperCase()) : '';
  let siteAddress = '';

  if (!siteCity && parts.length >= 2) {
    const candidate = parts[parts.length - 2].replace(/\b(AZ|Arizona)\b.*$/i, '').trim();
    if (candidate && !/\d{5}/.test(candidate)) siteCity = candidate;
  }
  if (parts.length >= 2 && /\d/.test(parts[0])) siteAddress = parts[0];

  if (!siteCity || !stateMatch) return null;
  return { siteAddress: siteAddress || 'Site address pending', siteCity, siteState: 'AZ', siteZip: zipMatch?.[1] };
}

export function decideOutcome(lead: OutcomeLead): OutcomeDecision {
  const service = matchService(lead);
  const locationText = text(lead.location, lead.city, lead.zip);
  const coverage = coverageOf(locationText);
  const hasContact = Boolean(lead.phone?.trim() || lead.email?.trim());
  const emergency = EMERGENCY_RE.test(text(lead.urgency, lead.message));
  const parsed = parseLocation(locationText);
  const hasSiteDetails = Boolean(parsed && parsed.siteAddress !== 'Site address pending');

  const policyChecks: OutcomePolicyCheck[] = [
    { name: 'contact_provided', passed: hasContact, detail: hasContact ? 'Phone or email on record.' : 'No phone or email captured.' },
    {
      name: 'service_in_catalog',
      passed: service.id !== 'smart_hands' || hasContact,
      detail: `Matched service: ${service.label}.`
    },
    {
      name: 'coverage_area',
      passed: coverage !== 'unknown',
      detail:
        coverage === 'metro'
          ? 'Inside Phoenix-metro primary coverage.'
          : coverage === 'state'
            ? 'Inside Arizona statewide coverage.'
            : coverage === 'nationwide_scope'
              ? 'Nationwide project coverage by scope.'
              : 'Location outside standard coverage.'
    },
    {
      name: 'dispatch_ready',
      passed: hasSiteDetails,
      detail: hasSiteDetails ? 'Street address captured; work order can be created.' : 'No street address; outcome limited to quote and scheduling.'
    }
  ];

  const base = {
    serviceId: service.id,
    serviceLabel: service.label,
    policyChecks,
    quoteRangeUsd: service.quoteRangeUsd,
    responseWindow: emergency ? 'Immediate escalation — dispatch notified now' : service.responseWindow
  };

  if (!hasContact) {
    return {
      ...base,
      kind: 'needs_details',
      priority: 'low',
      confirmation: 'We captured your request but need a phone number or email to confirm the outcome. Provide one and the quote and scheduling confirm instantly.'
    };
  }

  if (coverage === 'unknown' && !emergency) {
    return {
      ...base,
      kind: 'out_of_area',
      priority: 'normal',
      confirmation: `${service.label} is scoped per project outside Arizona. Your request is logged for a scope review; if it fits nationwide project coverage it proceeds without a callback queue.`
    };
  }

  if (emergency) {
    return {
      ...base,
      kind: hasSiteDetails ? 'dispatch_created' : 'urgent_escalation',
      priority: 'urgent',
      confirmation: hasSiteDetails
        ? `Emergency ${service.label} dispatched: work order created, technician matching started, and dispatch is notified now.`
        : `Emergency ${service.label} escalated to dispatch now. Reply with the street address to convert this into a confirmed dispatch without waiting.`
    };
  }

  if (hasSiteDetails && lead.preferredTime) {
    return {
      ...base,
      kind: 'dispatch_created',
      priority: 'normal',
      confirmation: `${service.label} scheduled: work order created for ${lead.preferredTime.trim()} with technician matching running. Estimated range $${service.quoteRangeUsd.low}–$${service.quoteRangeUsd.high}; final quote confirmed in the work order.`
    };
  }

  return {
    ...base,
    kind: 'quote_issued',
    priority: 'normal',
    confirmation: `Quote issued for ${service.label}: estimated range $${service.quoteRangeUsd.low}–$${service.quoteRangeUsd.high}, ${service.responseWindow}. Add a street address and preferred window to convert this to a confirmed dispatch in the same conversation.`
  };
}

type OutcomeExecutionResult = {
  workOrderId?: string;
  matchCandidates?: number;
  executed: 'work_order' | 'intake_fallback' | 'none';
  error?: string;
};

/**
 * Execute the decided outcome. Dispatch-eligible outcomes create a canonical
 * work order (which also runs technician matching). Any failure degrades to
 * 'intake_fallback' — the lead is still delivered to dispatch — so the
 * conversation never ends in an error.
 */
export async function executeOutcome(requestUrl: string, lead: OutcomeLead, decision: OutcomeDecision): Promise<OutcomeExecutionResult> {
  if (decision.kind !== 'dispatch_created' && decision.kind !== 'urgent_escalation') {
    return { executed: 'none' };
  }

  const parsed = parseLocation(text(lead.location, lead.city, lead.zip));
  if (!parsed) return { executed: 'intake_fallback' };

  const url = new URL('/api/work-orders', requestUrl);
  const service = serviceCatalog.find((entry) => entry.id === decision.serviceId) || serviceCatalog[serviceCatalog.length - 1];
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: lead.source || 'ai_receptionist_conversation',
        sourceId: `conv-${Date.now()}`,
        customerName: lead.fullName || lead.name || 'Conversation customer',
        company: lead.company || 'Individual / conversation intake',
        email: lead.email || 'no-email-captured@alreadyherellc.com',
        phone: lead.phone,
        siteAddress: parsed.siteAddress,
        siteCity: parsed.siteCity,
        siteState: parsed.siteState,
        siteZip: parsed.siteZip,
        scope: text(lead.serviceType, lead.message) || service.label,
        serviceType: service.workOrderServiceType,
        priority: decision.priority,
        requestedWindow: lead.preferredTime,
        estimatedValueCents: service.quoteRangeUsd.high * 100
      }),
      cache: 'no-store'
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) {
      return { executed: 'intake_fallback', error: body.error || `work-orders responded ${res.status}` };
    }
    return { executed: 'work_order', workOrderId: body.workOrderId, matchCandidates: body.matchCandidates };
  } catch (error) {
    return { executed: 'intake_fallback', error: error instanceof Error ? error.message : 'work-order request failed' };
  }
}
