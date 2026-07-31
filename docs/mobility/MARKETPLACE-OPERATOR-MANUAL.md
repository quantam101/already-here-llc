# Already Here Marketplace — Operator Manual

How to access the marketplace, use it from the renter/owner/worker side, and operate it as a business.

## 1. What this is

The `/marketplace` page is the public hub where anyone can:

- **Browse** vehicles, equipment, and spaces for rent, lease, or sale.
- **List** their own vehicle, equipment, or space.
- **Request** a vehicle, equipment, or space.
- **Find work or find workers** at `/connect`.

It currently supports scooter rentals directly and captures leads for every other category. The site routes submissions into your operating database and sends a notification email for each lead.

## 2. Access

### Public URLs

| Page | URL | Purpose |
|------|-----|---------|
| Marketplace hub | `https://www.alreadyherellc.com/marketplace` | Browse all categories, search/filter, submit an intake |
| Scooter rentals | `https://www.alreadyherellc.com/scooter-rentals` | Turnkey scooter rental intake and pricing |
| Find work / workers | `https://www.alreadyherellc.com/connect` | People-to-people contract matching |
| Owner dashboard | `https://www.alreadyherellc.com/dashboard` | Listings, rentals, matches, referrals, payments (preview) |
| Referrals | `https://www.alreadyherellc.com/dashboard/referrals` | Generate/share a referral code |
| Payments | `https://www.alreadyherellc.com/dashboard/payments` | Stripe checkout preview |

`/fleet-marketplace` automatically redirects to `/marketplace`.

### Run it locally

```bash
cd /home/ubuntu/repos/already-here-llc
npm install
npm run dev
```

Open `http://localhost:3000/marketplace`.

For the full quality gate:

```bash
npm run lint
npm run typecheck
npm run build
node scripts/a-plus-content-guard.mjs
source ~/.nvm/nvm.sh && nvm use 22 && npm run test
```

## 3. How to use as a renter, buyer, or demand source

1. Go to `/marketplace`.
2. Scroll to **"Request anything"** or click **"List an asset"** if you have supply.
3. Fill out the marketplace intake form:
   - **I am a**: choose your role (driver, business needing vehicles, etc.).
   - **Category**: delivery, farming, construction, entertainment, camping, parties, bounce houses, water sports, apartments, storage, etc.
   - **Vehicle / equipment type**: select from the dropdown or describe.
   - **Preferred arrangement**: rent, lease, sell, revenue-share, managed fleet, service.
   - **Start date, end date, estimated rental length, and flexibility**: tells the owner/operator when you need it.
   - **Interests**: check all that apply (e.g., scooter rental, farm equipment, apartment rental).
   - **Business need**: number of vehicles, service area, schedule, budget.
   - **Notes**: anything else.
4. Agree to the consent checkboxes and submit.
5. The page shows a `MOB-...` reference number. An email is sent to the configured dispatch address.

To rent a scooter directly, use `/scooter-rentals` and choose the weekly or monthly plan.

## 4. How to use as an owner, seller, or supply source

1. Go to `/marketplace`.
2. Click **"List an asset"**.
3. In the form:
   - Select **"vehicle_owner"** or **"fleet_partner"**.
   - Choose the matching category and vehicle/equipment type.
   - Enter year, make, model, mileage/hours, condition, asking price, and photos/description in the **Vehicle or equipment information** section.
   - Add availability, preferred arrangement, pickup/return rules, and pricing notes in the free-text fields.
4. Submit. You receive a `MOB-...` reference.

Currently the site captures leads and emails them to you. Later, owner dashboard features will let you edit live listings and set availability.

## 5. How to find or offer work (`/connect`)

`/connect` is the people-to-people layer:

- **I have skills / want work**: drivers, technicians, contractors, event staff, equipment operators, cleaners, etc.
- **I need people / contractors**: businesses or owners who need labor.

Fill out the form, check the relevant roles or needs, and submit. The system sends a `CNT-...` reference and routes the record to your email/webhook.

## 6. Dashboard overview

`/dashboard` is a preview control panel with links to:

