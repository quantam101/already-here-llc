# Daily Command Super AI Orchestrator Integration

Generated: 2026-06-17

## Status

Daily Command now acts as the operator command shell. The Super AI Orchestrator acts as the controlled runtime beneath it.

## Files

- `lib/daily-command-super-ai.ts`
- `lib/daily-command-core.ts`
- `app/api/daily-command/super-ai/route.ts`
- `app/daily-command/page.tsx`
- `tests/daily-command-super-ai.test.mjs`
- `daily-command/schema/daily-command-super-ai-operation.schema.json`

## Control model

The Super AI routes work. Each agent performs one operation only.

| Agent | Operation |
|---|---|
| `agent_daily_command_ingest` | `ingest_daily_command_item` |
| `agent_daily_command_rank` | `rank_daily_command_item` |
| `agent_daily_command_summary` | `summarize_daily_command_queue` |
| `agent_daily_command_snapshot` | `render_daily_command_snapshot` |
| `agent_daily_command_security_gate` | `evaluate_daily_command_security_gate` |

## Runtime flow

```text
Daily Command prompt
  -> ingest
  -> rank
  -> summarize
  -> render snapshot
  -> owner approval gate
```

## Safety boundary

Restricted external actions stay blocked until owner approval. This integration stores no live third-party secrets and does not execute outside transactions by itself.

## API

Daily Command response endpoint:

```text
POST /api/daily-command
```

Dedicated Super AI endpoint:

```text
GET /api/daily-command/super-ai
POST /api/daily-command/super-ai
```

Smoke test path:

```text
/api/daily-command/super-ai?operation=summarize_daily_command_queue&prompt=urgent%20same-day%20dispatch%20revenue%20opportunity%20by%20noon%20%24500&estimatedValue=500
```

## Test

```bash
npm run test:daily-command
npm run typecheck
npm run build
```
