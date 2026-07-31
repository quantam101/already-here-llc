import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'GINC Dashboard',
  description: 'Manage your GINC listings, rentals, work matches, referrals, and payments.',
  alternates: { canonical: '/dashboard' }
};

const sections = [
  { title: 'My listings', description: 'Vehicles, spaces, and equipment you have listed. Update availability, pricing, and photos.', action: 'Manage listings', href: '/ginc/network' },
  { title: 'My rentals', description: 'Active and upcoming scooter, vehicle, and equipment rentals. View agreements and return dates.', action: 'View rentals', href: '/scooter-rentals' },
  { title: 'My work & contracts', description: 'Jobs, contract opportunities, and worker matches you have posted or applied to.', action: 'View matches', href: '/connect' },
  { title: 'Network', description: 'Browse the full GINC network: members, listings, jobs, and matches.', action: 'Browse network', href: '/ginc/network' },
  { title: 'Referrals', description: 'Your referral code, shareable link, and earned credits.', action: 'View referrals', href: '/dashboard/referrals' },
  { title: 'Payments', description: 'Deposit and subscription invoices, payment methods, and payout settings.', action: 'View payments', href: '/dashboard/payments' }
];

export default function DashboardPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">GINC Dashboard</span>
      <h1 className="section-title mt-5">Dashboard</h1>
      <p className="section-copy">
        Manage your GINC listings, rentals, work matches, referrals, and payments from one place. This is a preview dashboard — authentication and live data integration will be added before launch.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <section key={section.title} className="card p-6">
            <h2 className="text-lg font-semibold text-navy">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{section.description}</p>
            <Link href={section.href} className="mt-4 inline-flex rounded-full border border-action px-4 py-2 text-sm font-semibold text-action hover:bg-action/5">
              {section.action}
            </Link>
          </section>
        ))}
      </div>

      <section className="mt-12 rounded-2xl border border-borderBrand bg-soft p-6">
        <h2 className="text-lg font-semibold text-navy">Quick stats</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Active listings', '1'],
            ['Pending bookings', '0'],
            ['Open matches', '0'],
            ['Referral credits', '$0']
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-borderBrand bg-white p-5 text-center">
              <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-action">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-600">Live statistics will appear once backend data is connected. Until then, all dashboard links lead to the relevant marketplace or intake pages.</p>
      </section>
    </div>
  );
}
