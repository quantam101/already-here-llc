"""Tests for the native MCP trading engine (enhanced edition)."""

import time
from decimal import Decimal

import pytest

from runtime.mcp_trading_engine import (
    CircuitBreaker,
    EngineState,
    PositionRecord,
    PositionTracker,
    PortfolioState,
    RejectionReason,
    RiskSupervisor,
    TechnicalScanners,
    TradeAuditLog,
    TradeSetup,
    compute_position_size,
    fast_book_distillation,
    ZERO,
    MAX_RISK_PER_TRADE_PCT,
    MIN_SIGNAL_SCORE,
    RSI_OVERBOUGHT_THRESHOLD,
)


# ---------------------------------------------------------------------------
# fast_book_distillation
# ---------------------------------------------------------------------------
class TestBookDistillation:
    def test_basic_mid_price_and_imbalance(self):
        bids = [[100.0, 10.0], [99.0, 5.0]]
        asks = [[101.0, 8.0], [102.0, 3.0]]
        mid, imb = fast_book_distillation(bids, asks)
        assert mid == Decimal("100.50")
        assert -1.0 <= imb <= 1.0

    def test_symmetric_book_zero_imbalance(self):
        bids = [[100.0, 10.0]]
        asks = [[101.0, 10.0]]
        _, imb = fast_book_distillation(bids, asks)
        assert imb == 0.0

    def test_heavy_bid_positive_imbalance(self):
        bids = [[100.0, 100.0]]
        asks = [[101.0, 1.0]]
        _, imb = fast_book_distillation(bids, asks)
        assert imb > 0.0

    def test_heavy_ask_negative_imbalance(self):
        bids = [[100.0, 1.0]]
        asks = [[101.0, 100.0]]
        _, imb = fast_book_distillation(bids, asks)
        assert imb < 0.0

    def test_empty_bids_raises(self):
        with pytest.raises(ValueError, match="non-empty"):
            fast_book_distillation([], [[101.0, 10.0]])

    def test_empty_asks_raises(self):
        with pytest.raises(ValueError, match="non-empty"):
            fast_book_distillation([[100.0, 10.0]], [])

    def test_malformed_bids_raises(self):
        with pytest.raises(ValueError, match="Bids must be"):
            fast_book_distillation([[100.0]], [[101.0, 10.0]])

    def test_malformed_asks_raises(self):
        with pytest.raises(ValueError, match="Asks must be"):
            fast_book_distillation([[100.0, 10.0]], [[101.0]])

    def test_zero_volume_raises(self):
        with pytest.raises(ValueError, match="zero"):
            fast_book_distillation([[100.0, 0.0]], [[101.0, 0.0]])


# ---------------------------------------------------------------------------
# PortfolioState
# ---------------------------------------------------------------------------
class TestPortfolioState:
    def test_daily_reset(self):
        ps = PortfolioState(
            account_balance=Decimal("5000"),
            total_drawdown_today=Decimal("100"),
            max_daily_drawdown_limit=Decimal("150"),
            cached_max_trade_value=Decimal("500"),
            last_reset_day="1970-01-01",
        )
        ps.maybe_reset_daily()
        assert ps.total_drawdown_today == ZERO
        assert ps.last_reset_day == time.strftime("%Y-%m-%d", time.gmtime())

    def test_no_reset_same_day(self):
        today = time.strftime("%Y-%m-%d", time.gmtime())
        ps = PortfolioState(
            account_balance=Decimal("5000"),
            total_drawdown_today=Decimal("100"),
            max_daily_drawdown_limit=Decimal("150"),
            cached_max_trade_value=Decimal("500"),
            last_reset_day=today,
        )
        ps.maybe_reset_daily()
        assert ps.total_drawdown_today == Decimal("100")


# ---------------------------------------------------------------------------
# PositionTracker
# ---------------------------------------------------------------------------
class TestPositionTracker:
    def test_open_and_query(self):
        pt = PositionTracker()
        rec = PositionRecord("AAPL", "buy", Decimal("150"), Decimal("500"), Decimal("147.75"), Decimal("156.75"), 0)
        assert not pt.has_open("AAPL")
        pt.open(rec)
        assert pt.has_open("AAPL")
        assert pt.has_open("aapl")  # case-insensitive

    def test_close(self):
        pt = PositionTracker()
        rec = PositionRecord("AAPL", "buy", Decimal("150"), Decimal("500"), Decimal("147.75"), Decimal("156.75"), 0)
        pt.open(rec)
        closed = pt.close("AAPL")
        assert closed is not None
        assert closed.symbol == "AAPL"
        assert not pt.has_open("AAPL")

    def test_close_nonexistent(self):
        pt = PositionTracker()
        assert pt.close("XYZ") is None

    def test_all_open(self):
        pt = PositionTracker()
        pt.open(PositionRecord("A", "buy", Decimal("1"), Decimal("1"), Decimal("1"), Decimal("1"), 0))
        pt.open(PositionRecord("B", "buy", Decimal("2"), Decimal("2"), Decimal("2"), Decimal("2"), 0))
        assert len(pt.all_open) == 2


