import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePost, validateCatalog } from '../scripts/blog-publish-gate.mjs';
const post=(title,body,description='Description')=>validatePost(title+'.md',`---\ntitle: "${title}"\ndescription: "${description}"\n---\n${body}`);
test('rejects fabricated testimonials',()=>assert.match(post('Proof','sample testimonial').failures.join(' '),/proof/));
test('rejects conflicting example pricing',()=>assert.match(post('Pricing','Use $80/hr').failures.join(' '),/price/));
test('requires metadata description',()=>assert.match(validatePost('missing.md','---\ntitle: Missing\n---\nContent').failures.join(' '),/description/));
test('rejects near-duplicate topics',()=>assert.match(validateCatalog([post('How to vet AI tools for small business','Text'),post('How to vet AI tools for small businesses','Text')]).join(' '),/duplicates/));
test('accepts distinct grounded content',()=>assert.deepEqual(validateCatalog([post('Network installation guide','Factual'),post('Printer repair checklist','Factual')]),[]));
