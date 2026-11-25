#!/usr/bin/env python3
"""Real Redis synthetic backup/restore drill; never connects to production."""
import os
import unittest
from redis import Redis
from redis_snapshot import create_payload, restore_payload, seal, unseal

SOURCE = "rediss://synthetic-source.invalid:6379"
TARGET = "rediss://synthetic-scratch.invalid:6379"

class RedisIntegrationTests(unittest.TestCase):
    def test_binary_ttl_type_and_count_round_trip(self):
        source = Redis(host="127.0.0.1", port=6379, db=14, socket_timeout=5)
        scratch = Redis(host="127.0.0.1", port=6379, db=15, socket_timeout=5)
        source.ping()
        scratch.ping()
        # Isolated ephemeral Redis service only, never a shared database.
        source.flushdb()
        scratch.flushdb()
        try:
            source.hset(b"synthetic:job:1", mapping={b"status": b"queued", b"binary": b"\x00\xff"})
            source.zadd(b"synthetic:queue", {b"job:1": 2})
            source.pexpire(b"synthetic:queue", 600000)
            source.set(b"synthetic:message", b"hello\x00world")
            payload = create_payload(source, SOURCE)
            self.assertEqual(payload["count"], 3)
            encrypted = seal(payload, bytes(range(32)))
            self.assertNotIn(b"synthetic:job:1", encrypted)
            result = restore_payload(scratch, unseal(encrypted, bytes(range(32))), TARGET)
            self.assertEqual(result["restored"], 3)
            self.assertEqual(scratch.dbsize(), 3)
            self.assertEqual(scratch.hget(b"synthetic:job:1", b"binary"), b"\x00\xff")
            self.assertEqual(scratch.zscore(b"synthetic:queue", b"job:1"), 2.0)
            self.assertGreater(scratch.pttl(b"synthetic:queue"), 0)
            self.assertEqual(scratch.ttl(b"synthetic:job:1"), -1)
            self.assertEqual(scratch.get(b"synthetic:message"), b"hello\x00world")
        finally:
            source.flushdb()
            scratch.flushdb()

if __name__ == "__main__":
    unittest.main()