# ---------------------------------------------------------------------------
# CircuitBreaker
# ---------------------------------------------------------------------------
class TestCircuitBreaker:
    def test_starts_closed(self):
        cb = CircuitBreaker(failure_threshold=3, reset_timeout=60)
        assert cb.state == "closed"
        assert not cb.is_open

    def test_opens_after_threshold(self):
        cb = CircuitBreaker(failure_threshold=3, reset_timeout=60)
        cb.record_failure()
        cb.record_failure()
        assert cb.state == "closed"
        cb.record_failure()
        assert cb.is_open

    def test_success_resets(self):
        cb = CircuitBreaker(failure_threshold=2, reset_timeout=60)
        cb.record_failure()
        cb.record_success()
        cb.record_failure()
        assert cb.state == "closed"

    def test_half_open_after_timeout(self):
        cb = CircuitBreaker(failure_threshold=1, reset_timeout=0.01)
        cb.record_failure()
        assert cb.is_open
        time.sleep(0.02)
        assert cb.state == "half_open"


# ---------------------------------------------------------------------------
# TechnicalScanners
# ---------------------------------------------------------------------------
class TestTechnicalScanners:
    def test_rsi_score_deep_oversold(self):
        assert TechnicalScanners.rsi_score(20.0) == 1.0

    def test_rsi_score_moderate_oversold(self):
        score = TechnicalScanners.rsi_score(28.0)
        assert score == 0.85

    def test_rsi_score_mild_oversold(self):
        score = TechnicalScanners.rsi_score(33.0)
        assert score == 0.3

    def test_rsi_score_neutral(self):
        assert TechnicalScanners.rsi_score(55.0) == 0.0

    def test_rsi_score_boundary_invalid(self):
        assert TechnicalScanners.rsi_score(0.0) == 0.0
        assert TechnicalScanners.rsi_score(100.0) == 0.0

    def test_orderbook_score_strong(self):
        assert TechnicalScanners.orderbook_score(0.6) == 1.0

    def test_orderbook_score_moderate(self):
        assert TechnicalScanners.orderbook_score(0.35) == 0.75

    def test_orderbook_score_threshold(self):
        assert TechnicalScanners.orderbook_score(0.25) == 0.5

    def test_orderbook_score_weak(self):
        assert TechnicalScanners.orderbook_score(0.05) == 0.0

    def test_macd_score_insufficient_data(self):
        _, _, score = TechnicalScanners.macd_score([100.0] * 5)
        assert score == 0.0

    def test_macd_score_with_data(self):
        prices = list(range(100, 150))  # 50 data points, uptrend
        _, _, score = TechnicalScanners.macd_score(prices)
        assert 0.0 <= score <= 1.0

    def test_bollinger_score_below_lower_band(self):
        prices = [100.0] * 19 + [80.0]
        _, _, score = TechnicalScanners.bollinger_score(prices, 75.0)
        assert score == 1.0

    def test_bollinger_score_insufficient_data(self):
        _, _, score = TechnicalScanners.bollinger_score([100.0] * 5, 100.0)
        assert score == 0.0

    def test_vwap_score_below_vwap(self):
        prices = [100.0, 101.0, 102.0, 100.0]
        volumes = [1000.0, 1000.0, 1000.0, 1000.0]
        vwap, score = TechnicalScanners.vwap_score(prices, volumes, 97.0)
        assert vwap > 0
        assert score > 0

    def test_vwap_score_empty(self):
        vwap, score = TechnicalScanners.vwap_score([], [], 100.0)
        assert vwap == 0.0
        assert score == 0.0

    def test_momentum_score_strong_drop(self):
        prices = list(range(120, 100, -1)) + [94]  # declining
        score = TechnicalScanners.momentum_score(prices)
        assert score > 0.0

    def test_momentum_score_insufficient_data(self):
        assert TechnicalScanners.momentum_score([100.0] * 5) == 0.0

    def test_composite_signal_rsi_only(self):
        score, breakdown = TechnicalScanners.composite_signal(
            rsi_14=20.0, imbalance=0.6
        )
        assert score > 0
        assert "rsi" in breakdown
        assert "orderbook" in breakdown
        assert breakdown["rsi"] == 1.0
        assert breakdown["orderbook"] == 1.0

    def test_composite_signal_no_signal(self):
        score, breakdown = TechnicalScanners.composite_signal(
            rsi_14=55.0, imbalance=0.05
        )
        assert score == 0.0
        assert breakdown["rsi"] == 0.0
        assert breakdown["orderbook"] == 0.0

    def test_composite_signal_with_price_history(self):
        prices = [100.0 - i * 0.5 for i in range(40)]  # downtrend
        volumes = [1000.0] * 40
        score, breakdown = TechnicalScanners.composite_signal(
            rsi_14=25.0,
            imbalance=0.4,
            prices=prices,
            volumes=volumes,
            current_price=80.0,
        )
        assert score > 0
        assert "macd" in breakdown
        assert "bollinger" in breakdown
        assert "vwap" in breakdown
        assert "momentum" in breakdown


