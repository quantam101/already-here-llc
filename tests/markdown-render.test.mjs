import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from '../lib/markdown.ts';

test('renders a GFM Markdown table as semantic HTML', async () => {
  const output = await renderMarkdown(`| Gate | Status |
| --- | --- |
| Claims | Verified |
| Pricing | Approved |`);

  assert.match(output, /<table>/);
  assert.match(output, /<th>Gate<\/th>/);
  assert.match(output, /<td>Verified<\/td>/);
});
