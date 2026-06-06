# Revenue Fusion OS

Revenue Fusion OS makes Local Revenue Radar and Revenue Growth OS operate as one pipeline.

## Unified decision

Local Revenue Radar handles intake, validation, scoring, routing, and opportunity classification.

Revenue Growth OS handles conversion: CRM records, proposals, campaigns, follow-up assets, dashboards, and review packets.

## Flow

```text
Lead source -> Radar score -> Fusion event -> Parallel agents -> CRM / proposal / campaign / analytics -> Human approval
```

## Core agents

- Intake Agent
- Scoring Agent
- CRM Agent
- Proposal Agent
- Campaign Agent
- Analytics Agent
- Risk Agent

## Offline-first behavior

Core workflows do not require an external AI provider. When server access, API access, or AI capacity is unavailable, the system uses deterministic local rules, local queueing, and exportable records.

## Guardrails

- Human approval before outbound contact.
- Human approval before bids or quotes are submitted.
- No client-side secret storage.
- No unsupported claims.
- Every output keeps a source lead ID and timestamp.

## Files

- `fusion-contract.json`
- `failover-policy.json`
- `orchestrator.js`
- `RUNBOOK.md`
- `samples/fusion-sample-lead.json`
