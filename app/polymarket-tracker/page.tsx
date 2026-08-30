import type { Metadata } from 'next';
import Link from 'next/link';
import { polymarketPlans, polymarketProofPoints, polymarketFaqs } from '@/lib/polymarket-products';
import { PolymarketCheckoutButton } from '@/components/PolymarketCheckoutButton';

export const metadata: Metadata = {
  title: 'Polymarket Smart Wallet Tracker — Whale Alerts & Backtest Engine',
  description:
    'Track Polymarket smart wallets, backtest copy strategies on real on-chain data, and receive Telegram alerts before prices move. Alert-only by default; live execution is opt-in and risk-gated.',
  alternates: { canonical: 'https://www.alreadyherellc.com/polymarket-tracker' },
  openGraph: {
    title: 'Polymarket Smart Wallet Tracker | Already Here LLC',
    description:
      'Real-time Polymarket whale alerts, wallet profiling, and historical backtest engine with portfolio risk guardrails.',
    url: 'https://www.alreadyherellc.com/polymarket-tracker',
    siteName: 'Already Here LLC',
    type: 'website'
  }
};

export const dynamic = 'force-static';

export default function PolymarketTrackerPage() {
  return (
    <div className="proof-light bg-white">
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-12 py-16 lg:grid-cols-[1fr_0.9fr] lg:py-24">
          <div>
            <span className="eyebrow proof-label">On-chain alpha, delivered</span>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
              Track the smart wallets that move Polymarket, then backtest before you copy.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              The Polymarket Smart Wallet Tracker watches Polygon OrderFilled events, profiles high-performing wallets,
              runs realized backtests on closed markets, and sends Telegram alerts within seconds. Live copy trading is
              opt-in and guarded by fixed sizing, slippage caps, and portfolio circuit breakers.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#pricing" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
                Start free or subscribe
              </a>
              <a href="#demo" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                Watch the demo
              </a>
            </div>
          </div>

          <div className="card p-8" data-proof-surface>
            <p className="grid-label proof-label">Verified backtest result</p>
            <h2 className="mt-4 text-2xl font-semibold text-navy">$1,000 bankroll → $11,320.29 on real historical fills.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Using wallet <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">0x93b1...b746e</code> and fixed $50 copy sizing on
              Goldsky OrderFilled events + Polymarket closed-market settlements. 92.73% win rate, 9.09% max drawdown.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {polymarketProofPoints.map((point) => (
                <div key={point.label} className="rounded-2xl border border-borderBrand bg-white px-4 py-3" data-proof-border>
                  <p className="text-xs font-semibold text-action">{point.value}</p>
                  <p className="text-sm font-medium text-navy">{point.label}</p>
                  <p className="text-xs text-slate-500">{point.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="container-shell py-16 lg:py-24">
        <div className="mb-10 max-w-3xl">
          <span className="eyebrow proof-label">How it works</span>
          <h2 className="section-title mt-5">Four stages from signal to alert.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { step: '01', title: 'Listen', body: 'Ingest OrderFilled, OrdersMatched, and ERC-1155 transfer events from Polygon RPC or Alchemy WebSocket.' },
            { step: '02', title: 'Profile', body: 'Compute realized P&L, win-rate, Sharpe, and conviction for every watched wallet using on-chain fills.' },
            { step: '03', title: 'Gate', body: 'Run the trade through SignalConfluence, slippage limits, fixed sizing, and PortfolioRiskGuard drawdown checks.' },
            { step: '04', title: 'Alert', body: 'Send a formatted Telegram alert with wallet, token, market, side, size, price, confluence score, and portfolio scale.' }
          ].map((item) => (
            <article key={item.title} className="card p-6" data-proof-surface>
              <p className="text-3xl font-bold text-action">{item.step}</p>
              <h3 className="mt-4 text-lg font-semibold text-navy">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="border-y border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow proof-label">Terminal demo</span>
          <h2 className="section-title mt-5">Watch the $1,000 backtest run in real time.</h2>
          <p className="section-copy proof-muted">
            This recording starts the Polymarket tracker demo, loads real OrderFilled events from Goldsky, and prints the final
            P&L, win rate, monthly breakdown, and Telegram alert example.
          </p>
          <div className="mt-8 aspect-video overflow-hidden rounded-2xl border border-borderBrand bg-black">
            <video controls className="h-full w-full">
              <source src="https://app.devin.ai/attachments/eec65dfb-3426-4a0c-8580-3ee249f2a6b2/rec-5bb5a57b-58df-4648-b3ac-ab750cc5dc9e-edited.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Result in the demo: 949 trades, 92.73% win rate, $10,320.29 total P&L, max drawdown 9.09%.
          </p>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24" id="pricing">
        <div className="mb-10 max-w-3xl">
          <span className="eyebrow proof-label">Pricing</span>
          <h2 className="section-title mt-5">Choose a plan that matches your edge.</h2>
          <p className="section-copy proof-muted">
            Start free for manual alerts. Upgrade when you want risk gating, multi-wallet tracking, and the subscriber dashboard.
          </p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {polymarketPlans.map((plan) => (
            <article
              key={plan.id}
              className={`card flex flex-col p-6 ${plan.popular ? 'ring-2 ring-action' : ''}`}
              data-proof-surface
            >
              {plan.popular && <span className="mb-3 w-fit rounded-full bg-action px-3 py-1 text-xs font-semibold text-white">Most popular</span>}
              <p className="grid-label proof-label">{plan.name}</p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <h3 className="text-3xl font-semibold text-navy">{plan.price}</h3>
                <p className="pb-1 text-sm font-semibold text-slate-600">{plan.frequency}</p>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{plan.bestFor}</p>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-1 text-action">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {plan.id === 'enterprise' ? (
                  <a
                    href="mailto:info@alreadyherellc.com?subject=Polymarket%20Enterprise%20Node"
                    className="link-ring inline-flex w-full items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action"
                  >
                    {plan.cta}
                  </a>
                ) : plan.id === 'alerts' ? (
                  <Link
                    href="/dashboard/polymarket-tracker"
                    className="link-ring inline-flex w-full items-center justify-center rounded-full border border-borderBrand px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <PolymarketCheckoutButton planId={plan.id}>{plan.cta}</PolymarketCheckoutButton>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="mb-10 max-w-3xl">
          <span className="eyebrow proof-label">FAQ</span>
          <h2 className="section-title mt-5">Common questions.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {polymarketFaqs.map((faq) => (
            <details key={faq.question} className="card p-5" data-proof-surface>
              <summary className="cursor-pointer text-base font-semibold text-navy">{faq.question}</summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-borderBrand bg-white">
        <div className="container-shell py-16 text-center">
          <h2 className="text-3xl font-semibold text-navy">Start tracking whale wallets today.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Free alert feed, no credit card required. Upgrade when you are ready for multi-wallet tracking,
            portfolio risk gating, and automated sizing.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#pricing" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
              Get started
            </a>
            <a
              href="https://github.com/quantam101/already-here-llc/blob/devin/polymarket-tracker/docs/polymarket/OPERATOR_MANUAL.md"
              className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action"
            >
              Read the operator manual
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
