#!/usr/bin/env bash
set -euo pipefail

# Build the Already Here Enterprise Multi-Boot & Field Recovery USB drive.
# WARNING: This script is DESTRUCTIVE to the target block device.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="${SCRIPT_DIR}/config"
ISO_SOURCES_DIR="${SCRIPT_DIR}/iso-sources"
VENTOY_DIR="${SCRIPT_DIR}/vendor/ventoy"
PORTABLE_APPS_SOURCE="${SCRIPT_DIR}/portable-apps"
DOCS_SOURCE="${SCRIPT_DIR}/field-docs"

TARGET_DEVICE=""
FORCE=false
SECURE_BOOT=true
DRY_RUN=false
LABEL="AHRecovery"
YES=false

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS] /dev/sdX

Build a Ventoy-based multi-boot recovery USB using the Enterprise spec.

Options:
  -f, --force              Force Ventoy install (wipes target disk)
  -n, --no-secure-boot     Disable Secure Boot support in Ventoy
  -l, --label LABEL        Data partition label (default: ${LABEL})
  -s, --sources DIR        ISO source directory (default: ${ISO_SOURCES_DIR})
      --ventoy-dir DIR     Path to extracted Ventoy directory
      --dry-run            Print operations but do not modify any device
      --yes                Skip interactive confirmation (dangerous)
  -h, --help               Show this help
EOF
}

error() {
    echo "ERROR: $1" >&2
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -f|--force) FORCE=true; shift ;;
        -n|--no-secure-boot) SECURE_BOOT=false; shift ;;
        -l|--label) LABEL="$2"; shift 2 ;;
        -s|--sources) ISO_SOURCES_DIR="$2"; shift 2 ;;
        --ventoy-dir) VENTOY_DIR="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        --yes) YES=true; shift ;;
        -h|--help) usage; exit 0 ;;
        --) shift; break ;;
        -*) error "Unknown option: $1" ;;
        *) TARGET_DEVICE="$1"; shift ;;
    esac
done

if [[ -z "${TARGET_DEVICE}" ]]; then
    if [[ "${DRY_RUN}" == true ]]; then
        TARGET_DEVICE="dry-run"
    else
        usage
        error "Target device is required"
    fi
fi

if ! command -v lsblk >/dev/null 2>&1; then
    error "lsblk is required"
fi

if [[ "${DRY_RUN}" == true && ! -b "${TARGET_DEVICE}" ]]; then
    echo "Dry-run: ${TARGET_DEVICE} is not a block device; using a staging directory."
    DEVICE_SIZE=0
elif [[ ! -b "${TARGET_DEVICE}" ]]; then
    error "${TARGET_DEVICE} is not a block device"
else
    DEVICE_SIZE=$(lsblk -bndo SIZE "${TARGET_DEVICE}" 2>/dev/null || echo 0)
    if [[ "${DEVICE_SIZE}" -lt 549755813888 ]]; then
        echo "WARNING: ${TARGET_DEVICE} is smaller than 64 GiB (${DEVICE_SIZE} bytes)." >&2
        echo "The spec recommends 64 GB minimum; 128 GB+ is preferred." >&2
    fi
fi

if [[ "${EUID:-$(id -u)}" -ne 0 && "${DRY_RUN}" != true ]]; then
    error "This script must be run as root to write the boot loader"
fi

if [[ ! -x "${VENTOY_DIR}/Ventoy2Disk.sh" ]]; then
    echo "Ventoy not found; running download-ventoy.sh..."
    "${SCRIPT_DIR}/download-ventoy.sh"
fi

VENTOY_THEME_DIR="${VENTOY_DIR}/plugin/ventoy/theme"
if [[ ! -f "${VENTOY_THEME_DIR}/theme.txt" ]]; then
    error "Ventoy theme files missing in ${VENTOY_THEME_DIR}"
fi

echo ""
echo "Target device:  ${TARGET_DEVICE}"
echo "Size:           ${DEVICE_SIZE} bytes"
echo "Ventoy:         ${VENTOY_DIR}"
echo "ISO sources:    ${ISO_SOURCES_DIR}"
echo "Data label:     ${LABEL}"
echo "Secure boot:    ${SECURE_BOOT}"
echo "Force install:  ${FORCE}"
echo "Dry run:        ${DRY_RUN}"
echo ""

