# Already Here OCI Gallery Rotation Agent

This agent runs continuously on an Oracle Cloud Infrastructure VM and rotates approved project photos into the website gallery.

## Operating model

```text
Google Drive approved gallery folder
→ rclone copies approved photos to OCI local approved folder
→ Hermes health check runs
→ SOCRATES readiness review runs
→ OCI gallery agent checks rotation interval
→ selected images are copied into public/gallery/rotating
→ data/gallery-manifest.json is updated
→ hermes/receipts audit files are written
→ agent commits and pushes to GitHub
→ Vercel deploys production
```

## Safety model

The agent does not publish directly from arbitrary folders. Only the configured local approved folder is scanned.

Blocked filenames/folders include patterns such as:

```text
do-not-publish
private
credential
badge
license
medical
patient
serial
secret
```

Human review is required before placing images in the approved Google Drive source folder.

## Fast install on OCI VM

Clone this repo on the Oracle VM, then run from the repository root:

```bash
sudo bash infra/oci-gallery-agent/install-oci-agent.sh
```

The installer handles:

```text
Git install
Docker install
rclone install
required folders
systemd service files
systemd timer files
Docker image build
service enablement
```

It creates this file if missing:

```text
/etc/already-here/gallery-agent.env
```

Edit it before starting the services.

## Required environment value

```bash
GALLERY_REPO_URL=https://x-access-token:<TOKEN>@github.com/quantam101/already-here-llc.git
```

Use a token with narrow repo write access. Do not commit the token.

## Recommended production values

```bash
GALLERY_GIT_BRANCH=main
GALLERY_LOCAL_SOURCE_DIR=/opt/already-here-gallery/source
GALLERY_ROTATION_DAYS=21
GALLERY_PUBLISH_LIMIT=6
GALLERY_SLEEP_SECONDS=21600
GALLERY_FORCE_ROTATION=false
RCLONE_REMOTE=alreadyhere-drive
RCLONE_SOURCE_PATH=Already Here LLC/Website Gallery/Approved
RCLONE_DESTINATION=/opt/already-here-gallery/source
```

## Configure Google Drive sync

Run:

```bash
sudo rclone config
```

Create a Google Drive remote named:

```text
alreadyhere-drive
```

Recommended Drive structure:

```text
Already Here LLC / Website Gallery / Approved
Already Here LLC / Website Gallery / Do Not Publish
Already Here LLC / Website Gallery / Archive
```

Only the Approved folder should be configured as the rclone source.

## Start services

After editing `/etc/already-here/gallery-agent.env` and configuring rclone:

```bash
sudo systemctl start already-here-drive-sync.service
sudo systemctl start already-here-drive-sync.timer
sudo systemctl start already-here-gallery-agent.service
```

Enable on boot if not already enabled:

```bash
sudo systemctl enable already-here-drive-sync.timer
sudo systemctl enable already-here-gallery-agent.service
```

## Check status

```bash
sudo systemctl status already-here-drive-sync.timer
sudo systemctl status already-here-gallery-agent.service
sudo journalctl -u already-here-drive-sync.service -n 100 --no-pager
sudo journalctl -u already-here-gallery-agent.service -f
```

## Force one rotation

Temporarily set:

```bash
GALLERY_FORCE_ROTATION=true
```

Restart:

```bash
sudo systemctl restart already-here-gallery-agent.service
```

After the first successful pushed commit, restore:

```bash
GALLERY_FORCE_ROTATION=false
```

Then restart again.

## Verify successful operation

A successful run should create or update:

```text
data/gallery-manifest.json
public/gallery/rotating/*
hermes/receipts/*
```

Then GitHub should receive a commit and Vercel should deploy.

## Rollback

If a bad photo publishes:

```bash
git revert <bad-gallery-commit>
git push origin main
```

Then remove the bad image from the Google Drive Approved folder or move it into Do Not Publish.
