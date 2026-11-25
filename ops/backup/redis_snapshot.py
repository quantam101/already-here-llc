#!/usr/bin/env python3
"""Encrypted, best-effort Upstash Redis backup and scratch-only restore.

This is a recovery copy, NOT an atomic point-in-time ledger snapshot. Concurrent
key creation/deletion can change the scanned keyspace. For authoritative money
reconciliation, use independently verified processor/bank evidence.
"""

from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

FORMAT = "already-here-upstash-copy"
VERSION = 1
AAD = f"{FORMAT}:v{VERSION}".encode("ascii")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def decode_key(raw: str) -> bytes:
    try:
        value = base64.b64decode(raw, validate=True)
    except (ValueError, base64.binascii.Error) as error:
        raise ValueError("BACKUP_ENCRYPTION_KEY must be base64-encoded") from error
    if len(value) != 32:
        raise ValueError("BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes")
    return value


def source_id(redis_url: str) -> str:
    url = urlsplit(redis_url)
    if url.scheme != "rediss" or not url.hostname:
        raise ValueError("A TLS Redis URL (rediss://) is required")
    # Never serialize credentials, the username, or the database URL.
    return hashlib.sha256(url.hostname.encode("utf-8")).hexdigest()


def redis_client(redis_url: str):
    source_id(redis_url)
    from redis import Redis  # Installed for the scheduled job; not needed for unit tests.

    return Redis.from_url(
        redis_url,
        decode_responses=False,
        socket_connect_timeout=15,
        socket_timeout=30,
        health_check_interval=30,
    )


def create_payload(client, redis_url: str) -> dict:
    started = utc_now()
    observed_before = int(client.dbsize())
    entries = []
    seen = set()
    cursor = 0

    while True:
        cursor, keys = client.scan(cursor=cursor, count=250)
        for key in keys:
            if key in seen:
                continue
            seen.add(key)
            # Keep each key's type, TTL, and binary dump from one transaction.
            with client.pipeline(transaction=True) as tx:
                tx.type(key)
                tx.pttl(key)
                tx.dump(key)
                type_name, ttl_ms, serialized = tx.execute()
            if type_name in (b"none", "none") or ttl_ms == -2 or serialized is None:
                raise RuntimeError("A key disappeared during backup; retry the job")
            if ttl_ms < -1:
                raise RuntimeError("Invalid Redis key expiration encountered")
            expires_at_ms = None
            if ttl_ms >= 0:
                expires_at_ms = int(utc_now().timestamp() * 1000) + int(ttl_ms)
            entries.append(
                {
                    "key_b64": base64.b64encode(key).decode("ascii"),
                    "type": type_name.decode("ascii") if isinstance(type_name, bytes) else type_name,
                    "dump_b64": base64.b64encode(serialized).decode("ascii"),
                    "expires_at_ms": expires_at_ms,
                }
            )
        if int(cursor) == 0:
            break

    observed_after = int(client.dbsize())
    if observed_before != observed_after or observed_after != len(entries):
        raise RuntimeError("Key count changed while copying; retry rather than save a partial backup")
    entries.sort(key=lambda item: item["key_b64"])
    return {
        "format": FORMAT,
        "version": VERSION,
        "source_fingerprint": source_id(redis_url),
        "started_at": started.isoformat(),
        "finished_at": utc_now().isoformat(),
        "consistency": "best_effort_non_atomic_scan",
        "count": len(entries),
        "entries": entries,
    }


def seal(payload: dict, encryption_key: bytes) -> bytes:
    plain = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    compressed = gzip.compress(plain, mtime=0)
    nonce = secrets.token_bytes(12)
    encrypted = AESGCM(encryption_key).encrypt(nonce, compressed, AAD)
    envelope = {
        "format": FORMAT,
        "version": VERSION,
        "nonce_b64": base64.b64encode(nonce).decode("ascii"),
        "ciphertext_b64": base64.b64encode(encrypted).decode("ascii"),
    }
    return json.dumps(envelope, separators=(",", ":")).encode("utf-8")


def unseal(data: bytes, encryption_key: bytes) -> dict:
    envelope = json.loads(data)
    if envelope.get("format") != FORMAT or envelope.get("version") != VERSION:
        raise ValueError("Unsupported backup format")
    nonce = base64.b64decode(envelope["nonce_b64"], validate=True)
    encrypted = base64.b64decode(envelope["ciphertext_b64"], validate=True)
    plain = gzip.decompress(AESGCM(encryption_key).decrypt(nonce, encrypted, AAD))
    payload = json.loads(plain)
    if payload.get("format") != FORMAT or payload.get("version") != VERSION:
        raise ValueError("Backup payload format mismatch")
    if payload.get("count") != len(payload.get("entries", [])):
        raise ValueError("Backup entry count mismatch")
    return payload


def restore_payload(client, payload: dict, target_url: str) -> dict:
    if payload["source_fingerprint"] == source_id(target_url):
        raise RuntimeError("Refusing restore: destination host matches original database")
    if int(client.dbsize()) != 0:
        raise RuntimeError("Refusing restore: scratch database is not empty")
    restored = 0
    expired = 0
    now_ms = int(utc_now().timestamp() * 1000)
    for entry in payload["entries"]:
        key = base64.b64decode(entry["key_b64"], validate=True)
        data = base64.b64decode(entry["dump_b64"], validate=True)
        expires_at_ms = entry["expires_at_ms"]
        ttl_ms = 0 if expires_at_ms is None else int(expires_at_ms) - now_ms
        if expires_at_ms is not None and ttl_ms <= 0:
            expired += 1
            continue
        # No REPLACE: a concurrent write or collision fails safely.
        client.restore(key, ttl_ms, data, replace=False)
        restored_type = client.type(key)
        restored_type = restored_type.decode("ascii") if isinstance(restored_type, bytes) else restored_type
        if restored_type != entry["type"]:
            raise RuntimeError("Restored key type does not match source")
        restored += 1
    if int(client.dbsize()) != restored:
        raise RuntimeError("Restored record count does not match the backup")
    return {"restored": restored, "expired_since_backup": expired, "expected": payload["count"]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("create", "verify", "restore"))
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument("--confirm-scratch", action="store_true")
    args = parser.parse_args()

    encryption_key = decode_key(os.environ["BACKUP_ENCRYPTION_KEY"])
    if args.action == "create":
        url = os.environ["UPSTASH_REDIS_TCP_URL"]
        client = redis_client(url)
        try:
            payload = create_payload(client, url)
        finally:
            client.close()
        args.file.parent.mkdir(parents=True, exist_ok=True)
        args.file.write_bytes(seal(payload, encryption_key))
        os.chmod(args.file, 0o600)
        print(json.dumps({"result": "encrypted_backup_created", "count": payload["count"], "file": args.file.name}))
    else:
        payload = unseal(args.file.read_bytes(), encryption_key)
        if args.action == "verify":
            print(json.dumps({"result": "integrity_verified", "count": payload["count"], "consistency": payload["consistency"]}))
            return
        if not args.confirm_scratch or os.environ.get("BACKUP_RESTORE_TARGET") != "SCRATCH_ONLY":
            raise RuntimeError("Restore requires --confirm-scratch and BACKUP_RESTORE_TARGET=SCRATCH_ONLY")
        target = os.environ["REDIS_RESTORE_TCP_URL"]
        client = redis_client(target)
        try:
            print(json.dumps(restore_payload(client, payload, target)))
        finally:
            client.close()


if __name__ == "__main__":
    main()
