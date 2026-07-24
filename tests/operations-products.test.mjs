import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const raw = await readFile(new URL('../data/phase-2-product-catalog.json', import.meta.url), 'utf8');
const catalog = JSON.parse(raw);

assert.equal(typeof catalog.version, 'string');
assert.ok(Array.isArray(catalog.products));
assert.equal(catalog.products.length, 5);

const ids = new Set();
for (const product of catalog.products) {
  assert.equal(typeof product.id, 'string');
  assert.ok(!ids.has(product.id), `duplicate product id: ${product.id}`);
  ids.add(product.id);

  assert.equal(typeof product.name, 'string');
  assert.equal(typeof product.target_buyer, 'string');
  assert.equal(typeof product.problem, 'string');
  assert.ok(Array.isArray(product.deliverables) && product.deliverables.length >= 5);
  assert.equal(typeof product.pricing, 'object');

  for (const tier of ['basic', 'professional', 'company_license', 'configuration', 'implementation', 'monthly_support']) {
    assert.equal(typeof product.pricing[tier], 'string', `${product.id} missing ${tier}`);
  }
}

console.log(`operations-products catalog valid: ${catalog.products.length} products`);
