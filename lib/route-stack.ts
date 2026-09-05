export interface RouteStop {
  id: string;
  type: 'pickup' | 'dropoff' | 'service' | 'haul' | 'delivery' | 'transport';
  lat: number;
  lng: number;
  windowStart?: string;
  windowEnd?: string;
  revenue?: number;
  cost?: number;
  serviceTimeMinutes?: number;
  skillRequired?: string;
  vehicleRequired?: string;
  loadCuYd?: number;
  anchor?: boolean;
}

export interface RouteVehicle {
  id: string;
  type: string;
  capacityCuYd?: number;
  skills?: string[];
  costPerMile?: number;
  mpg?: number;
  fuelCostPerGallon?: number;
}

export type RouteFeasibility = 'recommended' | 'possible_with_risk' | 'not_feasible';

export interface RoutePlan {
  sequence: RouteStop[];
  totalDistanceMiles: number;
  totalTravelCost: number;
  totalRevenue: number;
  totalCost: number;
  totalContributionMargin: number;
  contributionMarginPerHour: number;
  revenuePerHour: number;
  totalDurationMinutes: number;
  totalServiceMinutes: number;
  windowViolations: number;
  feasibilityScore: number;
  feasibility: RouteFeasibility;
  riskReasons: string[];
}

export interface RouteStackInput {
  stops: RouteStop[];
  vehicle?: RouteVehicle;
  startTime?: string;
  depot?: { lat: number; lng: number };
  laborCostPerHour?: number;
  speedMph?: number;
  minimumTurnaroundMinutes?: number;
}

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

function canServe(stop: RouteStop, vehicle?: RouteVehicle): boolean {
  if (!vehicle) return true;
  if (stop.vehicleRequired && stop.vehicleRequired !== vehicle.type) return false;
  if (stop.skillRequired && !(vehicle.skills || []).includes(stop.skillRequired)) return false;
  if (typeof stop.loadCuYd === 'number' && typeof vehicle.capacityCuYd === 'number' && stop.loadCuYd > vehicle.capacityCuYd) return false;
  return true;
}

function travelMinutes(distanceMiles: number, speedMph: number): number {
  return speedMph > 0 ? (distanceMiles / speedMph) * 60 : Number.POSITIVE_INFINITY;
}

function travelCost(distanceMiles: number, vehicle?: RouteVehicle): number {
  if (vehicle?.costPerMile) return distanceMiles * vehicle.costPerMile;
  const mpg = vehicle?.mpg ?? 12;
  const fuelCost = vehicle?.fuelCostPerGallon ?? 3.75;
  return mpg > 0 ? (distanceMiles / mpg) * fuelCost : distanceMiles * 0.5;
}

function classifyFeasibility(score: number, violations: number, riskReasons: string[]): RouteFeasibility {
  if (violations > 0 || score < 55 || riskReasons.some((reason) => reason.startsWith('unserviceable'))) return 'not_feasible';
  if (score < 85 || riskReasons.length > 0) return 'possible_with_risk';
  return 'recommended';
}

