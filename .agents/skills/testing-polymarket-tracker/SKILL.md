---
name: testing-polymarket-tracker
description: How to safely smoke-test the runtime/polymarket Python agent and the Next.js /api/polymarket-tracker/status endpoint for already-here-llc.
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

## Live execution guardrail
- `POLYMARKET_LIVE_EXECUTION` must stay unset or `false`. The risk guard returns `live_execution: false` by default and the status route hard-codes `liveExecution: false` / `mode: "alert-only"`.
