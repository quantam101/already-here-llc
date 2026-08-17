# Polymarket Tracker — Live Execution Checklist

This document describes the production path from alert-only to live copy
trading. Live execution is **opt-in, self-hosted, and at your own risk**. The
SaaS product does not hold or move customer funds.

## 1. Prerequisites

Before enabling live execution, you must have:

- A funded Polymarket account with deposited USDC on Polygon.
- A dedicated wallet address with a controlled private key or browser wallet.
- An RPC endpoint (Alchemy WebSocket or public HTTP fallback) for Polygon.
- Telegram bot token and chat IDs for alerts.
- Forward-test results you are comfortable with.

## 2. Safety configuration

Set these environment variables in `.env`:

```text
POLYMARKET_LIVE_EXECUTION=true
POLYGON_WS_URL=wss://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_HTTP_URLS=https://polygon-rpc.com,https://polygon.drpc.org
WATCHED_WALLETS=0x93b110ff31deb58847e841b3cbc6535b3e7b746e
POLYMARKET_FIXED_ORDER_USD=50
POLYMARKET_MAX_SLIPPAGE_PCT=2
POLYMARKET_PORTFOLIO_DAILY_LOSS_LIMIT=200
POLYMARKET_PORTFOLIO_WEEKLY_LOSS_LIMIT=500
POLYMARKET_PORTFOLIO_MAX_DRAWDOWN_PCT=30
POLYMARKET_PORTFOLIO_CONSECUTIVE_LOSS_LIMIT=5
```

## 3. Execution handler integration

The current `runtime/polymarket/orchestrator.py` dispatches alerts and records
intended trades to the state database. It does not submit on-chain orders.

To execute trades, implement an `ExecutionHandler` adapter:

```python
class PolymarketExecutionHandler:
    def execute(self, event: dict) -> dict:
        # 1. Re-read the current order book for token_id.
        # 2. Compute max acceptable price using POLYMARKET_MAX_SLIPPAGE_PCT.
        # 3. Build and sign a CTF Exchange order or market order.
        # 4. Submit via Polymarket CLOB API or direct contract call.
        # 5. Return {tx_hash, status, executed_price, filled_shares}.
```

Attach the handler in `PolymarketOrchestrator` after the risk and confluence
gates pass and before `self.alert_agent(event)`.

## 4. Live execution smoke test

Before running with real capital:

1. Fund the wallet with $50 or the minimum accepted position size.
2. Start the orchestrator with `POLYMARKET_LIVE_EXECUTION=true`.
3. Wait for a qualifying fill from a watched wallet.
4. Verify:
   - The risk gate passes.
   - The portfolio circuit breaker is green.
   - The slippage check passes.
   - The order is submitted and confirmed on Polygonscan.
   - The Telegram alert includes the executed price and tx hash.

## 5. Guardrails that must stay enabled

- **Fixed order sizing** (never percent of balance).
- **Max slippage cap** (reject if price moved beyond configured %).
- **Daily/weekly loss limits** (pause after threshold).
- **Max drawdown %** (pause after threshold).
- **Consecutive loss limit** (pause after N losses).
- **Blacklist** (ignore known manipulated or low-liquidity markets).

## 6. Monitoring

Watch these continuously during live trading:

- Orchestrator logs and heartbeat.
- Telegram alert stream.
- Wallet USDC balance and position P&L.
- Subgraph/RPC latency.
- Closed-market settlement updates for P&L reconciliation.

## 7. Kill switch

If any of the following happen, stop the orchestrator immediately:

- Any single loss exceeds the fixed order size (should not be possible with
  binary outcome tokens, but check for partial fills or failed exits).
- Daily loss limit is hit.
- Three consecutive slippage rejections in a row.
- RPC or subgraph provider goes down for more than 5 minutes.
- Market shows signs of wash trading or manipulation.

## 8. Important disclaimers

- The SaaS product only provides alerts and research tools. It does not execute
  trades on your behalf unless you add a custom execution handler.
- All live trading is at your own risk. Historical performance is not a
  guarantee of future results.
- Prediction markets can result in total loss of the amount risked per trade.
- Polygon network, Polymarket contracts, and third-party APIs can fail or
  change without notice.

## 9. Next step

After a successful smoke test with the minimum position size and 2-4 weeks of
forward/paper trading, you may scale position sizes gradually. Never increase
position size beyond what your bankroll and drawdown limits can absorb.
