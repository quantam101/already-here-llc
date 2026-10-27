import fs from 'fs';
import path from 'path';

export type Post = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category: string;
  /**
   * Whether search engines should index this post. Hand-written posts carry a
   * `category`; auto-generated posts do not. A post is hidden from search, the
   * sitemap and the blog list when it has no category or sets `noindex: true`.
   * Hidden posts stay reachable by URL. Set `index: true` to force indexing.
   */
  indexable: boolean;
  content: string;
};

function isIndexable(data: Record<string, string>): boolean {
  if (/^(true|yes|1)$/i.test(data.noindex ?? '')) return false;
  if (/^(true|yes|1)$/i.test(data.index ?? '')) return true;
  return Boolean((data.category ?? '').trim());
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };
  const data: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) data[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
  }
  return { data, content: match[2] };
}

function safeSlug(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
      const { data, content } = parseFrontmatter(raw);
      return {
        slug: safeSlug(file.replace(/\.md$/, '')),
        title: data.title ?? 'Untitled',
        date: data.date ?? '',
        excerpt: data.excerpt ?? '',
        category: data.category ?? 'Field Service',
        indexable: isIndexable(data),
        content
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | null {
  const safe = safeSlug(slug);
  const filePath = path.join(BLOG_DIR, `${safe}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = parseFrontmatter(raw);
  return {
    slug: safe,
    title: data.title ?? 'Untitled',
    date: data.date ?? '',
    excerpt: data.excerpt ?? '',
    category: data.category ?? 'Field Service',
    indexable: isIndexable(data),
    content
  };
}

/** Posts that search engines should index (see Post.indexable). */
export function getIndexablePosts(): Post[] {
  return getAllPosts().filter((post) => post.indexable);
}

export function getStaticPostParams(): { slug: string }[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ slug: safeSlug(f.replace(/\.md$/, '')) }));
}
