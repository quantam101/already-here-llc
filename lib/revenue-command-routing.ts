import { createHash } from 'node:crypto';
import { persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteTechnician extends RoutePoint {
  id: string;
  skills: string[];
  availableMinutes: number;
}

export interface RouteCandidate extends RoutePoint {
  id: string;
  opportunityId: string;
  lane: string;
  address?: string;
  requiredSkills?: string[];
  estimatedRevenueCents: number;
  estimatedCostCents?: number;
  estimatedMinutes: number;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  slaDueAt?: string;
}

export interface RouteStop extends RouteCandidate {
  sequence: number;
  travelMiles: number;
  skillMatch: number;
  contributionMarginCents: number;
  score: number;
}

export interface RouteStackResult {
  id: string;
  technicianId: string;
  generatedAt: string;
  status: 'draft';
  stops: RouteStop[];
  totalRevenueCents: number;
  totalCostCents: number;
  contributionMarginCents: number;
  totalMiles: number;
  totalMinutes: number;
  score: number;
  persisted: boolean;
  persistenceErrors: string[];
}

const EARTH_RADIUS_MILES = 3958.7613;

function radians(value: number): number {
  return value * Math.PI / 180;
}

export function haversineMiles(from: RoutePoint, to: RoutePoint): number {
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizedSkills(values: string[] = []): Set<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export function skillMatchRatio(technicianSkills: string[], requiredSkills: string[] = []): number {
  if (!requiredSkills.length) return 1;
  const available = normalizedSkills(technicianSkills);
  const required = [...normalizedSkills(requiredSkills)];
  const matched = required.filter((skill) => available.has(skill)).length;
  return required.length ? matched / required.length : 1;
}

function priorityWeight(priority: RouteCandidate['priority']): number {
  switch (priority) {
    case 'P0': return 4000;
    case 'P1': return 2400;
    case 'P2': return 1200;
    default: return 300;
  }
}

function urgencyWeight(slaDueAt?: string, now = Date.now()): number {
  if (!slaDueAt) return 0;
  const due = Date.parse(slaDueAt);
  if (!Number.isFinite(due)) return 0;
  const minutes = (due - now) / 60000;
  if (minutes <= 0) return 5000;
  if (minutes <= 60) return 3500;
  if (minutes <= 180) return 1800;
  if (minutes <= 480) return 800;
  return 0;
}

export function scoreRouteCandidate(
  current: RoutePoint,
  technician: RouteTechnician,
  candidate: RouteCandidate,
  now = Date.now()
): { score: number; travelMiles: number; skillMatch: number; contributionMarginCents: number } {
  const travelMiles = haversineMiles(current, candidate);
  const skillMatch = skillMatchRatio(technician.skills, candidate.requiredSkills);
  const contributionMarginCents = Math.max(0, candidate.estimatedRevenueCents - (candidate.estimatedCostCents || 0));
  const productiveHours = Math.max(candidate.estimatedMinutes, 15) / 60;
  const marginPerHour = contributionMarginCents / productiveHours;
  const travelPenalty = travelMiles * 120;
  const skillPenalty = (1 - skillMatch) * 10000;
  const score = Math.round(
    marginPerHour +
    priorityWeight(candidate.priority) +
    urgencyWeight(candidate.slaDueAt, now) -
    travelPenalty -
    skillPenalty
  );
  return { score, travelMiles, skillMatch, contributionMarginCents };
}

function stableRouteId(technicianId: string, generatedAt: string, stopIds: string[]): string {
  const digest = createHash('sha256')
    .update(`${technicianId}:${generatedAt}:${stopIds.join(',')}`)
    .digest('hex')
    .slice(0, 18);
  return `route_stack_${digest}`;
}

export function buildRouteStack(
  technician: RouteTechnician,
  candidates: RouteCandidate[],
  generatedAt = new Date().toISOString()
): Omit<RouteStackResult, 'persisted' | 'persistenceErrors'> {
  let current: RoutePoint = { latitude: technician.latitude, longitude: technician.longitude };
  let remainingMinutes = Math.max(0, technician.availableMinutes);
  const remaining = [...candidates];
  const stops: RouteStop[] = [];

  while (remaining.length && remainingMinutes > 0) {
    const scored = remaining
      .map((candidate) => ({ candidate, ...scoreRouteCandidate(current, technician, candidate, Date.parse(generatedAt)) }))
      .filter((item) => item.skillMatch >= 1)
      .filter((item) => item.candidate.estimatedMinutes <= remainingMinutes)
      .sort((a, b) => b.score - a.score || a.travelMiles - b.travelMiles || a.candidate.id.localeCompare(b.candidate.id));

    const best = scored[0];
    if (!best || best.score <= 0) break;

    const stop: RouteStop = {
      ...best.candidate,
      sequence: stops.length + 1,
      travelMiles: Number(best.travelMiles.toFixed(2)),
      skillMatch: Number(best.skillMatch.toFixed(4)),
      contributionMarginCents: best.contributionMarginCents,
      score: best.score
    };
    stops.push(stop);
    remainingMinutes -= best.candidate.estimatedMinutes;
    current = { latitude: best.candidate.latitude, longitude: best.candidate.longitude };
    remaining.splice(remaining.findIndex((candidate) => candidate.id === best.candidate.id), 1);
  }

  const totalRevenueCents = stops.reduce((sum, stop) => sum + stop.estimatedRevenueCents, 0);
  const totalCostCents = stops.reduce((sum, stop) => sum + (stop.estimatedCostCents || 0), 0);
  const totalMiles = Number(stops.reduce((sum, stop) => sum + stop.travelMiles, 0).toFixed(2));
  const totalMinutes = stops.reduce((sum, stop) => sum + stop.estimatedMinutes, 0);
  const score = stops.reduce((sum, stop) => sum + stop.score, 0);
  const id = stableRouteId(technician.id, generatedAt, stops.map((stop) => stop.id));

  return {
    id,
    technicianId: technician.id,
    generatedAt,
    status: 'draft',
    stops,
    totalRevenueCents,
    totalCostCents,
    contributionMarginCents: totalRevenueCents - totalCostCents,
    totalMiles,
    totalMinutes,
    score
  };
}

export async function persistRouteStack(
  stack: Omit<RouteStackResult, 'persisted' | 'persistenceErrors'>
): Promise<RouteStackResult> {
  const write: DatabaseReadyWrite = {
    table: 'route_stacks',
    id: stack.id,
    action: 'insert',
    record: {
      id: stack.id,
      technician_id: stack.technicianId,
      status: stack.status,
      generated_at: stack.generatedAt,
      stop_ids: stack.stops.map((stop) => stop.id),
      stops: stack.stops,
      total_revenue_cents: stack.totalRevenueCents,
      total_cost_cents: stack.totalCostCents,
      contribution_margin_cents: stack.contributionMarginCents,
      total_miles: stack.totalMiles,
      total_minutes: stack.totalMinutes,
      score: stack.score,
      created_at: stack.generatedAt,
      updated_at: stack.generatedAt
    }
  };
  const result = await persistDatabaseReadyWrites([write]);
  return {
    ...stack,
    persisted: result.errors.length === 0 && result.inserted === 1,
    persistenceErrors: result.errors
  };
}
