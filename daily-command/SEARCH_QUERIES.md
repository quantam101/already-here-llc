# Daily Command Search Query Bank

This file stores the recurring searches used to build the Daily Command Summary.

## Gmail — AH/Hot

```text
newer_than:7d ("deadline" OR "due" OR "urgent" OR "action required" OR "final notice" OR "approved" OR "accepted" OR "assigned" OR "payment" OR "invoice" OR "scholarship" OR "certification")
```

## Gmail — AH/Needs-Action

```text
newer_than:14d ("needs action" OR "action required" OR "please respond" OR "confirm" OR "review" OR "signature" OR "documents" OR "onboarding" OR "registration" OR "missing")
```

## Gmail — Field Nation

```text
newer_than:14d ("Field Nation" OR "work order" OR "WO" OR "counter" OR "assignment" OR "buyer" OR "dispatch")
```

## Gmail — WorkMarket

```text
newer_than:14d ("WorkMarket" OR "assignment" OR "work order" OR "dispatch" OR "counter" OR "service request")
```

## Gmail — Dispatch intake

```text
newer_than:14d ("dispatch" OR "ETA" OR "site" OR "onsite" OR "scope" OR "rate" OR "technician" OR "closeout" OR "check in" OR "check out")
```

## Gmail — Procurement

```text
newer_than:30d ("procurement" OR "solicitation" OR "bid" OR "RFP" OR "RFQ" OR "vendor registration" OR "supplier" OR "contract opportunity" OR "purchase order")
```

## Gmail — Billing and payment

```text
newer_than:30d ("invoice" OR "payment" OR "paid" OR "processed" OR "bill" OR "autopay" OR "balance" OR "reconciliation" OR "deduction" OR "reimbursement" OR "receipt")
```

## Gmail — Website/GitHub health

```text
newer_than:14d (from:notifications@github.com OR from:noreply@github.com OR from:vercel.com OR "CI" OR "failed" OR "deployment" OR "workflow" OR "security" OR "secret" OR "vulnerability")
```

## Gmail — V2D / Vets to Drones

```text
newer_than:60d (from:portal@vetstodrones.org OR from:(vetstodrones.org) OR subject:(V2D) OR subject:(SITREP) OR "UAS Industry Intelligence" OR "Vets to Drones")
```

## Gmail — Drone/UAS training and scholarships

```text
newer_than:60d ("free training" OR "certification" OR "Part 107" OR "FAA" OR "drone training" OR "UAS" OR "veteran" OR "scholarship" OR "grant" OR "workforce")
```

## Gmail — Paid drone work

```text
newer_than:60d ("drone job" OR "UAS job" OR "drone pilot" OR "mapping" OR "inspection" OR "roof" OR "solar" OR "construction progress" OR "telecom" OR "site survey" OR "contract")
```

## GitHub — Daily Command files

Search repository:

```text
daily-command
```

## GitHub — production health

Search repositories:

```text
CI failed deployment health check secret credential redaction
```

## GitHub — AI lead capture

Search repositories:

```text
lead capture receptionist intake booking quote automation
```

## Query use rules

- Use narrower searches first when deadline pressure exists.
- Use broader searches for weekly pipeline building.
- Read full emails only when the summary/snippet indicates material change.
- Do not expose raw private email content in public commits.
- Suppress duplicates unless the source adds a new fact, deadline, approval, rejection, amount, or risk.
