"""Tests for the Polymarket Smart Wallet Tracker runtime."""

from __future__ import annotations

import json
import os
import time
from decimal import Decimal

import pytest

from runtime.polymarket.abi import (
    ORDERS_MATCHED_V2_TOPIC,
    ORDER_FILLED_V2_TOPIC,
    decode_order_filled_v2,
    decode_transfer_batch,
    decode_transfer_single,
    derive_price_from_fill,
    parse_log,
)
from runtime.polymarket.config import PolymarketConfig
from runtime.polymarket.profiler import WalletProfiler, _realized_pnl_and_returns, _coerce_trade
from runtime.polymarket.risk import RiskGuard
from runtime.polymarket.state import StateManager
from runtime.polymarket.claude import ClaudeSummarizer
from runtime.polymarket.utils import CircuitBreaker, RateLimiter, sharpe_ratio, win_rate


@pytest.fixture
def tmp_db(tmp_path):
    return str(tmp_path / "tracker.db")


@pytest.fixture
def config(tmp_db):
    return PolymarketConfig(
        polygon_ws_url="",
        polygon_http_urls=[],
        telegram_bot_token="",
        telegram_chat_ids=[],
        watched_wallets=["0xce25testwallet398144"],
        db_path=tmp_db,
        min_wallet_profit_usd=Decimal("0"),
        min_win_rate_pct=Decimal("0"),
        min_sharpe_ratio=Decimal("0"),
    )


# ---------------------------------------------------------------------------
# ABI / log decoding
# ---------------------------------------------------------------------------
def test_decode_order_filled_v2():
    topics = [
        ORDER_FILLED_V2_TOPIC,
        "0x" + "11" * 32,
        "0x" + "22" * 32,  # maker
        "0x" + "33" * 32,  # taker
    ]
    data = (
        "0x"
        + "00" * 31 + "00"  # side BUY
        + "00" * 31 + "01"  # tokenId 1
        + "00" * 31 + "64"  # makerAmount 100
        + "00" * 31 + "c8"  # takerAmount 200
        + "00" * 31 + "00"  # fee 0
        + "bb" * 32          # builder
        + "cc" * 32          # metadata
    )
    log = {
        "topics": topics,
        "data": data,
        "transactionHash": "0x" + "aa" * 32,
        "logIndex": "0x1",
        "blockNumber": "0x1234",
    }
    parsed = decode_order_filled_v2(log)
    assert parsed
    assert parsed["maker"] == "0x" + "22" * 20
    assert parsed["taker"] == "0x" + "33" * 20
    assert parsed["side"] == "BUY"
    assert parsed["token_id"] == "1"
    assert parsed["maker_amount"] == 100
    assert parsed["taker_amount"] == 200


def test_parse_log_routes_v2_order_filled():
    topics = [ORDER_FILLED_V2_TOPIC, "0x" + "11" * 32, "0x" + "22" * 32, "0x" + "33" * 32]
    data = (
        "0x"
        + "00" * 31 + "01"  # side SELL
        + "00" * 31 + "02"
        + "00" * 31 + "64"
        + "00" * 31 + "c8"
        + "00" * 31 + "00"
        + "bb" * 32
        + "cc" * 32
    )
    parsed = parse_log({"topics": topics, "data": data})
    assert parsed and parsed["side"] == "SELL"


def test_derive_price_from_fill():
    assert derive_price_from_fill({"maker_amount": 100, "taker_amount": 200}) == Decimal("0.5")
    assert derive_price_from_fill({"maker_amount": 0, "taker_amount": 200}) == Decimal("0")


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
def test_state_wallets_and_blacklist(tmp_db):
    state = StateManager(tmp_db)
    state.set_watched_wallets(["0xABC"])
    assert state.is_watched("0xabc")
    state.set_market_blacklist(["token1"])
    assert state.is_blacklisted("TOKEN1")


# ---------------------------------------------------------------------------
# Profiler
# ---------------------------------------------------------------------------
def test_profiler_fifo_pnl_and_score(config, tmp_db, monkeypatch):
    state = StateManager(tmp_db)
    prof = WalletProfiler(config, state)

    # Mock fetch_trades to return controlled buys/sells
    trades = [
        _coerce_trade(
            {
                "token": "tok1",
                "side": "BUY",
                "amount": 100,
                "price": 0.4,
                "timestamp": 1000,
                "tx_hash": "0x01",
            }
        ),
        _coerce_trade(
            {
                "token": "tok1",
                "side": "SELL",
                "amount": 100,
                "price": 0.7,
                "timestamp": 2000,
                "tx_hash": "0x02",
            }
        ),
    ]
    monkeypatch.setattr(prof, "fetch_trades", lambda wallet, since=None: trades)
    score = prof.compute_score("0xtest")
    assert score.profit_usd == Decimal("30.00")
    assert score.wins == 1
    assert score.losses == 0
    assert score.win_rate == Decimal("100.00")
    assert prof.passes_filter(score) is True


def test_profiler_score_filter_respects_min_profit(config, tmp_db, monkeypatch):
    # Use a config with a non-zero profit threshold to verify filtering
    config = PolymarketConfig(
        db_path=tmp_db,
        min_wallet_profit_usd=Decimal("1.00"),
        min_win_rate_pct=Decimal("0"),
        min_sharpe_ratio=Decimal("0"),
    )
    state = StateManager(tmp_db)
    prof = WalletProfiler(config, state)
    monkeypatch.setattr(
        prof, "fetch_trades", lambda wallet, since=None: []
    )
    score = prof.compute_score("0xtest")
    assert score.total_trades == 0
    assert prof.passes_filter(score) is False


