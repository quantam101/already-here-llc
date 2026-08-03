import { timingSafeEqual } from 'crypto';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { loadNetwork } from '@/lib/ginc-store';

export const metadata: Metadata = {
  title: 'GINC Admin Dashboard',
  description: 'Internal dashboard for monitoring GINC network health and platform activity.',
  robots: { index: false, follow: false }
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_KEY = process.env.GINC_ADMIN_KEY;

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

async function isAdminAuthorized(): Promise<boolean> {
  if (!ADMIN_KEY) return false;
  const headerStore = await headers();
  const cookieStore = await cookies();
  const headerKey = headerStore.get('x-admin-key') ?? '';
  const cookieKey = cookieStore.get('ginc-admin-key')?.value ?? '';
  if (headerKey && headerKey.length === ADMIN_KEY.length && constantTimeEqual(headerKey, ADMIN_KEY)) return true;
  if (cookieKey && cookieKey.length === ADMIN_KEY.length && constantTimeEqual(cookieKey, ADMIN_KEY)) return true;
  return false;
}

export default async function AdminPage() {
  if (!ADMIN_KEY) {
    return (
      <div className="container-shell py-16 lg:py-24">
        <h1 className="section-title">Admin dashboard not configured</h1>
        <p className="mt-4 text-sm text-slate-600">Set the <code className="rounded bg-slate-100 px-1 py-0.5">GINC_ADMIN_KEY</code> environment variable to enable the admin dashboard.</p>
      </div>
    );
  }

  if (!(await isAdminAuthorized())) {
    return (
      <div className="container-shell py-16 lg:py-24">
        <h1 className="section-title">Admin access required</h1>
        <p className="mt-4 max-w-2xl text-sm text-slate-600">
          Provide the admin key using the <code className="rounded bg-slate-100 px-1 py-0.5">x-admin-key</code> request header or a <code className="rounded bg-slate-100 px-1 py-0.5">ginc-admin-key</code> cookie.
        </p>
      </div>
    );
  }

  const network = await loadNetwork();

  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Admin</span>
      <h1 className="section-title mt-5">GINC network dashboard</h1>
      <p className="mt-4 max-w-2xl text-sm text-slate-600">
        Internal monitoring view. Full moderation tools, role-based access controls, and audit event review are available through the platform API and future admin console releases.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-navy">{network.members.length}</div>
          <div className="mt-2 text-sm font-medium text-slate-500">Members</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-navy">{network.listings.length}</div>
          <div className="mt-2 text-sm font-medium text-slate-500">Listings</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-navy">{network.jobs.length}</div>
          <div className="mt-2 text-sm font-medium text-slate-500">Work posts</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-navy">
            {network.listings.filter((l) => l.status === 'available').length}
          </div>
          <div className="mt-2 text-sm font-medium text-slate-500">Available listings</div>
        </div>
      </div>

      <div className="mt-10 card p-8">
        <h2 className="text-lg font-semibold text-navy">Enterprise readiness checklist</h2>
        <ul className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Redis-backed persistence and audit logging</li>
          <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Rate limiting and security headers</li>
          <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Privacy, Terms, and GDPR pages</li>
          <li className="flex items-center gap-2"><span className="text-emerald-600">✓</span> Role-based access helpers (admin/moderator/member)</li>
          <li className="flex items-center gap-2"><span className="text-amber-600">~</span> Admin key-gated moderation API and dashboard</li>
          <li className="flex items-center gap-2"><span className="text-amber-600">~</span> SSO / identity provider integration (future phase)</li>
        </ul>
      </div>
    </div>
  );
}
