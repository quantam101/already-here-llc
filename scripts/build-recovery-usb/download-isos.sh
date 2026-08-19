#!/usr/bin/env bash
set -euo pipefail

# Downloads freely distributable ISO images into iso-sources/.
# Commercial/custom images (Windows 11 installer, custom WinPE, Kaspersky) must be
# supplied by the operator.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ISO_DIR="${SCRIPT_DIR}/iso-sources"

mkdir -p "${ISO_DIR}/Rescue"
mkdir -p "${ISO_DIR}/Imaging"
mkdir -p "${ISO_DIR}/WinPE"
mkdir -p "${ISO_DIR}/Installers"
mkdir -p "${ISO_DIR}/AV_Security"

verify_checksum() {
    local file="$1"
    local checksum_url="$2"
    local checksum_tmp base expected actual

    checksum_tmp=$(mktemp)
    if curl -fsSL --retry 3 --retry-delay 2 -o "${checksum_tmp}" "${checksum_url}" 2>/dev/null; then
        base=$(basename "${file}")
        expected=$(grep -F "${base}" "${checksum_tmp}" | head -n1 | awk '{print $1}' || true)
        if [[ -n "${expected}" ]]; then
            actual=$(sha256sum "${file}" 2>/dev/null | awk '{print $1}')
            if [[ -z "${actual}" ]] && command -v shasum >/dev/null 2>&1; then
                actual=$(shasum -a 256 "${file}" | awk '{print $1}')
            fi
            if [[ "${actual}" == "${expected}" ]]; then
                echo "Checksum OK: ${base}"
            else
                echo "ERROR: SHA256 mismatch for ${base}" >&2
                echo "  expected: ${expected}" >&2
                echo "  actual:   ${actual}" >&2
                rm -f "${checksum_tmp}"
                return 1
            fi
        else
            echo "WARNING: No checksum entry for ${base} in ${checksum_url}" >&2
        fi
    else
        echo "WARNING: Could not download checksum from ${checksum_url}" >&2
    fi
    rm -f "${checksum_tmp}"
    return 0
}

download_and_verify() {
    local url="$1"
    local dest="$2"
    local checksum_url="${3:-}"

    if [[ -f "${dest}" ]]; then
        echo "Already present: ${dest}"
        if [[ -n "${checksum_url}" ]]; then
            verify_checksum "${dest}" "${checksum_url}" || return 1
        fi
        return 0
    fi

    echo "Downloading $(basename "${dest}")..."
    if curl -fsSL --retry 3 --retry-delay 2 -o "${dest}.tmp" "${url}"; then
        if [[ -n "${checksum_url}" ]] && ! verify_checksum "${dest}.tmp" "${checksum_url}"; then
            rm -f "${dest}.tmp"
            return 1
        fi
        mv "${dest}.tmp" "${dest}"
        echo "Saved: ${dest}"
    else
        rm -f "${dest}.tmp"
        echo "WARNING: Failed to download $(basename "${dest}") from ${url}" >&2
        return 1
    fi
}

# SystemRescue 11.00 amd64
download_and_verify \
    "https://sourceforge.net/projects/systemrescuecd/files/sysresccd-x86/11.00/systemrescue-11.00-amd64.iso/download" \
    "${ISO_DIR}/Rescue/systemrescue-11.00-amd64.iso" \
    "https://www.system-rescue.org/releases/11.00/systemrescue-11.00-amd64.iso.sha256" || true

# Rescuezilla 2.5 (Noble build used as the generic 64-bit release)
download_and_verify \
    "https://github.com/rescuezilla/rescuezilla/releases/download/2.5/rescuezilla-2.5-64bit.noble.iso" \
    "${ISO_DIR}/Imaging/rescuezilla-2.5-64bit.iso" \
    "https://github.com/rescuezilla/rescuezilla/releases/download/2.5/SHA256SUM" || true

# Ubuntu 24.04 LTS live server
download_and_verify \
    "https://releases.ubuntu.com/24.04/ubuntu-24.04.4-live-server-amd64.iso" \
    "${ISO_DIR}/Installers/ubuntu-24.04-live-server.iso" \
    "https://releases.ubuntu.com/24.04/SHA256SUMS" || true

# Kaspersky Rescue Disk - often requires manual download due to gated distribution.
# Place a marker file if not available so the build script can surface the gap.
if [[ ! -f "${ISO_DIR}/AV_Security/krd.iso" ]]; then
    echo "NOTE: Kaspersky Rescue Disk (krd.iso) must be downloaded manually from"
    echo "      https://support.kaspersky.com/downloads/free-rescue-disk"
    echo "      and placed at: ${ISO_DIR}/AV_Security/krd.iso"
    > "${ISO_DIR}/AV_Security/krd.iso.MISSING"
fi

# Windows 11 installer - must be supplied by operator (no stable public direct URL).
if [[ ! -f "${ISO_DIR}/Installers/Win11_23H2_English_x64.iso" ]]; then
    echo "NOTE: Windows 11 23H2 English x64 installer must be supplied manually and placed at:"
    echo "      ${ISO_DIR}/Installers/Win11_23H2_English_x64.iso"
    > "${ISO_DIR}/Installers/Win11_23H2_English_x64.iso.MISSING"
fi

# Already Here custom Win11PE - must be built/supplied by operator.
if [[ ! -f "${ISO_DIR}/WinPE/Win11PE_x64_AlreadyHere_v2.iso" ]]; then
    echo "NOTE: Win11PE_x64_AlreadyHere_v2.iso must be supplied manually and placed at:"
    echo "      ${ISO_DIR}/WinPE/Win11PE_x64_AlreadyHere_v2.iso"
    > "${ISO_DIR}/WinPE/Win11PE_x64_AlreadyHere_v2.iso.MISSING"
fi

echo "ISO download pass complete. Missing images are flagged with .MISSING files."
