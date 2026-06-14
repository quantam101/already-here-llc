# Daily Command Task Catalog

This catalog is the operating layer that makes the Already Here LLC Daily Command useful. The prompt tells the system what to look for. The task catalog tells the system how to decide what matters, what to suppress, what to rank, and what not to touch without approval.

## Operating principle

The Daily Command is not a newsletter. It is a decision and action filter.

Every task must answer:

1. What changed?
2. Does it affect revenue, funding, compliance, delivery, payment, production health, or opportunity timing?
3. What is the exact next action?
4. What is blocked without Stephen Franklin's approval?

## Standard task card fields

Every recurring task should define:

- Task name
- Purpose
- Frequency
- Sources
- Include criteria
- Suppress criteria
- Required output fields
- Risk flags
- Approval gates
- Done condition

---

## Task 01 — Scan AH/Hot

**Purpose:** Identify same-day priority operating signals.

**Frequency:** Daily; more often during active dispatches, payment disputes, scholarship deadlines, procurement windows, or production incidents.

**Sources:** Gmail, GitHub notifications, calendar, dispatch inbox, vendor portals, payment notices, procurement notices, website/deployment alerts.

**Include:** Hard deadlines within 7 days, direct revenue opportunities, dispatch acceptances, funding/scholarship deadlines, billing or payment problems, production failures, client disputes, security warnings, urgent compliance items.

**Suppress:** Duplicate alerts, stale notices, low-value promotions, generic newsletters, work below minimum effective revenue unless strategically useful.

**Required output:** Source, date, subject/title, material change, deadline, grade, risk flags, exact next action.

**Approval gates:** No sending, applying, enrolling, submitting forms, moving money, changing credentials, deleting/archiving messages, or modifying production files without explicit approval.

**Done condition:** Item is ranked, action is clear, and approval requirement is stated.

---

## Task 02 — Scan AH/Needs-Action

**Purpose:** Surface important items requiring review, reply, documentation, or follow-up.

**Frequency:** Daily.

**Sources:** Gmail, drafts, sent mail, GitHub issues/PRs, procurement portals, vendor registration emails, billing notices, calendar.

**Include:** Drafts awaiting review, sent outreach awaiting response, vendor onboarding requests, registration/document requests, unresolved billing/reconciliation items, non-urgent security notices, missing information requests, open issues blocking revenue/reliability.

**Suppress:** Already-actioned messages with no material change, information-only emails, duplicates of AH/Hot unless new detail exists.

**Required output:** Source, date, material change, current status, grade, risk flags, exact next action.

**Approval gates:** No replies, forwards, bulk labels, archives, record changes, or submissions without approval unless pre-authorized.

**Done condition:** Item has a next action or is marked monitor/pass with reason.

---

## Task 03 — Scan Field Nation

**Purpose:** Detect actionable Field Nation work orders that can contribute to the minimum daily field revenue target or create strategic vendor positioning.

**Frequency:** Daily; more often during morning revenue scan.

**Sources:** Gmail notifications, Field Nation emails, platform alerts if available.

**Include:** Phoenix metro work, viable route stacks, premium dispatches, short high-effective-rate work, smart hands, AP swaps, low-voltage, POS, printers, servers, network troubleshooting, store deployments, IT equipment removal, asset inventory, RMA/reverse logistics, door access, healthcare equipment support.

**Suppress:** Show Low unless high travel-adjusted flat rate is pre-approved, low-margin route work unless stackable, vague work without pay/location/buyer clarity, labor-only work below threshold, duplicates already reviewed.

**Required output:** Platform, buyer, location, distance, rate, schedule, scope, risk flags, counter recommendation, exact next action.

**Approval gates:** No accept/counter/decline/buyer message without approval unless pre-authorized.

**Done condition:** Job is graded as actionable, counter-ready, monitor, or pass.

---

## Task 04 — Scan WorkMarket

**Purpose:** Detect WorkMarket opportunities matching Already Here LLC onsite IT, deployment, healthcare, data center, and smart-hands capabilities.

**Frequency:** Daily.

**Sources:** Gmail notifications, WorkMarket emails, platform alerts if available.

**Include:** Same work categories as Field Nation, with emphasis on buyer quality, recurring potential, schedule certainty, and rate certainty.

**Suppress:** Same suppression rules as Field Nation.

**Required output:** Platform, buyer, location, rate, scope, schedule, risk flags, exact next action.

**Approval gates:** No accept/counter/decline without approval unless pre-authorized.

**Done condition:** Opportunity is ranked and action recommendation is clear.

---

## Task 05 — Process Dispatch Intake

**Purpose:** Convert inbound dispatch/vendor/client requests into structured opportunity records.

**Frequency:** Daily and as inbound messages arrive.

**Sources:** Gmail, dispatch inbox, vendor platforms, forms, phone/call notes if provided.

**Include:** New dispatch requests, rate confirmations, scheduling changes, scope changes, ETA requests, closeout/documentation requests, buyer follow-ups, acceptance/rejection notices.

