# Master Document

## 1. Project Purpose

Already Here LLC is a lean B2B field-service website and intake system designed to convert qualified leads into dispatch requests and service inquiries. The current implementation focuses on clear positioning, trust signals, service area framing, and a controlled dispatch intake path.

## 2. Executive Summary

- Product type: marketing website + intake workflow
- Primary stack: Next.js App Router, TypeScript, Tailwind CSS
- Hosting model: Vercel for the public site, with supporting operational tooling in the repo
- Core commercial action: request dispatch
- Primary audience: agencies, service providers, and field execution buyers

## 3. Repository at a Glance

- app/: Next.js App Router pages and route handlers
- components/: reusable UI sections and forms
- lib/: site, metadata, dispatch, and content utilities
- docs/: governance, launch, operational, and planning references
- infra/: OCI and deployment support for runtime and gallery automation
- hermes/: agentic operating system and workflow artifacts
- tests/: validation and QA coverage

## 4. Core User Flows

### Primary flow
1. Visitor lands on the homepage and sees positioning, proof, and service framing.
2. Visitor explores services, coverage, and audience-fit content.
3. Visitor initiates dispatch or contact through the intake path.
4. Submission is routed through the dispatch API and forwarded to the configured endpoint.

### Secondary flow
- Review service details
- Review who the service fits
- Submit a general contact request
- Follow the thank-you completion path

## 5. Runtime and Deployment

- Frontend runtime: Next.js App Router
- Hosting target: Vercel
- Domain baseline: www.alreadyherellc.com with apex redirect to the www host
- Primary intake endpoint: /api/dispatch
- Required environment variable for production form delivery: FORMSPREE_ENDPOINT

## 6. Key Routes

- / — homepage and primary positioning
- /services — service groups and fit framing
- /who-we-serve — audience qualification
- /dispatch — controlled intake path
- /contact — secondary contact path
- /service-area — coverage framing
- /privacy — policy baseline
- /thank-you — post-submit state

## 7. Operational Notes

- Local development starts with npm install and npm run dev.
- Production QA should verify homepage presentation, trust markers, dispatch CTA behavior, form submission reliability, file handling, and final user experience on mobile and desktop.
- The dispatch path depends on a valid configured endpoint; without it, form rendering still works but submission will fail.

## 8. Governance and Risk Areas

Current governance and delivery risks include:

- limited CI coverage
- limited smoke test coverage
- limited observability
- undocumented integrations
- live edits without full governance history

## 9. Launch Readiness Principles

The project should not be considered production-ready until the launch checklist is satisfied:

- CI, lint, typecheck, and tests pass
- security checks pass
- no secrets are exposed
- no-spend policy and approval gates are active
- backups, restore, HTTPS, and monitoring are verified
- rollback and domain controls are documented

## 10. Recommended Next Actions

1. Strengthen CI and automated smoke tests.
2. Document all external integrations and operational dependencies.
3. Add observability and deployment monitoring.
4. Formalize release, rollback, and governance procedures.
5. Keep the master document updated as the product and operations evolve.
