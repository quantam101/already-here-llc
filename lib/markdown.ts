import { remark } from 'remark';
import gfm from 'remark-gfm';
import html from 'remark-html';

/** Render GitHub-flavored Markdown, including tables, as sanitized HTML. */
export async function renderMarkdown(markdown: string): Promise<string> {
  const result = await remark().use(gfm).use(html, { sanitize: true }).process(markdown);
  return result.toString();
}
