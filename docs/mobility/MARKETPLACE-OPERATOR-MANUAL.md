# GINC — Growth & Interconnected Networks Collective

A DBA of Already Here LLC.

How to access, use, and operate the GINC network that connects people, vehicles, equipment, spaces, and work.

## 1. What this is

GINC is a multi-sided network, not just a marketplace. It connects:

- **Owners** with idle vehicles, equipment, tools, spaces, or real estate.
- **Renters/buyers** who need vehicles, equipment, spaces, or short-term capacity.
- **Workers** who want jobs, contracts, or recurring crew relationships.
- **Businesses** that need people, vehicles, equipment, or extra capacity.

Public pages:

- `/ginc` — network landing page
- `/ginc/join` — create a member profile
- `/ginc/list` — list an asset, vehicle, space, or equipment
- `/ginc/work` — post a job, contract, or work need
- `/ginc/network` — browse members, listings, work posts, and matches
- `/marketplace` — legacy marketplace hub (redirects to `/ginc` over time)
- `/connect` — GINC Work matching
- `/scooter-rentals` — turnkey scooter rental intake
- `/dashboard` — preview control panel

The site captures submissions, stores them (Redis/Upstash in production, in-memory/file in local dev), and sends a notification email for each lead.

## 2. Access

### Public URLs

| Page | URL | Purpose |
|------|-----|---------|
| GINC hub | `https://www.alreadyherellc.com/ginc` | Join, list, post work, browse |
| Join the network | `https://www.alreadyherellc.com/ginc/join` | Create a member profile |
| List an asset | `https://www.alreadyherellc.com/ginc/list` | Add a vehicle, tool, space, or equipment listing |
| Post work / need | `https://www.alreadyherellc.com/ginc/work` | Post a job, contract, or worker need |
| Browse network | `https://www.alreadyherellc.com/ginc/network` | Filter and match members, listings, and jobs |
| Scooter rentals | `https://www.alreadyherellc.com/scooter-rentals` | Turnkey scooter rental intake and pricing |
| GINC Work | `https://www.alreadyherellc.com/connect` | People-to-people work matching |
| Dashboard | `https://www.alreadyherellc.com/dashboard` | Listings, rentals, matches, referrals, payments (preview) |

### Run it locally

```bash
cd /home/ubuntu/repos/already-here-llc
npm install
npm run dev
```

Open `http://localhost:3000/ginc`.

For the full quality gate:

```bash
npm run lint
npm run typecheck
npm run build
node scripts/a-plus-content-guard.mjs
source ~/.nvm/nvm.sh && nvm use 22 && npm run test
```

## 3. How to join GINC

1. Go to `/ginc/join`.
2. Choose your role: owner, renter, worker, or business.
3. Enter name, email, phone, city, state, and ZIP.
4. Add skills, assets, or a short bio.
5. Submit. You receive a `MEM-...` reference ID. Keep it to list assets or post work.

## 4. How to list an asset or space

1. Go to `/ginc/list`.
2. Enter your member ID if you already joined, or fill out the profile fields.
3. Select category, asset type, title, price, and period.
4. Add location, description, and availability notes.
5. Submit. The listing receives an `LST-...` reference and appears in `/ginc/network`.

Supported categories include delivery/gig vehicles, farming, construction, entertainment, camping, parties, bounce houses, water sports, bicycles, apartments, rooms, storage, parking, fleet overflow, and specialty assets.

## 5. How to post work or a need

1. Go to `/ginc/work`.
2. Enter your member ID or profile information.
3. Select category, asset/need type, title, schedule, and budget.
4. Describe the scope and whether the work could become recurring.
5. Submit. The post receives a `JOB-...` reference and appears in `/ginc/network`.

## 6. How to browse and match

`/ginc/network` shows:

- **Matches** — listings, jobs, and members scored by state, category, and asset/need type
- **Listings** — all available assets and spaces
- **Work** — all open job/contract posts
- **Members** — all profiles

Use the filter form to narrow by state, category/keyword, or asset/need type. Matching uses a simple token-overlap score; production scale will move to a persistent database with geospatial and vector search.

## 7. Dashboard overview

