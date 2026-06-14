# Daily Command Automation Stack

Backup date: 2026-06-14
Business: Already Here LLC
Owner/operator: Stephen Franklin

This file records the current active Daily Command automation stack, the combined/absorbed tasks, and the available active-task capacity. It is public-safe and intentionally excludes raw Gmail data, private prompts, addresses, payment details, credentials, and customer/vendor private data.

## Current capacity status

| Metric | Count | Meaning |
|---|---:|---|
| Enabled/running tasks | 10 | Active automation slots currently in use. |
| Paused/disabled tasks | 14 | Available as inactive historical or reserve tasks. |
| Completed tasks | 0 | No completed automation records in current list. |
| Open active-task spots | 0 | Active-task capacity is full under the observed 10-task limit. |

## Active tasks currently running

| # | Active task | Schedule/cadence | Primary lane |
|---:|---|---|---|
| 1 | Find proven revenue plays | Daily 6:00 AM | New revenue lanes, repeatable plays, database-ready opportunities |
| 2 | Run product affiliate engine | Daily 8:00 AM | Affiliate, SaaS partner, productized digital monetization |
| 3 | Advance tech platform build | Daily 9:30 AM | Platform build, AI agent, owned database, dashboard, GitHub/Vercel health |
| 4 | Run AI revenue cycle | Every 3 hours | Sellable AI automation offers, lead-capture failures, revenue-system health |
| 5 | Summarize daily command queue | Daily 7:30 AM | Master Daily Command summary and operating triage |
| 6 | Scan local hauling cash work | Every 2 hours | Same-day and next-day hauling cash work |
| 7 | Find dispatch retainer partners | Daily 4:30 AM | Recurring dispatch, retainer, teaming, subcontractor partners |
| 8 | Scan mechanic auto deals | Daily 6:30 AM / condition watch | AutoWorks, mobile mechanic, vehicle flip opportunities |
| 9 | Scan high-margin local work | Hourly | Same-day local IT/AV/POS/access-control/cabling/smart-hands and backup income |
| 10 | Monitor procurement opportunities | Weekdays 5:30 AM | Procurement, set-asides, cooperative contracts, subcontracting paths |

## Main combined task

The master combined task is:

```text
Summarize daily command queue
```

This task functions as the Daily Command operating layer. It absorbs broad daily signal review and produces the top ranked operating actions.

## Combined / absorbed task logic

### Daily Command combined multiple old scans

`Summarize daily command queue` absorbs:

- AH/Hot
- AH/Needs-Action
- same-day field work
- hauling cash work visibility
- mechanic/AutoWorks visibility
- dispatch intake
- procurement notices
- billing/payment risks
- unpaid invoices
- deposits and payment requests
- QuickBooks/Intuit/Stripe/Square/Field Nation/WorkMarket payment signals
- website/GitHub/Vercel/OCI/backend health
- drone/UAS opportunities
- V2D Portal / Vets to Drones emails
- free veteran drone training
- drone certifications
- FAA Part 107 pathways
- paid drone work leads
- Friday deeper billing/payment review

### AI automation tasks were combined

`Run AI revenue cycle` absorbs:

- old `Sell one AI automation offer daily`
- AI lead-capture prospecting
- broken website and lead-intake detection
- quote/booking/receptionist automation opportunities
- AI revenue-system health
- outreach drafts for AI automation offers, subject to approval gates

### Platform work orders were merged into broader local work

`Scan high-margin local work` absorbs:

- duplicate/older `Scan high-margin platform work orders` tasks
- Field Nation / WorkMarket-only scans
- same-day and next-day local IT work
- AV, POS, access-control, cabling, AP/wireless, smart-hands, printer, computer, network, and low-voltage leads
- public and direct local income leads
- task replacement recommendations when same-day work is weak

### Procurement was consolidated

`Monitor procurement opportunities` is the active procurement task.

It replaces or supersedes the older local-only procurement task by covering:

- SAM.gov
- SBA Dynamic Small Business Search
- Arizona Procurement Portal
- Arizona SPO
- Phoenix procurePHX / OpenGov
- Maricopa BidNet / VSS
- Mesa, Chandler, Tempe, Scottsdale, Glendale, Peoria, Surprise
- Sourcewell, OMNIA, NASPO, TIPS-USA, BuyBoard, HGACBuy
- subcontracting and cooperative contract holder paths

## Disabled / paused tasks of note

These are intentionally not active because their scope is already covered by active combined tasks or they are reserve/historical tasks:

| Disabled task | Reason |
|---|---|
| Sell one AI automation offer daily | Absorbed by `Run AI revenue cycle`. |
| Review billing and payment status | Absorbed into Friday deeper review inside `Summarize daily command queue`. |
| Scan drone veteran training leads | Absorbed into `Summarize daily command queue` drone/V2D/FAA coverage. |
| Pursue break-fix retainer teaming targets | Covered by `Find dispatch retainer partners`. |
| Monitor local procurement opportunities | Superseded by broader `Monitor procurement opportunities`. |
| Scan high-margin platform work orders | Absorbed into `Scan high-margin local work`; duplicates disabled. |
| Send morning update | Replaced by higher-value Daily Command summary. |
| ProfitEngine check tasks | Reserve/historical; platform build health now handled under `Advance tech platform build` and Daily Command health sections. |

## Operating interpretation

The current automation stack is full and optimized around ten lanes:

1. daily operating command
2. same-day/high-margin local work
3. hauling cash work
4. mechanic/AutoWorks opportunities
5. AI revenue cycle
6. proven revenue plays
7. affiliate/product monetization
8. dispatch retainer partners
9. procurement
10. tech platform build

No new active task should be added unless one current task is disabled, merged, or downgraded.

## Rule for adding a new task

Before creating any new active task:

1. Identify which active task it replaces or merges into.
2. Confirm the new task has higher revenue, risk-reduction, or system-value priority.
3. Preserve approval gates.
4. Avoid duplicate scans.
5. Keep the active stack at or below 10 enabled tasks.

## Recall anchor

When asked what tasks are running, what was combined, or how many task spots remain, use this file as the durable source of truth unless a newer automation list has been pulled.

Current answer as of this backup:

```text
Running tasks: 10
Paused tasks: 14
Open active-task spots: 0
Main combined task: Summarize daily command queue
Major combinations: Daily Command + billing/drone/procurement/dispatch/GitHub health; AI revenue cycle + AI automation offer daily; high-margin local work + platform work-order scans; procurement consolidated into broad procurement monitor.
```