# ---------------------------------------------------------------------------
# Risk
# ---------------------------------------------------------------------------
def test_risk_blocks_blacklisted_market(config, tmp_db):
    state = StateManager(tmp_db)
    state.set_market_blacklist(["bad-token"])
    risk = RiskGuard(config, state)
    result = risk.assess_alert("0xtest", "bad-token", Decimal("100"))
    assert result.pass_gate is False
    assert "blacklisted" in result.reasons[0].lower()


def test_risk_default_allows_alert(config, tmp_db):
    state = StateManager(tmp_db)
    state.set_watched_wallets(["0xtest"])
    risk = RiskGuard(config, state)
    result = risk.assess_alert("0xtest", "good-token", Decimal("100"))
    assert result.pass_gate is True


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------
def test_circuit_breaker_opens_after_failures():
    cb = CircuitBreaker("test", failure_threshold=2, reset_timeout_seconds=0.1)
    assert cb.is_open is False
    cb.record_failure()
    cb.record_failure()
    assert cb.is_open is True
    time.sleep(0.15)
    assert cb.state == "half_open"


def test_rate_limiter_caps_calls():
    rl = RateLimiter(max_calls=2, window_seconds=10)
    assert rl.is_allowed() is True
    assert rl.is_allowed() is True
    assert rl.is_allowed() is False


def test_win_rate_and_sharpe():
    assert win_rate(3, 4) == Decimal("75.00")
    assert sharpe_ratio([Decimal("0.01"), Decimal("-0.005"), Decimal("0.02")]) > 0


# ---------------------------------------------------------------------------
# Integration / orchestrator status
# ---------------------------------------------------------------------------
def test_orchestrator_status_smoke(config, tmp_db):
    from runtime.polymarket.orchestrator import PolymarketOrchestrator

    orchestrator = PolymarketOrchestrator(config)
    status = orchestrator.status()
    assert status["running"] is False
    assert "listener" in status
    assert "alerts" in status
    assert "risk" in status
    assert "portfolio" in status
    assert "confluence" in status


def test_signal_confluence_with_synthetic_prices():
    from runtime.polymarket.signals import SignalConfluence

    cfg = PolymarketConfig(confluence_enabled=True, confluence_threshold=Decimal("0.10"))
    confluence = SignalConfluence(cfg)
    # Inject synthetic rising prices to get a BUY confluence.
    confluence._history._cache["test-token"] = list(range(50, 80))
    result = confluence.assess("test-token", "BUY", Decimal("0.79"))
    assert result.agree is True
    assert result.score > 0
    assert result.confidence > 0


def test_portfolio_risk_guard_blocks_after_losses(config, tmp_db):
    from runtime.polymarket.portfolio import PortfolioRiskGuard

    state = StateManager(tmp_db)
    for i in range(6):
        state.record_closed_trade(
            {
                "id": f"loss-{i}",
                "closed_at": time.time() - i,
                "wallet": "0xtest",
                "token_id": "token",
                "side": "BUY",
                "shares": 1.0,
                "entry_price": 0.5,
                "exit_price": 0.4,
                "pnl": -10.0,
                "roi": -0.2,
            }
        )
    guard = PortfolioRiskGuard(config, state)
    result = guard.assess()
    assert result.consecutive_losses == 6
    assert result.can_trade is False
    assert any("consecutive" in r.lower() for r in result.reasons)


def test_claude_summarizer_disabled_by_default(config):
    summarizer = ClaudeSummarizer(enabled=False, api_key="")
    assert summarizer.ready is False
    assert summarizer.summarize({}) is None
    assert summarizer.status()["ready"] is False


def test_claude_summarizer_message_build_includes_prompt():
    summarizer = ClaudeSummarizer(enabled=False)
    event = {
        "wallet": "0xWallet",
        "role": "TAKER",
        "side": "BUY",
        "amount_usd": "100",
        "price": "0.55",
        "token_id": "123456789012",
    }
    prompt = summarizer._build_prompt(event, {"profit_usd": "1000", "win_rate": "80", "sharpe": "1.5"})
    assert "Polymarket" in prompt or "prediction-market" in prompt
    assert "0xWallet" in prompt
    assert "$100.00" in prompt


# ---------------------------------------------------------------------------
# Alert time window
# ---------------------------------------------------------------------------
def test_alert_window_allows_only_configured_hours(tmp_db):
    from datetime import datetime, timezone
    from runtime.polymarket.alerts import TelegramAlertEngine

    state = StateManager(tmp_db)
    config = PolymarketConfig(
        db_path=tmp_db,
        alert_start_hour=4,
        alert_end_hour=6,
        alert_timezone="UTC",
    )
    engine = TelegramAlertEngine(config, state)
    assert engine._in_alert_window(datetime(2026, 8, 14, 4, 30, tzinfo=timezone.utc))
    assert engine._in_alert_window(datetime(2026, 8, 14, 5, 59, tzinfo=timezone.utc))
    assert not engine._in_alert_window(datetime(2026, 8, 14, 6, 0, tzinfo=timezone.utc))
    assert not engine._in_alert_window(datetime(2026, 8, 14, 3, 59, tzinfo=timezone.utc))


def test_alert_window_allows_overnight(tmp_db):
    from datetime import datetime, timezone
    from runtime.polymarket.alerts import TelegramAlertEngine

    state = StateManager(tmp_db)
    config = PolymarketConfig(
        db_path=tmp_db,
        alert_start_hour=22,
        alert_end_hour=4,
        alert_timezone="UTC",
    )
    engine = TelegramAlertEngine(config, state)
    assert engine._in_alert_window(datetime(2026, 8, 14, 23, 0, tzinfo=timezone.utc))
    assert engine._in_alert_window(datetime(2026, 8, 14, 2, 0, tzinfo=timezone.utc))
    assert not engine._in_alert_window(datetime(2026, 8, 14, 12, 0, tzinfo=timezone.utc))
