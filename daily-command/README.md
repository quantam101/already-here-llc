# Already Here LLC Daily Command OS

This folder backs up the Daily Command Summary operating workflow for Already Here LLC.

## Purpose

The Daily Command Summary is the daily operating signal report for Already Here LLC. It is designed to identify only actionable or materially changed items across connected operating channels, including:

- AH/Hot
- AH/Needs-Action
- Field Nation
- WorkMarket
- dispatch intake
- procurement notices
- billing and payment items
- website and GitHub health
- drone/UAS opportunities
- V2D Portal / Vets to Drones emails
- free veteran drone training
- drone certifications
- FAA Part 107 pathways
- paid drone work leads
- AI lead-capture proof-of-work
- vendor outreach and partner pipeline

## What makes it work

The Daily Command is not just a saved prompt. It includes the operating task structure that defines how signals are scanned, filtered, ranked, suppressed, escalated, and closed.

The core operating files are:

| File | Purpose |
|---|---|
| `TASK_CATALOG.md` | Defines each recurring Daily Command task as an operator-ready task card. |
| `RUNBOOK.md` | Defines the execution sequence for producing a Daily Command Summary. |
| `ACTION_RULES.md` | Defines approval gates and actions that must not be executed without Stephen Franklin's approval. |
| `STATUS_WORKFLOW.md` | Defines review, approval, monitor, pass, blocked, and done states. |
| `SEARCH_QUERIES.md` | Stores reusable Gmail/GitHub query patterns. |
| `DAILY_CHECKLIST.md` | Provides the one-pass checklist for running the system. |
| `AUTOMATION_STACK.md` | Records the active task stack, combined tasks, disabled/absorbed tasks, and remaining active-task capacity. |
| `PRIVATE_REPORT_POLICY.md` | Defines what can be public and what must stay private. |
| `COMMAND_PROMPT.md` | Stores the master Daily Command generation prompt. |
| `schema/daily-command-item.schema.json` | Defines the structured data model for Daily Command items. |
| `examples/sanitized-daily-command-summary.md` | Shows a public-safe example format. |

## Privacy rule

Do not commit raw Gmail content, customer data, invoices, disputes, payment details, credentials, or private operational facts into a public repository.

This repository stores the workflow, prompt, task catalog, runbook, automation stack, schemas, action rules, and sanitized examples. Private daily reports should be stored only in an approved private repository or secure drive location.

## Output standard

Every Daily Command Summary should include:

1. Top 3 ranked actions.
2. Only actionable or materially changed items.
3. Source, date, deadline, eligibility, cost/free status, apply/contact link if available, grade, risk flags, and exact next action.
4. No sending emails, deleting emails, archiving emails, submitting forms, enrolling, applying, moving money, changing credentials, or modifying production files without explicit approval.

## Current backup status

- Dedicated repo requested: `daily-command-private`
- Dedicated repo creation status: blocked by available connector permissions/tools
- Current safe backup location: `quantam101/already-here-llc/daily-command/`
- Data sensitivity status: sanitized public-safe framework only
- Operating task catalog status: included
- Automation stack status: included
