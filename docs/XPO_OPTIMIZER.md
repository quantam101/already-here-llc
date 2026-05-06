# AI-Powered XPO Optimizer

## Purpose

The XPO Optimizer is the execution-performance optimization layer for Already Here LLC. It converts operating signals into ranked, risk-adjusted actions for field work, dispatch intake, procurement, billing, website health, and operational controls.

XPO means Execution Performance Optimization in this repository.

## Core outcomes

- Detect revenue-producing work and hard deadlines.
- Rank actions by revenue impact, access risk, time sensitivity, and execution complexity.
- Separate signal from noise.
- Produce a daily executive operating queue.
- Preserve approval boundaries for sensitive actions.

## Non-negotiable controls

The optimizer may recommend actions, but it must not perform restricted actions without explicit owner approval.

Restricted actions:

- Send emails.
- Delete emails.
- Submit bids, certifications, or forms.
- Move money.
- Change credentials, MFA, tokens, or API keys.
- Modify production files.
- Accept or decline marketplace work.
- Merge pull requests.

## Input channels

Current expected inputs:

- Gmail labels and searches.
- GitHub PR, CI, and deployment signals.
- Dispatch intake signals.
- Billing and payment notices.
- Procurement notices.
- Field Nation and WorkMarket operating signals.
- Owner-provided business proof and project evidence.

## Scoring model

Each signal is scored against six dimensions:

1. Revenue impact
2. Deadline pressure
3. Access/security risk
4. Cash-flow impact
5. Client/reputation impact
6. Execution confidence

The final priority score is weighted toward immediate revenue, security/control risk, and cash survivability.

## Output format

The optimizer should produce:

- Executive summary.
- AH/Hot queue.
- AH/Needs-Action queue.
- Field Nation status.
- WorkMarket status.
- Dispatch intake status.
- Procurement status.
- Billing/payment status.
- Website/GitHub health.
- Top 3 ranked actions.
- Explicit blocked items.
- Required approvals.

## Production requirements

- No secrets in code.
- No hardcoded tokens.
- No automatic production mutation.
- Deterministic scoring available without external AI.
- AI enhancement can be added later behind an environment variable.
- All access-impacting changes must be documented.

## AI enhancement path

The first production version is deterministic and safe. Later, an LLM can be added for summarization only. The deterministic score remains the source of truth.

Recommended future env vars:

- XPO_AI_ENABLED=false
- XPO_AI_PROVIDER=openai
- XPO_MODEL=[model name]
- XPO_SUMMARY_MAX_TOKENS=1200

Secrets must live only in the deployment provider and Bitwarden, not in GitHub.
