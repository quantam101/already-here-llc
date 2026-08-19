#!/usr/bin/env bash
set -euo pipefail

# Downloads and extracts the pinned Ventoy release used by the USB build.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR_DIR="${SCRIPT_DIR}/vendor"
VENTOY_DIR="${VENDOR_DIR}/ventoy"

VENTOY_VERSION="${VENTOY_VERSION:-1.0.99}"
ARCH="x86_64"
TARBALL="ventoy-${VENTOY_VERSION}-linux.tar.gz"
DOWNLOAD_URL="https://github.com/ventoy/Ventoy/releases/download/v${VENTOY_VERSION}/${TARBALL}"

mkdir -p "${VENDOR_DIR}"

if [[ -x "${VENTOY_DIR}/Ventoy2Disk.sh" ]]; then
    echo "Ventoy ${VENTOY_VERSION} already present at ${VENTOY_DIR}"
    exit 0
fi

echo "Downloading Ventoy ${VENTOY_VERSION}..."
curl -fsSL -o "${VENDOR_DIR}/${TARBALL}" "${DOWNLOAD_URL}"

echo "Extracting ${TARBALL}..."
tar -xzf "${VENDOR_DIR}/${TARBALL}" -C "${VENDOR_DIR}"
mv "${VENDOR_DIR}/ventoy-${VENTOY_VERSION}" "${VENTOY_DIR}"
rm "${VENDOR_DIR}/${TARBALL}"

if [[ ! -x "${VENTOY_DIR}/Ventoy2Disk.sh" ]]; then
    echo "ERROR: Ventoy2Disk.sh not found after extraction" >&2
    exit 1
fi

echo "Ventoy ${VENTOY_VERSION} ready at ${VENTOY_DIR}"
