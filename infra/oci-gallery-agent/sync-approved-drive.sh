#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${GALLERY_ENV_FILE:-/etc/already-here/gallery-agent.env}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${RCLONE_REMOTE:?RCLONE_REMOTE is required}"
: "${RCLONE_SOURCE_PATH:?RCLONE_SOURCE_PATH is required}"
: "${RCLONE_DESTINATION:=/opt/already-here-gallery/source}"
: "${RCLONE_SYNC_FLAGS:=--copy-links --create-empty-src-dirs --fast-list --transfers=4 --checkers=8}"

mkdir -p "$RCLONE_DESTINATION"

SOURCE="${RCLONE_REMOTE}:${RCLONE_SOURCE_PATH}"

echo "[$(date -Is)] Syncing approved gallery photos from ${SOURCE} to ${RCLONE_DESTINATION}"
# Intentionally using copy, not sync, to avoid accidental destructive deletion from local approved cache.
# Operators can manually prune the OCI approved source folder when needed.
rclone copy "$SOURCE" "$RCLONE_DESTINATION" $RCLONE_SYNC_FLAGS

echo "[$(date -Is)] Approved gallery photo sync complete"
