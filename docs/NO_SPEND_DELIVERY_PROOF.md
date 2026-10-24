# No-Spend Delivery Proof — Closed Local SMTP Loop

This proves the **automated queue-to-local-SMTP-sink** boundary, without using a vendor mail API, cloud billing account, real recipient or external network route. It **does not prove** that a real customer mailbox will receive a message for free, that the company hosting is free, or that a provider's future quota cannot change.

## Execute

    npm ci
    npm run test:owned-outbox
    npm run test:owned-loopback-delivery

The second test runs an owned SMTP sink bound strictly to `127.0.0.1` on a randomly assigned unprivileged local port. It creates only synthetic contacts. Its outbound transport:

- **Hardcodes the destination socket host** to `127.0.0.1`.
- **Hardcodes SMTP recipient and sender** to `proof@localhost.invalid`.
- Will not take a remote host, MX address, provider API token or customer SMTP recipient.
- Requires human approval of each queued message before a due runner may reserve and send.
- Reserves one daily **and** monthly quota token atomically in SQLite, in the same transaction as a unique delivery-attempt reservation.
- Can never automatically resend a reserved/uncertain message after process interruption. Reconciliation is manual rather than risk duplicate external effects.
- Writes proof and audit events only upon local SMTP acceptance; SMTP acceptance is *not* proof of inbox placement.
- Keeps tenants separate; checks suppression and consent at the point of delivery reservation.
- Fails closed at the configured quota; reopening with a higher maximum does not increase an existing period's allowance.
- Uses no external paid provider. There are no credit-card or payment paths in this test implementation.

Test receipt: `.tmp/owned-zero-spend-delivery-proof.json` (ignored by Git); GitHub CI logs also show an aggregate synthetic receipt without customer data.

## Scope of proof

| Evidence | Demonstrated |
| --- | --- |
| Queue persistence and restart | Yes, local SQLite |
| Human approval + consent gates | Yes |
| Scheduled release | Yes |
| TCP SMTP dialogue and DATA acceptance | Yes, **loopback receiver only** |
| Tenant-scope / suppression / idempotency | Yes |
| Atomic daily and monthly ceilings | Yes, for the local receiver |
| Recovery after ambiguous/in-flight reservation | Yes, blocks duplicate retry |
| Real email inbox arrival | **No** |
| Zero actual Vercel / Resend / cloud fees | **Not established** |
| Commercial-use rights / Meta OAuth | **Not established** |
| Production-ready automatic business SMTP | **Not established** |

## Required before sending real prospect mail

Choose and explicitly authorize an existing business-mailbox SMTP account or a proven free commercial-use relay; confirm its sending, storage and bandwidth terms **and billing configuration** with the provider. Implement an authenticated TLS SMTP adapter separately, preserve the durable reservation/consent/suppression/quota policy, add live bounce and complaint processing, message signing/domain authentication, delivery proof, and periodic quota reconciliation. Do not move production traffic until it has passed a controlled mailbox test using an authorized owned address and billing verification.

For multi-host installations SQLite requires one serialized writer or an external transactional reservation service; do not copy SQLite files to unrelated hosts and assume distributed reservations remain atomic. This proof is single-owned-host and reproducible; global enterprise deployment requires stronger operator authentication, encrypted backups, deployment proof and region-specific law reviews.

The latest architecture standard is at `docs/ENTERPRISE_PORTABLE_ZERO_SPEND_STANDARD.md`; the existing manual outbox runbook is `docs/OWNED_ZERO_SPEND_OUTBOX.md`.
