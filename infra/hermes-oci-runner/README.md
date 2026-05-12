# Hermes OCI Shell Runner

This is not an open remote shell. It is a governed, allowlisted command runner for the Oracle Cloud VM.

## Why this exists

It gives the operator a safe way to queue approved Oracle-side tasks from GitHub without exposing SSH or allowing arbitrary shell commands.

## Security model

```text
No open shell
No arbitrary command execution
Only allowlisted commands in hermes/runner-policy.json
Every job writes a SHA-256 receipt
Runner commits queue status and receipts back to GitHub
```

## Install on Oracle VM

From the repository root:

```bash
sudo bash infra/hermes-oci-runner/install-hermes-oci-runner.sh
```

Edit:

```text
/etc/already-here/hermes-runner.env
```

Set:

```bash
HERMES_REPO_URL=https://x-access-token:<TOKEN>@github.com/quantam101/already-here-llc.git
```

Start:

```bash
sudo systemctl start hermes-oci-runner.service
sudo systemctl status hermes-oci-runner.service
sudo journalctl -u hermes-oci-runner.service -f
```

## Queue a job

Edit `hermes/runner-queue.json` and add a queued job:

```json
{
  "schemaVersion": 1,
  "queue": [
    {
      "id": "job-001",
      "command": "health.check",
      "status": "queued"
    }
  ]
}
```

Commit and push. The OCI runner will pick it up, execute if allowlisted, then update the job status and write a receipt.

## Allowlisted commands

```text
health.check
socrates.review
gallery.rotate
drive.sync
git.status
```

## Receipts

Receipts are written to:

```text
hermes/receipts
```

Each receipt includes:

```text
job id
requested command
status
stdout/stderr tail
git status
changed files
sha256 hash
```

## Add more commands safely

Only add new commands in:

```text
hermes/runner-policy.json
```

Do not allow raw bash from queue input. Keep commands fixed and parameter-free unless the parameters are separately validated.
