# Already Here LLC: zero-subscription-cost Redis recovery copies

This workflow backs up the **live Upstash Redis keyspace** and uploads a
client-side AES-256-GCM encrypted file to a **dedicated private Vercel Blob
store**, with a 30-day retention window. It uses a GitHub Actions scheduled
workflow. This is separate from `scripts/backup.sh`, which archives source
files and **does not back up production customer records**.

## Safety and accuracy boundaries

- **Best effort, not a transactionally consistent snapshot.** Redis `SCAN`
  across changing keys is non-atomic. Each individual key's `TYPE`, `PTTL`, and
  `DUMP` is read transactionally, and before/after `DBSIZE` must match, but
  simultaneous changes can still evade detection. Financial event recovery
  also requires processor/bank reconciliation.
- The encrypted file preserves binary `DUMP` values and absolute key-expiration
  times. It never writes plaintext database records to disk.
- The restore command refuses the source Redis host and refuses nonempty
  targets. It cannot be triggered by the scheduled workflow.
- The dedicated Blob store must not be connected to the Already Here production
  Vercel project. Keep its static write token only in the GitHub Actions secret.
- Do not post credentials, dump files, or decrypted records in GitHub issues,
  repository history, screenshots, or chat.

## One-time setup (account owner)

1. In Vercel Storage, create a **Private** Blob store named for backup use.
   Keep it unconnected to the production `already-here-llc` project.
2. In GitHub `quantam101/already-here-llc` > Settings > Secrets and variables >
   Actions, create these **repository secrets** without putting values in chat:

   - `UPSTASH_REDIS_TCP_URL`: native TLS connection URI (`rediss://...`) for the
     exact Upstash Redis database serving production. This is not the REST URL.
   - `VERCEL_BLOB_BACKUP_TOKEN`: read/write token for the dedicated **private**
     Blob store, obtained from its Vercel settings.
   - `BACKUP_ENCRYPTION_KEY`: a random 32-byte secret encoded as base64. Generate
     locally with `python -c 'import base64,secrets;print(base64.b64encode(secrets.token_bytes(32)).decode())'`.

3. Keep the encryption key in a separate password manager as well as Actions
   secrets. **Without it, every offsite backup becomes permanently unreadable.**
4. Before merging the workflow to the default branch, run its unit tests and
   verify a native Upstash `DUMP`/`RESTORE` works on an isolated scratch database.
5. Once merged and configured, manually run Actions > Upstash encrypted recovery
   backup > Run workflow. Confirm `Create`, `verify`, and `upload` all pass.
6. Confirm `Vercel Storage > private backup store` contains an encrypted `.aes`
   object. The job runs nightly at **03:17 America/Phoenix** (10:17 UTC).

Neither Vercel nor Upstash must be upgraded for the code to run, but actual
availability, quota, billing, account plan, and Redis command support must be
confirmed before production activation. **No payment method or paid upgrade
should be authorized just to enable this workflow.** If the free Vercel Blob
quota is unavailable, do not silently substitute public storage.

## Restore drill (strictly isolated)

1. Create a **separate scratch Redis database** with its own TLS endpoint.
2. Download an encrypted `.aes` backup from the private Blob store into a
   trusted local directory with restricted permissions.
3. Install `pip install -r ops/backup/requirements.txt`. Export the encryption
   key from your password manager, and execute:

   ```bash
   python ops/backup/redis_snapshot.py verify --file /secure/backup.aes
   export REDIS_RESTORE_TCP_URL='rediss://...scratch-db...'
   export BACKUP_RESTORE_TARGET='SCRATCH_ONLY'
   python ops/backup/redis_snapshot.py restore --file /secure/backup.aes --confirm-scratch
   ```

4. Compare restored key count, types, and application-level customer/work-order
   totals. Reconcile independent financial evidence. Redis keys whose original
   TTL has since elapsed are intentionally omitted.
5. After verifying the drill, delete the **scratch database only** using its
   console and record the restore date, duration, results, and discrepancies.

## Validation

```bash
python -m unittest discover -s ops/backup -p 'test_*.py' -v
```

The existing automated CI should run these tests when updating this module.
