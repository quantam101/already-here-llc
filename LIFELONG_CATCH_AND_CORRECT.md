# Lifelong Catch and Correct

This repository now includes a lightweight quality-agent layer that catches recurring CI, SEO, content, and deployment-readiness failures before they reach production.

## What is implemented

- `scripts/seo-route-audit.mjs` checks public route discoverability, sitemap coverage, footer internal links, and private operational route noindex controls.
- `scripts/ci-failure-classifier.mjs` classifies common CI and runtime failure logs into repair categories.
- `scripts/auto-lint-repair.mjs` provides a narrow, safe lint repair helper for known unused-import patterns.
- `scripts/quality-gate.mjs` runs the full local validation gate and writes receipts under `hermes/receipts`.
- `.github/workflows/ci.yml` runs lint, typecheck, build, tests, content guard, SEO audit, and the quality gate.

## What it deliberately does not do

- It does not blindly push to production.
- It does not fabricate ProfitEngine revenue, posts, or uptime.
- It does not execute Oracle VM commands without host access.
- It does not commit secrets or `.env` files.

## Safe correction flow

1. Detect failure through CI, Vercel, or smoke checks.
2. Classify the root cause.
3. Apply the narrowest repair on a branch.
4. Re-run lint, typecheck, build, test, content guard, SEO audit, and quality gate.
5. Promote only when validation is green.
6. Record the failure class and fix in the changelog.

## Common commands

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run qa:content
npm run qa:seo
npm run qa:gate
```

Classify a copied CI log:

```bash
node scripts/ci-failure-classifier.mjs ./ci-error.log
```

Try the narrow unused-import repair helper:

```bash
node scripts/auto-lint-repair.mjs scripts/a-plus-content-guard.mjs --dry-run
```

## Oracle boundary

The Vercel status surface can report ProfitEngine runtime state. It cannot restart the Oracle host. Oracle repair still requires SSH, OCI, or a remote command runner.
