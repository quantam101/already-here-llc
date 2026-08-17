# Polymarket Tracker — Forward Test Guide

The historical backtest is useful, but it can overfit because the same wallet
that looked great in the past may not continue to win. A walk-forward test
solves this by training the wallet filter on one time window and testing it on a
later, completely separate window.

## 1. What a forward test proves

- Whether a wallet's edge persists out-of-sample.
- Whether the production filter rules (>$10k profit, >65% win, Sharpe>1) would
  have selected the same wallet in the past.
- A more honest P&L curve than an in-sample backtest.

## 2. Run a walk-forward test

Use the `runtime/polymarket/forward_test.py` CLI. Split the full dataset in half:

```bash
python runtime/polymarket/forward_test.py \
  --wallets 0x93b110ff31deb58847e841b3cbc6535b3e7b746e \
  --train-start 1771363200 \
  --train-end 1773500000 \
  --test-start 1773500000 \
  --test-end 1785634560 \
  --bankroll 1000 \
  --fixed-usd 50 \
  --min-profit 10000 \
  --min-win-rate 65 \
  --min-sharpe 1
```

The script will:
1. Fetch all fills from `--train-start` to `--test-end`.
2. Profile the wallet on the training window.
3. Copy BUY fills from the wallet during the test window if it qualified.
4. Compute win-rate, P&L, drawdown, and ROI using closed-market settlements.

## 3. How to interpret the result

| Metric | Healthy signal | Warning signal |
|--------|----------------|----------------|
| Win rate | > 60% | < 50% |
| Profit factor | > 1.5 | < 1.0 |
| Max drawdown | < 20% | > 40% |
| Test P&L | Positive | Negative or flat |

If the test window P&L is negative, the wallet's edge did not persist. Do not
add it to the live watchlist.

## 4. Paper trading before live execution

A forward test is still historical. Before real money, run the orchestrator in
alert-only mode and paper-trade every alert for 2-4 weeks:

1. Set `POLYMARKET_LIVE_EXECUTION=false`.
2. Record the alerted entry price, token, and side in a spreadsheet.
3. When the market closes, record the settlement price.
4. Compute fixed-$50 P&L for each paper trade.
5. Compare the live forward win-rate to the backtest and walk-forward win-rates.

Only enable live execution if the forward win-rate is within 10% of the
historical win-rate and the drawdown is acceptable.

## 5. Common mistakes

- **Training and testing on the same data.** This is the in-sample backtest,
  not a forward test.
- **Using too short a training window.** You need at least 30 days and 30+
  closed trades to get a stable wallet score.
- **Ignoring fees and spread.** The backtest uses settlement prices. Live
  execution will have slippage, spread, and Polymarket fees that reduce returns.
- **Over-tuning filters.** If you change the filter until the test window looks
  good, you have re-introduced overfitting.

## 6. Next step

If the walk-forward and paper-trade results are acceptable, read
`LIVE_EXECUTION.md` for the opt-in live trading checklist.
