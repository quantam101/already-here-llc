import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug, getStaticPostParams } from '@/lib/blog';
import { siteConfig } from '@/lib/site';

export async function generateStaticParams() {
  return getStaticPostParams();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${params.slug}` },
    openGraph: {
      title: `${post.title} | Already Here LLC`,
      description: post.excerpt,
      url: `${siteConfig.url}/blog/${params.slug}`
    }
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <div className="container-shell py-16 lg:py-24">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="eyebrow py-0.5">{post.category}</span>
          <span className="text-sm text-slate-400">{post.date}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-navy sm:text-4xl mb-6">
          {post.title}
        </h1>
        <p className="text-lg leading-8 text-slate-600 mb-10 border-b border-borderBrand pb-10">
          {post.excerpt}
        </p>
        <div className="prose prose-slate max-w-none text-sm leading-7"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      <div className="mt-16 border-t border-borderBrand pt-10 grid gap-4 sm:flex sm:items-center sm:justify-between">
        <Link href="/blog" className="text-sm font-medium text-action hover:underline">
          ← Back to Field Insights
        </Link>
        <Link
          href="/dispatch"
          className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy"
        >
          Request Field Coverage →
        </Link>
      </div>
    </div>
  );
}
