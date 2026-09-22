---
name: testing-polymarket-tracker
description: How to safely smoke-test the runtime/polymarket Python agent, the Next.js /api/polymarket-tracker/* endpoints, and the public landing/dashboard/support pages for already-here-llc.
---

# Polymarket Smart Wallet Tracker — Testing Notes

## Devin Secrets Needed
- None for alert-only smoke testing. Do **not** enable live execution or real Telegram/RPC secrets.

## Environment
- The Next.js commands need Node 22:
  ```bash
  export PATH=/home/ubuntu/.nvm/versions/node/v22.12.0/bin:$PATH
  ```
- Python packages are in `requirements.txt`. If `websocket-client` is missing, run:
  ```bash
  pip install -r requirements.txt
  ```

## Python runtime smoke
- The orchestrator file uses package-relative imports, so run it as a module:
  ```bash
  # This works
  POLYGON_HTTP_URLS= POLYGON_WS_URL= \
    timeout --preserve-status --signal=INT 6 \
    python -m runtime.polymarket.orchestrator

  # This does NOT work (ImportError on relative imports)
  python runtime/polymarket/orchestrator.py
  ```
- The orchestrator should start, print `Polymarket orchestrator started`, log its status JSON, and shut down cleanly after `SIGINT`.
- With `POLYGON_WS_URL` and `POLYGON_HTTP_URLS` empty, the listener sleeps and makes no network calls.

## Telegram alert mock
- Instantiate `TelegramAlertEngine` with an empty `telegram_bot_token` and an in-memory `StateManager`; `ready` should be `False`.

## Next.js status endpoint
- Start the dev server with the Node 22 PATH and a test status secret:
  ```bash
  WATCHED_WALLETS=0xabc... POLYMARKET_STATUS_SECRET=devtest npm run dev
  ```
- Public request must not expose `watchedWallets`, `hasTelegram`, `hasPolygon`, or `gated`.
- Authenticated request with `?token=devtest` must include `watchedWallets`, `hasTelegram`, `hasPolygon`, and `gated: false`.
- The response is JSON; use `curl -s | python -m json.tool` or open it in a browser.

## Commercial package UI and APIs
- Start the dev server with both status and dashboard secrets:
  ```bash
  export PATH=/home/ubuntu/.nvm/versions/node/v22.12.0/bin:$PATH
  POLYMARKET_STATUS_SECRET=devtest POLYMARKET_DASHBOARD_SECRET=devtest npm run dev
  ```
- `/polymarket-tracker` is the public landing page (static).
- `/polymarket-tracker/support` contains `<PolymarketSupportForm />` and POSTs to `/api/polymarket-tracker/support`.
- `/dashboard/polymarket-tracker` is token-gated by `POLYMARKET_DASHBOARD_SECRET` via the `token` query parameter; when authorized it fetches the status endpoint and renders a subscriber dashboard with billing/backtest links.
- `/polymarket-tracker/terms` and `/polymarket-tracker/privacy` are static legal pages.
- `/api/polymarket-tracker/checkout` and `/api/polymarket-tracker/portal` require `STRIPE_SECRET_KEY`; without it they return HTTP 503 with a clear message.
- The support ticket endpoint writes JSON lines to `data/polymarket-support-tickets.jsonl`.

## Forward test harness
- Run `python runtime/polymarket/forward_test.py --wallets <addr> --train-start ... --train-end ... --test-start ... --test-end ...`.
- The script fetches Goldsky OrderFilled events and Polymarket closed-market settlements, then runs a walk-forward backtest.
- If the wallet does not meet `--min-profit`, `--min-win-rate`, and `--min-sharpe` thresholds in the train window, `qualified_train_wallets` will be empty and `test_trades` will be 0. This is still a valid run.
- Keep the first run short by using a narrow test window, or lower thresholds to verify trade generation.

## Live execution guardrail
- `POLYMARKET_LIVE_EXECUTION` must stay unset or `false`. The risk guard returns `live_execution: false` by default and the status route hard-codes `liveExecution: false` / `mode: "alert-only"`.
