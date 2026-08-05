"""Polymarket contract ABI fragments, topic0 hashes, and log decoders."""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Known contract addresses (Polygon mainnet). Override via env for testnets.
# ---------------------------------------------------------------------------
DEFAULT_CTF_EXCHANGE_V2 = "0xE111180000d2663C0091e4f400237545B87B996B"
DEFAULT_NEG_RISK_EXCHANGE_V2 = "0xe2222d279d744050d28e00520010520000310F59"
DEFAULT_CTF_EXCHANGE_V1 = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E"
DEFAULT_CONDITIONAL_TOKENS = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045"

# USDC on Polygon (6 decimals)
USDC_DECIMALS = 6

# ---------------------------------------------------------------------------
# Event signatures and hardcoded keccak-256 topic0 values.
# Keccak is computed off-line and verified against on-chain logs.
# ---------------------------------------------------------------------------
ORDER_FILLED_V1_SIG = (
    "OrderFilled(bytes32,address,address,uint256,uint256,uint256,uint256,uint256)"
)
ORDER_FILLED_V2_SIG = (
    "OrderFilled(bytes32,address,address,uint8,uint256,uint256,uint256,uint256,bytes32,bytes32)"
)
ORDERS_MATCHED_V2_SIG = "OrdersMatched(bytes32,address,uint8,uint256,uint256,uint256)"
TRANSFER_SINGLE_SIG = "TransferSingle(address,address,address,uint256,uint256)"
TRANSFER_BATCH_SIG = "TransferBatch(address,address,address,uint256[],uint256[])"

# Pre-computed keccak-256 topic0 hashes (verified with pycryptodome 3.23)
ORDER_FILLED_V1_TOPIC = "0xd0a08e8c493f9c94f29311604c9de1b4e8c8d4c06bd0c789af57f2d65bfec0f6"
ORDER_FILLED_V2_TOPIC = "0xd543adfd945773f1a62f74f0ee55a5e3b9b1a28262980ba90b1a89f2ea84d8ee"
ORDERS_MATCHED_V2_TOPIC = "0x174b3811690657c217184f89418266767c87e4805d09680c39fc9c031c0cab7c"
TRANSFER_SINGLE_TOPIC = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62"
TRANSFER_BATCH_TOPIC = "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb"

TOPIC_0_BY_NAME: Dict[str, str] = {
    "OrderFilledV1": ORDER_FILLED_V1_TOPIC,
    "OrderFilledV2": ORDER_FILLED_V2_TOPIC,
    "OrdersMatchedV2": ORDERS_MATCHED_V2_TOPIC,
    "TransferSingle": TRANSFER_SINGLE_TOPIC,
    "TransferBatch": TRANSFER_BATCH_TOPIC,
}

ALL_FILL_TOPICS: Tuple[str, ...] = (
    ORDER_FILLED_V1_TOPIC,
    ORDER_FILLED_V2_TOPIC,
    ORDERS_MATCHED_V2_TOPIC,
)

ALL_TRANSFER_TOPICS: Tuple[str, ...] = (TRANSFER_SINGLE_TOPIC, TRANSFER_BATCH_TOPIC)


def _to_bytes(value: Any) -> bytes:
    if isinstance(value, bytes):
        return value
    if isinstance(value, int):
        return value.to_bytes(32, "big")
    text = str(value)
    if text.startswith("0x"):
        text = text[2:]
    if len(text) % 2:
        text = "0" + text
    return bytes.fromhex(text)


def _normalize_address(addr: Any) -> str:
    """Return lowercase checksummed-ish 0x address (no EIP-55, just lower)."""
    raw = str(addr)
    if raw.startswith("0x"):
        return "0x" + raw[2:].lower().zfill(40)[-40:]
    return "0x" + raw.lower().zfill(40)[-40:]


def _decode_uint256(hex_or_bytes: Any) -> int:
    return int.from_bytes(_to_bytes(hex_or_bytes), "big")


def _decode_address(topic_value: Any) -> str:
    b = _to_bytes(topic_value)
    return "0x" + b[-20:].hex()


def _decode_int8_at_offset(data: bytes, offset: int) -> int:
    return int.from_bytes(data[offset : offset + 32], "big")


def usdc_amount(raw: int) -> Decimal:
    """Convert a 6-decimal USDC integer to a Decimal USD value."""
    return Decimal(raw) / Decimal(10 ** USDC_DECIMALS)


