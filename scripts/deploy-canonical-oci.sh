#!/usr/bin/env bash
set -euo pipefail

# Deploy the canonical graph server to an OCI Ampere A1 (or x86) compute instance.
# This script assumes the oci CLI is configured with a profile that has permission
# to create instances, manage subnet security lists, and read VNIC attachments.
#
# Required environment variables:
#   OCI_CANONICAL_DOMAIN     DNS name pointing at the instance public IP (for Caddy TLS)
#   CANONICAL_API_KEY        Strong random secret; used by clients and health probes
#   OCI_COMPARTMENT_ID       OCI compartment OCID
#   OCI_SUBNET_ID            Subnet OCID where the instance will be placed
#   OCI_AVAILABILITY_DOMAIN  Availability domain name (e.g. "Uocm:PHX-AD-1")
#   OCI_SSH_PUBLIC_KEY_FILE  Path to an SSH public key used for the instance
#
# Optional:
#   OCI_SHAPE                Default: VM.Standard.A1.Flex
#   OCI_OCPUS                Default: 4
#   OCI_MEMORY_GB            Default: 24
#   OCI_IMAGE_ID             Default: latest Oracle-Linux-9 image in the compartment
#   ACME_EMAIL               Email for Let's Encrypt (default: admin@alreadyherellc.com)
#   GITHUB_TOKEN             Used to clone the private repo onto the instance

: "${OCI_CANONICAL_DOMAIN:?required}"
: "${CANONICAL_API_KEY:?required}"
: "${OCI_COMPARTMENT_ID:?required}"
: "${OCI_SUBNET_ID:?required}"
: "${OCI_AVAILABILITY_DOMAIN:?required}"
: "${OCI_SSH_PUBLIC_KEY_FILE:?required}"

SHAPE="${OCI_SHAPE:-VM.Standard.A1.Flex}"
OCPUS="${OCI_OCPUS:-4}"
MEMORY_GB="${OCI_MEMORY_GB:-24}"
ACME_EMAIL="${ACME_EMAIL:-admin@alreadyherellc.com}"

echo "[deploy-canonical-oci] Launching ${SHAPE} instance..."

if ! command -v oci >/dev/null 2>&1; then
  echo "ERROR: oci CLI not found. Install: https://docs.oracle.com/en-us/iaas/Content/API/Concepts/cliconcepts.htm" >&2
  exit 1
fi

if [ ! -f "$OCI_SSH_PUBLIC_KEY_FILE" ]; then
  echo "ERROR: SSH public key file not found: $OCI_SSH_PUBLIC_KEY_FILE" >&2
  exit 1
fi

SSH_PUBLIC_KEY=$(cat "$OCI_SSH_PUBLIC_KEY_FILE")

if [ -z "${OCI_IMAGE_ID:-}" ]; then
  echo "[deploy-canonical-oci] Resolving latest Oracle-Linux-9 image..."
  OCI_IMAGE_ID=$(oci compute image list \
    --compartment-id "$OCI_COMPARTMENT_ID" \
    --operating-system "Oracle Linux" \
    --operating-system-version "9" \
    --shape "$SHAPE" \
    --sort-by TIMECREATED \
    --sort-order DESC \
    --query 'data[0].id' \
    --raw-output)
fi

echo "[deploy-canonical-oci] Using image: $OCI_IMAGE_ID"

INSTANCE_NAME="canonical-graph-$(date +%s)"
INSTANCE_JSON=$(mktemp)
oci compute instance launch \
  --compartment-id "$OCI_COMPARTMENT_ID" \
  --availability-domain "$OCI_AVAILABILITY_DOMAIN" \
  --subnet-id "$OCI_SUBNET_ID" \
  --shape-config '{"ocpus":'"$OCPUS"',"memoryInGBs":'"$MEMORY_GB"'}' \
  --shape "$SHAPE" \
  --image-id "$OCI_IMAGE_ID" \
  --display-name "$INSTANCE_NAME" \
  --metadata '{"ssh_authorized_keys":"'"$SSH_PUBLIC_KEY"'"}' \
  --assign-public-ip true \
  --wait-for-state RUNNING \
  | tee "$INSTANCE_JSON"

INSTANCE_ID=$(oci compute instance list \
  --compartment-id "$OCI_COMPARTMENT_ID" \
  --display-name "$INSTANCE_NAME" \
  --lifecycle-state RUNNING \
  --query 'data[0].id' \
  --raw-output)

