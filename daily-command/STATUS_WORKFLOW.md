# Daily Command Status Workflow

This file defines item status values for review, decision, and completion tracking.

## Status values

| Status | Meaning | Use when |
|---|---|---|
| `new` | Newly surfaced item | Item has not yet been reviewed by Stephen |
| `reviewed` | Seen and understood | Stephen has seen it but no execution decision is complete |
| `needs-approval` | Action requires explicit approval | Email, application, money, credential, production, bid, or commitment action is proposed |
| `needs-info` | Missing required facts | Rate, eligibility, cost, deadline, buyer, location, scope, or access path is unclear |
| `draft-ready` | Draft is prepared but not sent | Email/counter/follow-up text exists and awaits approval |
| `action-ready` | Safe next step is clear | Item can proceed once approved, or is informational with safe action |
| `in-progress` | Execution started | Approved work is underway |
| `blocked` | Cannot proceed | Missing approval, credentials, documents, certification, access, or external response |
| `monitor` | Watch for change | No immediate action, but future change may matter |
| `pass` | Deliberately skipped | Low value, poor fit, expired, duplicate, or risk outweighs value |
| `done` | Completed | Action closed with outcome recorded |

## Review decision buttons

A future UI should expose these actions:

- Reviewed
- Approve action
- Draft reply
- Send reply after review
- Need more info
- Pass
- Monitor
- Mark done
- Escalate

## Status transition rules

```text
new -> reviewed
reviewed -> needs-approval
reviewed -> needs-info
reviewed -> draft-ready
reviewed -> action-ready
reviewed -> monitor
reviewed -> pass
needs-approval -> in-progress
needs-approval -> pass
needs-info -> action-ready
needs-info -> blocked
draft-ready -> needs-approval
in-progress -> done
in-progress -> blocked
monitor -> reviewed
blocked -> needs-info
blocked -> pass
```

## Pass reason codes

Use a reason when passing:

- duplicate
- stale
- expired
- below-rate
- too-far
- unclear-scope
- no-pay-shown
- bad-fit
- high-risk
- suspicious
- certification-blocked
- requires-unavailable-license
- not-now

## Done requirement

A `done` item must include:

- final action taken
- result/outcome
- date closed
- follow-up date if needed
