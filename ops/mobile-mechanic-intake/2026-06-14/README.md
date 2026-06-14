# Mobile Mechanic Intake and Work-Capture Backup - 2026-06-14

This folder stores a public-safe operational backup for the Already Here LLC mobile mechanic / on-site vehicle service intake workflow and the related work-capture task context.

## Scope

- Work-capture-first outreach strategy for mechanic/fleet and cleanout overflow prospects.
- Mobile Service Vehicle Intake & Pre-Work Inspection form source.
- Required pre-work photo and condition checklist.
- Liability-control workflow for on-site vehicle service.
- Current scheduled task inventory summary as of 2026-06-14.
- Base64 backup of the generated PDF intake sheet.
- Base64 backup of the Phoenix mechanic/cleanout work-capture prospect workbook.

## Public-safety handling

This backup intentionally avoids raw private email content, credentials, invoices, payment data, private customer details, and precise private operating addresses. Location-specific task wording has been sanitized where needed.

## Files

| File | Purpose |
|---|---|
| `vehicle-intake-pre-work-inspection.md` | Editable source version of the mobile mechanic intake sheet. |
| `task-context-and-active-automation-inventory.md` | Current task inventory and operating context. |
| `field-workflow.md` | Technician workflow for before-work documentation. |
| `backup-manifest.json` | Checksums and file inventory. |
| `Already_Here_Mobile_Service_Vehicle_Intake_Pre_Work_Inspection.pdf.b64` | Base64 backup of the generated PDF. |
| `Already_Here_Work_Capture_Prospects_Phoenix_Mechanic_Cleanout_2026-06-14.xlsx.b64` | Base64 backup of the generated work-capture workbook. |

## Restore commands

```bash
base64 -d Already_Here_Mobile_Service_Vehicle_Intake_Pre_Work_Inspection.pdf.b64 > Already_Here_Mobile_Service_Vehicle_Intake_Pre_Work_Inspection.pdf
base64 -d Already_Here_Work_Capture_Prospects_Phoenix_Mechanic_Cleanout_2026-06-14.xlsx.b64 > Already_Here_Work_Capture_Prospects_Phoenix_Mechanic_Cleanout_2026-06-14.xlsx
sha256sum Already_Here_Mobile_Service_Vehicle_Intake_Pre_Work_Inspection.pdf Already_Here_Work_Capture_Prospects_Phoenix_Mechanic_Cleanout_2026-06-14.xlsx
```

Compare the SHA-256 values against `backup-manifest.json` after restore.
