# Owned Data Core v1

## Purpose

Owned Data Core v1 is the persistent business asset layer for Already Here LLC. It centralizes organizations, contacts, leads, opportunities, AI recommendations, approvals, dispatches, revenue attribution, AutoWorks records, hauling jobs, procurement opportunities, products, documents, analytics events, and system-health history.

## Current branch scope

- PostgreSQL migration `001_owned_data_core.sql`
- PostgreSQL migration `002_owned_data_modules.sql`
- Zod domain contracts in `lib/owned-data/contracts.ts`
- Repository boundary in `lib/owned-data/repository.ts`
- Contract tests in `tests/owned-data-contracts.test.mjs`
- Main test-chain integration through `test:owned-data`

## Approval boundary

This branch does not deploy, migrate production data, change credentials, or enable automatic outbound execution. AI actions remain recommendations until a `review_actions` record records an allowed owner decision.

## Production rollout gates

1. Select and configure the PostgreSQL provider.
2. Run both migrations against an isolated preview database.
3. Verify schema rollback and backup procedures.
4. Implement the concrete `SqlExecutor` adapter.
5. Add repository integration tests against preview PostgreSQL.
6. Connect dispatch intake in shadow-write mode.
7. Compare JSON/runtime records with database records.
8. Enable database reads only after parity is verified.
9. Complete security review for RBAC, encryption, secrets, rate limiting, and audit retention.
10. Merge and deploy only after explicit owner approval.

## Revenue dependency order

1. Lead and organization persistence
2. AI review queue
3. Opportunity lifecycle
4. Dispatch and route stacking
5. Revenue events and dashboard aggregates
6. Procurement
7. AutoWorks
8. Hauling
9. Products and affiliates
10. Analytics and reusable proof-of-work
