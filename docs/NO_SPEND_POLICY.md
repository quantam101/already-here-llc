# No-Spend Policy

GMAOS runs in strict zero-spend mode by default.

Blocked by default:

- paid API calls
- paid cloud resources
- paid SaaS tasks
- paid email/SMS
- paid storage expansion
- paid compute expansion
- purchases
- subscriptions

Any cost requires explicit human approval and budget configuration.

## Global enforcement and reproducibility

This is the default across **all tenants, jurisdictions, agents and revenue lanes**. Do not interpret available credits, a free signup, or a connected app as a guarantee that a future request cannot create a bill.

- Default monthly mandatory SaaS subscription and external API budget is **USD 0**; no automatic top-ups or paid-tier upgrades.
- Enforce real provider ceilings and fail-closed behavior before authorizing a free-tier service. A configuration file alone is not a runtime cap.
- Every application must have a reproducible source build, a vendor-neutral data export, provider-independent adapters, an offline/local mode where feasible, and a tested rollback path.
- Any quote, invoice charge, transaction fee, hardware cost, domain renewal, bandwidth, taxes or infrastructure outside this software budget remains a separate, explicit, auditable expense requiring review.
- A social, email or payment integration needing owner OAuth permissions is **not active** until independently connected and verified. Never fabricate a successful connection.
- The reusable standard and release checklist are in [Enterprise Portable Zero-Spend Standard](ENTERPRISE_PORTABLE_ZERO_SPEND_STANDARD.md).
