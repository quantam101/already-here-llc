# LINDYMODE Hermes Agentic Operating System

This repository contains a practical Hermes-compatible operating layer for Already Here LLC automation.

## Purpose

Hermes OS gives the site automation a governed runtime model instead of one-off scripts.

It defines:

```text
missions
policy gates
allowed writes
receipts
audit hashes
OCI runtime compatibility
```

## Current missions

### gallery.rotate

Rotates approved project-gallery photos from the OCI approved source folder into the website.

Writes only:

```text
data/gallery-manifest.json
public/gallery/rotating/**
```

### health.check

Validates that Hermes OS, gallery manifest, OCI agent, Dockerfile, and systemd runtime files exist.

Run:

```bash
node scripts/hermes-agentctl.mjs health
```

## Receipts

Receipts are written to:

```text
hermes/receipts
```

Each receipt includes:

```text
mission
startedAt
finishedAt
status
git status
changed files
environment summary
sha256 hash
```

## Safety rules

Do not place unapproved images into the OCI publish folder.

Never commit secrets into the repo.

Human approval is required before publishing:

```text
client-identifiable images
faces
license plates
badges
credentials
medical or patient details
new procurement claims
new certification language
regulated-environment imagery
```

## OCI runtime

The first always-on worker is the gallery rotation agent in:

```text
infra/oci-gallery-agent
```

It runs continuously on an Oracle Cloud VM through Docker and systemd.
