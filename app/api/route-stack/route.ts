import { NextResponse } from 'next/server';
import { z } from 'zod';
import { optimizeRoute, type RouteStackInput } from '@/lib/route-stack';

const stopSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['pickup', 'dropoff', 'service', 'haul', 'delivery', 'transport']),
  lat: z.number().finite(),
  lng: z.number().finite(),
  windowStart: z.string().datetime().optional(),
  windowEnd: z.string().datetime().optional(),
  revenue: z.number().finite().optional(),
  cost: z.number().finite().optional(),
  serviceTimeMinutes: z.number().int().nonnegative().optional(),
  skillRequired: z.string().max(100).optional(),
  vehicleRequired: z.string().max(100).optional(),
  loadCuYd: z.number().finite().optional(),
});

const vehicleSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  capacityCuYd: z.number().finite().optional(),
  skills: z.array(z.string()).optional(),
  costPerMile: z.number().finite().optional(),
  mpg: z.number().finite().optional(),
  fuelCostPerGallon: z.number().finite().optional(),
});

const requestSchema = z.object({
  stops: z.array(stopSchema).min(1).max(50),
  vehicle: vehicleSchema.optional(),
  startTime: z.string().datetime().optional(),
  depot: z.object({ lat: z.number().finite(), lng: z.number().finite() }).optional(),
  laborCostPerHour: z.number().finite().optional(),
  speedMph: z.number().finite().optional(),
});

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => ({}));
  const parseResult = requestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parseResult.error.issues }, { status: 400 });
  }

  const input = parseResult.data as RouteStackInput;
  const plan = optimizeRoute(input);
  return NextResponse.json({ ok: true, plan });
}
