/**
 * Declarative Markdown Renderer
 *
 * Server-side markdown-to-HTML pipeline using remark/rehype.
 * Pure function: markdown string in, sanitized HTML string out.
 * No side effects, no mutable state.
 */

import { remark } from 'remark';
import html from 'remark-html';

/** Render markdown string to sanitized HTML. Pure, async transform. */
export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await remark().use(html, { sanitize: true }).process(markdown);
  return result.toString();
}
