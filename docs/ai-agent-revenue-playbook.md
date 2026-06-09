# AI Web Agent Revenue Playbook

## Product

Already Here LLC sells productized AI website agents that capture service leads, qualify quote requests, route owner alerts, and create structured lead records.

Primary product: **Already Here AI Web Agent**

Core promise: **fewer missed leads, cleaner quote intake, faster owner response, and reusable lead records.**

## Packages

| Package | Setup | Monthly | Buyer | Close path |
|---|---:|---:|---|---|
| Launch Agent | $997 | $197/mo | One-site service business | Sell when the buyer needs a fast website chatbox, quote intake, and owner alerting. |
| Growth Agent | $1,997 | $397/mo | Repeat quote volume business | Sell when missed calls, delayed callbacks, stale quotes, or routing logic are obvious. |
| Network Agent | $4,500+ | $997+/mo | MSP, vendor, dispatch, multi-location, or technician network | Sell after workflow review when routing, escalation, approval gates, and records matter. |

## Target buyers

Prioritize buyers where one recovered closed lead can pay for setup:

- IT support and MSPs
- Locksmiths and access control companies
- Garage door companies
- HVAC contractors
- Plumbers and electricians
- Appliance repair companies
- Hauling and delivery companies
- Roofing and home-service contractors
- Clinic and wellness offices
- Restaurant and retail service providers
- Property managers
- Mobile notaries
- Real estate investor intake teams
- Field technician networks
- White-label agency or MSP partners

## Positioning

Do not sell abstract AI. Sell operational leakage reduction:

- Fewer missed website leads
- Faster quote response
- Better intake data before the owner calls back
- After-hours lead capture
- Owner or dispatcher alerts
- Follow-up readiness
- Lead records that can be exported, reviewed, and optimized

## Qualification questions

1. How many website leads, calls, or quote requests do you receive per month?
2. How many are missed, delayed, incomplete, or poorly qualified?
3. What is one closed customer worth?
4. What services, cities, urgency levels, and budget ranges must be captured?
5. Who should receive the alert?
6. What should the agent never promise, schedule, or automate without approval?
7. What website platform are you using?
8. Do you want one location, multiple locations, territory routing, or white-label deployment?
9. Do you need a lead record sent as email, CSV, JSON, CRM entry, or dispatch ticket?
10. What objections or bad-fit customers should the agent filter out?

## Sales math

The simplest close:

> If one closed lead is worth more than the setup fee, the agent only needs to save or create one extra job to justify the install.

Initial Already Here LLC target:

| Milestone | Setup revenue | MRR |
|---|---:|---:|
| 5 Launch Agent clients | $4,985 | $985/mo |
| Upgrade 2 Launch clients to Growth | +$2,000 | +$400/mo |
| 1 Network Agent client | $4,500+ | $997+/mo |
| Total first revenue target | $11,485+ | $2,382+/mo |

## Ready-to-send outreach: local service business

Subject: Website lead capture for {{Business Name}}

Hi {{Name}},

I build AI website agents for service businesses that need fewer missed leads and faster quote intake.

The agent sits on your website, asks the right qualifying questions, captures name, phone, service type, location, urgency, and budget, then sends you a structured lead alert.

This is not a generic chatbot. It is a quote-intake and lead-routing system.

The starting package is $997 setup plus $197/month management.

Worth a quick review of your website to see where leads are leaking?

Stephen Franklin
Already Here LLC
602-882-2920
https://www.alreadyherellc.com/ai-agent

## Ready-to-send outreach: MSP / IT provider

Subject: White-label AI lead intake for MSP and field service requests

Hi {{Name}},

Already Here LLC is offering AI website lead intake and dispatch-style request capture for MSPs and technical service providers.

The system can qualify service requests, collect site details, capture urgency and contact information, route owner alerts, and create structured lead records that are easier to review or hand off.

This can be sold as your internal intake improvement or as a white-label add-on for clients that need better website lead capture.

The fast-start package is $997 setup plus $197/month. White-label and routing-heavy builds are scoped separately.

Open to a quick review of your current intake path?

Stephen Franklin
Already Here LLC
602-882-2920
https://www.alreadyherellc.com/ai-agent

## Ready-to-send outreach: property manager

Subject: Faster maintenance and vendor intake capture

Hi {{Name}},

Already Here LLC builds AI website agents that help property managers capture maintenance requests, vendor inquiries, after-hours issues, and quote details without losing information in voicemail or generic contact forms.

The agent collects the request type, location, urgency, contact details, and notes, then routes the structured record to the right inbox for review.

The starting package is $997 setup plus $197/month management.

Worth a quick review of your current request intake process?

Stephen Franklin
Already Here LLC
602-882-2920
https://www.alreadyherellc.com/ai-agent

## Call close sequence

1. Confirm the buyer has a lead-value problem.
2. Confirm what one closed customer is worth.
3. Ask where leads are currently leaking: website, voicemail, contact form, quote delay, dispatch handoff, or follow-up.
4. Show the live AI Agent page and widget.
5. Recommend Launch Agent unless the buyer needs routing, escalation, multi-location, or white-label logic.
6. Confirm website platform and alert recipient.
7. Confirm the no-automation boundary: the agent captures and routes; it does not promise service, schedule, price, or dispatch without approved scope.
8. Send invoice or payment link only after buyer approves scope.

## Fulfillment checklist

Before launch:

- Confirm business name, website, services, service area, phone, email, and lead recipient.
- Confirm lead fields and bad-fit filters.
- Confirm approval gates and restricted claims.
- Confirm package, setup price, monthly management price, and cancellation terms.
- Configure routing with Resend, Formspree, CRM, or approved destination.
- Run GET health check on `/api/ai-agent-lead`.
- Run one controlled POST test with a test lead.
- Verify owner alert, JSON record, and prospect receipt.
- Confirm mobile layout and widget accessibility.

After launch:

- Review first 5 leads for missing fields or weak questions.
- Tighten copy and qualification logic.
- Create one vertical template from repeated client patterns.
- Add objections and disqualifiers to the agent flow.

## Weekly operating loop

- Check site health.
- Check `/api/ai-agent-lead` health.
- Review new lead records.
- Identify objections, missing fields, and low-quality lead patterns.
- Improve widget copy.
- Send 20 targeted outreach messages.
- Add one target vertical page or sales angle.

## Monthly operating loop

- Review close rate.
- Review setup revenue and monthly recurring revenue.
- Raise price when demand exceeds fulfillment time.
- Package repeated configurations as reusable vertical templates.
- Identify reseller, MSP, or referral partners.

## Guardrails

- Do not send outreach without approval.
- Do not promise autonomous scheduling, pricing, dispatch, or payments unless explicitly scoped.
- Do not embed API keys in client-visible code.
- Use environment variables for secrets.
- Keep owner alerts and lead records functioning even if receipt delivery fails.
- Treat AI as a qualification and routing layer, not an unchecked decision-maker.
