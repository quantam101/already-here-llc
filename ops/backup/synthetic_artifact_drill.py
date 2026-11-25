#!/usr/bin/env python3
"""Synthetic Redis -> encrypted artifact -> scratch Redis drill. Never uses production URLs."""
import argparse
import json
import os
from pathlib import Path

from redis import Redis
from redis_snapshot import create_payload, decode_key, restore_payload, seal, unseal

SOURCE = "rediss://synthetic-ci-source.invalid:6379"
TARGET = "rediss://synthetic-ci-scratch.invalid:6379"


def database(db):
    return Redis(host="127.0.0.1", port=6379, db=db, socket_timeout=5)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("create", "restore"))
    parser.add_argument("--file", type=Path, required=True)
    args = parser.parse_args()
    if os.environ.get("GITHUB_ACTIONS") != "true" or os.environ.get("BACKUP_INTEGRATION_REDIS") != "1":
        raise RuntimeError("Synthetic drill must run on isolated GitHub CI Redis service")
    key = decode_key(os.environ["BACKUP_ENCRYPTION_KEY"])
    source = database(14)
    scratch = database(15)
    try:
        source.ping()
        scratch.ping()
        if args.action == "create":
            if source.dbsize() or scratch.dbsize():
                raise RuntimeError("Synthetic test databases must start empty")
            source.hset(b"synthetic:job:1", mapping={b"status": b"queued", b"binary": b"\\x00\\xff"})
            source.zadd(b"synthetic:queue", {b"job:1": 2})
            source.pexpire(b"synthetic:queue", 600000)
            source.set(b"synthetic:message", b"hello\\x00world")
            payload = create_payload(source, SOURCE)
            if payload["count"] != 3:
                raise RuntimeError("Expected exactly three synthetic keys")
            args.file.parent.mkdir(parents=True, exist_ok=True)
            args.file.write_bytes(seal(payload, key))
            os.chmod(args.file, 0o600)
            print(json.dumps({"phase": "created", "count": payload["count"]}))
        else:
            payload = unseal(args.file.read_bytes(), key)
            if payload["source_fingerprint"] != __import__("redis_snapshot").source_id(SOURCE):
                raise RuntimeError("Unexpected source fingerprint")
            result = restore_payload(scratch, payload, TARGET)
            if result["restored"] != 3 or scratch.dbsize() != 3:
                raise RuntimeError("Incomplete restored record count")
            if scratch.hget(b"synthetic:job:1", b"binary") != b"\\x00\\xff":
                raise RuntimeError("Binary hash field mismatch")
            if scratch.zscore(b"synthetic:queue", b"job:1") != 2.0:
                raise RuntimeError("Sorted-set mismatch")
            if scratch.pttl(b"synthetic:queue") <= 0:
                raise RuntimeError("TTL mismatch")
            if scratch.ttl(b"synthetic:job:1") != -1:
                raise RuntimeError("Persistent-key mismatch")
            if scratch.get(b"synthetic:message") != b"hello\\x00world":
                raise RuntimeError("Binary string mismatch")
            print(json.dumps({"phase": "restored", **result, "verified": True}))
    finally:
        source.close()
        scratch.close()


if __name__ == "__main__":
    main()
