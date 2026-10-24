# Enterprise Portable Zero-Spend Standard

Status: **enforceable reference configuration and automated validation**, not a claim that every third-party deployment is currently self-hosted, cost-free, licensed worldwide, or fully certified.

Owner: Already Here LLC. Applies to future field-operations, dispatch, MSP, cabling, content, AI-agent and lead-generation products.

## Mission

Build once, reproduce anywhere, adapt to each business, and retain the ability to operate without mandatory paid subscriptions. An installed copy must be possible to recreate from version-controlled source code, deployment instructions, a versioned configuration and documented data export. No automation should silently incur a fee, purchase credits, enlarge infrastructure, send billable messages, or approve charges.

**$0 new mandatory vendor subscription is a design target, not a promise that hardware, electricity, domain registration, paid hosting, payment-processing fees, staff labor, legal/tax compliance, or every country's telecom regulations cost $0.** A paid action is explicitly blocked by default. The owner must separately approve any change to this policy; commercial payment processing continues to have its normal real transaction fees.

This standard **extends** the existing [No-Spend Policy](NO_SPEND_POLICY.md), [Global Enterprise ASIOS architecture](GLOBAL_ENTERPRISE_ASIOS_ARCHITECTURE.md), and Python runtime guard in \`runtime/cost_guard.py\`. It does not replace them.

## Six universal constraints

1. **Portability:** no domain, provider, geographic scope, model name or business brand compiled into the reusable kernel. Put each market's \`country\`, \`region\`, \`locale\`, \`timeZone\`, \`currency\`, \`publicOrigin\`, routes and selected channel adapters in a validated deployment profile.
2. **Ownership and exports:** keep lead, contact, consent, dispatch, quote, payment-reference and audit records in an owner-controlled store; support structured JSON/CSV exports and backups. Never include credentials in export bundles. Host-dependent credentials are reauthorized after restoration.
3. **No-spend fail-closed:** the global default is a $0 recurring-subscription ceiling, no paid adapters and no automatic paid overages. A free-tier connector **must also have a real, tested, server-enforced quota circuit breaker** before use in a zero-spend installation. Declaring a quota in JSON does not implement a circuit breaker.
4. **Human approval:** external publication, unsolicited outbound messages, quote acceptance, contract signatures, invoice creation and payments are separated into permissioned steps. Invoice fees/taxes may be real expenses, and no payment is placed without explicit authorization.
5. **Consent and compliance:** capture source/time/version of marketing consent, per-channel scope, suppression and unsubscribe signals. Never assume that email consent authorizes DMs, SMS or phone marketing. Local laws, licenses, permits, data retention and international transfers require market-specific review.
6. **Observable reproducibility:** reproducible installation, tests, deployment evidence, health checks, rollback, failure recovery, migration, and data export must be documented and independently repeatable. Enterprise security is an acceptance requirement, not an unearned certification.

## Standard modules and replaceable adapters

| Capability | Required portable behavior | Default vendor-independent mode |
| --- | --- | --- |
| Web/landing | Server-side or static, relative routes, HTTPS in production | Self-host existing Next.js app with Node.js |
| Lead ingestion | Validation, duplicate control, idempotent lead IDs | Local endpoint + owned SQLite/remote durable store |
| Outreach | Traceable subscription and suppression | Human-reviewed email from existing mailbox |
| Social | Owned identities, opt-in triggers, Meta time-window policies | Manual posting; opt-in platform-specific DM after authorized connection |
| Scheduling | Market time zone, local date & time, no inferred booking | Native HTML date/time and an owner-controlled calendar |
| Quotes | Approval, price/fee/tax reconciliation and signed scope | PDF/JSON quote drafts; never automatic authorization |
| Payment | Provider-independent invoice/payment references | No automated charge or hidden processor requirement |
| AI | Deterministic rules first, local models optionally | Local CPU; external inference adapter disabled |
| Storage/backup | Backup/restore/export with tenant isolation | SQLite WAL or other operator-managed durable database |
| Audit | Event proofs, provenance and exceptions | Append-only auditable local records |

**Commercial production parity:** the live website currently uses Vercel, Resend and its configured durable storage. Those are deployed adapters, **not** evidence that the fully self-hosted replacements have been migrated or qualified. Confirm each provider's actual billing plan and quotas before calling current production $0. The domain is a continuing external cost unless already paid or donated. Preserve working production until a replacement passes equivalence tests.

## Campaign portability contract

- Source: \`lib/portable-campaign.ts\`.
- Reference deployment: \`config/campaigns/phoenix-cabling.reference.json\`.
- Gate: \`node --experimental-strip-types tests/portable-campaign.test.mjs\`.
- Profile roles: tenant identity, market localization, relative routes, strict no-spend policy, provider-independent adapter declarations.
- Each named adapter must be implemented and tested for the target operator. The supplied JSON is a **reference profile**, **not** a new live wiring, usage cap, or provider billing setting.
- To reproduce for another locale, copy the profile and change tenant/campaign identifiers, brand, market data, origin, routes and operator-owned adapters. Validate before any deploy; do not copy private credentials, consent or lead records between tenants.
- Translation and accessibility checks, tax rates, privacy notices, telecom policies, currency formatting, data residency and appropriate country-specific legal requirements remain per-market release gates.

## Reproduction procedure

1. Clone the owned Git repository at a pinned release commit and review \`package.json\`, \`package-lock.json\`, \`.env.example\` and the relevant Docker/OCI manifests.
2. Copy a tenant-specific campaign profile; run the portability contract suite. Do **not** enable optional cloud providers just to satisfy a deployment check.
3. Install with a supported Node runtime using the repo lockfile, then execute lint, typecheck, test and build gates. Current project uses Next.js and Node 24.x on production.
4. Create runtime secrets in local secret storage or the deployment host; never embed tokens in a frontend bundle, README, PDF, workflow YAML, or export.
5. Bring up local self-hosted durable storage (or another owned supported backend), verify persistence across process restart, migration rollback, backup/restore and cross-tenant isolation.
6. Configure domain/TLS, outgoing email/SPF/DKIM/DMARC, social OAuth, rate limiting, cancellation/retry handling, and consent as **separate bounded adapters**. Use simulated messages before any external contact.
7. Execute a synthetic lead -> acknowledgment -> persisted record -> owner notice -> opt-in -> RFQ -> authorized quote -> invoice/payment-reference reconciliation exercise, keeping all synthetic amounts and real money isolated.
8. Verify no unexpected billable calls, no service upgrade, and no free-tier overage. Document provider usage with a real usage report and tested emergency stop.
9. Retain versioned release manifest (source commit, dependencies, profile hash, migrations, sample tests), export schema and recovery instructions.
10. Activate only after the marketplace's user authorizes connector scopes and the market-specific legal/security requirements are met.

## Deployment environments

- **Developer workstation:** localhost HTTP, SQLite data, mock email/Meta, no customer access; lowest external dependency.
- **Owned/managed machine:** Next.js under Node process manager, Caddy/HTTPS, SQLite/remote durable storage, operator-owned DNS. Hosting, power, backups, IP, security operations and internet are real prerequisites.
- **Cloud free allowance:** allowed only within provider published limits, commercial-use policy, hard usage caps and service availability. No automatic conversion to paid tier.
- **Current production:** may retain Vercel/Resend while compliant and within separately verified allowances. Never re-point public DNS without a working substitute, backup and tested rollback.

## Enterprise release blockers

A generic campaign profile passing validation does **not** prove:
- all runtime provider actions enforce caps;
- Meta, ManyChat or another social connector is authenticated;
- messaging templates satisfy laws in a new jurisdiction;
- physical device/browser date-picker acceptance has been performed;
- durable multi-tenant row-level isolation or deletion/retention rights;
- subscription/license availability and commercial-use authorization;
- recovery under sustained load or verified disaster recovery;
- actual approved quotes, paid invoices or earned revenue.

Do not describe any of these as live until independent evidence exists. Operational failures fail closed and escalate to an operator rather than charging a card, fabricating customer activity or silently dropping leads.

## Acceptance tests for new products

Every reusable service must prove:
\`INSTALL\` (fresh checkout) -> \`CONFIGURE\` (all settings outside code) -> \`RUN\` (non-paid defaults) -> \`REPLAY\` (idempotent) -> \`RECOVER\` (restore records) -> \`EXPORT\` (portable copy) -> \`MIGRATE\` (second supported host) -> \`SECURE\` (consent/auth/rate limits) -> \`MEASURE\` (provider fees and revenue independently).

The owner retains approval over any costs, credentials, market launch, contacts and commercial obligations.
