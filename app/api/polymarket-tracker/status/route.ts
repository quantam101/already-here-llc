import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_EXCHANGES = [
  '0xE111180000d2663C0091e4f400237545B87B996B',
  '0xe2222d279d744050d28e00520010520000310F59',
  '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'
];

function safeList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAuthenticated(request: NextRequest): boolean {
  const secret = process.env.POLYMARKET_STATUS_SECRET;
  if (!secret) return false;
  const token = request.nextUrl.searchParams.get('token');
  return token === secret;
}

export async function GET(request: NextRequest) {
  const parsedExchanges = safeList(process.env.POLYMARKET_EXCHANGE_ADDRESSES);
  const exchanges =
    parsedExchanges.length > 0 ? parsedExchanges : DEFAULT_EXCHANGES;
  const watched = safeList(process.env.WATCHED_WALLETS);

  const publicBody = {
    ok: true,
    service: 'polymarket-tracker',
    status: 'ready',
    mode: 'alert-only',
    liveExecution: false,
    exchanges,
    watchedWalletCount: watched.length,
    risk: {
      maxSlippagePct: Number(process.env.POLYMARKET_MAX_SLIPPAGE_PCT ?? '2'),
      fixedOrderUsd: Number(process.env.POLYMARKET_FIXED_ORDER_USD ?? '50'),
      minProfitUsd: Number(process.env.POLYMARKET_MIN_PROFIT_USD ?? '10000'),
      minWinRatePct: Number(process.env.POLYMARKET_MIN_WIN_RATE_PCT ?? '65'),
      minSharpe: Number(process.env.POLYMARKET_MIN_SHARPE_RATIO ?? '1'),
      confluenceEnabled: process.env.POLYMARKET_CONFLUENCE_ENABLED === 'true',
      confluenceThreshold: Number(process.env.POLYMARKET_CONFLUENCE_THRESHOLD ?? '0.2'),
      confluenceMinConfidence: Number(
        process.env.POLYMARKET_CONFLUENCE_MIN_CONFIDENCE ?? '50'
      ),
      portfolioDailyLossLimit: Number(
        process.env.POLYMARKET_PORTFOLIO_DAILY_LOSS_LIMIT ?? '200'
      ),
      portfolioWeeklyLossLimit: Number(
        process.env.POLYMARKET_PORTFOLIO_WEEKLY_LOSS_LIMIT ?? '500'
      ),
      portfolioMaxDrawdownPct: Number(
        process.env.POLYMARKET_PORTFOLIO_MAX_DRAWDOWN_PCT ?? '30'
      )
    },
    timestamp: new Date().toISOString()
  };

  if (!isAuthenticated(request)) {
    return NextResponse.json(publicBody);
  }

  return NextResponse.json({
    ...publicBody,
    watchedWallets: watched,
    hasTelegram: Boolean(
      process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_IDS
    ),
    hasPolygon: Boolean(
      process.env.POLYGON_WS_URL || process.env.POLYGON_HTTP_URLS
    ),
    hasClaude: Boolean(
      process.env.CLAUDE_API_KEY && process.env.POLYMARKET_CLAUDE_ENABLED === 'true'
    ),
    gated: false
  });
}
