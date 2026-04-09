# Already Here LLC

Production website and controlled commercial intake system for Already Here LLC.

## Purpose

This project exists to:

- position the business as a field execution partner
- qualify buyer intent
- route dispatch requests
- support trust, conversion, and public credibility

## Stack

- Next.js App Router
- GitHub source of truth
- Vercel production runtime
- GoDaddy DNS

## Canonical domains

- https://www.alreadyherellc.com
- https://alreadyherellc.com

Apex redirects to www. www serves production.

## Public routes

- /
- /services
- /who-we-serve
- /dispatch
- /contact
- /service-area
- /privacy
- /thank-you

## Governance

This repo is governed by:

- ARCHITECTURE.md
- DECISIONS.md
- RUNBOOK.md
- docs/BUILD_OPERATING_STANDARD.md

## Local development

Expected commands:

    npm install
    npm run dev
    npm run build
    npm run start
    npm run lint

## Environment model

- local
- preview
- production

Do not expose secrets in frontend code.