# Phoenix Commercial IT Cabling Lead Funnel

Owner: Already Here LLC
Market: Phoenix Valley, Arizona
Landing page: https://www.alreadyherellc.com/phoenix-cabling-checklist
Guide: https://www.alreadyherellc.com/api/phoenix-cabling-guide
Consultation/RFQ: https://www.alreadyherellc.com/rfq
Campaign code: phoenix_cabling_q4_2026

## Architecture and acceptance

The public page POSTS to the same-origin API at /api/phoenix-cabling-lead. It validates required fields, rate limits requests per instance, screens a honeypot, records separate marketing consent, and routes the lead to the dispatch mailbox using existing Resend configuration, or existing Formspree as fallback. A JSON record is included with the owner email. A durable canonical graph, when configured, also persists the contact and lead. When no delivery provider is configured the API returns 503 and never claims success.

A successful respondent gets an immediate first-party PDF link. Resend also attempts an immediate transactional guide receipt; a failure is disclosed in the UI. Asking for the guide does not book an appointment or authorize marketing.

Before production activation, confirm GET /api/phoenix-cabling-lead reports emailDeliveryAvailable or fallbackAvailable as true. The canonical graph requires its own durability verification. Perform a clearly tagged INTERNAL TEST submission using controlled addresses, then verify receipt and record persistence. Test PDF retrieval, mobile usability, invalid payloads, bot trap, and consent. Do not generate fictitious customer data in live marketing reports.

## ManyChat Instagram flow — requires account connection

Current official guide: https://help.manychat.com/hc/en-us/articles/14281316989724-Instagram-Post-and-Reel-Comments-trigger

Set up the Instagram Post and Reel Comments trigger for the selected owned Reel, keyword BUILDOUT, matching the whole word. Public reply:

"Thanks for asking. I sent you a message about the Phoenix cabling checklist. Check your message requests if you don't see it."

The first DM must be a Private Reply with one content block and a quick reply:
"Thanks for your interest in the Phoenix commercial cabling checklist. Tap Send checklist to get the free planning guide."
Quick Reply: Send checklist

After the user TAPS the quick reply, deliver:
"Here is the Phoenix commercial IT cabling planning guide: https://www.alreadyherellc.com/phoenix-cabling-checklist?utm_source=instagram&utm_medium=dm&utm_campaign=phoenix_cabling_q4_2026"

Then after one minute, only if the user interacted and the permitted messaging window remains open:
"Are you planning an office build-out, warehouse expansion, or network upgrade in the Phoenix Valley?"
Quick replies: Active project; Planning; Just researching.

Active project:
"An Already Here LLC team member can review your scope. Request a project assessment: https://www.alreadyherellc.com/rfq"
Tag: cabling_active_project. Requires human qualification; does NOT automatically book a call.

Planning:
"The guide includes a kickoff checklist. When your scope is ready, request a review: https://www.alreadyherellc.com/rfq"
Tag: cabling_planning.

Just researching:
"Use the guide to compare cable category, routes, testing acceptance, and contractor compliance. No consultation required."
Tag: cabling_research.

Important: Only the first comment from each user under a post/reel triggers the automation. The first private reply alone does not establish an automated follow-up messaging window. User interaction opens the 24-hour window for follow-ups. Test through a separate Instagram account. Facebook/Messenger setup must be tested separately. Do not scrape commenters, and do not send unsolicited DMs.

## 30-second Reel script

0:00-0:04 — Visual: contractor viewing drawings and cable terminations.
"If you're building out an office or warehouse in the Phoenix Valley, don't order network cable before checking these five items."

0:04-0:20 — Visual: racks, labeled ports, pathway plan, field test equipment.
"Check the jacket ratings for each space, match Cat6 or Cat6A to your bandwidth and PoE needs, plan cable routes, require test results, and verify contractor scope and permits."

0:20-0:30 — Visual: checklist cover, Already Here LLC branding.
"Already Here LLC put together a practical commercial cabling checklist for Valley business projects. Comment BUILDOUT and we'll message you the free guide."

On-screen: "Phoenix commercial cabling | Comment BUILDOUT | Already Here LLC"
Campaign link: https://www.alreadyherellc.com/phoenix-cabling-checklist?utm_source=instagram&utm_medium=reel&utm_campaign=phoenix_cabling_q4_2026

## Consent-based email nurture — Resend automation configured

