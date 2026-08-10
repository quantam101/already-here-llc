import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'revenue-product-'));
process.env.REVENUE_COMMAND_DB_PATH = join(dir, 'db.sqlite3');

const db = await import('../lib/revenue-command-db.ts');
const product = await import('../lib/revenue-command-product.ts');

const created = await product.createProduct({ productName: 'AI Field Operations Extension', productType: 'service', priceCents: 30000, recurringInterval: 'monthly', proofStatus: 'internal_proof' });
assert.equal(created.ok, true);
assert.ok(db.getRecord('products', created.productId));

const affiliate = await product.createAffiliateLink({ productId: created.productId, partnerName: 'Proof Partner', trackingUrl: 'https://example.com/?ref=test', commissionModel: 'percent', commissionValue: 10 });
assert.equal(affiliate.ok, true);
assert.ok(db.getRecord('affiliate_links', affiliate.affiliateLinkId));

const approved = await product.approveProductForSale(created.productId, 'owner-test');
assert.equal(approved.ok, true);
assert.equal(db.getRecord('products', created.productId)?.externally_published, 0);

const order = await product.recordProductOrder({ productId: created.productId, grossAmountCents: 50000, affiliateLinkId: affiliate.affiliateLinkId, externalReference: 'test-order-1' });
assert.equal(order.ok, true);
const revenue = db.getRecord('revenue_events', `revenue_${order.orderId}`);
assert.equal(revenue?.amount_cents, 50000);
assert.equal(revenue?.commission_amount_cents, 5000);
assert.equal(revenue?.net_amount_cents, 45000);
assert.equal(db.getDatabaseStats().analytics_events >= 1, true);

db.closeDatabase();
rmSync(dir, { recursive: true, force: true });
console.log('revenue command product tests passed');
