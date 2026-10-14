/**
 * Deterministic Dispatch Triage — intake → lane routing scorer.
 *
 * Ported pattern: stabilitycapitalos lib/assessment.ts (assessParticipant).
 * A pure, rule-based scorer maps raw intake fields to a primary routing
 * lane plus urgency/risk scores at intake time. No LLM call, no I/O:
 * same input always produces the same triage.
 */

export type DispatchLane =
  | 'emergency_onsite'
  | 'remote_support'
  | 'priority_onsite'
  | 'scheduled_onsite';

export type DispatchTriageInput = {
  priority: string;
  serviceType: string;
  message: string;
  siteCount?: string;
  travelLikely?: string;
  bridgeDetails?: string;
};

export type DispatchTriage = {
  primaryLane: DispatchLane;
  urgencyScore: number;
  riskScore: number;
  nextStep: string;
};

const EMERGENCY_TERMS = [
  'emergency',
  'down',
  'outage',
  'offline',
  'not working',
  'no internet',
  'failed',
  'breach',
];

function hasEmergencySignal(input: DispatchTriageInput): boolean {
  if (input.priority.trim().toLowerCase() === 'emergency') return true;
  const text = `${input.serviceType} ${input.message}`.toLowerCase();
  return EMERGENCY_TERMS.some((term) => text.includes(term));
}

function isRemoteCapable(input: DispatchTriageInput): boolean {
  if (input.bridgeDetails?.trim()) return true;
  return input.serviceType.toLowerCase().includes('remote');
}

export function triageDispatchRequest(input: DispatchTriageInput): DispatchTriage {
  if (hasEmergencySignal(input)) {
    return {
      primaryLane: 'emergency_onsite',
      urgencyScore: 95,
      riskScore: 95,
      nextStep: 'Page dispatch coordinator for same-day onsite coverage and confirm site access.',
    };
  }

  if (isRemoteCapable(input)) {
    const urgent = input.priority.trim().toLowerCase() === 'urgent';
    return {
      primaryLane: 'remote_support',
      urgencyScore: urgent ? 70 : 40,
      riskScore: urgent ? 60 : 30,
      nextStep: 'Assign remote technician and open a remote bridge session against the request.',
    };
  }

  if (input.priority.trim().toLowerCase() === 'urgent') {
    return {
      primaryLane: 'priority_onsite',
      urgencyScore: 80,
      riskScore: 70,
      nextStep: 'Schedule priority onsite visit and confirm technician availability within the requested window.',
    };
  }

  return {
    primaryLane: 'scheduled_onsite',
    urgencyScore: 45,
    riskScore: 35,
    nextStep: 'Queue for standard scheduling and confirm the requested window with the requester.',
  };
}