function evaluateRoute(sequence: RouteStop[], input: RouteStackInput): RoutePlan {
  const { vehicle, startTime, depot, laborCostPerHour = 45, speedMph = 40, minimumTurnaroundMinutes = 10 } = input;
  if (sequence.length === 0) {
    return {
      sequence: [], totalDistanceMiles: 0, totalTravelCost: 0, totalRevenue: 0, totalCost: 0,
      totalContributionMargin: 0, contributionMarginPerHour: 0, revenuePerHour: 0, totalDurationMinutes: 0,
      totalServiceMinutes: 0, windowViolations: 0, feasibilityScore: 0, feasibility: 'not_feasible', riskReasons: ['no_serviceable_stops'],
    };
  }

  let current: { lat: number; lng: number } = depot ?? sequence[0];
  let currentTime = startTime ? new Date(startTime).getTime() : Date.now();
  let totalDistance = 0;
  let totalRevenue = 0;
  let totalStopCost = 0;
  let totalServiceMinutes = 0;
  let windowViolations = 0;
  let totalViolationMinutes = 0;
  const riskReasons: string[] = [];

  for (let index = 0; index < sequence.length; index += 1) {
    const stop = sequence[index];
    if (!canServe(stop, vehicle)) riskReasons.push(`unserviceable:${stop.id}`);
    const distance = haversineMiles(current, stop);
    const travelMin = travelMinutes(distance, speedMph);
    currentTime += travelMin * 60 * 1000;
    totalDistance += distance;

    if (stop.windowStart) {
      const startMs = new Date(stop.windowStart).getTime();
      if (currentTime < startMs) currentTime = startMs;
    }

    if (stop.windowEnd) {
      const endMs = new Date(stop.windowEnd).getTime();
      if (currentTime > endMs) {
        const violationMinutes = (currentTime - endMs) / 60_000;
        windowViolations += 1;
        totalViolationMinutes += violationMinutes;
        riskReasons.push(`window_violation:${stop.id}:${Math.round(violationMinutes)}m`);
      }
    }

    const serviceMin = stop.serviceTimeMinutes ?? 15;
    if (!stop.serviceTimeMinutes && stop.anchor) riskReasons.push(`anchor_duration_estimated:${stop.id}`);
    currentTime += serviceMin * 60 * 1000;
    totalServiceMinutes += serviceMin;
    totalRevenue += stop.revenue ?? 0;
    totalStopCost += stop.cost ?? 0;
    current = stop;

    if (index < sequence.length - 1) currentTime += minimumTurnaroundMinutes * 60 * 1000;
  }

  if (depot) {
    const returnDistance = haversineMiles(current, depot);
    totalDistance += returnDistance;
    currentTime += travelMinutes(returnDistance, speedMph) * 60 * 1000;
  }

  const totalTravelCost = travelCost(totalDistance, vehicle);
  const travelMin = (totalDistance / speedMph) * 60;
  const turnaroundMin = Math.max(0, sequence.length - 1) * minimumTurnaroundMinutes;
  const totalDurationMinutes = totalServiceMinutes + travelMin + turnaroundMin;
  const laborCost = (totalDurationMinutes / 60) * laborCostPerHour;
  const totalCost = totalTravelCost + totalStopCost + laborCost;
  const totalContributionMargin = totalRevenue - totalCost;
  const hours = Math.max(totalDurationMinutes / 60, 0.01);
  const revenuePerHour = totalRevenue / hours;
  const contributionMarginPerHour = totalContributionMargin / hours;

  let feasibilityScore = 100 - windowViolations * 35 - Math.min(35, totalViolationMinutes / 2);
  if (riskReasons.some((reason) => reason.startsWith('anchor_duration_estimated'))) feasibilityScore -= 10;
  if (riskReasons.some((reason) => reason.startsWith('unserviceable'))) feasibilityScore = 0;
  feasibilityScore = Math.max(0, Math.min(100, feasibilityScore));
  const feasibility = classifyFeasibility(feasibilityScore, windowViolations, riskReasons);

  return {
    sequence,
    totalDistanceMiles: Math.round(totalDistance * 100) / 100,
    totalTravelCost: Math.round(totalTravelCost * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalContributionMargin: Math.round(totalContributionMargin * 100) / 100,
    contributionMarginPerHour: Math.round(contributionMarginPerHour * 100) / 100,
    revenuePerHour: Math.round(revenuePerHour * 100) / 100,
    totalDurationMinutes: Math.round(totalDurationMinutes),
    totalServiceMinutes: Math.round(totalServiceMinutes),
    windowViolations,
    feasibilityScore: Math.round(feasibilityScore * 100) / 100,
    feasibility,
    riskReasons,
  };
}

function buildGreedyRoute(stops: RouteStop[], startId: string | undefined, input: RouteStackInput): RoutePlan {
  const { vehicle, depot } = input;
  const remaining = new Map(stops.map((stop) => [stop.id, stop]));
  const sequence: RouteStop[] = [];
  let current: { lat: number; lng: number } = depot ?? { lat: 0, lng: 0 };

  if (startId) {
    const start = remaining.get(startId);
    if (start && canServe(start, vehicle)) {
      sequence.push(start);
      remaining.delete(startId);
      current = start;
    }
  }

  while (remaining.size > 0) {
    let bestStop: RouteStop | undefined;
    let bestScore = -Infinity;
    for (const candidate of remaining.values()) {
      if (!canServe(candidate, vehicle)) continue;
      const distance = haversineMiles(current, candidate);
      const travel = Math.max(distance, 0.1);
      const serviceHours = Math.max((candidate.serviceTimeMinutes ?? 15) / 60, 0.25);
      const contribution = (candidate.revenue ?? 0) - (candidate.cost ?? 0) - travelCost(distance, vehicle);
      const contributionPerHour = contribution / (serviceHours + travel / 40);
      const anchorBoost = candidate.anchor ? 10_000 : 0;
      const score = anchorBoost + contributionPerHour - distance * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestStop = candidate;
      }
    }
    if (!bestStop) break;
    sequence.push(bestStop);
    remaining.delete(bestStop.id);
    current = bestStop;
  }
  return evaluateRoute(sequence, input);
}

export function optimizeRoute(input: RouteStackInput): RoutePlan {
  const { stops } = input;
  if (stops.length === 0) return evaluateRoute([], input);

  let startTime = input.startTime;
  if (!startTime) {
    const earliestWindow = stops.map((stop) => stop.windowStart ? new Date(stop.windowStart).getTime() : Infinity).filter((time) => time !== Infinity);
    if (earliestWindow.length > 0) startTime = new Date(Math.min(...earliestWindow)).toISOString();
  }
  const resolvedInput = { ...input, startTime };
  const feasible = stops.filter((stop) => canServe(stop, resolvedInput.vehicle));
  if (feasible.length === 0) return evaluateRoute([], resolvedInput);

  const anchors = feasible.filter((stop) => stop.anchor);
  const candidates = anchors.length > 0 ? anchors : (feasible.length <= 10 ? feasible : feasible.slice(0, 10));
  let bestPlan = buildGreedyRoute(feasible, candidates[0]?.id, resolvedInput);
  for (const start of candidates) {
    const plan = buildGreedyRoute(feasible, start.id, resolvedInput);
    const planRank = (plan.feasibility === 'recommended' ? 3 : plan.feasibility === 'possible_with_risk' ? 2 : 1);
    const bestRank = (bestPlan.feasibility === 'recommended' ? 3 : bestPlan.feasibility === 'possible_with_risk' ? 2 : 1);
    if (planRank > bestRank || (planRank === bestRank && plan.contributionMarginPerHour > bestPlan.contributionMarginPerHour)) bestPlan = plan;
  }
  return bestPlan;
}
