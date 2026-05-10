import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Field Service Insights',
  description:
    'Practical guides on IT field execution, MSP smart-hands, kiosk and POS support, and Phoenix-area field operations from Already Here LLC.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Field Service Insights | Already Here LLC',
    description: 'Practical guides on IT field execution, MSP smart-hands, kiosk support, and Phoenix-area field operations.',
    url: 'https://www.alreadyherellc.com/blog'
  }
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Field service insights</span>
      <h1 className="section-title mt-5">Phoenix field operations — practical guides</h1>
      <p className="section-copy">
        Guides on MSP smart-hands, kiosk and POS support, rollout execution, and field service
        operations for remote teams and vendors operating in Arizona.
      </p>

      {posts.length === 0 ? (
        <div className="mt-16 card p-10 text-center">
          <p className="text-slate-500 text-sm">Field insights coming soon.</p>
        </div>
      ) : (
        <div className="mt-12 grid gap-0 divide-y divide-borderBrand">
          {posts.map((post) => (
            <article key={post.slug} className="py-8">
              <Link href={`/blog/${post.slug}`} className="group block">
                <div className="flex items-center gap-3 mb-3">
                  <span className="eyebrow py-0.5">{post.category}</span>
                  <span className="text-xs text-slate-400">{post.date}</span>
                </div>
                <h2 className="text-xl font-semibold text-navy group-hover:text-action transition-colors mb-3">
                  {post.title}
                </h2>
                <p className="text-sm leading-7 text-slate-600 max-w-3xl">{post.excerpt}</p>
                <p className="mt-4 text-sm font-medium text-action group-hover:underline">
                  Read more →
                </p>
              </Link>
            </article>
          ))}
        </div>
      )}

      <div className="mt-16 card bg-navy p-8 text-white">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-xl font-semibold">Need field coverage in Phoenix?</h2>
            <p className="mt-2 text-base leading-7 text-white/80">
              Already Here LLC is the execution layer for MSPs, vendors, and multi-site operators across Arizona.
            </p>
          </div>
          <Link
            href="/dispatch"
            className="link-ring inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-navy transition hover:bg-slate-100"
          >
            Request Dispatch
          </Link>
        </div>
      </div>
    </div>
  );
}
