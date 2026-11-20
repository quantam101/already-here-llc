# Contract Desk: research and implementation decision

Reviewed November 3, 2026. Extends the existing procurement radar in Already Here LLC; does not replace the restored Procurement & Grants automation.

## Evidence and choices

| Source | Verified source facts | Decision for this build |
| --- | --- | --- |
| [GSA Opportunities API](https://open.gsa.gov/api/get-opportunities-public-api/) | Requires account API key, date window and pagination. Offset is a zero-based page index, not a record offset. Returns latest active notice version, not complete historical versions. | Use a server-side adapter and retain our own observed amendment history. Never ship shared personal API keys in a browser or ZIP. |
| [Orrery](https://github.com/chrisfulcher/orrery) | Repository declares Apache-2.0, a SQLite store, notice search, pursuits, tasks, quota and history tools. | Useful design reference for owned data, source traceability and quota accounting. Not installed, benchmarked or security-certified. |
| [GovCon Starter Harness](https://github.com/twinturbosystems/govcon-starter-harness) | MIT; author describes pipeline, compliance matrices and proposal preparation. Author explicitly notes that assistant instructions are not enforcement. | Reuse the workflow concept: requirements mapped to evidence, human submission, visible gaps. Do not treat prompts as delivery guarantees. |
| [OpenSAM](https://github.com/akshayakula/OpenSAM) | README claims MIT and AI search; also advertises mock development data and client-side key handling. | UI research only. No imported code or credentials. Do not adopt mock data or browser secret handling as production architecture; verify actual license file before copying code. |
| [Kingfisher Collect](https://github.com/open-contracting/kingfisher-collect) | BSD-3-Clause; downloads OCDS datasets and stores them on disk. | Candidate adapter for future international expansion where OCDS is actually published, not a universal scraper for U.S. portals. |
| [OCDS](https://www.open-contracting.org/data/) | Open standard follows planning, tender, award, contract and implementation with identifiers. | Future interoperability mapping; current internal notice schema is not claimed to be OCDS-compliant. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Accessibility guidance includes mobile, keyboard and assistive technology use. | Design target for focus, labels, contrast, readable text and small-screen layout. Compliance requires testing; no conformance claim yet. |

Repository descriptions and licenses above are source-reported, not independent reliability measurements. No third-party project source was copied into this implementation. Popularity is not proof of correctness.

## Existing system findings

At baseline cc34441 the category procurement source config listed SAM.gov, Arizona and Tempe. The module YAML said production_ready, but its README described manual/authorized ingestion. Configuration does not prove collection, delivery or database writes. Existing ChatGPT procurement automation was restored separately in this conversation; its new scheduled execution/delivery has not been observed.

## Implemented first increment

- Expanded approved source registry from 3 to 12 sources: SAM, Arizona, Tempe, DIBBS, PIEE, Unison, Phoenix, Maricopa, Mesa, Chandler, InstantMarkets and GovBidWatch. Registry entries do not create collectors or portal subscriptions.
- Durable SQLite notice store, material-version history and pending alert outbox inside the existing radar module. It uses its own tables/file; canonical production Revenue Command database integration is not yet established.
- Stable agency/solicitation keys across portals; observation URL/time do not create duplicate amendment alerts. Older observations cannot overwrite newer notices. Reuse of identical IDs by the same buyer across fiscal years may require an additional official procurement-cycle identifier.
- Score threshold, evidence presence, current deadlines, explicit timezone requirement, stale-data hold and explicit unknown/disqualified eligibility states.
- Pending alerts are superseded when an amendment replaces them or qualifications no longer hold. Export rechecks expiry and staleness.
- SAM adapter with finite pagination, transport timeout, sanitized errors and partial-scan health. Raw imports remain score 0 until actually qualified. This is conservative and intentionally does not present keyword similarity as bid readiness.
- Offline, responsive single-file Contract Desk: actual snapshot load, search, filters, Phoenix deadlines, source health, record export and Lifelong Catch and Correct guidance. It performs no network requests and persists no browser records. It is a snapshot viewer, not a deployed multi-user service or native mobile app.
- CLI for import, export and authorized SAM sync. No new dependency required for the module on Node 24.

## Operator use

Run from repository root on Node 24:

```sh
npm run test:contract-watch
npm run contract:watch -- import /absolute/path/notices.json
npm run contract:watch -- export /absolute/path/snapshot.json
```

Open `ops/local-revenue-radar/contract-desk.html`, then select the exported snapshot. No sample opportunities are supplied. To use SAM collection, provision SAM_API_KEY privately in the runtime and set SAM_POSTED_FROM and SAM_POSTED_TO to MM/dd/yyyy dates, then run `npm run contract:watch -- sync-sam`. Never paste the key into command arguments, client code or a report. CONTRACT_WATCH_DB optionally selects a private SQLite file; default is ignored `data/procurement/contract-watch.db`. Keep the DB and its WAL/SHM private.

Each imported record requires agency, solicitationId, title, approved sourceId, HTTPS url, dueAt and observedAt with explicit timezone, numeric score, eligibility (verified/unknown/disqualified) and evidence array. Optional status, noticeType, requirements, location, value and nextAction are retained. Caller-supplied scores and evidence require review; they are not independent verification. SAM notices without required IDs/deadlines are excluded from the actionable store; the adapter is not a full archive or award intelligence feed. Timezone-free source deadlines fail closed instead of guessing.

## Next increments and release gates

1. Reconcile canonical procurement_targets with the notice store; implement idempotent migration/import and backup recovery before pointing any hosted UI at private data.
2. Wire the restored scheduler to a verified collector and the existing owned notification transport. Add retry-safe delivery worker, acknowledgement/provider receipts, bounce handling and a controlled owner-address test. Pending outbox is never delivery proof.
3. Add compliant source-specific collectors only after verifying public API/feed or native saved-search access. Until then DIBBS/PIEE/Unison/state/local are manual/authorized intake and explicitly not checked.
4. Integrate saved organization profiles, evidence library and requirements-to-proposal workflow. Keep each organization's records and credentials isolated; public reuse must not expose Already Here's bids or client data.
5. Add authenticated, role-scoped hosted UI, actual phone/browser testing, accessibility audit, encrypted backups, private operational analytics, optional consented public analytics and audit trail. Public SEO belongs on marketing pages; bids and private desk stay noindex.
6. Validate end-to-end: official notice to durable canonical record, material amendment to one alert, provider receipt to owner, no repeat on rerun, source outage visible, restart/offline recovery, one real requirements matrix and reviewed export. Only then declare live-ready.

No claim of best-in-market, universal usability, zero setup, completed live integration, autonomous learning, delivered notifications, or profits is made by this increment. The reusable boundary is the source-independent core and offline desk; production service operation still needs secure credentials and deployment.
