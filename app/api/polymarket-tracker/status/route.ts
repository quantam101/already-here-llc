import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function safeList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET() {
  const watched = safeList(process.env.WATCHED_WALLETS);
  const exchanges = safeList(process.env.POLYMARKET_EXCHANGE_ADDRESSES) || [
    '0xE111180000d2663C0091e4f400237545B87B996B',
    '0xe2222d279d744050d28e00520010520000310F59',
    '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'
  ];
  const hasTelegram = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_IDS);
  const hasPolygon = Boolean(
    process.env.POLYGON_WS_URL || process.env.POLYGON_HTTP_URLS
  );

  return NextResponse.json({
    ok: true,
    service: 'polymarket-tracker',
    status: 'ready',
    mode: 'alert-only',
    liveExecution: false,
    watchedWallets: watched,
    exchanges,
    hasTelegram,
    hasPolygon,
    risk: {
      maxSlippagePct: Number(process.env.POLYMARKET_MAX_SLIPPAGE_PCT ?? '2'),
      fixedOrderUsd: Number(process.env.POLYMARKET_FIXED_ORDER_USD ?? '50'),
      minProfitUsd: Number(process.env.POLYMARKET_MIN_PROFIT_USD ?? '10000'),
      minWinRatePct: Number(process.env.POLYMARKET_MIN_WIN_RATE_PCT ?? '65'),
      minSharpe: Number(process.env.POLYMARKET_MIN_SHARPE_RATIO ?? '1')
    },
    timestamp: new Date().toISOString()
  });
}
