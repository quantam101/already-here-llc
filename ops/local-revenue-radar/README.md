# Local Revenue Radar / Lead Network Exchange

Local Revenue Radar is an isolated ops module for finding, scoring, routing, and exporting local service opportunities. It does not modify website routes, contact third parties, submit bids, or scrape restricted social platforms.

## Files

- `sources.config.json` defines home-market scope, approved sources, allowed source use, local capabilities, lead states, and scoring weights.
- `procurement-radar.json`, `medical-courier-radar.json`, `hotshot-radar.json`, and `field-service-radar.json` define category-specific source rules and compliance guardrails.
- `opportunity-scoring-rules.json` controls deterministic scoring thresholds, penalties, and category fit rules.
- `lead-ingestion-engine.js` validates source policy, normalizes raw leads, assigns categories, and calls the router.
- `lead-scoring-engine.js` scores opportunities and classifies them into `DO_IT`, `REFER_IT`, `SELL_IT`, `SUBCONTRACT_IT`, or `IGNORE_IT`.
- `lead-router.js` maps scored leads to human workflow states and next actions.
- `rss-monitor.js` monitors only approved public RSS sources. Facebook and Nextdoor are manual intake or authorized API only.
- `crm-export.js` exports accepted leads to CRM-ready JSON or CSV.
- `analytics-engine.js` summarizes pipeline readiness, route mix, revenue estimate, and compliance review needs.
- `referral-tracker.json` defines consent, partner, and audit requirements for referral exchange workflows.
- `samples/sample-lead.json` provides a local test lead.

## Usage

```js
import sourcesConfig from './sources.config.json' assert { type: 'json' };
import sampleLead from './samples/sample-lead.json' assert { type: 'json' };
import { ingestLead } from './lead-ingestion-engine.js';
import { exportCrmCsv } from './crm-export.js';
import { summarizePipeline } from './analytics-engine.js';

const result = ingestLead(sampleLead, sourcesConfig);
console.log(result.routing);
console.log(exportCrmCsv([result]));
console.log(summarizePipeline([result]));
```

Node tests use `createRequire` to load JSON so the repo does not need to change its root module type.

## Environment Variables

No static API keys are embedded. Any future authorized integrations must read secrets from environment variables only.

- `LOCAL_REVENUE_RADAR_USER_AGENT`: optional user agent string for public RSS monitoring.
- `MEDICAL_COURIER_API_BASE_URL`: optional authorized medical courier API base URL.
- `MEDICAL_COURIER_API_TOKEN`: optional authorized medical courier API token.

## Operating Guardrails

- No auto-bidding, bid submission, certification claims, or third-party contact.
- No Facebook or Nextdoor scraping. Use manual intake or authorized APIs only.
- Public RSS monitoring is limited to configured sources with `allowed_use: public_rss`.
- Referral exchange requires customer consent, source terms review, partner acceptance, and written referral terms.
- Medical courier opportunities require human review for chain of custody, certification, insurance, and restricted-material scope.

## Local Validation

Run the module test:

```bash
npm run test:local-revenue-radar
```

Recommended full repo checks:

```bash
npm run lint
npm run typecheck
npm run build
```
