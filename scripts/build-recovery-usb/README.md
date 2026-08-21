# Enterprise Multi-Boot & Field Recovery USB Builder

Scripts and configuration templates to build the Already Here LLC recovery USB drive described in `Enterprise_MultiBoot_Recovery_Platform_Specification.pdf`.

## Quick start

1. Run from this directory:

```bash
cd scripts/build-recovery-usb

# 1. Download freely distributable ISOs
./download-isos.sh

# 2. (Optional) Add operator-supplied images
#    - ISOs/Installers/Win11_23H2_English_x64.iso
#    - ISOs/WinPE/Win11PE_x64_AlreadyHere_v2.iso
#    - ISOs/AV_Security/krd.iso

# 3. Build the USB drive (replace /dev/sdX with the target device)
sudo ./build-usb.sh --force /dev/sdX

# 4. Verify the result
sudo ./verify-usb.sh /dev/sdX
```

## Files

- `build-usb.sh` — partitions the target device with Ventoy, creates the directory taxonomy, and copies ISOs/configs.
- `download-ventoy.sh` — downloads the pinned Ventoy release (`1.0.99`).
- `download-isos.sh` — downloads the public ISO images (SystemRescue, Rescuezilla, Ubuntu).
- `verify-usb.sh` — mounts the drive and checks the layout, config files, and ISOs.
- `config/ventoy.json` — Ventoy menu configuration from the spec.
- `config/autounattend.xml` — Windows unattended answer file from the spec.

## Important notes

- **This process is destructive.** `build-usb.sh` with `--force` wipes the target device.
- Run `build-usb.sh` as root; it writes the Ventoy bootloader and mounts partitions.
- The target should be a 64 GB+ USB 3.2 Gen 2 flash drive or NVMe USB enclosure.
- Commercial/custom ISOs must be supplied by the operator:
  - Windows 11 23H2 installer
  - `Win11PE_x64_AlreadyHere_v2.iso` custom WinPE
  - Kaspersky Rescue Disk (`krd.iso`)
- On the first UEFI Secure Boot boot, enroll the Ventoy MOK certificate when MokManager appears.

## Hardware validation

Insert the completed drive, boot from the UEFI USB entry, and confirm each ISO can load into RAM and detect NVMe storage.