Email 1 — immediate delivery is already implemented as a transactional receipt when the Resend runtime is configured.
Subject: Your Phoenix Commercial IT Cabling Checklist
Body:
"Hello,
Your free checklist is ready: https://www.alreadyherellc.com/api/phoenix-cabling-guide
It covers material ratings, Cat6 vs. Cat6A, pathways, link testing, and contractor-scope checks.
For a project scope review: https://www.alreadyherellc.com/rfq
Already Here LLC | Phoenix, Arizona | dispatch@alreadyherellc.com"

Email 2 — Day 2. Published in Resend. Triggered only after explicit opt-in, successful transactional receipt, and durable lead persistence.
Subject: What should be in a cabling contractor's closeout package?
Body:
"Hello,
Before sign-off, ask for cable IDs, as-built routes, patch-panel maps, test limits, per-link reports, and a written list of exceptions.
For an independent scope conversation, use https://www.alreadyherellc.com/rfq
Already Here LLC"

Email 3 — Day 4. Published in Resend. Waits for two additional days; a conversion event can stop this last email.
Subject: Planning a Phoenix office network upgrade?
Body:
"Hello,
If you have a Phoenix-area office, warehouse, or network project in planning, we can review proposed device counts, pathways, acceptance criteria, and onsite execution scope.
Request an optional scope review: https://www.alreadyherellc.com/rfq
Already Here LLC"

A supposed Phoenix cabling case study is not to be invented. Only use real approved customer projects with documented test evidence and image rights.

## SMS — disabled

This version does not collect phone numbers or separate marketing-SMS consent. No text messages are sent. A future SMS implementation needs consent, proper sender registration, and STOP/unsubscribe handling.

## Measurement

Record source, UTM campaign, lead ID, project ZIP/city, project stage, opt-in status, email delivery, canonical persistence, qualification outcome, RFQ, approved quote, booked job, and closed revenue. Do not count guide downloads as paid revenue.

Official technical sources: https://www.phoenix.gov/administration/departments/pdd/tools-resources/codes-ordinance/building-code.html ; https://roc.az.gov/license-classifications
Official ManyChat messaging: https://help.manychat.com/hc/en-us/articles/23358636027932-Understanding-messaging-windows


## Production follow-up integration — October 24, 2026

Resend automation dashboard: https://resend.com/automations/01a16f5d-9fd6-750d-a174-f18fb73eb65c/editor

- Email topic: Phoenix Cabling Planning Tips, default opt-out.
- Event: `phoenix.cabling.opted_in`; emitted from the lead endpoint only after explicit separate email marketing permission, successful delivery receipt, and durable graph storage. A non-consenting lead never receives the event.
- Day 2 message: Published Resend template `phoenix-cabling-day2-2026`.
- Day 4 message: Published Resend template `phoenix-cabling-day4-2026`.
- Conversion stop event: `phoenix.cabling.converted` skips Day 4 if received during the intervening two-day wait.
- Each message contains the Resend-managed `RESEND_UNSUBSCRIBE_URL`. Subscribers can stop marketing without affecting their original guide or service inquiry.
- Status API reports only technical marketing readiness; it does not prove any individual prospect opted in, received messages, or booked service.
- On automated event failure, the owner is alerted with the lead ID. Operators should reconcile the Resend run and durable consent record before manual retry, avoiding duplicates.
- The RFQ process currently requires human review. Do not infer an actual booking or sale merely from a guide download or form submission.
- Meta activation remains separate: no Instagram or Facebook Page OAuth grant or ManyChat account with rights to edit automations is available to this agent. The `BUILDOUT` flow above is the exact configuration reference, not an activated workflow.


## RFQ-to-nurture conversion stop — October 24, 2026

A **submitted and successfully delivered RFQ** tagged with a valid Phoenix cabling campaign lead ID is a lead-to-RFQ conversion stage, not an approved quote, contract, dispatch booking, or paid sale.

- The existing RFQ form includes the original `AH-CBL-UUID` reference in the project request.
- The dispatch API parses that reference only for the `RFQ / project-based bid` service type.
- After the dispatch receiver confirms delivery, it emits the `phoenix.cabling.converted` event for the RFQ submitter's email.
- The opted-in Resend automation ends before the Day 4 email if that conversion event arrives while the conversion wait is active.
- A failed event does not block an authentic customer's RFQ; it is logged for reconciliation.
- Local-only proof, failed dispatch delivery, other service types, and unattributed RFQs cannot generate this event.
- The conversion signal records an **RFQ stage**, not customer revenue. Quote approval, Stripe invoice matching, paid-status reconciliation, and gross-margin proof remain independent required controls.
