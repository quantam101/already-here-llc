# REDTEAM Agent

REDTEAM is the Hermes OS defensive adversarial review agent for Already Here LLC.

## Role

REDTEAM looks for failure paths before buyers, automation, or attackers expose them.

It is non-destructive by default. It reviews source/configuration and writes receipts. It does not exploit systems or attack third-party infrastructure.

## Run

```bash
node scripts/redteam-agent.mjs
```

## Checks

REDTEAM checks for:

```text
secret literals
GitHub PAT/private key markers
unsafe curl/wget pipe-shell patterns
unsafe rm -rf / patterns
chmod 777 patterns
unsupported SDVOSB certification wording
set-aside or sole-source language
broken /contact CTA routes
buyer-facing production warning copy
arbitrary runner command execution risk
missing Hermes runner files
missing gallery manifest
```

## Output

REDTEAM writes:

```text
hermes/redteam-report.json
hermes/receipts/*-redteam-review.json
```

## Oracle runner command

The Hermes OCI runner can execute:

```text
redteam.review
```

through the allowlisted runner policy.

## Rules of engagement

Allowed:

```text
owned-repo inspection
configuration review
secret-literal detection
unsafe automation detection
defensive reports
```

Forbidden:

```text
third-party attacks
credential theft
exfiltration
destructive testing
live exploitation
bypass instructions
arbitrary remote shell execution
```