# ---------------------------------------------------------------------------
# compute_position_size
# ---------------------------------------------------------------------------
class TestPositionSizing:
    def test_basic_sizing(self):
        shares, capital = compute_position_size(
            account_balance=Decimal("5000"),
            entry_price=Decimal("100.00"),
            stop_loss=Decimal("99.20"),
            max_trade_value=Decimal("500"),
        )
        assert shares > ZERO
        assert capital > ZERO
        max_loss = shares * (Decimal("100.00") - Decimal("99.20"))
        assert max_loss <= Decimal("5000") * MAX_RISK_PER_TRADE_PCT + Decimal("0.01")

    def test_risk_under_one_percent(self):
        shares, capital = compute_position_size(
            account_balance=Decimal("10000"),
            entry_price=Decimal("200.00"),
            stop_loss=Decimal("198.40"),
            max_trade_value=Decimal("2000"),
        )
        max_loss = shares * (Decimal("200.00") - Decimal("198.40"))
        risk_pct = max_loss / Decimal("10000")
        assert risk_pct <= MAX_RISK_PER_TRADE_PCT + Decimal("0.001")

    def test_caps_at_max_trade_value(self):
        shares, capital = compute_position_size(
            account_balance=Decimal("100000"),
            entry_price=Decimal("10.00"),
            stop_loss=Decimal("9.92"),
            max_trade_value=Decimal("500"),
        )
        assert capital <= Decimal("500.01")

    def test_zero_entry_returns_zero(self):
        shares, capital = compute_position_size(
            Decimal("5000"), Decimal("0"), Decimal("0"), Decimal("500")
        )
        assert shares == ZERO
        assert capital == ZERO

    def test_short_side_position_sizing(self):
        shares, capital = compute_position_size(
            Decimal("5000"), Decimal("100"), Decimal("100.50"), Decimal("500")
        )
        assert shares > ZERO
        assert capital > ZERO


