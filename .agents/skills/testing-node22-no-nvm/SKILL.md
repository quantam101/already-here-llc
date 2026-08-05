---
name: testing-node22-no-nvm
description: How to run the already-here-llc quality gate when nvm is unavailable but a Node 22 install exists, and how to extract the Vercel preview URL from GitHub PR comments.
---

## Node 22 without nvm

If `nvm` is not installed but Node 22 is present under `/home/ubuntu/.nvm/versions/node/v22.12.0/bin`, prepend that directory to `$PATH` before running any `npm` or `node` commands:

```bash
export PATH=/home/ubuntu/.nvm/versions/node/v22.12.0/bin:$PATH
node --version  # should be v22.x
```

Use this for the full quality gate:

```bash
npm run lint
npm run typecheck
npm run build
node scripts/a-plus-content-guard.mjs
npm run test
```

Note: `npm install` may emit an `EBADENGINE` warning from `eslint-visitor-keys` wanting Node `^22.13.0`; this does not block the gate on Node `22.12.0`.

## Vercel preview URL when `git_view_pr` is unavailable

If the shell `git_view_pr` command is disabled, use the GitHub API to read the Vercel bot comment and decode the preview domain:

```bash
gh auth status   # ensure the token is active
gh api repos/<owner>/<repo>/issues/<pr>/comments --jq '.[] | select(.user.login == "vercel[bot]") | .body'
```

The Vercel comment contains a `[vc]: #<signature>:<base64>` block. Decode the base64 payload (it is a JSON object) and read `projects[0].previewUrl`. The Vercel status check also exposes a dashboard `target_url` but not the live preview domain.

## Testing the scooter rental intake

- Hide the bottom floating CTA (`Need a Phoenix technician today?`) via a one-time `display: none` in the browser console if it obstructs form fields.
- The form uses uncontrolled inputs; setting `value`/`checked`/`selectedIndex` on elements and then triggering the submit button is sufficient for validation.
- The `/api/scooter-rental` endpoint returns `{ message, rentalId, status }` even when `RESEND_API_KEY` is unset.
