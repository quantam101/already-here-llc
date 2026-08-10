import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveCanonicalIdentity } from '@/lib/revenue-command-identity';

const IdentitySchema = z.object({
  organizationName: z.string().trim().min(1).max(300).optional(),
  organizationType: z.enum(['client', 'vendor', 'partner', 'prospect', 'technician_company', 'internal']).optional(),
  fullName: z.string().trim().min(1).max(250).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().trim().min(7).max(50).optional(),
  roleTitle: z.string().trim().max(200).optional(),
  source: z.string().trim().min(1).max(160),
  consentStatus: z.enum(['unknown', 'opted_in', 'opted_out', 'contractual']).optional(),
  serviceArea: z.string().trim().max(300).optional(),
  observedAt: z.string().datetime().optional()
}).refine((value) => Boolean(value.organizationName || value.email || value.phone || value.fullName), {
  message: 'At least one organization or contact identity field is required.'
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = IdentitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid identity payload', issues: parsed.error.issues }, { status: 400 });
  }

  const result = await resolveCanonicalIdentity(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
