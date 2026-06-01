#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
CERT_DIR="$APP_DIR/nginx/certs"
WEBROOT_DIR="$APP_DIR/nginx/certbot"

mkdir -p "$CERT_DIR" "$WEBROOT_DIR"

if ! command -v certbot >/dev/null 2>&1; then
  echo "certbot is not installed. Run deploy/oci-bootstrap.sh first." >&2
  exit 1
fi

if [[ ! -f "$CERT_DIR/fullchain.pem" || ! -f "$CERT_DIR/privkey.pem" ]]; then
  openssl req -x509 -nodes -newkey rsa:2048 -sha256 \
    -keyout "$CERT_DIR/privkey.pem" \
    -out "$CERT_DIR/fullchain.pem" \
    -days 365 \
    -subj "/CN=alreadyherellc.com" \
    -addext "subjectAltName=DNS:alreadyherellc.com,DNS:www.alreadyherellc.com" \
    -addext "basicConstraints=CA:FALSE" >/dev/null 2>&1
fi

certbot certonly \
  --webroot \
  -w "$WEBROOT_DIR" \
  -d alreadyherellc.com \
  -d www.alreadyherellc.com \
  --email dispatch@alreadyherellc.com \
  --agree-tos \
  --non-interactive

cp /etc/letsencrypt/live/alreadyherellc.com/fullchain.pem "$CERT_DIR/fullchain.pem"
cp /etc/letsencrypt/live/alreadyherellc.com/privkey.pem "$CERT_DIR/privkey.pem"

cd "$APP_DIR"
docker compose up -d --force-recreate nginx

echo "Certificate refreshed and Nginx reloaded."
