# Revenue Automation Runbook

Purpose: convert Already Here LLC from passive web assets into an approval-gated revenue acquisition system.

This runbook defines the operating loop for finding prospects, creating records, drafting outreach, routing approvals, sending through approved channels, tracking replies, and following up until an opportunity is booked, disqualified, or archived.

## Operating Standard

Every revenue workflow must be automation-first and approval-gated.

Allowed without manual approval:

- scan public sources for opportunities;
- normalize prospects into pipeline records;
- rank opportunities by fit, urgency, probability, and revenue potential;
- draft outreach;
- prepare follow-up reminders;
- alert Slack or dashboard channels;
- generate reporting exports.

Requires Stephen approval before execution:

- sending email, Slack, SMS, or social messages;
- submitting vendor applications, bids, quotes, or RFQs;
- accepting work orders;
- signing agreements;
- spending money;
- creating accounts;
- making public claims about partnerships, certifications, results, or client outcomes.

## Revenue Lanes

Primary lanes:

1. National subcontract field work
   - smart hands;
   - network refresh;
   - POS deployment;
   - wireless/AP work;
   - low-voltage support;
   - healthcare field service;
   - data center support.

2. Phoenix commercial work
   - emergency network support;
   - Wi-Fi upgrades;
   - office moves;
   - printer/POS support;
   - cameras/access control referral or subcontract;
   - local MSP overflow.

3. AI implementation services
   - lead capture;
   - intake automation;
   - follow-up automation;
   - CRM routing;
   - quote workflow;
   - dispatch workflow.

4. Owned digital products
   - Field Operations Toolkit;
   - Mechanic Documentation Kit;
   - IT Site Survey Kit;
   - Low-Voltage Installation Kit;
   - AI Workflow Starter Pack.

5. Ethical affiliate/referral stack
   - field-service SaaS;
   - AI automation tools;
   - IT/MSP tools;
   - diagnostic scanners;
   - documentation/productivity tools;
   - drone operations tools.

## Daily Automation Loop

1. Source
   - ingest prospects from public vendor lists, marketplace alerts, inbound email, website forms, partner conversations, and manually supplied leads.

2. Normalize
   - convert each candidate into the pipeline schema in `data/revenue-pipeline-schema.json`.

3. Score
   - score each opportunity by speed to revenue, buyer fit, trust risk, margin, setup time, recurrence, and compatibility with Already Here services.

4. Draft
   - generate outreach, follow-up, and call notes.

5. Approve
   - route outbound actions to Stephen for approval.

6. Send
   - after approval only, send via Gmail, Zoho Mail, Slack, or another approved channel.

7. Track
   - update status, next action, next follow-up date, expected revenue, and probability.

8. Escalate
   - push hot replies and urgent opportunities into Slack or dashboard alerts.

9. Report
   - export daily JSON/CSV summaries through `scripts/revenue-pipeline-export.mjs`.

## Pipeline Status Values

- `new`
- `researching`
- `drafted`
- `approval_required`
- `approved_to_send`
- `sent`
- `replied`
- `call_scheduled`
- `quote_requested`
- `submitted`
- `won`
- `lost`
- `nurture`
- `archived`

## Minimum Daily Targets

- 25 qualified subcontract/vendor prospects;
- 10 local commercial prospects;
- 5 AI implementation prospects;
- 3 digital product or referral opportunities;
- 10 follow-ups on prior outreach;
- 1 booked job, quote request, vendor onboarding step, or sales call as the daily conversion objective.

## Quality Gates

A pipeline record is not valid unless it includes:

- source;
- lane;
- company or buyer;
- target buyer;
- pain solved;
- recommended action;
- status;
- next follow-up date;
- risk flags;
- approval requirement.

## Slack Alert Rules

Alert immediately when:

- estimated value is at least $500;
- time to revenue is same day or within 7 days;
- prospect asks for pricing, availability, insurance, W-9, COI, onboarding, or a call;
- inbound reply contains urgent language;
- a follow-up is overdue.

## Revenue Principle

No more passive assets. Every page, form, script, tracker, and automation must support one of five outcomes:

1. find revenue;
2. capture revenue;
3. convert revenue;
4. track revenue;
5. protect revenue.
