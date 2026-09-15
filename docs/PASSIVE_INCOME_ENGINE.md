# Passive Income Engine — Reviewed Spec (A+ Revision)

Reviewed and rebuilt from the "Enterprise AI Passive Income Engine" blueprint. This document
is the operating spec for the implementation in `lib/passive-income-engine.ts`.

## Review verdict on the original blueprint

| Area | Blueprint gap | A+ fix |
| --- | --- | --- |
| Code samples | Collapsed imports, broken Typst/Markdown fences, `loop` variable unused, n8n JSON incomplete | Treated as a spec, not copied. One typed TypeScript engine replaces Python + n8n. |
| Automation | "Fully automated" listing, uploads, publishing | Side effects that touch money or public surfaces are **approval-gated**. Agents produce packets; humans click. |
| Quality | No acceptance criteria, no retries | Every agent has weighted checks, a 90/95 pass threshold, one bounded retry with feedback, and downstream halt on failure. |
| Provider risk | Assumes Groq/Gemini always answer | Uses the existing gateway chain (gateway -> Groq -> Gemini). Any null/garbage response falls back to deterministic templates with `provenance` recorded. |
| Spend | "Zero upfront" asserted, not enforced | `spendUsd: 0` on every run; supervisor policy forbids `paid_api_call`, `move_money`, `auto_publish`, `auto_upload`. |
| Compliance | No disclosures | AI-assisted disclosure on books, listings, and newsletters; affiliate disclosure; `GenerativeAI=true` on stock CSV; no people/faces/brands in image prompts. |
| Claims | Implied income projections | No revenue promises anywhere. Forbidden-claim scan (`guaranteed income`, `risk-free`, `get rich quick`, official endorsement) is a quality check. |

## Architecture

```
SystemInput --> pie-supervisor --> [agent 1] -> [agent 2] -> ... -> EngineRun
                                    |  each: draft -> checks -> score -> retry(<=1) -> artifacts
                                    +-- approvalRequired stages end as passed_pending_approval
```

One specialized agent per process (10 total), grouped into three systems:

| System | Agents (in order) | Approval gate |
| --- | --- | --- |
| `technical-ebook` | `pie-ebook-outline` -> `pie-ebook-chapters` -> `pie-ebook-compiler` -> `pie-ebook-listing` | listing |
| `stock-asset-factory` | `pie-stock-prompts` -> `pie-stock-metadata` -> `pie-stock-upload` | upload |
| `industry-newsletter` | `pie-news-ingest` -> `pie-news-synthesis` -> `pie-news-publish` | publish |

Grades: A+ >= 95, A >= 90, B >= 80, C >= 65, else F. A run is `ok` only if no stage failed.

## Surfaces

- **Library**: `runIncomeSystem(input, ctx?)`, `verifyPassiveIncomeEngine()`, registries.
- **API**: `GET /api/passive-income[?system=|view=verify]` (public metadata), `POST /api/passive-income`
  (internal key via `AHFOS_INTERNAL_API_KEY`; 422 when a stage fails).
- **CLI**: `npm run income:ebook -- --topic "..."`, `npm run income:stock -- --niche ...`,
  `npm run income:newsletter` (fetches `data/passive-income-feeds.json` feeds). Add `--offline`
  to skip providers. Writes artifacts + `run.json` under `.tmp/passive-income/<runId>/`; compiles
  `book.typ` with `typst` if installed.
- **CI**: `.github/workflows/passive-income-engine.yml` — manual dispatch for any system, weekly
  newsletter draft. Artifacts are uploaded for human review; nothing is published from CI.
- **Tests**: `npm run test:passive-income`.

## Human approval checklist (per run)

1. Open `run.json`; confirm `spendUsd === 0` and `overallGrade` is A or A+.
2. Review `approvalQueue` artifacts (`listing.json`, `stock-upload.csv`, `publish-packet.json`).
3. eBook: compile PDF, spot-check code blocks, then create the Gumroad/Payhip product manually.
4. Stock: generate images from `prompt-batch.json` on a free tier, upscale, verify no faces/brands,
   then upload with `stock-upload.csv`.
5. Newsletter: paste `newsletter.md` into Beehiiv/Substack as a draft, verify links + disclosures, schedule.

## Roadmap alignment

Phase 1 (eBook) and Phase 3 (newsletter) ship as complete pipelines. Phase 2 (stock) ships
prompts/metadata/CSV; image generation remains a manual free-tier step by design (no paid APIs).
