---
name: testing-already-here-llc
description: Test the already-here-llc Next.js + Python GMAOS site end-to-end. Use when verifying UI changes, runtime refactors, or content guard compliance.
---

## Quality Gate (Shell Tests)

Run all checks from repo root:

```bash
npx eslint .                           # ESLint
npx tsc --noEmit                       # TypeScript typecheck
npm run build                          # Next.js build
node scripts/a-plus-content-guard.mjs  # Content guard (must show 0 findings)
python -m pytest tests/ -v             # Python runtime tests
```

All must exit 0 with no errors.

## Content Guard

- The content guard (`scripts/a-plus-content-guard.mjs`) scans for forbidden SDVOSB language patterns
- `skipFiles` in the script excludes meta files (agent defs, scripts, docs) from scanning
- If content guard fails, check for: "SDVOSB-certified", "set-aside", "sole-source" in buyer-facing content
- Use "SDVOSB Eligible" or "Certification Pursuit In Progress" instead
- There may be pre-existing content guard failures on `main` in `daily-command/` files — verify against base branch before blaming your PR

## Browser Testing

Use the Vercel preview URL from the PR (check `git_view_pr` comments for the URL).

Key pages to verify:
1. `/blog/<slug>` — Markdown rendered as HTML (h2 tags in DOM, no literal `##` text)
2. `/blog` — Blog listing with titles, excerpts, categories
3. `/` — Homepage with branding, nav, trust bar, service cards
4. `/capability-statement` — Must show "Certification Pursuit In Progress", NOT "SDVOSB Certified"
5. `/dispatch` — Dispatch form with all fields
6. `/command-center/agents` — GMAOS scaffold JSON renders

## Blog Markdown Rendering

- Blog posts use `remark` + `remark-html` for server-side markdown-to-HTML conversion
- The `prose` Tailwind class with `text-sm` makes h2 headings render at body text size — this is a styling choice, not a bug
- To verify h2 tags: use `curl` on the page URL and search for `<h2>` in the response
- The `sanitize: true` option on remark-html strips unsafe HTML (script tags, etc.)

## Python Runtime

- `runtime/health_server.py` is the K8s container entrypoint (not `sovereign_core.py`)
- Verify imports: `python -c "from runtime.health_server import HealthHandler, main; print('ok')"`
- The health server exposes `/healthz`, `/readyz`, `/metrics` on port 8080

## MCP Trading Engine (`runtime/mcp_trading_engine.py`)

The MCP trading engine is a FastAPI-based Streamable HTTP MCP Server. To test it:

### Dependencies
```bash
pip install fastapi httpx[http2] uvicorn numpy
```

### Starting the Server
```bash
# Without auth (dev mode)
python -m uvicorn runtime.mcp_trading_engine:app --host 127.0.0.1 --port 8000

# With auth enabled
MCP_API_KEY=your-key python -m uvicorn runtime.mcp_trading_engine:app --host 127.0.0.1 --port 8000
```

### Endpoint Testing
```bash
# Health check
curl http://127.0.0.1:8000/healthz
# Expected: {"status":"ok","engine":"mcp-trading"}

# Readiness
curl http://127.0.0.1:8000/readyz
# Expected: {"status":"ready","circuit_breaker":"closed","open_positions":0,"drawdown_today":"0.00"}

# Tool listing (POST per MCP spec, also GET for backward compat)
curl -X POST http://127.0.0.1:8000/tools/list

# Trade evaluation (RSI oversold = triggers trade attempt)
curl -X POST http://127.0.0.1:8000/tools/call -H "Content-Type: application/json" \
  -d '{"id":1,"params":{"arguments":{"symbol":"AAPL","rsi_14":30,"orderbook_bids":[[150,100]],"orderbook_asks":[[151,50]]}}}'
# Expected: HTTP 502 (broker unreachable in test env) — proves risk check passed

# No-signal rejection (RSI normal, balanced book)
curl -X POST http://127.0.0.1:8000/tools/call -H "Content-Type: application/json" \
  -d '{"id":2,"params":{"arguments":{"symbol":"TSLA","rsi_14":55,"orderbook_bids":[[200,10]],"orderbook_asks":[[201,10]]}}}'
# Expected: HTTP 200, status=REJECTED
```

### Key Validation Tests
- Missing symbol → HTTP 400, code -32602
- Empty orderbook → HTTP 400, "non-empty" message
- Zero volume bids/asks → HTTP 400, "zero" message (guards against ZeroDivisionError)
- Auth without header when MCP_API_KEY set → HTTP 401

### Audit Log
Trade decisions are logged to `data/trade_audit.jsonl` (NDJSON). Events: `trade_executed`, `trade_rejected`, `broker_error`, `circuit_breaker_open`.

### Env Vars
| Variable | Default | Description |
|---|---|---|
| `MCP_API_KEY` | (empty = no auth) | Bearer token for request auth |
| `MCP_RH_GATEWAY_URL` | `https://agent.robinhood.com/mcp/trading` | Robinhood MCP endpoint |
| `MCP_ACCOUNT_BALANCE` | `5000.00` | Initial account balance |
| `MCP_MAX_DAILY_DRAWDOWN` | `150.00` | Daily drawdown limit |
| `MCP_MAX_TRADE_VALUE` | `500.00` | Per-trade capital ceiling |
| `MCP_AUDIT_LOG` | `./data/trade_audit.jsonl` | Audit log path |
| `MCP_ENGINE_PORT` | `8000` | Server port |

## Common Gotchas

- The favicon might return 404 on Vercel preview — this is pre-existing and unrelated to code changes
- The `validate` CI check may fail if content guard finds violations — fix the content, not the script
- `next-env.d.ts` is auto-generated — exclude it from ESLint via `eslint.config.mjs`
- K8s manifests reference images that don't exist yet (`ghcr.io/quantam101/already-here-llc-web:latest`) — these are scaffolds
- The MCP trading engine requires `httpx[http2]` (not just `httpx`) for the HTTP/2 connection pool — `pip install httpx` alone will cause an ImportError at startup
- When testing trades, the Robinhood gateway is unreachable in test environments — HTTP 502 with "Robinhood link exception" is the CORRECT behavior proving the trade passed risk checks

## Dependencies

- Node.js packages: `npm install` (includes zod, remark, remark-html)
- Python packages: `pip install pyyaml pytest numpy`
- MCP engine additional: `pip install fastapi httpx[http2] uvicorn`
