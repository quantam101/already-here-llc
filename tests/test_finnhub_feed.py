"""Tests for Finnhub real-time data feed integration."""

import json
import os
import sys
import time
import threading
from unittest.mock import patch, MagicMock

# Clear env var before importing module to avoid leaking test key
os.environ.pop("FINNHUB_API_KEY", None)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from runtime.finnhub_feed import FinnhubRealtimeFeed


def test_feed_creation_no_api_key():
    """Feed should work without API key (Yahoo-only mode)."""
    with patch.dict(os.environ, {}, clear=True):
        # Ensure env var doesn't interfere
        os.environ.pop("FINNHUB_API_KEY", None)
        feed = FinnhubRealtimeFeed(symbols=["AAPL", "MSFT"], api_key="")
        assert feed._api_key == ""
        assert not feed._ws_connected
        stats = feed.get_stats()
        assert stats["ws_connected"] is False
        assert stats["source"] == "fallback"


def test_feed_creation_with_key():
    """Feed initializes with API key and symbols."""
    feed = FinnhubRealtimeFeed(
        symbols=["AAPL", "MSFT", "NVDA"],
        api_key="test_key_123",
    )
    assert feed._api_key == "test_key_123"
    assert feed._symbols == ["AAPL", "MSFT", "NVDA"]
    assert len(feed._price_history) == 3


def test_window_reset():
    """Per-scan OHLCV window resets correctly."""
    feed = FinnhubRealtimeFeed(symbols=["AAPL"], api_key="test")
    feed._window_high["AAPL"] = 300.0
    feed._window_low["AAPL"] = 295.0
    feed._window_open["AAPL"] = 297.0
    feed._window_volume["AAPL"] = 50000

    feed.reset_window()

    assert "AAPL" not in feed._window_high
    assert "AAPL" not in feed._window_low
    assert "AAPL" not in feed._window_open
    assert "AAPL" not in feed._window_volume


def test_ws_message_processing():
    """WebSocket trade messages update internal state correctly."""
    feed = FinnhubRealtimeFeed(symbols=["AAPL", "MSFT"], api_key="test")

    # Simulate incoming trade message
    message = json.dumps({
        "type": "trade",
        "data": [
            {"s": "AAPL", "p": 297.50, "v": 100, "t": 1781805000000},
            {"s": "AAPL", "p": 297.55, "v": 200, "t": 1781805001000},
            {"s": "MSFT", "p": 380.00, "v": 50, "t": 1781805002000},
        ],
    })

    feed._on_ws_message(None, message)

    assert feed._last_trade_price["AAPL"] == 297.55
    assert feed._last_trade_price["MSFT"] == 380.00
    assert feed._trade_count["AAPL"] == 2
    assert feed._trade_count["MSFT"] == 1
    assert feed._total_trades_received == 3

    # Window should track OHLCV
    assert feed._window_open["AAPL"] == 297.50  # First trade
    assert feed._window_high["AAPL"] == 297.55  # Max
    assert feed._window_low["AAPL"] == 297.50  # Min
    assert feed._window_volume["AAPL"] == 300  # 100 + 200


def test_ws_message_ignores_non_trade():
    """Non-trade messages (ping, etc.) are ignored."""
    feed = FinnhubRealtimeFeed(symbols=["AAPL"], api_key="test")

    feed._on_ws_message(None, json.dumps({"type": "ping"}))
    assert feed._total_trades_received == 0

    feed._on_ws_message(None, "invalid json{{{")
    assert feed._total_trades_received == 0


def test_get_current_price_from_ws():
    """get_current_price returns WebSocket price when fresh."""
    feed = FinnhubRealtimeFeed(symbols=["AAPL"], api_key="test")

    # Simulate recent trade
    feed._last_trade_price["AAPL"] = 298.00
    feed._last_trade_time["AAPL"] = time.time()

    price = feed.get_current_price("AAPL")
    assert price == 298.00


def test_get_current_price_stale():
    """Stale WebSocket data triggers fallback."""
    os.environ.pop("FINNHUB_API_KEY", None)
    feed = FinnhubRealtimeFeed(symbols=["AAPL"], api_key="")
    feed._history_loaded["AAPL"] = True  # Skip history load
    feed._price_history["AAPL"] = [290.0]

    # Simulate old trade (>30s ago)
    feed._last_trade_price["AAPL"] = 295.00
    feed._last_trade_time["AAPL"] = time.time() - 60

    # Without API key and Yahoo fallback, should return None
    with patch.object(feed, "_yahoo_fallback", return_value=None):
        price = feed.get_current_price("AAPL")
        assert price is None


