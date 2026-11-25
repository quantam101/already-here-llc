import base64
import unittest

from redis_snapshot import (
    create_payload,
    decode_key,
    restore_payload,
    seal,
    source_id,
    unseal,
)


class FakePipeline:
    def __init__(self, database):
        self.database = database
        self.key = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def type(self, key):
        self.key = key

    def pttl(self, key):
        self.key = key

    def dump(self, key):
        self.key = key

    def execute(self):
        row = self.database.items[self.key]
        return (row["type"], row["ttl_ms"], row["dump"])


class FakeRedis:
    def __init__(self, items=None):
        self.items = items or {}

    def dbsize(self):
        return len(self.items)

    def scan(self, cursor=0, count=250):
        keys = list(self.items)
        return 0, keys

    def pipeline(self, transaction=True):
        assert transaction
        return FakePipeline(self)

    def restore(self, key, ttl_ms, data, replace=False):
        assert not replace
        if key in self.items:
            raise RuntimeError("Overwriting a key is prohibited")
        restored_type = b"zset" if data == b"\x01second key" else b"hash"
        self.items[key] = {"type": restored_type, "ttl_ms": ttl_ms, "dump": data}

    def type(self, key):
        return self.items[key]["type"]


class SnapshotTests(unittest.TestCase):
    SOURCE = "rediss://default:secret@source.upstash.io:6379"
    TARGET = "rediss://default:secret@scratch.upstash.io:6379"

    def setUp(self):
        self.key = bytes(range(32))
        self.source = FakeRedis({
            b"canonical:jobs:a": {"type": b"hash", "ttl_ms": -1, "dump": b"\x00\x11test binary\xff"},
            b"canonical:queue": {"type": b"zset", "ttl_ms": 600_000, "dump": b"\x01second key"},
        })

    def test_encrypt_round_trip_and_scratch_restore(self):
        payload = create_payload(self.source, self.SOURCE)
        encrypted = seal(payload, self.key)
        self.assertNotIn(b"canonical:jobs:a", encrypted)
        opened = unseal(encrypted, self.key)
        destination = FakeRedis()
        result = restore_payload(destination, opened, self.TARGET)
        self.assertEqual(result["restored"], 2)
        self.assertEqual(destination.items[b"canonical:jobs:a"]["dump"], b"\x00\x11test binary\xff")
        self.assertEqual(destination.items[b"canonical:jobs:a"]["ttl_ms"], 0)
        self.assertGreater(destination.items[b"canonical:queue"]["ttl_ms"], 0)

    def test_rejects_wrong_key_and_tampered_backup(self):
        data = seal(create_payload(self.source, self.SOURCE), self.key)
        with self.assertRaises(Exception):
            unseal(data, bytes(reversed(self.key)))
        envelope = bytearray(data)
        envelope[-12] = ord('X')
        with self.assertRaises(Exception):
            unseal(bytes(envelope), self.key)

    def test_never_restores_to_original_or_nonempty_store(self):
        payload = create_payload(self.source, self.SOURCE)
        with self.assertRaisesRegex(RuntimeError, "matches original"):
            restore_payload(FakeRedis(), payload, self.SOURCE)
        with self.assertRaisesRegex(RuntimeError, "not empty"):
            restore_payload(self.source, payload, self.TARGET)

    def test_rejects_invalid_key_and_non_tls(self):
        with self.assertRaises(ValueError):
            decode_key(base64.b64encode(b"short").decode("ascii"))
        with self.assertRaises(ValueError):
            source_id("redis://default:pass@source.upstash.io:6379")


if __name__ == "__main__":
    unittest.main()
