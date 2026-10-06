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
SHA256_URL="https://github.com/ventoy/Ventoy/releases/download/v${VENTOY_VERSION}/sha256.txt"

mkdir -p "${VENDOR_DIR}"

if [[ -x "${VENTOY_DIR}/Ventoy2Disk.sh" ]]; then
    echo "Ventoy ${VENTOY_VERSION} already present at ${VENTOY_DIR}"
    exit 0
fi

echo "Downloading Ventoy ${VENTOY_VERSION}..."
curl -fsSL -o "${VENDOR_DIR}/${TARBALL}" "${DOWNLOAD_URL}"

echo "Verifying Ventoy ${VENTOY_VERSION} checksum..."
if curl -fsSL -o "${VENDOR_DIR}/sha256.txt" "${SHA256_URL}" 2>/dev/null; then
    EXPECTED=$(grep -F "${TARBALL}" "${VENDOR_DIR}/sha256.txt" | head -n1 | awk '{print $1}' || true)
    if [[ -n "${EXPECTED}" ]]; then
        ACTUAL=$(sha256sum "${VENDOR_DIR}/${TARBALL}" 2>/dev/null | awk '{print $1}')
        if [[ -z "${ACTUAL}" ]] && command -v shasum >/dev/null 2>&1; then
            ACTUAL=$(shasum -a 256 "${VENDOR_DIR}/${TARBALL}" | awk '{print $1}')
        fi
        if [[ "${ACTUAL}" != "${EXPECTED}" ]]; then
            echo "ERROR: SHA256 mismatch for ${TARBALL}" >&2
            echo "  expected: ${EXPECTED}" >&2
            echo "  actual:   ${ACTUAL}" >&2
            rm -f "${VENDOR_DIR}/${TARBALL}" "${VENDOR_DIR}/sha256.txt"
            exit 1
        fi
        echo "Checksum OK: ${TARBALL}"
    else
        echo "WARNING: No checksum entry for ${TARBALL}; continuing without verification" >&2
    fi
    rm -f "${VENDOR_DIR}/sha256.txt"
else
    echo "WARNING: Could not download ${SHA256_URL}; continuing without verification" >&2
fi

echo "Extracting ${TARBALL}..."
tar -xzf "${VENDOR_DIR}/${TARBALL}" -C "${VENDOR_DIR}"
mv "${VENDOR_DIR}/ventoy-${VENTOY_VERSION}" "${VENTOY_DIR}"
rm "${VENDOR_DIR}/${TARBALL}"

if [[ ! -x "${VENTOY_DIR}/Ventoy2Disk.sh" ]]; then
    echo "ERROR: Ventoy2Disk.sh not found after extraction" >&2
    exit 1
fi

echo "Ventoy ${VENTOY_VERSION} ready at ${VENTOY_DIR}"