VNIC_ID=$(oci compute vnic-attachment list \
  --compartment-id "$OCI_COMPARTMENT_ID" \
  --instance-id "$INSTANCE_ID" \
  --query 'data[0].vnic-id' \
  --raw-output)

PUBLIC_IP=$(oci network vnic get \
  --vnic-id "$VNIC_ID" \
  --query 'data."public-ip"' \
  --raw-output)

echo "[deploy-canonical-oci] Instance running at ${PUBLIC_IP}"

# Open ports 22, 80, 443, and 8443 on the subnet security list.
SECURITY_LIST_ID=$(oci network subnet get \
  --subnet-id "$OCI_SUBNET_ID" \
  --query 'data."security-list-ids"[0]' \
  --raw-output)

echo "[deploy-canonical-oci] Adding ingress rules to security list ${SECURITY_LIST_ID}..."
oci network security-list update \
  --security-list-id "$SECURITY_LIST_ID" \
  --ingress-security-rules '[
    {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
    {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":80,"max":80}}},
    {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":443,"max":443}}},
    {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":8443,"max":8443}}}
  ]' \
  --force

echo "[deploy-canonical-oci] Waiting for SSH on ${PUBLIC_IP}..."
for i in {1..30}; do
  if nc -z -w 2 "$PUBLIC_IP" 22 2>/dev/null; then
    break
  fi
  echo "  ... attempt $i"
  sleep 10
done

REMOTE_USER="opc"
if oci compute instance get --instance-id "$INSTANCE_ID" --query 'data."metadata"."ssh_authorized_keys"' --raw-output | grep -q ubuntu; then
  REMOTE_USER="ubuntu"
fi

SSH_TARGET="${REMOTE_USER}@${PUBLIC_IP}"

echo "[deploy-canonical-oci] Installing Docker on ${SSH_TARGET}..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SSH_TARGET" <<'REMOTE'
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  else
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  fi
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker "$(whoami)"
REMOTE

echo "[deploy-canonical-oci] Cloning repo onto instance..."
if [ -n "${GITHUB_TOKEN:-}" ]; then
  REPO_URL="https://${GITHUB_TOKEN}@github.com/quantam101/already-here-llc.git"
else
  REPO_URL="https://github.com/quantam101/already-here-llc.git"
fi

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SSH_TARGET" \
  "git clone ${REPO_URL} /app/already-here-llc && cd /app/already-here-llc && git checkout devin/1786404500-canonical-graph"

ENV_FILE=$(mktemp)
cat >"$ENV_FILE" <<EOF
OCI_CANONICAL_DOMAIN=${OCI_CANONICAL_DOMAIN}
CANONICAL_API_KEY=${CANONICAL_API_KEY}
ACME_EMAIL=${ACME_EMAIL}
EOF

scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$ENV_FILE" "${SSH_TARGET}:/app/already-here-llc/.env.canonical-oci"

echo "[deploy-canonical-oci] Starting canonical services..."
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SSH_TARGET" <<'REMOTE'
  cd /app/already-here-llc
  docker compose -f docker-compose.canonical-oci.yml --env-file .env.canonical-oci up -d
  echo '[deploy-canonical-oci] Waiting for health...'
  sleep 10
  curl -fsS -H "X-API-Key: ${CANONICAL_API_KEY}" "https://${OCI_CANONICAL_DOMAIN}/health" || true
REMOTE

rm -f "$INSTANCE_JSON" "$ENV_FILE"

echo ""
echo "================================================================"
echo "  Canonical graph server deployed"
echo "================================================================"
echo "  Instance ID: ${INSTANCE_ID}"
echo "  Public IP:   ${PUBLIC_IP}"
echo "  Domain:      ${OCI_CANONICAL_DOMAIN}"
echo "  Health:      https://${OCI_CANONICAL_DOMAIN}/health"
echo ""
echo "  Set these environment variables in Vercel/GitHub secrets:"
echo "    OCI_CANONICAL_URL=https://${OCI_CANONICAL_DOMAIN}"
echo "    OCI_CANONICAL_API_KEY=${CANONICAL_API_KEY}"
echo ""
echo "  Backup command:"
echo "    curl -fsS -H 'X-API-Key: ${CANONICAL_API_KEY}' -X POST https://${OCI_CANONICAL_DOMAIN}/backup"
echo "================================================================"
