import assert from 'node:assert/strict';
import { getAllPosts, getIndexablePosts, getPostBySlug } from '../lib/blog.ts';

const all = getAllPosts();
const indexable = getIndexablePosts();

// Hand-written posts (with a category) are indexed; auto-generated ones are not.
assert.ok(indexable.length > 0, 'at least one indexable post');
assert.ok(indexable.length < all.length, 'some posts are hidden');
for (const post of indexable) assert.ok(post.category && post.indexable, `${post.slug} indexable`);
for (const slug of ['msp-smart-hands-phoenix-az', 'pos-kiosk-support-phoenix']) {
  assert.equal(getPostBySlug(slug)?.indexable, true, `${slug} stays indexed`);
}
assert.equal(getPostBySlug('2026-09-13-best-side-hustle-strategies-2026')?.indexable, false);
assert.equal(getPostBySlug('2026-10-03-pilot-a-small-delivery-scooter-rental-service-in-2026-step-by-step-guide-break-even-worksh')?.indexable, false);
// Hidden posts are still served by URL.
assert.ok(getPostBySlug('2026-09-13-best-side-hustle-strategies-2026'), 'hidden post still loads');

console.log(`blog-index: ${indexable.length} indexable of ${all.length}; all assertions passed`);
