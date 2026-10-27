# Phoenix Cabling — Live Business-Mailbox Acceptance Evidence

**Evidence date:** 2026-10-25 (UTC). **Environment:** current business website and connected email provider. **Type:** read-only reconciliation of an existing *internal, noncustomer* test. No new outbound message, customer commitment, purchase, upgrade or paid service was initiated for this review.

## Acceptance verdict

**PASS for website -> existing email service -> owned Gmail inbox**, using an internal QA submission. **NOT YET PROVEN for end-to-end owned SQLite outbox -> real internet mailbox, or for account-level $0 invoicing.**

The independent local-owned SMTP proof is in `docs/NO_SPEND_DELIVERY_PROOF.md`, supported by `tests/owned-loopback-delivery.test.mjs`. The live-mailbox evidence below confirms a separate existing hosted sender, not that the new SQLite outbox is wired to Resend.

## Source-specific evidence

| Gate | Observed evidence | Result |
| --- | --- | --- |
| Owned sender authorization | Connected email-provider domain `alreadyherellc.com` is verified; sending enabled; receiving disabled at provider | PASS |
| Test request | An existing synthetic lead for a company-owned QA mailbox was recorded at 2026-10-25T11:20:22Z | PASS |
| Owner notification | Provider reports delivered; independently present in connected Gmail inbox with matching lead reference | PASS |
| Checklist receipt | Provider reports delivered; independently present in Gmail with working guide link in message body | PASS |
| Database | Owner notification says `Canonical graph persisted true`; no independent database row read in this review | Application-reported |
| Marketing opt-in | QA submission has `Marketing permission no`; no new marketing automation run at its timestamp | PASS |
| Resend quota snapshot | 2 / 100 daily, 14 / 3,000 monthly, 3 / 10,000 automation runs | Below published free thresholds |
| Actual provider subscription billing | The tool provides usage and limits, not authoritative current plan invoices, payment-method state, or pay-as-you-go setting | UNVERIFIED |
| Self-hosted queue to real email | The owned SQLite outbox has independent loopback-only SMTP proof; no Internet-mail transport attached | NOT IMPLEMENTED |
| Facebook/Instagram Meta DM | No connected business accounts returned; only separate TikTok account visible | BLOCKED: external OAuth |

Provider publishes a $0/month Free tier with 100 daily and 3,000 monthly transactional emails, with paid pay-as-you-go overages available on paid tiers only: https://resend.com/pricing . That published price and a low usage count **do not certify the specific account has incurred $0 in fees or has paid overages disabled**. This account's billing portal must be read before the production service is marked as zero-charge-certified. Do not infer lack of charges from absent billing emails.

## Privacy of evidence

The recipient mailbox, message URLs, provider object identifiers, customer-identifying information and any email body beyond the generic checklist link have been deliberately omitted from this source-controlled summary. The original evidence remains inside authorized account interfaces. No secrets are required to reproduce the GitHub CI local SMTP proof.

## Next safe execution gates

1. **Billing attestation:** inspect authorized account billing plan, outstanding invoices, transactional overages switch and attached payment method in the provider's own account UI. If not verifiable, keep account billing status **unknown**, not free.
2. **Safety ceiling:** enforce actual atomic, all-sender quota reservations in the *real outbound adapter*, accounting for other systems using the same provider account, with a buffer below provider limits. The present owner-hosted quota is verified only for the local SMTP test.
3. **Real sending from owned outbox:** implement an authorized outbound transport with TLS, bounce/complaint signals, recipient verification, suppression and proof-of-delivery, and run one internal approved message. Do not route prospect records to it until parity is verified.
4. **Business hosting:** verify commercial-use permission, actual invoice amount and absence of paid automatic scaling on the public deployment; keep production online during any self-hosting migration.
5. **Social:** account owner must complete Facebook and Instagram OAuth and ManyChat (if still selected). These are not connected as of this check.
6. **Global portability:** test backup/restore, idempotency, timezone, tenant isolation, security controls, market consent rules and provider quota limits for each new jurisdiction.

**No simulated sale, generated invoice, tax payment, or external customer communication occurred in this acceptance review.**
