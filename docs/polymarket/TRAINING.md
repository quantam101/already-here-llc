# Polymarket Smart Wallet Tracker — Trader Training

This guide walks you from installation to a live, risk-managed copy-trading
workflow. Work through each lesson in order.

## Lesson 1 — Install and verify

1. Open a terminal in the repo root.
2. Install Python dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
3. Install Node dependencies and confirm versions:
   ```bash
   npm install
   node -v   # should be 22.x
   python --version  # should be 3.11+
   ```
4. Run the test suite:
   ```bash
   python -m pytest tests/ -q
   npm test
   ```
5. Run the quality gates:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   npm run security:scan
   ```

## Lesson 2 — Configure the environment

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` with your values. For training, use alert-only:
   ```text
   WATCHED_WALLETS=0x93b110ff31deb58847e841b3cbc6535b3e7b746e
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_IDS=your_chat_id
   POLYMARKET_LIVE_EXECUTION=false
   ```
3. Verify the status API picks up the config:
   ```bash
   npm run dev
   curl http://localhost:3000/api/polymarket-tracker/status | python -m json.tool
   ```

## Lesson 3 — Run your first backtest

Run the same command the developers used to verify the wallet from the PR:

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

Read the output. You should see `win_rate`, `total_pnl`, `final_bankroll`, and
`max_drawdown_pct`.

**Exercise:** Rerun with `--confluence` and compare. In the current dataset the
confluence ensemble blocks all trades for this wallet, so the 93.44% result comes
from wallet selection alone.

## Lesson 4 — Select and validate a wallet

Use the profiler to find your own candidate wallet:

1. Pick an active wallet address from a Polymarket block explorer or the Goldsky
   subgraph.
2. Run the backtest with strict filters:
   ```bash
   --min-profit 10000 --min-win-rate 65 --min-sharpe 1
   ```
3. If no wallet qualifies, relax filters one at a time and watch how `win_rate`,
   `profit_factor`, and `max_drawdown_pct` change.
4. Select a wallet only when:
   - `win_rate` is above 60%,
   - `profit_factor` is above 1.5,
   - `max_drawdown_pct` is below the limit you can tolerate,
   - the P&L curve is stable, not one lucky month.

## Lesson 5 — Start alert-only mode

1. Set `WATCHED_WALLETS` to your validated wallet.
2. Start the orchestrator:
   ```bash
   python runtime/polymarket/orchestrator.py
   ```
3. Wait for a fill. You will receive a Telegram alert with market, token, side,
   shares, price, confluence score, and portfolio scale.
4. Log each alert in a spreadsheet for one week. Compare the alerted entry price
   to the market settlement price later to estimate real-time performance.

## Lesson 6 — Understand confluence (when to use it)

- `POLYMARKET_CONFLUENCE_ENABLED=false` is the safest default.
- Enabling confluence adds order-book and market-metadata signals.
- If confluence blocks too many winning trades, lower the threshold or keep it
  disabled.
- Never add confluence signals to a strategy you have not backtested; verify on
  closed-market data first.

## Lesson 7 — Paper trade / forward test

Before risking capital, run a two-week forward test:

1. Keep `POLYMARKET_LIVE_EXECUTION=false`.
2. For each alert, manually record what you *would* have bought at the alert price.
3. Track outcomes and compare to the backtest.
4. If the live forward win-rate is within 10% of the backtest win-rate, the
   wallet is a candidate for automation.

## Lesson 8 — Enable live execution (optional)

Only proceed if:

1. You have a dedicated Polymarket-funded wallet.
2. You set a conservative fixed order size (`POLYMARKET_FIXED_ORDER_USD=50` or
   lower).
3. You set loss limits and a max drawdown you can accept.
4. You enable live execution explicitly:
   ```text
   POLYMARKET_LIVE_EXECUTION=true
   POLYGON_WS_URL=your_alchemy_ws
   POLYGON_HTTP_URLS=https://polygon-rpc.com,https://polygon.drpc.org
   ```

Restart the orchestrator. The risk gate will still block trades that violate
slippage, sizing, or portfolio limits.

## Daily operating checklist

- [ ] Check Telegram for overnight alerts.
- [ ] Verify orchestrator is still connected (`/api/polymarket-tracker/status`).
- [ ] Review closed trades and updated P&L in `polymarket_tracker.db`.
- [ ] Confirm daily/weekly loss limits have not been hit.
- [ ] If a wallet has 5 consecutive losses, remove or pause it.
- [ ] Run `npm run security:scan` before any code changes.

## Risk-management rules

1. **Fixed size only.** Never risk a percentage of your balance per trade.
2. **One wallet per $1,000 bankroll.** Do not copy more wallets than your capital
   can fund simultaneously.
3. **Max 5% drawdown per day.** Pause and reassess after a bad day.
4. **No all-in.** Even a 93% win-rate can have a losing streak.
5. **Keep live execution opt-in.** Alerts are free; live money is not.

## FAQ

**Q: Can I guarantee the 93.44% win rate?**  
A: No. The 93.44% result is historical, in-sample, and tied to one wallet's
activity window. Future results will differ.

**Q: Why did confluence block all trades?**  
A: The current ensemble signals (order-book imbalance + metadata) are not
aligned with this wallet's edge. Use confluence only after validating it on your
own dataset.

**Q: How much capital should I start with?**  
A: Use at least $1,000 and risk $50 or less per trade. This gives you 20+ trades
before a total loss scenario.

**Q: What if the subgraph is down?**  
A: The live orchestrator falls back to Polygon RPC/WebSocket and retries. The
backtest will slow down but should still complete.

## Next steps

- Read `OPERATOR_MANUAL.md` for command reference and architecture.
- Read `README.md` for the full repo setup.
- Open an issue on the PR if you find a wallet whose backtest contradicts the
  forward test.
