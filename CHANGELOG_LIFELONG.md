# Lifelong Catch and Correct Changelog

## 2026-06-14

### Added

- Added public-safe mobile mechanic / on-site vehicle service intake backup under `ops/mobile-mechanic-intake/2026-06-14`.
- Added editable vehicle intake source, field workflow, active task inventory summary, backup manifest, and PDF base64 restore artifact.
- Added work-capture-first operating sequence for mechanic/fleet and cleanout overflow prospects.

### Safety notes

- Backup excludes private operating details and keeps outreach, job acceptance, payments, and production changes approval-gated.
- Public repo backup stores the generated PDF as base64 text and checksum-tracks larger generated workbook/preview artifacts without adding unnecessary binary bloat.

## 2026-05-29

### Added

- Added isolated Local Revenue Radar / Lead Network Exchange module under `ops/local-revenue-radar`.
- Added procurement, medical courier, hotshot, field-service, referral, scoring, ingestion, RSS, CRM export, analytics, README, and example lead artifacts.
- Added `test:local-revenue-radar` and wired it into `npm test` to validate module imports and core lead workflow behavior.

### Safety notes

- Radar module does not modify live website routes, submit bids, contact third parties, scrape Facebook/Nextdoor, or embed static API keys.
- Restricted sources require manual intake or authorized APIs, and referral export requires consent/source-term review before operational use.

## 2026-05-13

### Added

- Added SEO route audit to verify public page discoverability and operational route noindex controls.
- Added CI failure classifier for common lint, dependency, Next build, and runtime-offline failure patterns.
- Added narrow lint repair helper for known unused import failures.
- Added quality gate runner that executes lint, typecheck, build, tests, content guard, and SEO audit.
- Wired content guard, SEO audit, and quality gate into GitHub Actions CI.
- Added documentation for the quality-agent layer and safe promotion process.

### Failure classes now covered

- ESLint unused imports and variables.
- Deprecated ESLint CLI flag usage with flat config.
- Next App Router async params type mismatches.
- package-lock/package.json sync failures.
- Duplicate or incompatible Next build-time lint wrappers.
- Oracle runtime offline / connection-refused states.

### Operating rule

Automated checks may block production, but they must not fabricate revenue, claim posting success, or push unsafe production changes without validation.
