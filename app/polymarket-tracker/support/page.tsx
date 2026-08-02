import type { Metadata } from 'next';
import { PolymarketSupportForm } from '@/components/PolymarketSupportForm';

export const metadata: Metadata = {
  title: 'Polymarket Tracker Support',
  description: 'Open a support ticket for the Polymarket Smart Wallet Tracker.',
  alternates: { canonical: 'https://www.alreadyherellc.com/polymarket-tracker/support' }
};

export default function PolymarketSupportPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow proof-label">Support</span>
      <h1 className="section-title mt-5">Polymarket Tracker support</h1>
      <p className="section-copy proof-muted">
        Free users: email and GitHub issues. Pro users: 48-hour email SLA. Enterprise users: dedicated Slack channel.
      </p>
      <PolymarketSupportForm />
    </div>
  );
}
