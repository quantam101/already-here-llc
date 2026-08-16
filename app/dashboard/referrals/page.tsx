import type { Metadata } from 'next';
import { ReferralDashboard } from '@/components/ReferralDashboard';

export const metadata: Metadata = {
  title: 'Referrals',
  description: 'Share your referral code and earn account credits when new renters complete paid weeks.',
  alternates: { canonical: '/dashboard/referrals' }
};

export default function ReferralsPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Referrals</span>
      <h1 className="section-title mt-5">Refer drivers. Earn credits.</h1>
      <p className="section-copy">
        Share your referral code with delivery drivers, vehicle owners, or businesses. You earn a $25 account credit after each referred renter completes four paid weeks.
      </p>

      <ReferralDashboard />

      <div className="mt-8 rounded-2xl border border-borderBrand bg-soft p-5">
        <p className="text-sm font-semibold text-navy">How it works</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Enter your email to get your code.</li>
          <li>Share your code or link with drivers, vehicle owners, or businesses who need our marketplace.</li>
          <li>They enter your code at intake or checkout.</li>
          <li>After they complete four paid weeks (or a qualifying marketplace transaction), you receive a $25 account credit.</li>
        </ol>
      </div>
    </div>
  );
}
