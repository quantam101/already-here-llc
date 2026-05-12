# Already Here OCI Gallery Rotation Agent

This agent runs continuously on an Oracle Cloud Infrastructure VM and rotates approved project photos into the website gallery.

## Operating model

```text
Approved photo folder on OCI VM
→ OCI gallery agent scans folder every few hours
→ agent enforces 14/21 day rotation interval
→ selected images are copied into public/gallery/rotating
→ data/gallery-manifest.json is updated
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

Human review is still required before placing images in the approved source folder.

## OCI VM setup

Create folders:

```bash
sudo mkdir -p /opt/already-here-gallery/source
sudo mkdir -p /opt/already-here-gallery/workspace
sudo mkdir -p /etc/already-here
```

Copy approved photos into:

```text
/opt/already-here-gallery/source
```

## Build Docker image

From the repository root on the OCI VM:

```bash
docker build -f infra/oci-gallery-agent/Dockerfile -t already-here-gallery-agent:latest .
```

## Environment file

Create:

```bash
sudo nano /etc/already-here/gallery-agent.env
```

Use `gallery-agent.env.example` as the template.

Required value:

```bash
GALLERY_REPO_URL=https://x-access-token:<TOKEN>@github.com/quantam101/already-here-llc.git
```

Recommended production values:

```bash
GALLERY_GIT_BRANCH=main
GALLERY_LOCAL_SOURCE_DIR=/opt/already-here-gallery/source
GALLERY_ROTATION_DAYS=21
GALLERY_PUBLISH_LIMIT=6
GALLERY_SLEEP_SECONDS=21600
GALLERY_FORCE_ROTATION=false
```

## Install systemd service

```bash
sudo cp infra/oci-gallery-agent/already-here-gallery-agent.service /etc/systemd/system/already-here-gallery-agent.service
sudo systemctl daemon-reload
sudo systemctl enable already-here-gallery-agent
sudo systemctl start already-here-gallery-agent
```

## Check status

```bash
sudo systemctl status already-here-gallery-agent
sudo journalctl -u already-here-gallery-agent -f
```

## Force one rotation

Temporarily set this in `/etc/already-here/gallery-agent.env`:

```bash
GALLERY_FORCE_ROTATION=true
```

Then restart:

```bash
sudo systemctl restart already-here-gallery-agent
```

After the first successful run, set it back to:

```bash
GALLERY_FORCE_ROTATION=false
```

## Google Drive sync option

Use rclone or another Drive sync tool to mirror only your approved Google Drive gallery folder into:

```text
/opt/already-here-gallery/source
```

Recommended Drive structure:

```text
Already Here LLC / Website Gallery / Approved
```

Only sync approved images into the OCI source folder. Do not sync private project archives directly into the publish source.