def test_history_update():
    """History updates when price changes significantly."""
    feed = FinnhubRealtimeFeed(symbols=["AAPL"], api_key="test")
    feed._price_history["AAPL"] = [290.0, 291.0, 292.0]
    feed._volume_history["AAPL"] = [1000.0, 1100.0, 1200.0]
    feed._high_history["AAPL"] = [291.0, 292.0, 293.0]
    feed._low_history["AAPL"] = [289.0, 290.0, 291.0]
    feed._history_loaded["AAPL"] = True

    feed._update_history_from_ws("AAPL", 295.0, 500, 296.0, 294.0)

    assert feed._price_history["AAPL"][-1] == 295.0
    assert len(feed._price_history["AAPL"]) == 4


def test_history_no_duplicate():
    """History doesn't append if price unchanged."""
    feed = FinnhubRealtimeFeed(symbols=["AAPL"], api_key="test")
    feed._price_history["AAPL"] = [290.0, 291.0, 292.0]
    feed._volume_history["AAPL"] = [1000.0, 1100.0, 1200.0]
    feed._high_history["AAPL"] = [291.0, 292.0, 293.0]
    feed._low_history["AAPL"] = [289.0, 290.0, 291.0]

    feed._update_history_from_ws("AAPL", 292.0, 500, 293.0, 291.0)

    assert len(feed._price_history["AAPL"]) == 3  # No change


def test_history_trim_to_300():
    """History is trimmed to 300 bars max."""
    feed = FinnhubRealtimeFeed(symbols=["AAPL"], api_key="test")
    feed._price_history["AAPL"] = list(range(300))
    feed._volume_history["AAPL"] = list(range(300))
    feed._high_history["AAPL"] = list(range(300))
    feed._low_history["AAPL"] = list(range(300))

    feed._update_history_from_ws("AAPL", 999.0, 100, 1000.0, 998.0)

    assert len(feed._price_history["AAPL"]) == 300
    assert feed._price_history["AAPL"][-1] == 999.0


def test_fetch_live_data_ws_source():
    """fetch_live_data returns WebSocket data when available."""
    feed = FinnhubRealtimeFeed(symbols=["AAPL"], api_key="test")
    feed._history_loaded["AAPL"] = True
    feed._price_history["AAPL"] = [290.0, 291.0]
    feed._volume_history["AAPL"] = [1000.0, 1100.0]
    feed._high_history["AAPL"] = [291.0, 292.0]
    feed._low_history["AAPL"] = [289.0, 290.0]

    # Simulate fresh WebSocket data
    feed._last_trade_price["AAPL"] = 297.50
    feed._last_trade_time["AAPL"] = time.time()
    feed._window_high["AAPL"] = 298.0
    feed._window_low["AAPL"] = 296.0
    feed._window_open["AAPL"] = 297.0
    feed._window_volume["AAPL"] = 5000

    data = feed.fetch_live_data("AAPL")
    assert data is not None
    assert data["price"] == 297.50
    assert data["source"] == "finnhub_ws"
    assert data["high"] == 298.0
    assert data["low"] == 296.0
    assert data["volume"] == 5000


def test_stats():
    """Stats reflect current feed state."""
    feed = FinnhubRealtimeFeed(symbols=["AAPL", "MSFT"], api_key="test")
    feed._ws_connected = True
    feed._ws_connect_time = time.time() - 60
    feed._total_trades_received = 150
    feed._last_trade_price["AAPL"] = 297.0
    feed._last_trade_price["MSFT"] = 380.0

    stats = feed.get_stats()
    assert stats["ws_connected"] is True
    assert stats["total_trades_received"] == 150
    assert stats["symbols_with_data"] == 2
    assert stats["source"] == "finnhub_ws"
    assert stats["uptime_sec"] >= 59


if __name__ == "__main__":
    tests = [
        test_feed_creation_no_api_key,
        test_feed_creation_with_key,
        test_window_reset,
        test_ws_message_processing,
        test_ws_message_ignores_non_trade,
        test_get_current_price_from_ws,
        test_get_current_price_stale,
        test_history_update,
        test_history_no_duplicate,
        test_history_trim_to_300,
        test_fetch_live_data_ws_source,
        test_stats,
    ]

    passed = 0
    for t in tests:
        try:
            t()
            passed += 1
            print(f"  PASS: {t.__name__}")
        except Exception as e:
            print(f"  FAIL: {t.__name__} — {e}")

    print(f"\n{passed}/{len(tests)} tests passed")
    if passed < len(tests):
        sys.exit(1)
