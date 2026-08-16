import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

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

function getAgentSwarm() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'polymarket_tracker.db');
    const db = new Database(dbPath, { readonly: true, fileMustExist: false });
    const agents = db
      .prepare('SELECT agent, status_json FROM agent_status')
      .all() as Array<{ agent: string; status_json: string }>;
    const decision = db
      .prepare('SELECT decision_json FROM meta_decisions ORDER BY created_at DESC LIMIT 1')
      .get() as { decision_json: string } | undefined;
    const audit = db
      .prepare('SELECT COUNT(*) as c FROM security_audit')
      .get() as { c: number };
    const dayAgo = (Date.now() / 1000) - 86400;
    const anomalies = db
      .prepare("SELECT COUNT(*) as c FROM security_audit WHERE anomaly_flags != '[]' AND created_at >= ?")
      .get(dayAgo) as { c: number };
    db.close();
    const byAgent: Record<string, unknown> = {};
    for (const row of agents) {
      try {
        byAgent[row.agent] = JSON.parse(row.status_json);
      } catch {
        byAgent[row.agent] = row.status_json;
      }
    }
    return {
      enabled: process.env.POLYMARKET_META_AGENT_ENABLED !== 'false',
      agents: byAgent,
      latestDecision: decision ? JSON.parse(decision.decision_json) : null,
      audit: { total: audit?.c || 0, anomalies: anomalies?.c || 0 }
    };
  } catch {
    return { enabled: false, agents: {}, latestDecision: null, audit: { total: 0, anomalies: 0 } };
  }
}

function getPaperMetrics() {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'polymarket_tracker.db');
    const db = new Database(dbPath, { readonly: true, fileMustExist: false });
    const open = db
      .prepare('SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as n FROM paper_positions WHERE closed = 0')
      .get() as { c: number; n: number };
    const closed = db
      .prepare('SELECT COUNT(*) as c, COALESCE(SUM(pnl),0) as pnl FROM paper_positions WHERE closed = 1')
      .get() as { c: number; pnl: number };
    const trades = db
      .prepare("SELECT pnl FROM closed_trades WHERE strategy = 'paper' ORDER BY closed_at")
      .all() as Array<{ pnl: number }>;
    db.close();

    let wins = 0;
    let losses = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let running = 0;
    for (const t of trades) {
      running += t.pnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDrawdown) maxDrawdown = dd;
      if (t.pnl > 0) wins++;
      else if (t.pnl < 0) losses++;
    }
    const total = wins + losses;
    const winRate = total ? (wins / total) * 100 : 0;

    return {
      enabled: process.env.POLYMARKET_PAPER_TRADING === 'true',
      openPositions: open.c || 0,
      openNotional: open.n || 0,
      closedTrades: closed.c || 0,
      realizedPnl: closed.pnl || 0,
      winRate,
      maxDrawdown,
      bankroll:
        Number(process.env.POLYMARKET_PAPER_STARTING_BANKROLL ?? '1000') +
        (closed.pnl || 0)
    };
  } catch {
    return {
      enabled: process.env.POLYMARKET_PAPER_TRADING === 'true',
      openPositions: 0,
      openNotional: 0,
      closedTrades: 0,
      realizedPnl: 0,
      winRate: 0,
      maxDrawdown: 0,
      bankroll: Number(process.env.POLYMARKET_PAPER_STARTING_BANKROLL ?? '1000')
    };
  }
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
    paper: getPaperMetrics(),
    agents: getAgentSwarm(),
    gated: false
  });
}
