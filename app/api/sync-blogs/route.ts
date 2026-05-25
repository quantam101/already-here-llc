import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/blog';
import { notifyBlogPost } from '@/lib/profitengine';

export async function POST() {
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
