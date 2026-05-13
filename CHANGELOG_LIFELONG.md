# Lifelong Catch and Correct Changelog

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
