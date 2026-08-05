export type PolymarketPlanId = 'alerts' | 'pro' | 'enterprise';

export type PolymarketPlan = {
  id: PolymarketPlanId;
  name: string;
  price: string;
  cents: number;
  frequency: string;
  mode: 'subscription' | 'payment';
  bestFor: string;
  includes: string[];
  cta: string;
  popular?: boolean;
};

export const polymarketPlans: PolymarketPlan[] = [
  {
    id: 'alerts',
    name: 'Alert Feed',
    price: '$0',
    cents: 0,
    frequency: 'Free forever',
    mode: 'payment',
    bestFor: 'Self-directed traders who want Telegram alerts and manual execution.',
    includes: [
      'One watched wallet',
      'Telegram alerts within seconds of on-chain fills',
      'Basic backtest access',
      'Public status endpoint'
    ],
    cta: 'Start free'
  },
  {
    id: 'pro',
    name: 'Pro Tracker',
    price: '$197/mo',
    cents: 19700,
    frequency: 'per month',
    mode: 'subscription',
    bestFor: 'Active traders who want portfolio risk gating, multi-wallet tracking, and automated sizing.',
    includes: [
      'Up to 10 watched wallets',
      'Portfolio circuit breaker and drawdown guard',
      'Signal confluence (order book + market metadata)',
      'Advanced backtest with bankroll tracking',
      'Priority Telegram + email alerts',
      'Subscriber dashboard'
    ],
    cta: 'Subscribe',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise Node',
    price: '$997/mo',
    cents: 99700,
    frequency: 'per month',
    mode: 'subscription',
    bestFor: 'Funds, syndicates, and white-label partners who need custom risk models and SLA support.',
    includes: [
      'Unlimited watched wallets',
      'Custom confluence models and filters',
      'Private RPC endpoints and dedicated infra',
      'White-label Telegram bot / API',
      'Monthly strategy review and tuning',
      '99.9% uptime SLA'
    ],
    cta: 'Contact us'
  }
];

export const polymarketProofPoints = [
  { label: 'Realized win rate', value: '92.73%', detail: 'Historical backtest on closed Polymarket events' },
  { label: 'Starting bankroll', value: '$1,000', detail: 'To final bankroll of $11,320.29 in demo window' },
  { label: 'Max drawdown', value: '9.09%', detail: 'Fixed $50 sizing per copy trade' },
  { label: 'Alert latency', value: '< 2s', detail: 'Polygon WebSocket / HTTP fallback' }
];

export const polymarketFaqs = [
  {
    question: 'Does this guarantee profits?',
    answer:
      'No. The 92.73% win rate is a historical, in-sample result for one tracked wallet. Prediction markets are high-risk and any amount risked can be lost.'
  },
  {
    question: 'Is live copy trading enabled by default?',
    answer:
      'No. The default mode is alert-only. Live execution requires explicit opt-in, a funded wallet, and passing all risk guardrails.'
  },
  {
    question: 'Can I run this on my own server?',
    answer:
      'Yes. The runtime is open-source Python in runtime/polymarket. The paid plans add dashboards, multi-wallet tracking, and managed alerts.'
  },
  {
    question: 'What exchanges or markets does this support?',
    answer:
      'Polymarket on Polygon. The modular listener design can be extended to other CLOB or on-chain venues by adding a new listener adapter.'
  },
  {
    question: 'Do I need a Polymarket account?',
    answer:
      'Only if you enable live execution. Alert-only and backtest modes do not require an account.'
  }
];
