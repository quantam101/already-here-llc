import assert from 'assert';
import { canonicalId, canonicalSlug } from '../lib/canonical-ids.ts';

const id = canonicalId('org', 'Already Here LLC');
assert.ok(id.startsWith('org_'), 'canonicalId should prefix with org_');
assert.equal(canonicalId('org', 'Already Here LLC'), id, 'canonicalId should be deterministic');

assert.equal(canonicalSlug('Already Here LLC'), 'already_here_llc', 'lowercases and collapses spaces');
assert.equal(canonicalSlug('  Multiple   spaces  '), 'multiple_spaces', 'trims and collapses leading/trailing/consecutive separators');
assert.equal(canonicalSlug('---leading-and-trailing---'), 'leading_and_trailing', 'collapses and trims non-alphanumeric runs');
assert.equal(canonicalSlug('UPPERCASE'), 'uppercase', 'lowercases input');
assert.equal(canonicalSlug('123-abc!@#def'), '123_abc_def', 'splits on mixed non-alphanumeric characters');
assert.equal(canonicalSlug('a__b'), 'a_b', 'collapses consecutive underscores');
assert.equal(canonicalSlug('a_b_c'), 'a_b_c', 'preserves single underscores');
assert.equal(canonicalSlug(''), '', 'empty input returns empty');
assert.equal(canonicalSlug('!@#$%'), '', 'only separators returns empty');
assert.equal(canonicalSlug('a'.repeat(100)), 'a'.repeat(64), 'truncates to 64 characters');
assert.equal(canonicalSlug('café-resto'), 'caf_resto', 'non-ascii alphanumeric characters become separators');

console.log('canonical ids tests passed');