# ---------------------------------------------------------------------------
# RiskSupervisor
# ---------------------------------------------------------------------------
class TestRiskSupervisor:
    def _make_supervisor(self, **portfolio_kwargs):
        defaults = {
            "account_balance": Decimal("5000"),
            "total_drawdown_today": ZERO,
            "max_daily_drawdown_limit": Decimal("150"),
            "cached_max_trade_value": Decimal("500"),
        }
        defaults.update(portfolio_kwargs)
        ps = PortfolioState(**defaults)
        pt = PositionTracker()
        return RiskSupervisor(ps, pt), ps, pt

    def test_valid_buy_signal_rsi_oversold(self):
        rs, _, _ = self._make_supervisor()
        ok, result = rs.audit_trade_setup("AAPL", Decimal("150.00"), 25.0, 0.10)
        assert ok
        assert isinstance(result, TradeSetup)
        assert result.symbol == "AAPL"
        assert result.action == "buy"
        assert result.hard_stop < result.verified_entry
        assert result.hard_target > result.verified_entry

    def test_valid_buy_signal_high_imbalance(self):
        rs, _, _ = self._make_supervisor()
        ok, result = rs.audit_trade_setup("MSFT", Decimal("300.00"), 50.0, 0.25)
        assert ok
        assert isinstance(result, TradeSetup)

    def test_rejected_no_signal(self):
        rs, _, _ = self._make_supervisor()
        ok, result = rs.audit_trade_setup("TSLA", Decimal("200.00"), 55.0, 0.10)
        assert not ok
        assert isinstance(result, RejectionReason)
        assert "entry criteria" in result.reason

    def test_rejected_drawdown_limit(self):
        today = time.strftime("%Y-%m-%d", time.gmtime())
        rs, _, _ = self._make_supervisor(total_drawdown_today=Decimal("150.00"), last_reset_day=today)
        ok, result = rs.audit_trade_setup("AAPL", Decimal("150.00"), 25.0, 0.25)
        assert not ok
        assert "drawdown" in result.reason.lower()

    def test_rejected_duplicate_position(self):
        rs, _, pt = self._make_supervisor()
        pt.open(PositionRecord("AAPL", "buy", Decimal("150"), Decimal("500"), Decimal("147"), Decimal("156"), 0))
        ok, result = rs.audit_trade_setup("AAPL", Decimal("150.00"), 25.0, 0.25)
        assert not ok
        assert "already open" in result.reason.lower()

    def test_rejected_zero_entry(self):
        rs, _, _ = self._make_supervisor()
        ok, result = rs.audit_trade_setup("X", Decimal("0.00"), 30.0, 0.25)
        assert not ok
        assert "positive" in result.reason.lower()

    def test_rejected_negative_entry(self):
        rs, _, _ = self._make_supervisor()
        ok, result = rs.audit_trade_setup("X", Decimal("-5.00"), 30.0, 0.25)
        assert not ok
        assert "positive" in result.reason.lower()

    def test_stop_loss_take_profit_math_buy(self):
        rs, _, _ = self._make_supervisor()
        ok, result = rs.audit_trade_setup("SPY", Decimal("100.00"), 25.0, 0.25)
        assert ok
        assert isinstance(result, TradeSetup)
        assert result.action == "buy"
        # 100 * 0.995 = 99.50
        assert result.hard_stop == Decimal("99.50")
        # 100 * 1.035 = 103.50
        assert result.hard_target == Decimal("103.50")

    def test_bear_signal_rsi_overbought(self):
        rs, _, _ = self._make_supervisor()
        ok, result = rs.audit_trade_setup("TSLA", Decimal("200.00"), 75.0, 0.10)
        assert ok
        assert isinstance(result, TradeSetup)
        assert result.action == "sell"
        assert result.hard_stop > result.verified_entry
        assert result.hard_target < result.verified_entry

    def test_bear_signal_negative_imbalance(self):
        rs, _, _ = self._make_supervisor()
        ok, result = rs.audit_trade_setup("NVDA", Decimal("300.00"), 50.0, -0.30)
        assert ok
        assert isinstance(result, TradeSetup)
        assert result.action == "sell"

    def test_trade_includes_signal_score(self):
        rs, _, _ = self._make_supervisor()
        ok, result = rs.audit_trade_setup("AAPL", Decimal("150.00"), 20.0, 0.50)
        assert ok
        assert isinstance(result, TradeSetup)
        assert result.signal_score > 0.0
        assert "rsi" in result.scanner_breakdown

    def test_trade_includes_position_sizing(self):
        rs, _, _ = self._make_supervisor()
        ok, result = rs.audit_trade_setup("AAPL", Decimal("150.00"), 25.0, 0.25)
        assert ok
        assert isinstance(result, TradeSetup)
        assert result.position_size_shares > ZERO
        max_loss = result.position_size_shares * abs(result.verified_entry - result.hard_stop)
        risk_pct = max_loss / Decimal("5000")
        assert risk_pct <= MAX_RISK_PER_TRADE_PCT + Decimal("0.001")


# ---------------------------------------------------------------------------
# TradeAuditLog
# ---------------------------------------------------------------------------
class TestTradeAuditLog:
    def test_writes_to_file(self, tmp_path):
        log_path = str(tmp_path / "audit.jsonl")
        audit = TradeAuditLog(path=log_path)
        audit.trade_rejected("AAPL", "test rejection")
        with open(log_path) as f:
            content = f.read()
        assert "trade_rejected" in content
        assert "AAPL" in content

    def test_trade_executed_writes(self, tmp_path):
        log_path = str(tmp_path / "audit.jsonl")
        audit = TradeAuditLog(path=log_path)
        setup = TradeSetup("AAPL", "buy", Decimal("150"), Decimal("500"), Decimal("147"), Decimal("156"), 0)
        audit.trade_executed(setup, {"order_id": "abc"})
        with open(log_path) as f:
            content = f.read()
        assert "trade_executed" in content

    def test_broker_error_writes(self, tmp_path):
        log_path = str(tmp_path / "audit.jsonl")
        audit = TradeAuditLog(path=log_path)
        audit.broker_error("AAPL", "timeout")
        with open(log_path) as f:
            content = f.read()
        assert "broker_error" in content

    def test_scanner_result_writes(self, tmp_path):
        log_path = str(tmp_path / "audit.jsonl")
        audit = TradeAuditLog(path=log_path)
        audit.scanner_result("AAPL", 0.75, {"rsi": 1.0, "macd": 0.5})
        with open(log_path) as f:
            content = f.read()
        assert "scanner_result" in content
        assert "0.75" in content


# ---------------------------------------------------------------------------
# EngineState
# ---------------------------------------------------------------------------
class TestEngineState:
    def test_reset(self):
        state = EngineState()
        state.portfolio.total_drawdown_today = Decimal("100")
        state.reset()
        assert state.portfolio.total_drawdown_today == ZERO
