#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${APP_NAME:-profitengine}"
APP_DIR="${APP_DIR:-$HOME/profitengine}"
PORT="${PORT:-3000}"
ENTRYPOINT="${ENTRYPOINT:-scheduler.js}"
HEALTH_PATH="${HEALTH_PATH:-/api/health}"
STATUS_PATH="${STATUS_PATH:-/api/status}"
POSTS_PATH="${POSTS_PATH:-/api/posts}"
EARNINGS_PATH="${EARNINGS_PATH:-/api/earnings}"
PUBLIC_IP="${PUBLIC_IP:-129.153.101.0}"
LOG_DIR="${LOG_DIR:-$APP_DIR/logs}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT="$LOG_DIR/recovery-$STAMP.log"

mkdir -p "$LOG_DIR"
exec > >(tee -a "$REPORT") 2>&1

echo "=== ProfitEngine recovery started: $STAMP ==="
echo "user=$(whoami) host=$(hostname) app_dir=$APP_DIR port=$PORT entrypoint=$ENTRYPOINT public_ip=$PUBLIC_IP"

fail() {
  echo "FATAL: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

need_cmd curl
need_cmd sudo

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js missing. Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v npm >/dev/null 2>&1; then
  fail "npm missing after Node.js install"
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "PM2 missing. Installing globally..."
  sudo npm install -g pm2
fi

if [ ! -d "$APP_DIR" ]; then
  fail "Application directory not found: $APP_DIR. Upload/extract ProfitEngine first, likely profitengine-v4.zip."
fi

cd "$APP_DIR"

if [ ! -f "$ENTRYPOINT" ]; then
  echo "Available files:"
  find . -maxdepth 2 -type f | sed 's#^./##' | sort | head -200
  fail "Entrypoint not found: $APP_DIR/$ENTRYPOINT"
fi

if [ ! -f ".env" ]; then
  echo "WARNING: .env is missing. Runtime may start but posting/earnings/email integrations will fail."
fi

if [ -f package-lock.json ]; then
  echo "Installing dependencies with npm ci..."
  npm ci --omit=dev || npm ci
elif [ -f package.json ]; then
  echo "Installing dependencies with npm install..."
  npm install
else
  echo "WARNING: package.json not found. Skipping dependency install."
fi

echo "Opening local firewall ports $PORT and 80..."
sudo iptables -C INPUT -m state --state NEW -p tcp --dport "$PORT" -j ACCEPT 2>/dev/null || \
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$PORT" -j ACCEPT
sudo iptables -C INPUT -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT

if command -v netfilter-persistent >/dev/null 2>&1; then
  sudo netfilter-persistent save || true
else
  echo "netfilter-persistent missing; installing for firewall persistence..."
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent netfilter-persistent
  sudo netfilter-persistent save || true
fi

echo "Restarting PM2 app..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start "$ENTRYPOINT" --name "$APP_NAME" --time
fi

pm2 save
pm2 list

echo "Waiting for app to bind..."
sleep 5

echo "Listening ports:"
sudo ss -lntp | grep -E ":80|:$PORT" || true

check_endpoint() {
  local label="$1"
  local url="$2"
  echo "--- $label: $url"
  curl -fsS -m 10 -i "$url" | head -80 || return 1
}

LOCAL_BASE="http://127.0.0.1:$PORT"
PUBLIC_BASE="http://$PUBLIC_IP:$PORT"

LOCAL_OK=0
check_endpoint "local health" "$LOCAL_BASE$HEALTH_PATH" || LOCAL_OK=1
check_endpoint "local status" "$LOCAL_BASE$STATUS_PATH" || true
check_endpoint "local posts" "$LOCAL_BASE$POSTS_PATH" || true
check_endpoint "local earnings" "$LOCAL_BASE$EARNINGS_PATH" || true

echo "Recent PM2 logs:"
pm2 logs "$APP_NAME" --lines 80 --nostream || true

if [ "$LOCAL_OK" -ne 0 ]; then
  echo "Local health failed. Inspect PM2 errors above and verify .env values."
  exit 2
fi

echo "External check command to run from off-VM:"
echo "curl -i $PUBLIC_BASE$HEALTH_PATH && curl -i $PUBLIC_BASE$POSTS_PATH && curl -i $PUBLIC_BASE$EARNINGS_PATH"
echo "=== ProfitEngine recovery complete. Report: $REPORT ==="
