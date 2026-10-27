# Owned Zero-Spend Outbox — Self-Hosted Campaign Fallback

**Status:** Executable, provider-independent local outbox with a manual delivery boundary. This does not replace production Resend, connect Meta, or promise unlimited free email.

## Proven design properties

- Node built-in SQLite, WAL and no additional npm/SaaS dependency.
- Durable tenant-scoped records and tenant + dedupe-key idempotency across restart.
- Marketing drafts rejected without explicit timestamped consent and source.
- Every draft requires operator approval, respects UTC scheduled dates, and can be suppressed before delivery.
- Human-supplied delivery evidence and an append-only application audit for state transitions.
- Tenant-scoped JSON export for migrations. Protect exports because they contain contact records.
- The module contains NO automatic sender, network API, credit purchase, scheduler or paid provider adapter.

This is a secure-by-default local component, not a complete authenticated public multitenant SaaS. Production authorization, encryption at rest, cross-tenant access rules, retention/deletion, and disaster recovery require additional testing and deployment controls.

## Installation and verification

Use a Node.js runtime with built-in SQLite support. On Node 22, enable the experimental flag.

    npm ci
    node --experimental-sqlite tests/owned-zero-spend-outbox.test.mjs

No vendor token is required. The CLI file database defaults to ./data/owned-outbox.sqlite (already excluded by the repository .gitignore).

## Enqueue a local draft

Create a private JSON file, e.g. /tmp/owned-outbox-input.json, with:

    {
      "tenant": "already-here-llc",
      "campaign": "commercial-cabling",
      "dedupeKey": "internal-proof-001",
      "recipient": "operator@example.org",
      "kind": "transactional",
      "subject": "Internal delivery test",
      "body": "A test draft; not customer outreach.",
      "scheduledAt": "2026-10-24T21:00:00.000Z"
    }

For a marketing draft, also add consent evidence:

    "consent": {
      "granted": true,
      "source": "website-checkbox",
      "at": "2026-10-24T20:00:00.000Z"
    }

Only supply a consent record if it actually exists. Run:

    node --experimental-sqlite scripts/owned-outbox-cli.mjs enqueue --file /tmp/owned-outbox-input.json
    node --experimental-sqlite scripts/owned-outbox-cli.mjs pending --tenant already-here-llc
    node --experimental-sqlite scripts/owned-outbox-cli.mjs approve --tenant already-here-llc --id ACTUAL_ID --operator reviewer

The operator manually sends the approved, due message using an authorized company mailbox. **Only after independent confirmation that it was actually sent**, record evidence:

    node --experimental-sqlite scripts/owned-outbox-cli.mjs sent --tenant already-here-llc --id ACTUAL_ID --proof SENT_ITEM_REFERENCE

Suppress future messages, including already approved but unsent ones:

    node --experimental-sqlite scripts/owned-outbox-cli.mjs suppress --tenant already-here-llc --email operator@example.org --reason unsubscribe

Tenant-scoped export:

    node --experimental-sqlite scripts/owned-outbox-cli.mjs export --tenant already-here-llc --file /secure-location/new-export.json

Exports require a new path, do not overwrite and use restrictive file mode where supported. Apply storage encryption and operator-level file permissions. For live SQLite WAL backups, use a consistent SQLite backup API or stop writers; copying only the main database file while active is unsafe.

## Provider and automation migration gates

| Adapter | Readiness |
| --- | --- |
| Owned manual SQLite outbox | Implemented with contract tests |
| Existing production Resend and Vercel | Remains unchanged |
| Owned automatic SMTP delivery | Not implemented |
| Meta/Instagram/ManyChat automatic comments and DMs | Not authenticated or implemented here |

Before enabling fully automated delivery, add and test: a durable atomic per-provider quota reservation, strict stop before paid overage, idempotent delivery with safe retry, verified consent and live suppression checks, bounce/complaint processing, receiver identities, tenant permissions, and a documented commercial-use plan. Fail closed if limits or billing status cannot be established. An in-memory count is not suitable for distributed/serverless delivery.

Configuration remains per tenant and market. For local project dates, convert the user's verified IANA time zone to a UTC instant before enqueue. No user content, credentials, or records should be copied to another tenant.

**Reproducibility is established for the local queue and proof tests only; a full zero-cost globally commercial production replacement still requires the above integration and compliance gates.**
