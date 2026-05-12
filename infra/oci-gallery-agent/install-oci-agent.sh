#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(pwd)}"
ENV_DIR="/etc/already-here"
ENV_FILE="$ENV_DIR/gallery-agent.env"
SOURCE_DIR="/opt/already-here-gallery/source"
WORKSPACE_DIR="/opt/already-here-gallery/workspace"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash infra/oci-gallery-agent/install-oci-agent.sh"
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y git docker.io rclone ca-certificates curl
  systemctl enable --now docker
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y git docker rclone ca-certificates curl
  systemctl enable --now docker
elif command -v yum >/dev/null 2>&1; then
  yum install -y git docker rclone ca-certificates curl
  systemctl enable --now docker
else
  echo "Unsupported Linux package manager. Install git, docker, and rclone manually."
  exit 1
fi

mkdir -p "$ENV_DIR" "$SOURCE_DIR" "$WORKSPACE_DIR"
chmod 700 "$ENV_DIR"

if [ ! -f "$ENV_FILE" ]; then
  cp "$REPO_DIR/infra/oci-gallery-agent/gallery-agent.env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE. Edit it before starting services."
else
  echo "$ENV_FILE already exists; leaving it unchanged."
fi

install -m 0755 "$REPO_DIR/infra/oci-gallery-agent/sync-approved-drive.sh" /usr/local/bin/sync-approved-drive.sh
cp "$REPO_DIR/infra/oci-gallery-agent/already-here-gallery-agent.service" /etc/systemd/system/already-here-gallery-agent.service
cp "$REPO_DIR/infra/oci-gallery-agent/already-here-drive-sync.service" /etc/systemd/system/already-here-drive-sync.service
cp "$REPO_DIR/infra/oci-gallery-agent/already-here-drive-sync.timer" /etc/systemd/system/already-here-drive-sync.timer

docker build -f "$REPO_DIR/infra/oci-gallery-agent/Dockerfile" -t already-here-gallery-agent:latest "$REPO_DIR"

systemctl daemon-reload
systemctl enable already-here-gallery-agent.service
systemctl enable already-here-drive-sync.timer

cat <<EOF

Install complete.

Required next steps:
1. Edit $ENV_FILE and set GALLERY_REPO_URL plus rclone settings.
2. Run: rclone config
3. Test Drive sync: systemctl start already-here-drive-sync.service
4. Start timer: systemctl start already-here-drive-sync.timer
5. Start agent: systemctl start already-here-gallery-agent.service
6. Watch logs: journalctl -u already-here-gallery-agent -f

EOF
