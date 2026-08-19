#!/usr/bin/env bash
set -euo pipefail

# Verify a completed Enterprise Multi-Boot & Field Recovery USB.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TARGET_DEVICE="${1:-}"
if [[ -z "${TARGET_DEVICE}" ]]; then
    echo "Usage: $(basename "$0") /dev/sdX" >&2
    exit 1
fi

if ! command -v lsblk >/dev/null 2>&1; then
    echo "ERROR: lsblk is required" >&2
    exit 1
fi

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "ERROR: This script must be run as root" >&2
    exit 1
fi

echo "Checking device ${TARGET_DEVICE}..."

# Look for Ventoy partitions.
PARTS=$(lsblk -nro NAME,FSTYPE,SIZE "${TARGET_DEVICE}" | tail -n +2 || true)
echo "${PARTS}"

if ! echo "${PARTS}" | grep -qi "exfat"; then
    echo "ERROR: No exFAT data partition found" >&2
    exit 1
fi

if ! echo "${PARTS}" | grep -qi "fat"; then
    echo "ERROR: No FAT EFI/VTOYEFI partition found" >&2
    exit 1
fi

FIRST_PART=""
for child in $(lsblk -nro NAME "${TARGET_DEVICE}" | tail -n +2); do
    dev="/dev/${child}"
    fstype=$(lsblk -nro FSTYPE "${dev}" 2>/dev/null || true)
    if [[ "${fstype}" == "exfat" ]]; then
        FIRST_PART="${dev}"
        break
    fi
done

if [[ -z "${FIRST_PART}" ]]; then
    echo "ERROR: Could not locate exFAT data partition" >&2
    exit 1
fi

MOUNT_POINT=""
if command -v udisksctl >/dev/null 2>&1; then
    udisksctl mount -b "${FIRST_PART}" --no-user-interaction >/dev/null 2>&1 || true
fi
MOUNT_POINT=$(lsblk -nro MOUNTPOINT "${FIRST_PART}" 2>/dev/null | head -n1 || true)
if [[ -z "${MOUNT_POINT}" ]]; then
    MOUNT_POINT="/mnt/ahrecovery-verify"
    mkdir -p "${MOUNT_POINT}"
    if command -v mount.exfat-fuse >/dev/null 2>&1; then
        mount.exfat-fuse "${FIRST_PART}" "${MOUNT_POINT}"
    else
        mount -t exfat "${FIRST_PART}" "${MOUNT_POINT}"
    fi
fi

echo "Mounted at: ${MOUNT_POINT}"

ERRORS=0

check_file() {
    local path="$1"
    if [[ -f "${MOUNT_POINT}/${path}" ]]; then
        echo "OK   ${path}"
    else
        echo "MISS ${path}" >&2
        ERRORS=$((ERRORS + 1))
    fi
}

check_dir() {
    local path="$1"
    if [[ -d "${MOUNT_POINT}/${path}" ]]; then
        echo "OK   ${path}/"
    else
        echo "MISS ${path}/" >&2
        ERRORS=$((ERRORS + 1))
    fi
}

echo ""
echo "Configuration files:"
check_file "ventoy/ventoy.json"
check_file "ventoy/script/autounattend.xml"
check_file "ventoy/theme/darkness/theme.txt"

echo ""
echo "ISO directories:"
check_dir "ISOs/Rescue"
check_dir "ISOs/Imaging"
check_dir "ISOs/WinPE"
check_dir "ISOs/Installers"
check_dir "ISOs/AV_Security"

echo ""
echo "Expected ISO payloads:"
check_file "ISOs/Rescue/systemrescue-11.00-amd64.iso"
check_file "ISOs/Imaging/rescuezilla-2.5-64bit.iso"
check_file "ISOs/WinPE/Win11PE_x64_AlreadyHere_v2.iso"
check_file "ISOs/Installers/Win11_23H2_English_x64.iso"
check_file "ISOs/Installers/ubuntu-24.04-live-server.iso"
check_file "ISOs/AV_Security/krd.iso"

echo ""
echo "Portable apps matrix:"
check_dir "Portable_Apps/Disk_Diagnostics"
check_dir "Portable_Apps/Hardware_Info"
check_dir "Portable_Apps/Network_Tools"
check_dir "Portable_Apps/System_Repair"

echo ""
echo "Field docs:"
check_dir "Docs_and_Scripts"

echo ""
echo "Ventoy MOK enrollment key:"
MOK_CER=""
for child in $(lsblk -nro NAME "${TARGET_DEVICE}" | tail -n +2); do
    dev="/dev/${child}"
    fstype=$(lsblk -nro FSTYPE "${dev}" 2>/dev/null || true)
    if [[ "${fstype}" == "vfat" || "${fstype}" == "FAT" ]]; then
        MOUNT_EFI=""
        if command -v udisksctl >/dev/null 2>&1; then
            udisksctl mount -b "${dev}" --no-user-interaction >/dev/null 2>&1 || true
        fi
        MOUNT_EFI=$(lsblk -nro MOUNTPOINT "${dev}" 2>/dev/null | head -n1 || true)
        if [[ -z "${MOUNT_EFI}" ]]; then
            MOUNT_EFI="/mnt/ahrecovery-vtoyefi"
            mkdir -p "${MOUNT_EFI}"
            mount -t vfat "${dev}" "${MOUNT_EFI}" 2>/dev/null || true
        fi
        if [[ -f "${MOUNT_EFI}/ENROLL_THIS_KEY_IN_MOKMANAGER.cer" ]]; then
            MOK_CER="${MOUNT_EFI}/ENROLL_THIS_KEY_IN_MOKMANAGER.cer"
            echo "OK   MOK certificate: ${MOK_CER}"
        fi
        if [[ -n "${MOUNT_EFI}" && "${MOUNT_EFI}" == /mnt/ahrecovery-vtoyefi ]]; then
            umount "${MOUNT_EFI}" 2>/dev/null || true
        fi
    fi
done
if [[ -z "${MOK_CER}" ]]; then
    echo "WARN MOK certificate not found on a FAT partition (may be on another device or Secure Boot disabled)" >&2
fi

if command -v udisksctl >/dev/null 2>&1; then
    udisksctl unmount -b "${FIRST_PART}" --no-user-interaction >/dev/null 2>&1 || umount "${FIRST_PART}" || true
else
    umount "${FIRST_PART}" || true
fi

echo ""
if [[ "${ERRORS}" -eq 0 ]]; then
    echo "Verification passed."
else
    echo "Verification failed with ${ERRORS} missing items." >&2
    exit 1
fi
