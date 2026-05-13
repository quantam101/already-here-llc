# Google Drive Gallery Source Mapping

## Verified Drive access

The ChatGPT Google Drive connector can search, list, and fetch accessible Drive files.

## Existing relevant Drive folder

```text
Folder name: already_here_llc
Folder ID: 1Lp0LdpVer1hh39A6oCzbCAOgenWkAJxW
URL: https://drive.google.com/drive/folders/1Lp0LdpVer1hh39A6oCzbCAOgenWkAJxW
```

Current children:

```text
BOS — Dispatch Intake Log
BOS — HubSpot, QB & CRM
BOS — Build Fixes & VHLL Pipeline
```

## Required gallery folder structure

Create this structure inside `already_here_llc`:

```text
already_here_llc
  Website Gallery
    Approved
    Current Projects
    Archive
    Do Not Publish
```

Only these folders should feed the website gallery automation:

```text
Website Gallery / Approved
Website Gallery / Current Projects
```

These folders must never feed the public site:

```text
Website Gallery / Archive
Website Gallery / Do Not Publish
```

## Why this matters

The gallery automation intentionally uses an approved-source model. It should not publish random Drive files, raw project archives, medical files, credentials, screenshots, or uncontrolled Gmail image exports.

## rclone target

After the folders exist, configure the Oracle VM rclone source to one of these:

```bash
RCLONE_REMOTE=alreadyhere-drive
RCLONE_SOURCE_PATH=already_here_llc/Website Gallery/Approved
RCLONE_DESTINATION=/opt/already-here-gallery/source
```

For current project rotation, use:

```bash
RCLONE_SOURCE_PATH=already_here_llc/Website Gallery/Current Projects
```

## Approval rules

Do not place images in Approved or Current Projects if they contain:

```text
faces without permission
badges
client credentials
license plates
serial numbers
patient information
medical records
restricted signage
addresses
QR codes
screens showing usernames/passwords
private client names unless intentionally public
```

## Minimum launch target

Before enabling automatic gallery publishing, place at least 3 safe project photos into:

```text
already_here_llc / Website Gallery / Approved
```

Then run the Oracle queue:

```text
drive.sync
gallery.rotate
a-plus.live-smoke-test
```
