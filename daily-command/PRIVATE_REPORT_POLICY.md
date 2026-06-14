# Daily Command Private Report Policy

The Daily Command workflow may live in a public-safe repository. Raw Daily Command reports must not.

## Rule

Do not commit private operating reports to a public repository.

## Public-safe content

The following may be stored in `quantam101/already-here-llc/daily-command/`:

- task catalog
- runbook
- prompt
- schemas
- action rules
- status workflow
- query bank
- sanitized examples
- generic templates
- non-sensitive operating documentation

## Private-only content

The following must be stored only in a private repository or secure drive:

- raw Gmail content
- email bodies or snippets containing private details
- customer names and private contact details
- vendor disputes
- invoices
- payment amounts where sensitive
- bank/card/autopay details
- tax documents
- W-9, insurance, banking, EIN, veteran documents, IDs
- credentials, secrets, API keys, tokens, auth links
- production incident details that expose exploitable weaknesses
- proprietary client/site notes
- work-order IDs when tied to private buyer/site data

## Recommended private repository

```text
quantam101/daily-command-private
```

## Recommended private report path

```text
reports/YYYY/YYYY-MM-DD-daily-command-summary.md
```

## Redaction standard

When a public-safe example is needed:

- replace names with role labels
- replace emails with `[redacted]`
- replace amounts with ranges unless public or non-sensitive
- remove auth/tracking links
- remove message IDs
- remove private site addresses
- remove customer/vendor private details
- summarize disputes without private evidence

## Minimum private report metadata

Private reports should include:

- report date
- run time
- sources searched
- top 3 actions
- included items
- excluded categories
- approvals needed
- follow-up date

## Enforcement

If a report contains private operating facts, it belongs in the private repo or secure drive only. If uncertain, treat it as private.
