# A+ Launch Checklist

This checklist defines the final operating standard for Already Here LLC production readiness.

## P0: Live public site

- Homepage exposes Request Dispatch, Request Project Quote, Project Gallery, and Coverage.
- Header exposes RFQ, Gallery, Coverage, and Dispatch.
- No unsupported SDVOSB certification claims.
- No set-aside or sole-source language unless verified.
- No buyer-facing endpoint/configuration warnings.
- No dead /contact links.
- Dispatch page does not show duplicate numbering.

Run:

```bash
node scripts/a-plus-content-guard.mjs
node scripts/live-smoke-test.mjs
```

## P1: Intake workflow

- Dispatch form loads.
- RFQ form loads.
- Attachment upload field accepts PDF/JPG/PNG.
- Requester receipt is sent.
- Owner notification is sent.
- Dispatch ID is generated.
- JSON dispatch record is attached or stored.

Dry-run:

```bash
node scripts/intake-contract-smoke.mjs
```

Live submit test only when ready:

```bash
INTAKE_SMOKE_MODE=submit node scripts/intake-contract-smoke.mjs
```

## P1: Oracle runner

Install:

```bash
sudo bash infra/hermes-oci-runner/install-hermes-oci-runner.sh
```

Required env file:

```text
/etc/already-here/hermes-runner.env
```

Start:

```bash
sudo systemctl start hermes-oci-runner.service
sudo journalctl -u hermes-oci-runner.service -f
```

## P1: OCI gallery agent

Install:

```bash
sudo bash infra/oci-gallery-agent/install-oci-agent.sh
```

Required env file:

```text
/etc/already-here/gallery-agent.env
```

Start:

```bash
sudo systemctl start already-here-drive-sync.service
sudo systemctl start already-here-drive-sync.timer
sudo systemctl start already-here-gallery-agent.service
```

## P1: Approved project photos

Google Drive structure:

```text
Already Here LLC / Website Gallery / Approved
Already Here LLC / Website Gallery / Do Not Publish
Already Here LLC / Website Gallery / Archive
```

Only Approved content syncs to Oracle:

```text
/opt/already-here-gallery/source
```

Do not publish photos containing:

```text
faces without approval
badges
client credentials
license plates
serial numbers
patient or medical details
restricted signage
addresses
QR codes
```

## P1: Full Hermes quality sequence

Copy this into `hermes/runner-queue.json` when the Oracle runner is installed:

```bash
cp hermes/runner-queue.a-plus-template.json hermes/runner-queue.json
git add hermes/runner-queue.json
git commit -m "queue A+ launch verification"
git push origin main
```

The runner will execute:

```text
health.check
a-plus.content-guard
socrates.review
redteam.review
pareto.prioritize
a-plus.live-smoke-test
a-plus.intake-contract-smoke
drive.sync
gallery.rotate
```

## A+ acceptance standard

The build reaches A+ when:

- Vercel production deploys successfully.
- A+ content guard passes.
- Live smoke test passes.
- Intake dry-run passes.
- One real RFQ and one real dispatch test complete successfully.
- Oracle runner is online.
- Gallery agent is online.
- At least 3 approved project photos are published.
- SOCRATES, REDTEAM, and PARETO receipts exist after live runner execution.
