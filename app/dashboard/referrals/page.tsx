import type { Metadata } from 'next';
import { randomUUID } from 'crypto';

export const metadata: Metadata = {
  title: 'Referrals',
  description: 'Share your referral code and earn account credits when new renters complete four paid weeks.',
  alternates: { canonical: '/dashboard/referrals' }
};

function generateReferralCode() {
  return `AH-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export default function ReferralsPage() {
  const code = generateReferralCode();
  const referralLink = `https://www.alreadyherellc.com/scooter-rentals?ref=${code}`;

  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Referrals</span>
      <h1 className="section-title mt-5">Refer drivers. Earn credits.</h1>
      <p className="section-copy">
        Share your referral code with delivery drivers, vehicle owners, or businesses. You earn a $25 account credit after each referred renter completes four paid weeks.
      </p>

      <section className="mt-10 card p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-borderBrand bg-soft p-5">
            <p className="text-sm font-semibold text-navy">Your referral code</p>
            <p className="mt-2 text-3xl font-semibold text-action">{code}</p>
            <p className="mt-1 text-sm text-slate-600">Give this to renters at checkout.</p>
          </div>
          <div className="rounded-2xl border border-borderBrand bg-soft p-5">
            <p className="text-sm font-semibold text-navy">Your shareable link</p>
            <p className="mt-2 break-all text-sm text-slate-700">{referralLink}</p>
            <p className="mt-1 text-sm text-slate-600">Share on social, text, or QR.</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-borderBrand bg-soft p-5">
          <p className="text-sm font-semibold text-navy">How it works</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>Copy your code or link.</li>
            <li>Share with drivers, vehicle owners, or businesses who need our marketplace.</li>
            <li>They enter your code at intake.</li>
            <li>After they complete four paid weeks (or a qualifying marketplace transaction), you receive a $25 account credit.</li>
          </ol>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          This is a preview page. Persistent referral tracking, automated credit application, and payout history require a connected database and logged-in user account.
        </div>
      </section>
    </div>
  );
}
