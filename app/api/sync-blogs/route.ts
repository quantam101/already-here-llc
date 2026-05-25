import { NextRequest, NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/blog';
import { notifyBlogPost } from '@/lib/profitengine';

const SYNC_SECRET = process.env.SYNC_BLOGS_SECRET ?? '';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  if (!SYNC_SECRET || auth !== `Bearer ${SYNC_SECRET}`) {
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