- **My listings** → `/marketplace`
- **My rentals** → `/scooter-rentals`
- **My work & contracts** → `/connect`
- **Referrals** → `/dashboard/referrals`
- **Payments** → `/dashboard/payments`

Live statistics, editable listings, and match tracking require a connected database.

## 7. How to sell / monetize

### Scooter rental pricing

| Plan | Rate | Best for |
|------|------|----------|
| Weekly | $155/week | Short-term / try it out |
| Monthly | $550/month | Longer-term renters; lower churn |
| Onboarding | $305 one-time | First week + $150 refundable deposit |

### Upsell: Pro Delivery Kit

Pre-selected at intake. Adds ~$25/week for wireless mount, LED vest, gloves, rain cover, and phone charger. Target >50% attachment.

### Waitlist and deposit pre-pay

The scooter intake form includes:

- **Waitlist checkbox**: capture demand when scooters are out.
- **Pay deposit now**: collect the $150 security deposit early to confirm commitment.

### Referrals

- Go to `/dashboard/referrals` to get a unique code such as `AH-A1B2C3`.
- Share the link `https://www.alreadyherellc.com/scooter-rentals?ref=AH-A1B2C3`.
- Referrer earns a $25 account credit after the referred renter completes four paid weeks.
- The form validates the `?ref=` code and ignores malformed codes.

### Marketplace conversion

For non-scooter categories, use the marketplace intake to capture interest. You then:

1. Screen ownership, registration, insurance, and condition.
2. Set pricing or revenue-share terms.
3. Manually match supply and demand from the submitted records.
4. Move to written agreement, payment/deposit, and handoff.

### Payments

`/dashboard/payments` shows a Stripe checkout button for the $305 scooter onboarding amount. To collect live payments, add these to your Vercel environment variables:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

For subscriptions (weekly/monthly), enable Stripe Billing products and link them to the checkout session.

## 8. Notification and follow-up channels

The site uses **Resend** for email. Each marketplace submission sends an email to the address configured in `DISPATCH_TO_EMAIL` or `MOBILITY_TO_EMAIL`.

For SMS (waitlist alerts, booking confirmations, matched work), add to Vercel:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

Templates live in `lib/sms.ts` and the sending endpoint is `/api/sms`.

## 9. Daily operating workflow

1. **Check submissions**: review the email or webhook payload for `MOB-...` (marketplace) and `CNT-...` (connect) records.
2. **Screen leads**:
   - Renter: license, delivery app eligibility, insurance, deposit/card.
   - Owner: title/registration, insurance, photos, condition, pricing.
   - Business: legal name, route/cargo needs, budget, insurance.
   - Worker: skills, availability, background, transportation.
3. **Match**: compare category, vehicle type, dates, rental length, budget, and geography.
4. **Quote**: send a written estimate or agreement.
5. **Collect deposit/payment** through Stripe or manual invoice.
6. **Document**: before-and-after photos, inspection checklist, mileage/hours, fuel/charge level.
7. **Track**: utilization, on-time returns, damage, maintenance, repeat rate.

## 10. Compliance and safety checklist

- Do not represent renters or workers as employees unless formally hired and classified.
- Confirm insurance covers the intended commercial or rental use.
- Use written rental/lease/revenue-share agreements reviewed for Arizona law.
- Do not handle controlled substances, hazardous materials, firearms, cash, or regulated medical specimens without proper authority.
- Keep title, SSN, bank, policy numbers, and other sensitive data out of the public intake forms.
- Mark unverified listings as "coming soon" until screening is complete.

## 11. Quick-start checklist

- [ ] Set `RESEND_API_KEY` and `DISPATCH_TO_EMAIL` in Vercel so intake emails arrive.
- [ ] Add `STRIPE_*` keys when ready to collect deposits/subscriptions.
- [ ] Add `TWILIO_*` keys when ready to send SMS.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the production domain.
- [ ] List the first scooter as "available" and the rest of the categories as "coming soon" until vetted.
- [ ] Share the referral link with the first renters.
- [ ] Post marketplace listings to Craigslist, Facebook Marketplace, Nextdoor, and local gig forums using the marketing copy in `docs/field-ops/SCOOTER-RENTAL-MARKETING.md`.
