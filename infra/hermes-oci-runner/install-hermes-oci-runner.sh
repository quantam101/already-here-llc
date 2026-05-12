#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(pwd)}"
ENV_DIR="/etc/already-here"
ENV_FILE="$ENV_DIR/hermes-runner.env"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash infra/hermes-oci-runner/install-hermes-oci-runner.sh"
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y git nodejs npm ca-certificates curl
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y git nodejs npm ca-certificates curl
elif command -v yum >/dev/null 2>&1; then
  yum install -y git nodejs npm ca-certificates curl
else
  echo "Unsupported Linux package manager. Install git and node manually."
  exit 1
fi

mkdir -p "$ENV_DIR" /opt/hermes-runner
chmod 700 "$ENV_DIR"

if [ ! -f "$ENV_FILE" ]; then
  cp "$REPO_DIR/infra/hermes-oci-runner/hermes-runner.env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE. Edit it before starting the runner."
else
  echo "$ENV_FILE already exists; leaving it unchanged."
fi

install -m 0755 "$REPO_DIR/infra/hermes-oci-runner/hermes-oci-runner-loop.sh" /usr/local/bin/hermes-oci-runner-loop.sh
cp "$REPO_DIR/infra/hermes-oci-runner/hermes-oci-runner.service" /etc/systemd/system/hermes-oci-runner.service

systemctl daemon-reload
systemctl enable hermes-oci-runner.service

cat <<EOF

Hermes OCI Runner installed.

Required next steps:
1. Edit $ENV_FILE and set HERMES_REPO_URL.
2. Start runner: systemctl start hermes-oci-runner.service
3. Watch logs: journalctl -u hermes-oci-runner.service -f

Queue jobs in hermes/runner-queue.json using one of these commands:
- health.check
- socrates.review
- gallery.rotate
- drive.sync
- git.status

EOF
