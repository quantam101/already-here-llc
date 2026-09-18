# PAYMENT & REMITTANCE STANDARD — Already Here LLC

## Canonical business payment identity

- **Business:** Already Here LLC
- **Stripe business profile:** `@alreadyherellc`
- **Payment/remittance contact:** dispatch@alreadyherellc.com
- **Primary workflow:** Provider-issued Stripe invoice or Stripe payment link.

## Required commercial-document block

Use this block on every new proposal, invoice, statement of work, retainer packet,
and client-onboarding packet:

> **Payment:** Electronic payment is processed through Stripe for Already Here LLC.
> Stripe business profile: **@alreadyherellc**. Pay from the invoice or payment link
> issued by Already Here LLC and reference the invoice number on remittance so the
> service description, tax treatment, and accounting record remain linked.
> Payment questions and remittance confirmation: dispatch@alreadyherellc.com.

## Invoice requirements

Every invoice must include:

1. Unique invoice number.
2. Invoice date and due date.
3. Client legal name and billing contact.
4. Service description and applicable work-order, PO, site, or project reference.
5. Subtotal, applicable tax treatment, credits, and total due.
6. Payment terms.
7. Stripe business profile `@alreadyherellc`.
8. Provider-issued Stripe invoice or payment link when electronic payment is requested.
9. dispatch@alreadyherellc.com for payment questions and remittance confirmation.

## Proposal requirements

Every proposal or quote that includes pricing must include the canonical payment block
above near the commercial terms. A proposal may identify Stripe as the payment processor
and `@alreadyherellc` as the business profile, but it must not contain payout-bank
information.

## Client-onboarding requirements

The onboarding packet must explain the approved payment workflow, require the client to
reference the invoice number on remittance, and direct payment questions to
dispatch@alreadyherellc.com.

## Bank-detail privacy rule

Payout-bank names, account numbers, routing numbers, account-ending identifiers, and
screenshots of payout settings must never be published on:

- the public website;
- public repositories or public documentation;
- proposals or capability statements;
- generic client-onboarding packets;
- marketing content, social posts, articles, or newsletters.

If a client requires ACH/vendor setup, banking instructions may be provided only through
a verified private AP channel. A requested change to remittance instructions must be
independently verified using a previously known Already Here LLC contact before funds are
sent.

## Source-of-truth rule

The Stripe handle is stored in `lib/site.ts` as `siteConfig.stripeProfileHandle`.
Website payment controls must read from that value rather than duplicating the handle in
multiple components. Stripe Checkout metadata must retain the business name and Stripe
profile handle for reconciliation.
