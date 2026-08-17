import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Polymarket Tracker Terms of Service',
  description: 'Terms of service for the Polymarket Smart Wallet Tracker subscription and alert service.',
  alternates: { canonical: 'https://www.alreadyherellc.com/polymarket-tracker/terms' }
};

export default function PolymarketTermsPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow proof-label">Legal</span>
      <h1 className="section-title mt-5">Polymarket Tracker terms of service</h1>
      <p className="section-copy proof-muted">Last updated: August 2, 2026</p>

      <div className="card mt-10 max-w-4xl space-y-6 p-8 text-sm leading-7 text-slate-700" data-proof-surface>
        <section>
          <h2 className="text-xl font-semibold text-navy">1. Acceptance of terms</h2>
          <p className="mt-3">
            By accessing or subscribing to the Polymarket Smart Wallet Tracker (&quot;Service&quot;), you agree to these Terms of Service.
            If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">2. Description of service</h2>
          <p className="mt-3">
            The Service provides on-chain event monitoring, wallet profiling, historical backtesting, and alert delivery for
            Polymarket prediction markets. The Service is for informational and research purposes only. It does not provide
            investment, financial, or legal advice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">3. No performance guarantee</h2>
          <p className="mt-3">
            Historical backtest results, win rates, and P&L figures shown in marketing materials are past performance only and
            are not guarantees of future results. Prediction markets involve substantial risk of loss, including total loss of
            any amount risked per trade.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">4. Live execution disclaimer</h2>
          <p className="mt-3">
            Any live copy-trading or order execution is entirely at your own risk and requires explicit opt-in. You are
            responsible for configuring your own wallet, RPC endpoints, slippage limits, and position sizing. We do not execute
            trades on your behalf.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">5. Subscriptions and billing</h2>
          <p className="mt-3">
            Pro and Enterprise plans are billed monthly through Stripe. You may cancel or manage your subscription through the
            billing portal in your dashboard. No refunds are provided for partial billing periods unless required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">6. Acceptable use</h2>
          <p className="mt-3">
            You may not use the Service to violate any law, manipulate markets, harass others, or reverse engineer the Service.
            We reserve the right to suspend or terminate accounts for abuse.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">7. Limitation of liability</h2>
          <p className="mt-3">
            To the fullest extent permitted by law, Already Here LLC and its operators are not liable for any trading losses,
            missed opportunities, data errors, or service interruptions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">8. Changes to terms</h2>
          <p className="mt-3">
            We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the
            revised terms.
          </p>
        </section>
      </div>
    </div>
  );
}
