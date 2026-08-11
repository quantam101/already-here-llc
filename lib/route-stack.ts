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

export interface RoutePlan {
  sequence: RouteStop[];
  totalDistanceMiles: number;
  totalTravelCost: number;
  totalRevenue: number;
  totalCost: number;
  totalContributionMargin: number;
  totalDurationMinutes: number;
  totalServiceMinutes: number;
  windowViolations: number;
  feasibilityScore: number;
}

export interface RouteStackInput {
  stops: RouteStop[];
  vehicle?: RouteVehicle;
  startTime?: string;
  depot?: { lat: number; lng: number };
  laborCostPerHour?: number;
  speedMph?: number;
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
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

function canServe(stop: RouteStop, vehicle?: RouteVehicle): boolean {
  if (!vehicle) return true;
  if (stop.vehicleRequired && stop.vehicleRequired !== vehicle.type) return false;
  if (stop.skillRequired && !(vehicle.skills || []).includes(stop.skillRequired)) return false;
  if (typeof stop.loadCuYd === 'number' && typeof vehicle.capacityCuYd === 'number') {
    if (stop.loadCuYd > vehicle.capacityCuYd) return false;
  }
  return true;
}

function travelMinutes(distanceMiles: number, speedMph: number): number {
  return (distanceMiles / speedMph) * 60;
}

function travelCost(distanceMiles: number, vehicle?: RouteVehicle): number {
  if (vehicle?.costPerMile) return distanceMiles * vehicle.costPerMile;
  const mpg = vehicle?.mpg ?? 12;
  const fuelCost = vehicle?.fuelCostPerGallon ?? 3.75;
  return mpg > 0 ? (distanceMiles / mpg) * fuelCost : distanceMiles * 0.5;
}

function evaluateRoute(sequence: RouteStop[], input: RouteStackInput): RoutePlan {
  const { vehicle, startTime, depot, laborCostPerHour = 45, speedMph = 40 } = input;
  let current: { lat: number; lng: number } = depot ?? sequence[0];
  let currentTime = startTime ? new Date(startTime).getTime() : Date.now();
  let totalDistance = 0;
  let totalRevenue = 0;
  let totalStopCost = 0;
  let totalServiceMinutes = 0;
  let windowViolations = 0;
  let earliestViolationMinutes = Infinity;

  for (const stop of sequence) {
    const distance = haversineMiles(current, stop);
    const travelMin = travelMinutes(distance, speedMph);
    currentTime += travelMin * 60 * 1000;
    totalDistance += distance;

    if (stop.windowStart) {
      const startMs = new Date(stop.windowStart).getTime();
      if (currentTime < startMs) {
        currentTime = startMs;
      }
    }

    if (stop.windowEnd) {
      const endMs = new Date(stop.windowEnd).getTime();
      if (currentTime > endMs) {
        const violationMinutes = (currentTime - endMs) / 60 / 1000;
        windowViolations += 1;
        earliestViolationMinutes = Math.min(earliestViolationMinutes, violationMinutes);
      }
    }

    const serviceMin = stop.serviceTimeMinutes ?? 15;
    currentTime += serviceMin * 60 * 1000;
    totalServiceMinutes += serviceMin;
    totalRevenue += stop.revenue ?? 0;
    totalStopCost += stop.cost ?? 0;
    current = stop;
  }

  if (depot) {
    const returnDistance = haversineMiles(current, depot);
    totalDistance += returnDistance;
    currentTime += travelMinutes(returnDistance, speedMph) * 60 * 1000;
  }

  const totalTravelCost = travelCost(totalDistance, vehicle);
  const laborCost = (totalServiceMinutes / 60) * laborCostPerHour;
  const totalCost = totalTravelCost + totalStopCost + laborCost;
  const totalContributionMargin = totalRevenue - totalCost;
  const totalDurationMinutes = totalServiceMinutes + (totalDistance / speedMph) * 60;

  const feasibilityScore = Math.max(
    0,
    100 -
      (windowViolations * 25) -
      (windowViolations > 0 ? earliestViolationMinutes : 0)
  );

  return {
    sequence,
    totalDistanceMiles: Math.round(totalDistance * 100) / 100,
    totalTravelCost: Math.round(totalTravelCost * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalContributionMargin: Math.round(totalContributionMargin * 100) / 100,
    totalDurationMinutes: Math.round(totalDurationMinutes),
    totalServiceMinutes: Math.round(totalServiceMinutes),
    windowViolations,
    feasibilityScore: Math.round(feasibilityScore * 100) / 100,
  };
}

function buildGreedyRoute(stops: RouteStop[], startId: string | undefined, input: RouteStackInput): RoutePlan {
  const { vehicle, depot } = input;
  const remaining = new Map(stops.map((s) => [s.id, s]));
  const sequence: RouteStop[] = [];

  let current: { lat: number; lng: number } = depot ?? { lat: 0, lng: 0 };

  if (startId) {
    const start = remaining.get(startId);
    if (start) {
      sequence.push(start);
      remaining.delete(startId);
      current = start;
    }
  }

  while (remaining.size > 0) {
    let bestStop: RouteStop | undefined;
    let bestScore = Infinity;

    for (const candidate of remaining.values()) {
      if (!canServe(candidate, vehicle)) continue;
      const distance = haversineMiles(current, candidate);
      const score = distance - (candidate.revenue ?? 0) * 0.01 + (candidate.cost ?? 0) * 0.1;
      if (score < bestScore) {
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
  if (stops.length === 0) {
    return {
      sequence: [],
      totalDistanceMiles: 0,
      totalTravelCost: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalContributionMargin: 0,
      totalDurationMinutes: 0,
      totalServiceMinutes: 0,
      windowViolations: 0,
      feasibilityScore: 0,
    };
  }

  const feasible = stops.filter((s) => canServe(s, input.vehicle));
  if (feasible.length === 0) {
    return evaluateRoute([], input);
  }

  const candidates = feasible.length <= 10 ? feasible : feasible.slice(0, 10);
  let bestPlan = buildGreedyRoute(feasible, undefined, input);

  for (const start of candidates) {
    const plan = buildGreedyRoute(feasible, start.id, input);
    if (
      plan.feasibilityScore > bestPlan.feasibilityScore ||
      (plan.feasibilityScore === bestPlan.feasibilityScore &&
        plan.totalContributionMargin > bestPlan.totalContributionMargin)
    ) {
      bestPlan = plan;
    }
  }

  return bestPlan;
}
