import { createHash } from 'node:crypto';
import { getRecord, persistDatabaseReadyWrites } from './revenue-command-db';
import { recordApprovalAction } from './revenue-command-approval';
import type { DatabaseReadyWrite } from './revenue-command-intake';

export interface ProductInput {
  productName: string;
  productType: 'digital' | 'service' | 'affiliate' | 'subscription' | 'template' | 'training';
  priceCents: number;
  recurringInterval?: 'one_time' | 'monthly' | 'annual';
  proofStatus?: 'not_proven' | 'internal_proof' | 'client_proof' | 'proven';
  source?: string;
  createdAt?: string;
}

export interface AffiliateLinkInput {
  productId: string;
  partnerName: string;
  trackingUrl: string;
  commissionModel: 'percent' | 'flat' | 'tiered' | 'unknown';
  commissionValue?: number;
  source?: string;
}

export interface ProductOrderInput {
  productId: string;
  opportunityId?: string;
  contactId?: string;
  quantity?: number;
  grossAmountCents: number;
  affiliateLinkId?: string;
  externalReference?: string;
  source?: string;
  occurredAt?: string;
}

function stableId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 18)}`;
}

function now(): string {
  return new Date().toISOString();
}

export async function createProduct(input: ProductInput): Promise<{ ok: boolean; productId: string; errors: string[] }> {
  const createdAt = input.createdAt || now();
  const productId = stableId('product', `${input.productName}:${input.productType}`);
  const result = await persistDatabaseReadyWrites([{
    table: 'products', id: productId, action: 'insert', record: {
      id: productId,
      product_name: input.productName,
      product_type: input.productType,
      proof_status: input.proofStatus || 'not_proven',
      price_cents: Math.max(0, Math.trunc(input.priceCents)),
      recurring_interval: input.recurringInterval || 'one_time',
      status: 'draft',
      source: input.source || 'product_engine',
      created_at: createdAt,
      updated_at: createdAt
    }
  }]);
  return { ok: result.errors.length === 0, productId, errors: result.errors };
}

export async function createAffiliateLink(input: AffiliateLinkInput): Promise<{ ok: boolean; affiliateLinkId: string; errors: string[] }> {
  if (!getRecord('products', input.productId)) return { ok: false, affiliateLinkId: '', errors: [`Product not found: ${input.productId}`] };
  let parsed: URL;
  try { parsed = new URL(input.trackingUrl); } catch { return { ok: false, affiliateLinkId: '', errors: ['Invalid affiliate tracking URL'] }; }
  if (!['https:', 'http:'].includes(parsed.protocol)) return { ok: false, affiliateLinkId: '', errors: ['Affiliate tracking URL must use HTTP(S)'] };
  const affiliateLinkId = stableId('affiliate', `${input.productId}:${input.partnerName}:${parsed.hostname}`);
  const createdAt = now();
  const result = await persistDatabaseReadyWrites([{
    table: 'affiliate_links', id: affiliateLinkId, action: 'insert', record: {
      id: affiliateLinkId,
      product_id: input.productId,
      partner_name: input.partnerName,
      tracking_url: parsed.toString(),
      commission_model: input.commissionModel,
      commission_value: Math.max(0, Number(input.commissionValue || 0)),
      source: input.source || 'affiliate_engine',
      status: 'draft_pending_approval',
      externally_published: 0,
      created_at: createdAt,
      updated_at: createdAt
    }
  }]);
  return { ok: result.errors.length === 0, affiliateLinkId, errors: result.errors };
}

export async function approveProductForSale(productId: string, actorId: string, note?: string): Promise<{ ok: boolean; approvalId?: string; errors: string[] }> {
  const product = getRecord('products', productId);
  if (!product) return { ok: false, errors: [`Product not found: ${productId}`] };
  const approval = await recordApprovalAction({ targetTable: 'products', targetId: productId, action: 'approve', actorId, note, authorityScope: 'product_sale_preparation' });
  if (!approval.ok) return { ok: false, approvalId: approval.approvalId, errors: approval.errors };
  const updatedAt = now();
  const result = await persistDatabaseReadyWrites([{
    table: 'products', id: productId, action: 'insert', record: {
      ...product,
      status: 'approved_for_sale_not_published',
      approval_id: approval.approvalId,
      approved_by: actorId,
      externally_published: 0,
      updated_at: updatedAt
    }
  }]);
  return { ok: result.errors.length === 0, approvalId: approval.approvalId, errors: result.errors };
}

export async function recordProductOrder(input: ProductOrderInput): Promise<{ ok: boolean; orderId: string; commissionId?: string; errors: string[] }> {
  const product = getRecord('products', input.productId);
  if (!product) return { ok: false, orderId: '', errors: [`Product not found: ${input.productId}`] };
  const occurredAt = input.occurredAt || now();
  const quantity = Math.max(1, Math.trunc(input.quantity || 1));
  const gross = Math.max(0, Math.trunc(input.grossAmountCents));
  const orderId = stableId('order', `${input.productId}:${input.externalReference || occurredAt}:${gross}:${quantity}`);
  let commissionId: string | undefined;
  let commissionCents = 0;

  if (input.affiliateLinkId) {
    const link = getRecord('affiliate_links', input.affiliateLinkId);
    if (!link) return { ok: false, orderId: '', errors: [`Affiliate link not found: ${input.affiliateLinkId}`] };
    const model = String(link.commission_model || 'unknown');
    const value = Number(link.commission_value || 0);
    commissionCents = model === 'percent' ? Math.round(gross * value / 100) : model === 'flat' ? Math.round(value) : 0;
    commissionId = stableId('commission', `${orderId}:${input.affiliateLinkId}`);
  }

  const writes: DatabaseReadyWrite[] = [{
    table: 'revenue_events', id: `revenue_${orderId}`, action: 'insert', record: {
      id: `revenue_${orderId}`,
      order_id: orderId,
      product_id: input.productId,
      opportunity_id: input.opportunityId || null,
      contact_id: input.contactId || null,
      affiliate_link_id: input.affiliateLinkId || null,
      external_reference: input.externalReference || null,
      quantity,
      event_type: 'product_order',
      amount_cents: gross,
      commission_amount_cents: commissionCents,
      net_amount_cents: Math.max(0, gross - commissionCents),
      currency: 'USD',
      source: input.source || 'product_order',
      created_at: occurredAt,
      updated_at: occurredAt
    }
  }, {
    table: 'analytics_events', id: stableId('analytics', orderId), action: 'insert', record: {
      id: stableId('analytics', orderId),
      source: input.source || 'product_order',
      module: 'Product / Affiliate',
      action: 'product_order_recorded',
      target_table: 'products',
      target_id: input.productId,
      conversion_value_cents: gross,
      order_id: orderId,
      affiliate_link_id: input.affiliateLinkId || null,
      commission_id: commissionId || null,
      commission_amount_cents: commissionCents,
      created_at: occurredAt
    }
  }];

  const result = await persistDatabaseReadyWrites(writes);
  return { ok: result.errors.length === 0, orderId, commissionId, errors: result.errors };
}
