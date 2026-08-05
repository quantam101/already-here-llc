import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Polymarket Tracker Privacy Policy',
  description: 'Privacy policy for the Polymarket Smart Wallet Tracker subscription and alert service.',
  alternates: { canonical: 'https://www.alreadyherellc.com/polymarket-tracker/privacy' }
};

export default function PolymarketPrivacyPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow proof-label">Legal</span>
      <h1 className="section-title mt-5">Polymarket Tracker privacy policy</h1>
      <p className="section-copy proof-muted">Last updated: August 2, 2026</p>

      <div className="card mt-10 max-w-4xl space-y-6 p-8 text-sm leading-7 text-slate-700" data-proof-surface>
        <section>
          <h2 className="text-xl font-semibold text-navy">1. Information we collect</h2>
          <p className="mt-3">
            We collect your email address, plan selection, and support messages when you create a ticket or subscribe. We do
            not collect or store private keys, wallet seed phrases, or exchange credentials.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">2. How we use information</h2>
          <p className="mt-3">
            We use your contact information to deliver alerts, manage your subscription, respond to support requests, and send
            product updates. We do not sell your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">3. Wallet and on-chain data</h2>
          <p className="mt-3">
            The Service reads public on-chain event data and Polymarket CLOB/Gamma market data. We do not control your wallet
            or move your funds. Any wallet addresses you configure are treated as watchlist items only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">4. Payment processing</h2>
          <p className="mt-3">
            Subscription payments are processed by Stripe. We do not store your full payment card details. Stripe&apos;s privacy
            policy governs payment data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">5. Cookies and analytics</h2>
          <p className="mt-3">
            We may use standard analytics to understand how visitors use the landing page and dashboard. You can disable
            cookies through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">6. Data retention</h2>
          <p className="mt-3">
            Support tickets and subscription records are retained for as long as needed to provide the Service and meet legal
            obligations. You may request deletion by contacting support.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">7. Security</h2>
          <p className="mt-3">
            We use industry-standard practices including HTTPS, environment-isolated secrets, and automated security scanning.
            No system is completely secure; you are responsible for protecting your dashboard access token and Telegram bot
            credentials.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">8. Changes</h2>
          <p className="mt-3">
            We may update this privacy policy. Material changes will be announced through the Service or by email.
          </p>
        </section>
      </div>
    </div>
  );
}
