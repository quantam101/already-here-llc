import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAllPosts } from '@/lib/blog';
import { notifyBlogPost } from '@/lib/profitengine';

const SYNC_SECRET = process.env.SYNC_BLOGS_SECRET ?? '';

function isAuthorized(req: NextRequest): boolean {
  if (!SYNC_SECRET) return false;
  const auth = req.headers.get('authorization') ?? '';
  const expected = Buffer.from(`Bearer ${SYNC_SECRET}`);
  const actual = Buffer.from(auth);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const posts = getAllPosts();
  const results: Array<{ slug: string; sent: boolean }> = [];

  for (const post of posts) {
    const sent = await notifyBlogPost({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      date: post.date,
      category: post.category,
    });
    results.push({ slug: post.slug, sent });
  }

  return NextResponse.json({
    ok: true,
    synced: results.filter((r) => r.sent).length,
    total: posts.length,
    results,
  });
}

export async function GET() {
  const posts = getAllPosts();
  return NextResponse.json({
    ok: true,
    total: posts.length,
    posts: posts.map((p) => ({ slug: p.slug, title: p.title, date: p.date, category: p.category })),
  });
}