`/dashboard` is a preview control panel with links to:

- **My listings** → `/ginc/network`
- **My rentals** → `/scooter-rentals`
- **My work & contracts** → `/connect`
- **Network** → `/ginc/network`
- **Referrals** → `/dashboard/referrals`
- **Payments** → `/dashboard/payments`

Live statistics, editable listings, and match tracking require authentication and a connected database or Redis.

## 8. How to sell / monetize

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

### GINC network monetization

- **Listing fees**: owners may pay a small fee per listing or a monthly subscription once volume grows.
- **Transaction/admin fee**: a percentage of each rental, sale, or job contract handled through GINC.
- **Managed fleet partnerships**: GINC sources vehicles/equipment and handles marketing, maintenance, and payout for a recurring fee or revenue share.
- **Implementation revenue**: setup, onboarding, inspection, insurance review, and compliance services for businesses joining the network.
- **Advertising/promoted listings**: featured placement for owners and businesses.

## 9. Data storage

Local development:

- The app reads from `data/ginc-network.json` and falls back to in-memory storage if the file is missing or read-only.
- Writes are persisted to the file in dev, but lost on Vercel because functions are stateless.

Production:

- Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel environment variables.
- GINC will use Upstash Redis to persist members, listings, jobs, and matches across requests.
- For high-volume scaling, migrate to Vercel Postgres, Neon, or another managed database with full search and indexing.

## 10. Notification and follow-up channels

The site uses **Resend** for email. Each GINC submission sends an email to the address configured in `DISPATCH_TO_EMAIL` or `MOBILITY_TO_EMAIL`.

For SMS (waitlist alerts, booking confirmations, matched work), add to Vercel:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

Templates live in `lib/sms.ts` and the sending endpoint is `/api/sms`.

## 11. Daily operating workflow

1. **Check submissions**: review email/webhook payloads for `MEM-...`, `LST-...`, and `JOB-...` records.
2. **Screen leads**:
   - **Owner**: title/registration, insurance, photos, condition, pricing.
   - **Renter**: license, delivery app eligibility, insurance, deposit/card.
   - **Business**: legal name, route/cargo/crew needs, budget, insurance.
   - **Worker**: skills, availability, background, transportation.
3. **Match**: use `/ginc/network` or compare submissions manually by category, asset type, state/city, schedule, and budget.
4. **Introduce**: connect matched members by email, phone, or SMS.
5. **Quote**: send written estimate or agreement.
6. **Collect deposit/payment** through Stripe or manual invoice.
7. **Document**: before-and-after photos, inspection checklist, mileage/hours, fuel/charge level.
8. **Track**: utilization, on-time returns, damage, maintenance, repeat rate, repeat work relationships.

## 12. Compliance and safety checklist

- GINC is a DBA of Already Here LLC. Operate under the existing LLC's insurance, tax, and liability framework.
- Do not represent renters or workers as employees unless formally hired and classified.
- Confirm insurance covers the intended commercial or rental use.
- Use written rental/lease/revenue-share/contract agreements reviewed for the state where the asset or work is used.
- Do not handle controlled substances, hazardous materials, firearms, cash, or regulated medical specimens without proper authority.
- Keep title, SSN, bank, policy numbers, and other sensitive data out of public intake forms.
- Mark unverified listings and jobs as "pending" until screening is complete.
- Comply with consumer protection, privacy, fair housing, and transportation laws in every state where the network operates.

## 13. Quick-start checklist

- [ ] Set `RESEND_API_KEY` and `DISPATCH_TO_EMAIL` in Vercel so intake emails arrive.
- [ ] Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to persist GINC data in production.
- [ ] Add `STRIPE_*` keys when ready to collect deposits/subscriptions.
- [ ] Add `TWILIO_*` keys when ready to send SMS.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the production domain.
- [ ] List the first scooter as "available" and the rest of the categories as "coming soon" until vetted.
- [ ] Share the referral link with the first renters.
- [ ] Post GINC listings to Craigslist, Facebook Marketplace, Nextdoor, and local gig forums using the marketing copy in `docs/field-ops/SCOOTER-RENTAL-MARKETING.md`.
