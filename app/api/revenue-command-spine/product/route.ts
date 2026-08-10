import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';
import { approveProductForSale, createAffiliateLink, createProduct, recordProductOrder } from '@/lib/revenue-command-product';

const ProductSchema = z.object({
  mode: z.literal('product'),
  productName: z.string().trim().min(1).max(240),
  productType: z.enum(['digital', 'service', 'affiliate', 'subscription', 'template', 'training']),
  priceCents: z.number().int().min(0).max(100_000_000),
  recurringInterval: z.enum(['one_time', 'monthly', 'annual']).optional(),
  proofStatus: z.enum(['not_proven', 'internal_proof', 'client_proof', 'proven']).optional(),
  source: z.string().max(200).optional()
});

const AffiliateSchema = z.object({
  mode: z.literal('affiliate'),
  productId: z.string().min(1).max(200),
  partnerName: z.string().trim().min(1).max(240),
  trackingUrl: z.string().url().max(2000),
  commissionModel: z.enum(['percent', 'flat', 'tiered', 'unknown']),
  commissionValue: z.number().min(0).max(1_000_000).optional(),
  source: z.string().max(200).optional()
});

const ApprovalSchema = z.object({
  mode: z.literal('approve'),
  productId: z.string().min(1).max(200),
  actorId: z.string().min(1).max(200),
  note: z.string().max(2000).optional()
});

const OrderSchema = z.object({
  mode: z.literal('order'),
  productId: z.string().min(1).max(200),
  opportunityId: z.string().max(200).optional(),
  contactId: z.string().max(200).optional(),
  quantity: z.number().int().min(1).max(10000).optional(),
  grossAmountCents: z.number().int().min(0).max(100_000_000),
  affiliateLinkId: z.string().max(200).optional(),
  externalReference: z.string().max(500).optional(),
  source: z.string().max(200).optional(),
  occurredAt: z.string().datetime().optional()
});

const Schema = z.discriminatedUnion('mode', [ProductSchema, AffiliateSchema, ApprovalSchema, OrderSchema]);

export async function POST(request: Request) {
  const auth = authorizeRevenueCommandInternalRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid product/affiliate payload', issues: parsed.error.issues }, { status: 400 });

  const data = parsed.data;
  if (data.mode === 'product') return NextResponse.json(await createProduct(data));
  if (data.mode === 'affiliate') return NextResponse.json(await createAffiliateLink(data));
  if (data.mode === 'approve') return NextResponse.json(await approveProductForSale(data.productId, data.actorId, data.note));
  return NextResponse.json(await recordProductOrder(data));
}