if [[ "${DRY_RUN}" != true && "${YES}" != true ]]; then
    read -r -p "This will DESTROY all data on ${TARGET_DEVICE}. Type 'yes' to continue: " confirm
    if [[ "${confirm}" != "yes" ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Build Ventoy install command.
VENTOY_CMD=("${VENTOY_DIR}/Ventoy2Disk.sh")
if [[ "${FORCE}" == true ]]; then
    VENTOY_CMD+=("-I")
else
    VENTOY_CMD+=("-i")
fi
VENTOY_CMD+=("-g")
if [[ "${SECURE_BOOT}" == true ]]; then
    VENTOY_CMD+=("-s")
else
    VENTOY_CMD+=("-S")
fi
VENTOY_CMD+=("-L" "${LABEL}" "${TARGET_DEVICE}")

echo "Ventoy install command: ${VENTOY_CMD[*]}"
if [[ "${DRY_RUN}" == true ]]; then
    echo "Dry-run: skipping Ventoy installation."
fi

if [[ "${DRY_RUN}" == true && "${TARGET_DEVICE}" == "dry-run" ]]; then
    MOUNT_POINT=$(mktemp -d /tmp/ahrecovery-usb-dryrun.XXXXXX)
    FIRST_PART="dry-run"
elif [[ "${DRY_RUN}" != true ]]; then
    # Feed enough 'y' confirmations to satisfy Ventoy's prompts (non-interactive).
    printf 'y\n%.0s' {1..20} | "${VENTOY_CMD[@]}"
    partprobe "${TARGET_DEVICE}" 2>/dev/null || true
    sleep 2

    # Identify the first Ventoy data partition.
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
        error "Could not find Ventoy exFAT data partition on ${TARGET_DEVICE}"
    fi

    echo "Data partition: ${FIRST_PART}"

    if command -v udisksctl >/dev/null 2>&1; then
        udisksctl mount -b "${FIRST_PART}" --no-user-interaction >/dev/null 2>&1 || true
    fi
    MOUNT_POINT=$(lsblk -nro MOUNTPOINT "${FIRST_PART}" 2>/dev/null | head -n1 || true)
    if [[ -z "${MOUNT_POINT}" ]]; then
        MOUNT_POINT="/mnt/ahrecovery-usb"
        mkdir -p "${MOUNT_POINT}"
        if command -v mount.exfat-fuse >/dev/null 2>&1; then
            mount.exfat-fuse "${FIRST_PART}" "${MOUNT_POINT}"
        elif [[ -x "${VENTOY_DIR}/tool/x86_64/mount.exfat-fuse" ]]; then
            "${VENTOY_DIR}/tool/x86_64/mount.exfat-fuse" "${FIRST_PART}" "${MOUNT_POINT}"
        else
            mount -t exfat "${FIRST_PART}" "${MOUNT_POINT}"
        fi
    fi
fi

if [[ -z "${MOUNT_POINT}" ]]; then
    error "Could not mount Ventoy data partition"
fi

echo "Mounted at: ${MOUNT_POINT}"

USB_ROOT="${MOUNT_POINT}"

# Directory taxonomy from the Enterprise spec.
DIRS=(
    "ventoy/script"
    "ventoy/theme/darkness"
    "ISOs/Rescue"
    "ISOs/Imaging"
    "ISOs/WinPE"
    "ISOs/Installers"
    "ISOs/AV_Security"
    "Portable_Apps/Disk_Diagnostics"
    "Portable_Apps/Hardware_Info"
    "Portable_Apps/Network_Tools"
    "Portable_Apps/System_Repair"
    "Docs_and_Scripts"
)

for d in "${DIRS[@]}"; do
    if [[ "${DRY_RUN}" == true ]]; then
        echo "Would create: ${USB_ROOT}/${d}"
    else
        mkdir -p "${USB_ROOT}/${d}"
    fi
done

# Copy Ventoy configuration.
copy_config() {
    local src="$1"
    local dst="$2"
    if [[ "${DRY_RUN}" == true ]]; then
        echo "Would copy: ${src} -> ${dst}"
    else
        cp "${src}" "${dst}"
    fi
}

copy_config "${CONFIG_DIR}/ventoy.json" "${USB_ROOT}/ventoy/ventoy.json"
copy_config "${CONFIG_DIR}/autounattend.xml" "${USB_ROOT}/ventoy/script/autounattend.xml"

# Copy Ventoy theme assets.
if [[ "${DRY_RUN}" == true ]]; then
    echo "Would copy Ventoy theme assets to ${USB_ROOT}/ventoy/theme/darkness/"
else
    cp -r "${VENTOY_THEME_DIR}"/* "${USB_ROOT}/ventoy/theme/darkness/"
fi

# ISO copy map: source -> destination name on USB.
declare -A ISO_MAP
declare -a ISO_KEYS
ISO_KEYS=(
    "Rescue/systemrescue-11.00-amd64.iso"
    "Imaging/rescuezilla-2.5-64bit.iso"
    "WinPE/Win11PE_x64_AlreadyHere_v2.iso"
    "Installers/Win11_23H2_English_x64.iso"
    "Installers/ubuntu-24.04-live-server.iso"
    "AV_Security/krd.iso"
)

for rel in "${ISO_KEYS[@]}"; do
    src="${ISO_SOURCES_DIR}/${rel}"
    dst="${USB_ROOT}/ISOs/${rel}"
    if [[ -f "${src}" ]]; then
        if [[ "${DRY_RUN}" == true ]]; then
            echo "Would copy ISO: ${src} -> ${dst}"
        else
            cp "${src}" "${dst}"
        fi
    else
        echo "WARNING: Missing ISO source: ${src}" >&2
    fi
done

# Optional portable application matrix.
if [[ -d "${PORTABLE_APPS_SOURCE}" ]]; then
    if [[ "${DRY_RUN}" == true ]]; then
        echo "Would copy portable apps from ${PORTABLE_APPS_SOURCE}"
    else
        cp -a "${PORTABLE_APPS_SOURCE}"/. "${USB_ROOT}/Portable_Apps/"
    fi
else
    if [[ "${DRY_RUN}" == true ]]; then
        echo "Would create Portable_Apps/README.txt (no source provided)"
    else
        cat > "${USB_ROOT}/Portable_Apps/README.txt" <<'EOF'
Place portable Windows diagnostics and repair tools here, organized by role:

- Disk_Diagnostics/
- Hardware_Info/
- Network_Tools/
- System_Repair/
EOF
    fi
fi

# Optional field documentation.
if [[ -d "${DOCS_SOURCE}" ]]; then
    if [[ "${DRY_RUN}" == true ]]; then
        echo "Would copy field docs from ${DOCS_SOURCE}"
    else
        cp -a "${DOCS_SOURCE}"/. "${USB_ROOT}/Docs_and_Scripts/"
    fi
else
    if [[ "${DRY_RUN}" == true ]]; then
        echo "Would create Docs_and_Scripts/README.txt (no source provided)"
    else
        cat > "${USB_ROOT}/Docs_and_Scripts/README.txt" <<'EOF'
Add field operational checklists, scripts, and offline driver collections here.
EOF
    fi
fi

if [[ "${DRY_RUN}" != true ]]; then
    sync
    if command -v udisksctl >/dev/null 2>&1; then
        udisksctl unmount -b "${FIRST_PART}" --no-user-interaction >/dev/null 2>&1 || umount "${FIRST_PART}" || true
    else
        umount "${FIRST_PART}" || true
    fi
fi

echo ""
echo "USB build complete: ${TARGET_DEVICE}"
echo ""
echo "Next steps:"
echo "  1. Run $(dirname "$0")/verify-usb.sh ${TARGET_DEVICE}"
echo "  2. Boot a UEFI/Secure Boot workstation and enroll the Ventoy MOK key when prompted."
if [[ "${SECURE_BOOT}" == true ]]; then
    echo "  3. Use MokManager: Enroll Key -> Enroll key from disk -> ENROLL_THIS_KEY_IN_MOKMANAGER.cer -> Yes."
fi
