#!/usr/bin/env bash
set -euo pipefail

: "${GALLERY_REPO_URL:?GALLERY_REPO_URL is required}"
: "${GALLERY_GIT_BRANCH:=main}"
: "${GALLERY_SLEEP_SECONDS:=21600}"

mkdir -p /workspace

if [ ! -d /workspace/repo/.git ]; then
  git clone --branch "$GALLERY_GIT_BRANCH" "$GALLERY_REPO_URL" /workspace/repo
fi

cd /workspace/repo

git config user.name "Already Here Hermes Agent"
git config user.email "dispatch@alreadyherellc.com"

while true; do
  echo "[$(date -Is)] Hermes health check"
  git fetch origin "$GALLERY_GIT_BRANCH"
  git checkout "$GALLERY_GIT_BRANCH"
  git reset --hard "origin/$GALLERY_GIT_BRANCH"
  node scripts/hermes-agentctl.mjs health || echo "[$(date -Is)] Hermes health check failed"

  echo "[$(date -Is)] Starting gallery.rotate mission"
  node /agent/oci-gallery-agent.mjs || echo "[$(date -Is)] Gallery agent run failed"

  echo "[$(date -Is)] Sleeping ${GALLERY_SLEEP_SECONDS}s"
  sleep "$GALLERY_SLEEP_SECONDS"
done
