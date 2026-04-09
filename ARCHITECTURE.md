# Architecture

## System role

This project is a production website and intake system for a field execution business.

## Runtime

- Frontend: Next.js App Router
- Hosting: Vercel
- Source control: GitHub
- DNS: GoDaddy
- Primary production host: www.alreadyherellc.com
- Apex redirect: alreadyherellc.com -> www.alreadyherellc.com

## Core routes

- / = homepage and primary positioning
- /services = service groups and fit framing
- /who-we-serve = audience qualification
- /dispatch = controlled intake path
- /contact = secondary contact path
- /service-area = coverage framing
- /privacy = policy baseline
- /thank-you = post-submit state

## API

- /api/dispatch = dispatch handling path

## Commercial model

Primary commercial action: request dispatch.

Secondary actions:

- review services
- review fit
- email dispatch

## Architecture risks

- missing or weak CI
- missing smoke tests
- missing observability
- undocumented integrations
- iterative live edits without full governance history