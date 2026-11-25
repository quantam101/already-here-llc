# Encrypted Redis recovery — staged rollout

## Current implementation

The isolated test workflow in `.github/workflows/upstash-private-backup.yml` is manually triggered. It reads **only** the `RECOVERY_TEST_REDIS_TCP_URL` GitHub Actions secret, encrypts the best-effort Redis copy using AES-256-GCM, verifies the encrypted file, and uploads it as a private GitHub Actions artifact with `retention-days: 30`. GitHub repository artifact retention limits may shorten that period. This is not a production backup schedule.

The repository's `redis-recovery-tests.yml` additionally performs synthetic DUMP/RESTORE testing against a disposable Redis service. No production Redis credentials are required for that CI job.

## Security boundaries

- Store `RECOVERY_TEST_REDIS_TCP_URL` and `BACKUP_ENCRYPTION_KEY` in GitHub Actions secrets. Do not put their values in source control, issue comments, workflow inputs, or chat.
- The test workflow does **not** read `UPSTASH_REDIS_TCP_URL` and must never point the recovery-test secret at production.
- The GitHub artifact contains an encrypted file, not plaintext Redis data. Anyone with repository read access may be able to download artifacts, so encryption key separation is mandatory.
- Keep an independent offline copy of the encryption key; losing it makes backups unreadable.
- Backups use SCAN and are **not atomic**. Payment and financial records require independent ledger reconciliation.
- The backup command budgets Redis calls and refuses incomplete key scans. The restore refuses source-host matches and nonempty targets.
- The test backup workflow has no nightly schedule, no production access, and no automatic restore.
- Retention of 30 days applies to each uploaded artifact, subject to GitHub's repository retention policy. There is no independently verified second-provider copy.

## Isolated drill

1. Configure a dedicated Upstash test Redis database using a TLS `rediss://` connection string in the `RECOVERY_TEST_REDIS_TCP_URL` Actions secret. Keep it separate from production.
2. Configure a base64-encoded random 32-byte `BACKUP_ENCRYPTION_KEY` Actions secret. Store the key in an independent secure password manager.
3. Populate the isolated test Redis database with synthetic keys of multiple types, including binary values and TTLs.
4. Manually run **Encrypted Redis recovery artifact (isolated test database only)** from GitHub Actions.
5. Confirm the run succeeds and its encrypted `.aes` artifact is available. Download it into a trusted environment.
6. Verify and restore to a **different, empty** scratch Redis instance:

   ```bash
   python -m pip install -r ops/backup/requirements.txt
   export BACKUP_ENCRYPTION_KEY='(retrieve securely from password manager)'
   python ops/backup/redis_snapshot.py verify --file /secure/isolated-recovery.aes
   export REDIS_RESTORE_TCP_URL='rediss://(separate scratch database)'
   export BACKUP_RESTORE_TARGET=SCRATCH_ONLY
   python ops/backup/redis_snapshot.py restore --file /secure/isolated-recovery.aes --confirm-scratch
   ```

7. Compare key count, types, TTL behavior, and application-level records. Document recovery time, missing records, and independent ledger checks.

## Production activation criteria

Do not repurpose the test secret, enable nightly production backups, or merge this as an operational recovery solution until the real Upstash test export, GitHub artifact download, and scratch restore have passed. Production rollout should use a protected GitHub environment, explicit source identification, least-privilege credentials where supported, documented quotas, a separate encryption-key escrow, and a second-provider/offline recovery copy where practical.

## Why GitHub artifacts instead of Vercel Blob signing?

GitHub Actions artifacts avoid distributing Vercel Blob write credentials or implementing a separate signed-URL service. The original Blob uploader remains experimental and is not invoked by the isolated workflow. For higher assurance, Vercel Private Blob now supports short-lived OIDC credentials and signed URLs, but connecting an isolated Vercel project and protecting its signer must be completed and tested separately.