**Suppress:** Duplicate automated reminders unless details changed, low-value messages with no required action.

**Required output:** Requester, site, city, schedule, scope, rate, materials/tools, access requirements, deliverables, risk flags, exact next action.

**Approval gates:** No schedule confirmation, rate negotiation, or scope commitment without approval unless already authorized.

**Done condition:** Intake is converted into a decision-ready summary.

---

## Task 06 — Scan Procurement Notices

**Purpose:** Identify municipal, healthcare, education, data center, aerospace, defense, and small-business procurement openings that fit Already Here LLC.

**Frequency:** Daily for email notices; weekly for broader lead development.

**Sources:** Gmail, city/vendor portals, procurement newsletters, SAM/state/local alerts if connected.

**Include:** IT services, network infrastructure, low-voltage, wireless/AP deployment, cybersecurity support, smart hands, endpoint/POS refresh, healthcare equipment support, McKesson medical cabinets/equipment, data center work, UAS/drone services, vendor registration deadlines.

**Suppress:** Opportunities requiring unavailable licenses/capacity unless subcontractable, unrealistic bonding/insurance requirements, low-fit commodity bids, stale notices past deadline.

**Required output:** Agency, opportunity, deadline, eligibility, registration required, documents needed, fit grade, risk flags, exact next action.

**Approval gates:** No bid submission, registration, certification, or document upload without approval.

**Done condition:** Opportunity is action-ready, needs documents, monitor, partner/subcontract, or pass.

---

## Task 07 — Scan Billing and Payment Items

**Purpose:** Protect cash flow, prevent missed payments, detect suspicious invoices, and advance receivables.

**Frequency:** Daily.

**Sources:** Gmail, invoices, payment processor notices, bank/card notices if connected, vendor reconciliation threads.

**Include:** Payment processed notices, bill-ready/autopay alerts, invoice disputes, outstanding receivables, reimbursement issues, suspicious invoice/payment links, tax/filing notices, subscription renewals.

**Suppress:** Routine confirmations with no cash-flow issue unless material; duplicate bill reminders already captured.

**Required output:** Source, amount when safe/private, due date, status, risk flags, exact next action.

**Approval gates:** No payments, transfers, suspicious link clicks, attachment opens, or account-data sharing without approval.

**Done condition:** Item is categorized as pay, verify, dispute, monitor, or pass.

---

## Task 08 — Scan Website and GitHub Health

**Purpose:** Detect breakage affecting revenue, lead capture, credibility, automation, security, or production readiness.

**Frequency:** Daily; after every merge/deployment.

**Sources:** GitHub notifications, CI/CD runs, Vercel notices, repo issues, PRs, CodeRabbit/Codex feedback, security alerts.

**Include:** Failed CI, skipped deployment that should have run, production deployment failures, security/secret warnings, broken health checks, open PRs blocking release, lead-capture failures, homepage AI Operations Advisor issues, credential redaction gaps.

**Suppress:** Routine successful deploys unless they resolve a prior failure; duplicate bot comments without new action.

**Required output:** Repo, commit/PR/workflow, failure type, production impact, risk flags, exact next action.

**Approval gates:** No merge, deploy, credential rotation, or production file change without approval unless explicitly authorized.

**Done condition:** Health item has one clear repair or verification action.

---

## Task 09 — Scan Drone/UAS Opportunities

**Purpose:** Build the drone/UAS revenue and certification pipeline with emphasis on veteran-friendly funding, FAA Part 107, inspection, mapping, and paid work.

**Frequency:** Daily during scholarship/training windows; weekly for broader paid lead building.

**Sources:** Gmail, V2D emails, USI emails, scholarship notices, FAA/training notices, drone job alerts, local business leads.

**Include:** Free/funded drone training, veteran drone programs, scholarships, FAA Part 107 pathways, certification deadlines, inspection/mapping/photo/video/survey leads, UAS maintenance or tech roles, telecom/construction/roofing/solar/real estate/insurance/municipal/site-documentation leads.

**Suppress:** Paid training with no funding path unless high value; generic drone newsletters without action; jobs requiring unavailable certifications unless used as pipeline intelligence.

**Required output:** Source, date, deadline, eligibility, cost/free status, apply/contact link if available, grade, risk flags, exact next action.

**Approval gates:** No application, enrollment, payment, test scheduling, or personal-data submission without approval.

**Done condition:** Item is apply-ready, verify-eligibility, build-lead-list, monitor, or pass.

---

## Task 10 — Scan V2D Portal / Vets to Drones

**Purpose:** Capture Vets to Drones and veteran UAS intelligence separately from generic drone noise.

**Frequency:** Daily when active; weekly otherwise.

**Sources:** Gmail searches for V2D, SITREP, Vets to Drones, UAS Industry Intelligence, portal@vetstodrones.org, vetstodrones.org.