def decode_transfer_single(log: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Decode an ERC-1155 TransferSingle event log."""
    topics = log.get("topics", [])
    data = log.get("data", "0x")
    if len(topics) < 4:
        return None
    try:
        data_bytes = _to_bytes(data)
    except Exception:
        return None
    if len(data_bytes) < 64:
        return None
    return {
        "event": "TransferSingle",
        "operator": _decode_address(topics[1]),
        "from": _decode_address(topics[2]),
        "to": _decode_address(topics[3]),
        "token_id": str(_decode_uint256(data_bytes[0:32])),
        "value": _decode_uint256(data_bytes[32:64]),
        "transaction_hash": log.get("transactionHash", log.get("transaction_hash", "")),
        "log_index": log.get("logIndex", log.get("log_index", 0)),
        "block_number": int(log.get("blockNumber", "0"), 16)
        if isinstance(log.get("blockNumber"), str)
        else int(log.get("blockNumber", 0)),
    }


def decode_transfer_batch(log: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Decode an ERC-1155 TransferBatch event log (dynamic array ABI)."""
    topics = log.get("topics", [])
    data = log.get("data", "0x")
    if len(topics) < 4:
        return None
    try:
        data_bytes = _to_bytes(data)
    except Exception:
        return None
    if len(data_bytes) < 128:
        return None

    # ABI-encoded dynamic arrays: offsets (2 words), then lengths + payloads
    offset_ids = _decode_uint256(data_bytes[0:32])
    offset_values = _decode_uint256(data_bytes[32:64])
    if offset_ids + 32 > len(data_bytes) or offset_values + 32 > len(data_bytes):
        return None

    ids_len = _decode_uint256(data_bytes[offset_ids : offset_ids + 32])
    ids: List[int] = []
    base = offset_ids + 32
    for i in range(ids_len):
        start = base + i * 32
        end = start + 32
        if end > len(data_bytes):
            return None
        ids.append(_decode_uint256(data_bytes[start:end]))

    values_len = _decode_uint256(data_bytes[offset_values : offset_values + 32])
    values: List[int] = []
    base = offset_values + 32
    for i in range(values_len):
        start = base + i * 32
        end = start + 32
        if end > len(data_bytes):
            return None
        values.append(_decode_uint256(data_bytes[start:end]))

    if len(ids) != len(values):
        return None

    return {
        "event": "TransferBatch",
        "operator": _decode_address(topics[1]),
        "from": _decode_address(topics[2]),
        "to": _decode_address(topics[3]),
        "token_ids": [str(t) for t in ids],
        "values": values,
        "transaction_hash": log.get("transactionHash", log.get("transaction_hash", "")),
        "log_index": log.get("logIndex", log.get("log_index", 0)),
        "block_number": int(log.get("blockNumber", "0"), 16)
        if isinstance(log.get("blockNumber"), str)
        else int(log.get("blockNumber", 0)),
    }


def decode_order_filled_v1(log: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Decode legacy CTF Exchange OrderFilled (8-arg data section)."""
    topics = log.get("topics", [])
    data = log.get("data", "0x")
    if len(topics) < 4:
        return None
    try:
        data_bytes = _to_bytes(data)
    except Exception:
        return None
    if len(data_bytes) < 160:
        return None
    return {
        "event": "OrderFilledV1",
        "order_hash": "0x" + _to_bytes(topics[1]).hex(),
        "maker": _decode_address(topics[2]),
        "taker": _decode_address(topics[3]),
        "maker_asset_id": str(_decode_uint256(data_bytes[0:32])),
        "taker_asset_id": str(_decode_uint256(data_bytes[32:64])),
        "maker_amount": _decode_uint256(data_bytes[64:96]),
        "taker_amount": _decode_uint256(data_bytes[96:128]),
        "fee": _decode_uint256(data_bytes[128:160]),
        "side": None,
        "transaction_hash": log.get("transactionHash", log.get("transaction_hash", "")),
        "log_index": log.get("logIndex", log.get("log_index", 0)),
        "block_number": int(log.get("blockNumber", "0"), 16)
        if isinstance(log.get("blockNumber"), str)
        else int(log.get("blockNumber", 0)),
    }


def decode_order_filled_v2(log: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Decode CTF Exchange V2 OrderFilled (Side + tokenId + amounts + fee + builder + metadata)."""
    topics = log.get("topics", [])
    data = log.get("data", "0x")
    if len(topics) < 4:
        return None
    try:
        data_bytes = _to_bytes(data)
    except Exception:
        return None
    if len(data_bytes) < 224:
        return None
    side_int = _decode_uint256(data_bytes[0:32])
    side = "BUY" if side_int == 0 else "SELL" if side_int == 1 else str(side_int)
    return {
        "event": "OrderFilledV2",
        "order_hash": "0x" + _to_bytes(topics[1]).hex(),
        "maker": _decode_address(topics[2]),
        "taker": _decode_address(topics[3]),
        "side": side,
        "token_id": str(_decode_uint256(data_bytes[32:64])),
        "maker_amount": _decode_uint256(data_bytes[64:96]),
        "taker_amount": _decode_uint256(data_bytes[96:128]),
        "fee": _decode_uint256(data_bytes[128:160]),
        "builder": "0x" + data_bytes[160:192].hex(),
        "metadata": "0x" + data_bytes[192:224].hex(),
        "transaction_hash": log.get("transactionHash", log.get("transaction_hash", "")),
        "log_index": log.get("logIndex", log.get("log_index", 0)),
        "block_number": int(log.get("blockNumber", "0"), 16)
        if isinstance(log.get("blockNumber"), str)
        else int(log.get("blockNumber", 0)),
    }


def decode_orders_matched_v2(log: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Decode CTF Exchange V2 OrdersMatched (taker order perspective)."""
    topics = log.get("topics", [])
    data = log.get("data", "0x")
    if len(topics) < 3:
        return None
    try:
        data_bytes = _to_bytes(data)
    except Exception:
        return None
    if len(data_bytes) < 128:
        return None
    side_int = _decode_uint256(data_bytes[0:32])
    side = "BUY" if side_int == 0 else "SELL" if side_int == 1 else str(side_int)
    return {
        "event": "OrdersMatchedV2",
        "taker_order_hash": "0x" + _to_bytes(topics[1]).hex(),
        "taker_order_maker": _decode_address(topics[2]),
        "side": side,
        "token_id": str(_decode_uint256(data_bytes[32:64])),
        "maker_amount": _decode_uint256(data_bytes[64:96]),
        "taker_amount": _decode_uint256(data_bytes[96:128]),
        "transaction_hash": log.get("transactionHash", log.get("transaction_hash", "")),
        "log_index": log.get("logIndex", log.get("log_index", 0)),
        "block_number": int(log.get("blockNumber", "0"), 16)
        if isinstance(log.get("blockNumber"), str)
        else int(log.get("blockNumber", 0)),
    }


def parse_log(log: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Route a raw log to the correct decoder based on topic0."""
    topics = log.get("topics", [])
    if not topics:
        return None
    topic0 = str(topics[0]).lower()
    if topic0 == ORDER_FILLED_V1_TOPIC.lower():
        return decode_order_filled_v1(log)
    if topic0 == ORDER_FILLED_V2_TOPIC.lower():
        return decode_order_filled_v2(log)
    if topic0 == ORDERS_MATCHED_V2_TOPIC.lower():
        return decode_orders_matched_v2(log)
    if topic0 == TRANSFER_SINGLE_TOPIC.lower():
        return decode_transfer_single(log)
    if topic0 == TRANSFER_BATCH_TOPIC.lower():
        return decode_transfer_batch(log)
    return None


def derive_price_from_fill(fill: Dict[str, Any]) -> Decimal:
    """Infer trade price (USDC per share) from maker/taker amounts.

    V2 OrderFilled / OrdersMatched encode an explicit side:
      - BUY  (0): maker gives collateral, taker gives shares  => price = maker/taker
      - SELL (1): maker gives shares,   taker gives collateral => price = taker/maker
    V1 lacks side, so we fall back to min/max ratio (collateral raw is always <= shares raw
    for binary markets with equal decimals).
    """
    maker_amount = fill.get("maker_amount", 0) or 0
    taker_amount = fill.get("taker_amount", 0) or 0
    if maker_amount == 0 or taker_amount == 0:
        return Decimal("0")

    side = fill.get("side")
    if side == "BUY":
        raw = Decimal(maker_amount) / Decimal(taker_amount)
    elif side == "SELL":
        raw = Decimal(taker_amount) / Decimal(maker_amount)
    else:
        # V1 / unknown: collateral raw is the smaller leg.
        usdc_raw = min(maker_amount, taker_amount)
        shares_raw = max(maker_amount, taker_amount)
        raw = Decimal(usdc_raw) / Decimal(shares_raw)

    return min(max(raw, Decimal("0")), Decimal("1")).quantize(Decimal("0.0001"))


def derive_usd_notional(fill: Dict[str, Any]) -> Decimal:
    """Return the USD collateral notional (6-decimal scaled) for a fill.

    Side-aware for V2; falls back to the smaller leg when side is unavailable.
    """
    maker_amount = fill.get("maker_amount", 0) or 0
    taker_amount = fill.get("taker_amount", 0) or 0
    if maker_amount == 0 or taker_amount == 0:
        return Decimal("0")

    side = fill.get("side")
    if side == "BUY":
        usdc_raw = maker_amount
    elif side == "SELL":
        usdc_raw = taker_amount
    else:
        usdc_raw = min(maker_amount, taker_amount)

    return (Decimal(usdc_raw) / Decimal(10**6)).quantize(Decimal("0.01"))
