# Outreach Pipeline

Purpose: define the approval-gated outbound revenue workflow for Already Here LLC.

The pipeline converts prospects into structured records, drafts relevant outreach, requests approval, sends through approved tools only after approval, then tracks replies and follow-ups.

## Pipeline Flow

```text
prospect_source
  -> pipeline_record
  -> fit_score
  -> outreach_draft
  -> approval_required
  -> approved_send_channel
  -> sent
  -> reply_tracking
  -> follow_up_sequence
  -> won | lost | nurture | archived
```

## Source Inputs

Approved input types:

- public vendor and partner directories;
- inbound website dispatch/RFQ forms;
- Gmail or Zoho inbound messages;
- Slack lead notes;
- prior client/vendor lists;
- marketplace opportunities;
- public bid/RFQ notices;
- manually entered prospects;
- product/affiliate/referral candidates.

## Default Lanes

- `national_subcontract`
- `phoenix_commercial`
- `government_bid`
- `ai_implementation`
- `owned_digital_product`
- `affiliate_referral`
- `mechanic_light_duty`
- `hauling_trailer`
- `low_voltage`
- `drone_operations`
- `it_msp`

## Outreach Types

1. Partner/subcontract introduction
2. Same-day availability notice
3. Overflow support offer
4. AI operations assessment offer
5. Digital product promotion
6. Referral/affiliate education
7. Follow-up after no response
8. Reply-to-inbound lead
9. Quote request response
10. Vendor onboarding request

## Approval Gates

Outbound action states:

- `draft_only`: system may generate text but cannot send.
- `approval_required`: Stephen must approve the exact send action.
- `approved_to_send`: send is approved for one specific recipient/channel/body.
- `sent`: connector confirms outbound send.
- `blocked`: missing approval, risky claim, missing recipient, or compliance issue.

## Recommended First-Touch Positioning

Primary field work message:

Already Here LLC provides experienced 1099/C2C field engineering support for network refreshes, POS deployments, wireless/AP work, smart hands, low-voltage support, printer/POS service, and healthcare field-service environments. Available for Phoenix onsite work and nationwide project support.

Primary AI implementation message:

Already Here LLC helps service businesses improve lead capture, intake, follow-up, dispatch, and documentation through practical AI automation and workflow implementation based on real operational use.

## Follow-Up Cadence

- Day 0: first outreach after approval.
- Day 2: short follow-up with availability and fit.
- Day 5: proof-of-work or capability statement.
- Day 10: final polite check-in.
- Day 30: nurture update if strategic.

## Scoring Model

Score each record from 0 to 100.

Weights:

- speed_to_revenue: 20
- audience_fit: 15
- probability_to_convert: 15
- estimated_margin: 10
- recurring_potential: 10
- trust_risk_inverse: 10
- setup_time_inverse: 10
- compatibility_with_services: 10

Priority bands:

- A: 85-100. Work immediately.
- B: 70-84. Work after A-list.
- C: 50-69. Nurture or automate later.
- D: below 50. Archive unless strategic.

## Required Record Fields

The canonical record shape is defined in `data/revenue-pipeline-schema.json`.

Minimum outbound-ready fields:

- source
- lane
- company_or_platform
- contact_name or target_role
- contact_method
- target_buyer
- pain_solved
- recommended_action
- outreach_subject
- outreach_body
- status
- approval_required
- next_follow_up_date
- risk_flags

## Slack Routing

Suggested channels:

- `#revenue-command`
- `#hot-leads`
- `#followups`
- `#client-replies`
- `#automation-errors`

Alert payload:

```json
{
  "event": "revenue_pipeline_alert",
  "priority": "A",
  "company_or_platform": "Example Company",
  "lane": "national_subcontract",
  "estimated_value": 1250,
  "status": "approval_required",
  "next_action": "Approve first-touch email"
}
```

## Non-Negotiables

- No sending without approval.
- No fake partner claims.
- No guaranteed revenue claims.
- No account creation without approval.
- No money movement.
- No committing secrets.
- No private-data scraping.
- Public-source research and opt-in/inbound workflows only.
