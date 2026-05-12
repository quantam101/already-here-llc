#!/usr/bin/env bash
set -euo pipefail

: "${HERMES_REPO_URL:?HERMES_REPO_URL is required}"
: "${HERMES_RUNNER_BRANCH:=main}"
: "${HERMES_RUNNER_SLEEP_SECONDS:=300}"

mkdir -p /opt/hermes-runner

if [ ! -d /opt/hermes-runner/repo/.git ]; then
  git clone --branch "$HERMES_RUNNER_BRANCH" "$HERMES_REPO_URL" /opt/hermes-runner/repo
fi

cd /opt/hermes-runner/repo

git config user.name "Already Here Hermes OCI Runner"
git config user.email "dispatch@alreadyherellc.com"

while true; do
  echo "[$(date -Is)] Hermes OCI runner polling queue"
  node scripts/hermes-oci-runner.mjs || echo "[$(date -Is)] Hermes OCI runner cycle failed"
  echo "[$(date -Is)] Sleeping ${HERMES_RUNNER_SLEEP_SECONDS}s"
  sleep "$HERMES_RUNNER_SLEEP_SECONDS"
done
