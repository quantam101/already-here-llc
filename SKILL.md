# Already Here LLC Runtime Skill Notes

## Finnhub WebSocket paper/shadow testing

Purpose: validate live-market data ingestion for paper/shadow trading proof-of-work without enabling live-money execution.

### Primary source order

```text
Finnhub WebSocket -> Finnhub REST quote -> Yahoo fallback
```

### Required secret handling

- Store `FINNHUB_API_KEY` only as a local environment variable, GitHub Actions secret, OCI environment variable, or hosting secret.
- Never commit the key to source control.
- Never paste the key into logs, issues, PR comments, or chat transcripts.

### Valid Finnhub WebSocket proof markers

A run may be labeled `FINNHUB_WEBSOCKET_PAPER_SHADOW_TEST` only when logs or reports show:

```text
source="finnhub_ws"
WebSocket connected
trades_received > 0
symbols_with_data > 0
paper_trader using FinnhubRealtimeFeed
live_order_execution=false
```

### Non-valid proof labels

Do not label a run as Finnhub WebSocket proof when it used:

- one-time quote snapshots,
- Yahoo-only fallback,
- REST-only quote calls,
- synthetic data,
- cached values without a fresh WebSocket trade.

Use `LIVE_SNAPSHOT_PAPER_TEST` instead for snapshot-fed paper tests.

### Local validation commands

```bash
python -m pip install -r requirements.txt
python -m pytest tests/test_finnhub_feed.py
FINNHUB_API_KEY=local_key python runtime/paper_trader.py
```

### Deployment verification checklist

After merge and deploy, verify on OCI:

```bash
echo "$FINNHUB_API_KEY" | wc -c
python -m pytest tests/test_finnhub_feed.py
python runtime/paper_trader.py
```

Runtime logs must show `source="finnhub_ws"` and a positive trade count before any report is marketed as real-time WebSocket proof.

### Trading boundary

Finnhub integration is market-data only. It must not place Robinhood, Alpaca, or any other broker orders. Live execution remains a separate, human-approved, risk-gated system.