**Include:** Portal notices, enrollment windows, free training announcements, veteran eligibility updates, SITREPs, industry intelligence with specific leads, certification/job-pathway items.

**Suppress:** General newsletters with no action; repeated notices with no new deadline/details.

**Required output:** Source, date, subject, program, deadline, eligibility, cost/free status, link/contact, grade, risk flags, exact next action.

**Approval gates:** No enrollment, form submission, or veteran/personal detail submission without approval.

**Done condition:** Item is action-ready or marked monitor/pass with reason.

---

## Task 11 — Scan Free Veteran Drone Training

**Purpose:** Identify no-cost or grant-funded drone training paths before paid alternatives.

**Frequency:** Daily during scholarship windows; weekly otherwise.

**Sources:** Gmail, veteran org notices, workforce emails, WIOA/VRE pathways, drone schools, FAA-related training providers.

**Include:** Free veteran training, scholarships, grants, WIOA/VRE eligible programs, community college workforce training, UAS certificate programs with funding.

**Suppress:** Expensive training marketed as free but requiring upfront payment without verified reimbursement; programs with unclear eligibility.

**Required output:** Provider, cost/free status, deadline, eligibility, credential outcome, risk flags, exact next action.

**Approval gates:** No application, enrollment, or personal document submission without approval.

**Done condition:** Funding path is clear or item is marked verify/pass.

---

## Task 12 — Scan FAA Part 107 Pathways

**Purpose:** Keep FAA Part 107 certification aligned with funding, training, exam readiness, and paid-work conversion.

**Frequency:** Weekly; daily when deadline or exam window is active.

**Sources:** Gmail, FAA notices, training providers, scholarship programs, calendar.

**Include:** Study programs, exam scheduling requirements, certification deadlines, prep-course funding, test reimbursement, recurrent training once certified.

**Suppress:** Generic drone content without certification action.

**Required output:** Pathway step, cost, deadline, eligibility, link/contact, risk flags, exact next action.

**Approval gates:** No exam scheduling, fee payment, or FAA form submission without approval.

**Done condition:** Next certification step is clear.

---

## Task 13 — Scan Paid Drone Work Leads

**Purpose:** Find drone work that can become near-term revenue once certification and service packaging are ready.

**Frequency:** Weekly; daily after Part 107 readiness.

**Sources:** Gmail alerts, local business searches, construction/property/roofing/solar/telecom/insurance/municipal leads, vendor platforms.

**Include:** Roof inspection, property documentation, construction progress photos, telecom site surveys, solar inspection, insurance/property documentation, real estate media, municipal/public works mapping support, subcontractor drone pilot requests.

**Suppress:** Unpaid exposure work, jobs requiring unavailable aircraft/equipment unless subcontractable, jobs requiring Part 107 before readiness unless pipeline only.

**Required output:** Buyer, location, scope, certification requirement, equipment requirement, likely pay, contact path, risk flags, exact next action.

**Approval gates:** No quote, commitment, flight, or representation of FAA certification status unless verified and approved.

**Done condition:** Lead is contact-ready, partner-needed, certification-blocked, monitor, or pass.

---

## Task 14 — Scan AI Lead Capture / Automation Proof-of-Work

**Purpose:** Convert internal and volunteer AI lead-capture pilots into sellable proof-of-work.

**Frequency:** Daily during setup/pilot period; weekly after stabilization.

**Sources:** Gmail drafts, website lead forms, CRM/spreadsheet, GitHub, deployment logs, pilot notes.

**Include:** Internal Already Here AI lead capture, Marquietta Bullard volunteer pilot, missed-call capture, quote intake, booking, follow-up automation, tracked lead-to-revenue proof, client workflow pain discovered from field relationships.

**Suppress:** Hard software pitches before trust/proof/workflow pain; generic AI ideas without buyer/use case.

**Required output:** Pilot/client, current setup status, blocker, proof metric, next action, risk flags.

**Approval gates:** No client outreach, production deployment, data collection expansion, or pricing commitment without approval.

**Done condition:** Pilot has a measurable next step or proof artifact.

---

## Task 15 — Scan Vendor Outreach and Partner Pipeline

**Purpose:** Convert outbound vendor introductions into live buyer relationships, onboarding, dispatch access, or partner/referral channels.

**Frequency:** Daily during active outreach; weekly for pipeline review.

**Sources:** Gmail sent/replies, drafts, vendor portals, capability statement tracker, contact database.

**Include:** Replies from MSPs, healthcare vendors, data-center vendors, low-voltage/access-control contractors, municipal contacts, procurement liaisons, national dispatch vendors, subcontracting/referral opportunities.

**Suppress:** Sent emails with no reply unless follow-up window is due; low-fit contacts.

**Required output:** Company, contact, last touch, response status, required documents, next follow-up, grade, risk flags.

**Approval gates:** No contract, pricing, insurance document, W-9, banking, portal submission, or signature without approval.

**Done condition:** Relationship is categorized as reply-needed, onboarding, follow-up due, monitor, or closed/pass.
