# Polymarket Smart Wallet Tracker — Operator Manual

## 1. What this system does

The `runtime/polymarket/` agent watches Polymarket's on-chain `OrderFilled` events,
profiles smart wallets, and sends Telegram alerts when a tracked wallet trades. It
can also run a historical backtest to see how copying a specific wallet would have
performed before risking live capital.

**Default mode is alert-only.** No money is moved unless you explicitly enable live
copy-execution and pass the risk gate.

## 2. Architecture

```
Polygon RPC / Alchemy WS
        │
        ▼
PolymarketListener  ──►  WalletProfiler
        │                       │
        ▼                       ▼
SignalConfluence        PortfolioRiskGuard
        │                       │
        └──────────┬────────────┘
                   ▼
         TelegramAlertEngine
```

- `PolymarketListener` — ingests `OrderFilled`, `OrdersMatched`, and ERC-1155
  `Transfer` events.
- `WalletProfiler` — computes 30-day realized P&L, win-rate, Sharpe, and
  conviction from on-chain fills.
- `SignalConfluence` — optional ensemble filter using CLOB price history,
  order-book imbalance, and Gamma market metadata.
- `PortfolioRiskGuard` — portfolio-level circuit breaker (daily/weekly loss,
  drawdown, consecutive losses, win-rate scaling).
- `TelegramAlertEngine` — dispatches formatted alerts within seconds.

## 3. Prerequisites

```bash
# Python
python -m pip install -r requirements.txt

# Node / Next.js
npm install
export PATH=/home/ubuntu/.nvm/versions/node/v22.12.0/bin:$PATH
```

## 4. Environment configuration

Copy `.env.example` to `.env` and fill in only the values you need.

```bash
cp .env.example .env
```

Required for alert-only operation:

```text
WATCHED_WALLETS=0x93b110ff31deb58847e841b3cbc6535b3e7b746e
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_IDS=your_chat_id
```

Live execution requires:

```text
POLYMARKET_LIVE_EXECUTION=true
POLYGON_WS_URL=your_alchemy_ws
POLYGON_HTTP_URLS=https://polygon-rpc.com,https://polygon.drpc.org
```

Never commit `.env` to Git.

## 5. Run the alert-only tracker

```bash
python runtime/polymarket/orchestrator.py
```

The orchestrator:
1. Loads watched wallets and risk settings.
2. Connects to Polygon WebSocket (or HTTP fallback).
3. For each matching fill, runs profiler, confluence, and portfolio risk gates.
4. Sends a Telegram alert if all gates pass.

To run as a module instead:

```bash
python -m runtime.polymarket.orchestrator
```

## 6. Run a historical backtest

The backtest uses real on-chain `OrderFilled` events from the Goldsky subgraph and
real settlement prices from the Polymarket CLOB closed-market list.

```bash
python runtime/polymarket/backtest.py \
  --wallets 0x93b110ff31deb58847e841b3cbc6535b3e7b746e \
  --start 1771363200 \
  --end 1785634560 \
  --bankroll 1000 \
  --fixed-usd 50 \
  --min-profit 0 \
  --min-win-rate 0 \
  --min-sharpe -100
```

Key flags:

| Flag | Meaning |
|------|---------|
| `--wallets` | Comma-separated wallets to copy |
| `--bankroll` | Starting capital for P&L and drawdown math |
| `--fixed-usd` | Fixed dollars risked per copy trade |
| `--position-size-pct` | Optional percent-of-bankroll sizing instead of fixed |
| `--min-profit` | Minimum wallet P&L to qualify |
| `--min-win-rate` | Minimum wallet win-rate to qualify |
| `--min-sharpe` | Minimum wallet Sharpe to qualify |
| `--confluence` | Enable `SignalConfluence` gating |

## 7. Wallet selection workflow

1. Identify candidate wallets from recent on-chain activity.
2. Run the backtest with the strict filter defaults:
   `--min-profit 10000 --min-win-rate 65 --min-sharpe 1`.
3. If no wallet qualifies, lower filters incrementally and inspect P&L curve.
4. Pick a wallet with a sustained win-rate, positive P&L, and drawdown you can
   tolerate.
5. Run the same wallet in alert-only mode for 1-2 weeks before enabling live
   execution.

## 8. Risk guardrails

The system enforces these regardless of mode:

- `POLYMARKET_MAX_SLIPPAGE_PCT` — reject copy if price moved beyond this.
- `POLYMARKET_FIXED_ORDER_USD` — fixed position size (never percentage of
  balance).
- `POLYMARKET_BLACKLIST_MARKET_IDS` — markets the tracker ignores.
- `POLYMARKET_PORTFOLIO_DAILY_LOSS_LIMIT` — pause after this daily loss.
- `POLYMARKET_PORTFOLIO_MAX_DRAWDOWN_PCT` — pause after this drawdown.
- `POLYMARKET_PORTFOLIO_CONSECUTIVE_LOSS_LIMIT` — pause after N losses in a row.

Live execution is only attempted when:

```
POLYMARKET_LIVE_EXECUTION=true
```

and the risk gate returns `pass_gate=true`.

## 9. Telegram alert format

A typical alert looks like:

```
🚨 Polymarket whale trade

Wallet: 0x93b1...b746e
Role: TAKER
Token: 0x1724...02980
Market: xrp-up-or-down-february-17-4pm-et
Side: BUY
Shares: 75.76
Price: 0.6600
USD Notional: $50.00
Confluence Score: 0.42
Portfolio Scale: 1.0x

[View on Polygonscan](https://polygonscan.com/tx/0x...)
```

## 10. Monitoring and health

Public status endpoint:

```bash
curl http://localhost:3000/api/polymarket-tracker/status
```

Authenticated status (if `POLYMARKET_STATUS_SECRET` is set):

```bash
curl "http://localhost:3000/api/polymarket-tracker/status?token=$POLYMARKET_STATUS_SECRET"
```

Python orchestrator status is printed to stdout on startup and at each heartbeat.

## 11. Common issues

| Issue | Fix |
|-------|-----|
| `ImportError` on `from .abi` | Run as `python -m runtime.polymarket.backtest` or set `PYTHONPATH`. |
| Subgraph timeouts | The loader retries with smaller page sizes automatically. Use shorter windows if timeouts persist. |
| No Telegram alerts | Check `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_IDS`; the engine silently fails safe. |
| Confluence blocks everything | Lower `POLYMARKET_CONFLUENCE_THRESHOLD` or disable with `POLYMARKET_CONFLUENCE_ENABLED=false`. |

## 12. Important disclaimer

This system is a research and alerting tool. Historical win-rate (including the
93.44% backtest result for wallet `0x93b110...b746e`) is **not a guarantee of
future performance**. Prediction markets can result in total loss of the amount
risked per trade. Never risk more than you can afford to lose.
