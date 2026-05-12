# SOCRATES Agent

SOCRATES is the Hermes OS readiness-review agent for Already Here LLC.

## Role

SOCRATES is non-destructive by default. It reviews the build and produces a receipt before high-risk public changes.

It checks for:

```text
unsupported certification claims
set-aside or sole-source claims without proof
broken contact routes
potential secret literals in source
missing gallery manifest
missing Hermes OS files
missing OCI gallery agent files
fallback gallery state
```

## Run locally or on OCI

```bash
node scripts/socrates-agent.mjs
```

## Output

SOCRATES writes receipts to:

```text
hermes/receipts
```

Each receipt includes:

```text
grade
status
risk flags
inspected files
git status
changed files
sha256 hash
```

## Passing score

```text
85/100
```

A score below 85 means review is required before treating the build as production-clean.

## Design rule

SOCRATES can review and block. It does not rewrite public production files unless explicitly connected to an approved write mission.
