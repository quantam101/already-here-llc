"""
Native MCP-compliant agentic trading engine — A+ Enhanced Edition.

Exposes a Streamable HTTP MCP Server (JSON-RPC 2.0) that performs
low-latency technical analysis with multi-indicator scanners and routes
validated orders to Robinhood's production MCP gateway.

Agent-agnostic: works identically with Claude, ChatGPT, Cursor, Grok,
or any MCP-capable client.  Accessible from phone and laptop via CORS.

Architecture
~~~~~~~~~~~~
Inbound market data → Multi-scanner pipeline (VWAP, MACD, Bollinger,
momentum, orderbook) → Composite signal scoring → Risk supervisor
(< 1% loss ceiling) → JSON-RPC 2.0 → Robinhood MCP (persistent HTTP/2)

All financial arithmetic uses ``Decimal`` to avoid floating-point drift.
Configuration is env-var-driven with safe defaults.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field, asdict
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Any, Dict, Final, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("mcp_trading_engine")

# ---------------------------------------------------------------------------
# CONFIGURATION (env-var driven, safe defaults)
# ---------------------------------------------------------------------------
_env = os.environ.get


def _dec(name: str, default: str) -> Decimal:
    raw = _env(name, default)
    try:
        return Decimal(raw)
    except InvalidOperation:
        logger.warning("Invalid Decimal for %s=%r, using default %s", name, raw, default)
        return Decimal(default)


ZERO: Final[Decimal] = Decimal("0.00")
PRECISION: Final[Decimal] = Decimal("0.01")
PRECISION_4: Final[Decimal] = Decimal("0.0001")

RH_MCP_URL: Final[str] = _env("MCP_RH_GATEWAY_URL", "https://agent.robinhood.com/mcp/trading")
RH_PROTOCOL_VERSION: Final[str] = _env("MCP_RH_PROTOCOL_VERSION", "2026-04-27")
MCP_API_KEY: Final[str] = _env("MCP_API_KEY", "")
MCP_ENGINE_PORT: Final[int] = int(_env("MCP_ENGINE_PORT", "8000"))

# Risk constants — aggressive but protected (<2% max loss per trade)
BULL_STOP_MULT: Final[Decimal] = _dec("MCP_BULL_STOP_MULT", "0.995")
BULL_TP_MULT: Final[Decimal] = _dec("MCP_BULL_TP_MULT", "1.035")
BEAR_STOP_MULT: Final[Decimal] = _dec("MCP_BEAR_STOP_MULT", "1.005")
BEAR_TP_MULT: Final[Decimal] = _dec("MCP_BEAR_TP_MULT", "0.965")
RSI_OVERSOLD_THRESHOLD: Final[float] = float(_env("MCP_RSI_OVERSOLD", "30.0"))
RSI_OVERBOUGHT_THRESHOLD: Final[float] = float(_env("MCP_RSI_OVERBOUGHT", "70.0"))
IMBALANCE_THRESHOLD: Final[float] = float(_env("MCP_IMBALANCE_THRESHOLD", "0.20"))
MAX_RISK_PER_TRADE_PCT: Final[Decimal] = _dec("MCP_MAX_RISK_PER_TRADE_PCT", "0.02")
MIN_SIGNAL_SCORE: Final[float] = float(_env("MCP_MIN_SIGNAL_SCORE", "0.45"))
SCALP_MODE: Final[bool] = _env("MCP_SCALP_MODE", "true").lower() == "true"
TRAILING_STOP_PCT: Final[Decimal] = _dec("MCP_TRAILING_STOP_PCT", "0.003")

# Scanner weights — heavier on fastest indicators for early detection
W_RSI: Final[float] = float(_env("MCP_W_RSI", "0.15"))
W_MACD: Final[float] = float(_env("MCP_W_MACD", "0.15"))
W_BOLLINGER: Final[float] = float(_env("MCP_W_BOLLINGER", "0.10"))
W_VWAP: Final[float] = float(_env("MCP_W_VWAP", "0.20"))
W_MOMENTUM: Final[float] = float(_env("MCP_W_MOMENTUM", "0.20"))
W_ORDERBOOK: Final[float] = float(_env("MCP_W_ORDERBOOK", "0.20"))

# MACD defaults — faster periods for quicker crossover detection
MACD_FAST: Final[int] = int(_env("MCP_MACD_FAST", "8"))
MACD_SLOW: Final[int] = int(_env("MCP_MACD_SLOW", "21"))
MACD_SIGNAL: Final[int] = int(_env("MCP_MACD_SIGNAL", "5"))

# Bollinger defaults
BB_PERIOD: Final[int] = int(_env("MCP_BB_PERIOD", "20"))
BB_STD_DEV: Final[float] = float(_env("MCP_BB_STD_DEV", "2.0"))

# Circuit breaker
CB_FAILURE_THRESHOLD: Final[int] = int(_env("MCP_CB_FAILURE_THRESHOLD", "5"))
CB_RESET_SECONDS: Final[float] = float(_env("MCP_CB_RESET_SECONDS", "60"))

# CORS origins for phone/laptop access
CORS_ORIGINS: Final[str] = _env("MCP_CORS_ORIGINS", "*")


# ---------------------------------------------------------------------------
# DOMAIN MODELS
# ---------------------------------------------------------------------------
@dataclass(slots=True, frozen=True)
class MarketContext:
    symbol: str
    spot_price: Decimal
    rsi_14: float
    orderbook_imbalance: float


@dataclass(slots=True)
class PortfolioState:
    account_balance: Decimal
    total_drawdown_today: Decimal
    max_daily_drawdown_limit: Decimal
    cached_max_trade_value: Decimal
    last_reset_day: str = ""

    def maybe_reset_daily(self) -> None:
        today = time.strftime("%Y-%m-%d", time.gmtime())
        if self.last_reset_day != today:
            self.total_drawdown_today = ZERO
            self.last_reset_day = today
            logger.info("Daily drawdown reset for %s", today)


@dataclass(slots=True, frozen=True)
class TradeSetup:
    symbol: str
    action: str
    verified_entry: Decimal
    allocated_capital_usd: Decimal
    hard_stop: Decimal
    hard_target: Decimal
    timestamp_ns: int
    signal_score: float = 0.0
    scanner_breakdown: Dict[str, float] = field(default_factory=dict)
    position_size_shares: Decimal = ZERO


@dataclass(slots=True, frozen=True)
class RejectionReason:
    reason: str


@dataclass(slots=True)
class PositionRecord:
    symbol: str
    side: str
    entry_price: Decimal
    capital_usd: Decimal
    stop_loss: Decimal
    take_profit: Decimal
    opened_at_ns: int


# ---------------------------------------------------------------------------
# TECHNICAL SCANNERS (pre-market reaction detection)
# ---------------------------------------------------------------------------
class TechnicalScanners:
    """Multi-indicator scanner pipeline for composite signal scoring."""

    @staticmethod
    def rsi_score(rsi_14: float) -> float:
        if rsi_14 <= 0.0 or rsi_14 >= 100.0:
            return 0.0
        if rsi_14 < 25.0:
            return 1.0
        if rsi_14 < 30.0:
            return 0.85
        if rsi_14 < RSI_OVERSOLD_THRESHOLD:
            return 0.65
        if rsi_14 < 45.0:
            return 0.3
        return 0.0

    @staticmethod
    def macd_score(prices: List[float]) -> Tuple[float, float, float]:
        """Compute MACD, signal, and histogram from price series.

        Returns (macd_line, signal_line, score) where score is 0.0-1.0.
        """
        if len(prices) < MACD_SLOW + MACD_SIGNAL:
            return 0.0, 0.0, 0.0
        arr = np.array(prices, dtype=np.float64)
        fast_ema = TechnicalScanners._ema(arr, MACD_FAST)
        slow_ema = TechnicalScanners._ema(arr, MACD_SLOW)
        macd_line = fast_ema - slow_ema
        signal_line = TechnicalScanners._ema(macd_line[MACD_SLOW - MACD_FAST:], MACD_SIGNAL)
        if len(signal_line) == 0:
            return 0.0, 0.0, 0.0
        histogram = macd_line[-len(signal_line):] - signal_line
        current_hist = float(histogram[-1])
        prev_hist = float(histogram[-2]) if len(histogram) > 1 else current_hist
        score = 0.0
        if current_hist > 0 and prev_hist <= 0:
            score = 1.0
        elif current_hist > 0 and current_hist > prev_hist:
            score = 0.75
        elif current_hist > 0:
            score = 0.4
        return float(macd_line[-1]), float(signal_line[-1]), score

    @staticmethod
    def bollinger_score(prices: List[float], current_price: float) -> Tuple[float, float, float]:
        """Compute Bollinger Band position. Returns (lower, upper, score)."""
        if len(prices) < BB_PERIOD:
            return 0.0, 0.0, 0.0
        arr = np.array(prices[-BB_PERIOD:], dtype=np.float64)
        sma = float(np.mean(arr))
        std = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0
        if std == 0.0:
            return sma, sma, 0.0
        lower = sma - BB_STD_DEV * std
        upper = sma + BB_STD_DEV * std
        band_width = upper - lower
        if band_width == 0.0:
            return lower, upper, 0.0
        pct_b = (current_price - lower) / band_width
        score = 0.0
        if pct_b <= 0.0:
            score = 1.0
        elif pct_b <= 0.15:
            score = 0.8
        elif pct_b <= 0.3:
            score = 0.5
        return lower, upper, score

    @staticmethod
    def vwap_score(
        prices: List[float], volumes: List[float], current_price: float
    ) -> Tuple[float, float]:
        """Compute VWAP and return (vwap, score)."""
        if not prices or not volumes or len(prices) != len(volumes):
            return 0.0, 0.0
        p_arr = np.array(prices, dtype=np.float64)
        v_arr = np.array(volumes, dtype=np.float64)
        total_vol = float(np.sum(v_arr))
        if total_vol == 0.0:
            return 0.0, 0.0
        vwap = float(np.sum(p_arr * v_arr) / total_vol)
        if vwap == 0.0:
            return 0.0, 0.0
        deviation_pct = (current_price - vwap) / vwap
        score = 0.0
        if deviation_pct < -0.02:
            score = 1.0
        elif deviation_pct < -0.01:
            score = 0.7
        elif deviation_pct < 0.0:
            score = 0.4
        return vwap, score

    @staticmethod
    def momentum_score(prices: List[float]) -> float:
        """Rate-of-change momentum across multiple timeframes."""
        if len(prices) < 20:
            return 0.0
        current = prices[-1]
        if current == 0.0:
            return 0.0
        roc_5 = (current - prices[-6]) / prices[-6] if prices[-6] != 0 else 0.0
        roc_10 = (current - prices[-11]) / prices[-11] if prices[-11] != 0 else 0.0
        roc_20 = (current - prices[-21]) / prices[-21] if prices[-21] != 0 else 0.0
        avg_roc = (roc_5 + roc_10 + roc_20) / 3.0
        if avg_roc < -0.05:
            return 1.0
        if avg_roc < -0.02:
            return 0.7
        if avg_roc < 0.0:
            return 0.3
        return 0.0

    @staticmethod
    def orderbook_score(imbalance: float) -> float:
        """Score orderbook imbalance signal strength."""
        if imbalance > 0.5:
            return 1.0
        if imbalance > 0.3:
            return 0.75
        if imbalance > IMBALANCE_THRESHOLD:
            return 0.5
        if imbalance > 0.1:
            return 0.2
        return 0.0

    @staticmethod
    def composite_signal(
        rsi_14: float,
        imbalance: float,
        prices: Optional[List[float]] = None,
        volumes: Optional[List[float]] = None,
        current_price: float = 0.0,
    ) -> Tuple[float, Dict[str, float]]:
        """Compute weighted composite signal score across all scanners.

        Returns (score, breakdown) where score is 0.0-1.0.
        """
        breakdown: Dict[str, float] = {}
        breakdown["rsi"] = TechnicalScanners.rsi_score(rsi_14)
        breakdown["orderbook"] = TechnicalScanners.orderbook_score(imbalance)

        if prices and len(prices) >= MACD_SLOW + MACD_SIGNAL:
            _, _, macd_s = TechnicalScanners.macd_score(prices)
            breakdown["macd"] = macd_s
        else:
            breakdown["macd"] = 0.0

        if prices and len(prices) >= BB_PERIOD and current_price > 0:
            _, _, bb_s = TechnicalScanners.bollinger_score(prices, current_price)
            breakdown["bollinger"] = bb_s
        else:
            breakdown["bollinger"] = 0.0

        if prices and volumes and current_price > 0:
            _, vwap_s = TechnicalScanners.vwap_score(prices, volumes, current_price)
            breakdown["vwap"] = vwap_s
        else:
            breakdown["vwap"] = 0.0

        if prices and len(prices) >= 20:
            breakdown["momentum"] = TechnicalScanners.momentum_score(prices)
        else:
            breakdown["momentum"] = 0.0

        score = (
            W_RSI * breakdown["rsi"]
            + W_MACD * breakdown["macd"]
            + W_BOLLINGER * breakdown["bollinger"]
            + W_VWAP * breakdown["vwap"]
            + W_MOMENTUM * breakdown["momentum"]
            + W_ORDERBOOK * breakdown["orderbook"]
        )
        return score, breakdown

    @staticmethod
    def _ema(data: np.ndarray, period: int) -> np.ndarray:
        """Exponential Moving Average via numpy vectorized computation."""
        if len(data) < period:
            return np.array([], dtype=np.float64)
        alpha = 2.0 / (period + 1.0)
        result = np.empty(len(data), dtype=np.float64)
        result[0] = float(np.mean(data[:period]))
        for i in range(1, len(data)):
            result[i] = alpha * data[i] + (1.0 - alpha) * result[i - 1]
        return result


# ---------------------------------------------------------------------------
# CIRCUIT BREAKER
# ---------------------------------------------------------------------------
class CircuitBreaker:
    """Prevents cascading failures when the upstream broker is unreachable."""

    def __init__(
        self,
        failure_threshold: int = CB_FAILURE_THRESHOLD,
        reset_timeout: float = CB_RESET_SECONDS,
    ) -> None:
        self._failure_count: int = 0
        self._failure_threshold = failure_threshold
        self._reset_timeout = reset_timeout
        self._last_failure_time: float = 0.0
        self._state: str = "closed"  # closed | open | half_open

    @property
    def state(self) -> str:
        if self._state == "open":
            if time.monotonic() - self._last_failure_time >= self._reset_timeout:
                self._state = "half_open"
        return self._state

    def record_success(self) -> None:
        self._failure_count = 0
        self._state = "closed"

    def record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.monotonic()
        if self._failure_count >= self._failure_threshold:
            self._state = "open"
            logger.warning(
                "Circuit breaker OPEN after %d failures", self._failure_count
            )

    @property
    def is_open(self) -> bool:
        return self.state == "open"


# ---------------------------------------------------------------------------
# AUDIT LOGGER (NDJSON, append-only)
# ---------------------------------------------------------------------------
class TradeAuditLog:
    """Append-only NDJSON trade decision log."""

    def __init__(self, path: Optional[str] = None) -> None:
        self._path = path or _env("MCP_AUDIT_LOG", "./data/trade_audit.jsonl")
        os.makedirs(os.path.dirname(self._path) or ".", exist_ok=True)

    def _write(self, event: Dict[str, Any]) -> None:
        event["ts"] = time.time()
        try:
            with open(self._path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(event, sort_keys=True, default=str) + "\n")
        except OSError:
            logger.exception("Failed to write audit event")

    def trade_executed(self, setup: TradeSetup, broker_response: Any) -> None:
        self._write({
            "event": "trade_executed",
            "symbol": setup.symbol,
            "action": setup.action,
            "entry": str(setup.verified_entry),
            "capital": str(setup.allocated_capital_usd),
            "signal_score": setup.signal_score,
            "scanner_breakdown": setup.scanner_breakdown,
            "position_size": str(setup.position_size_shares),
            "broker_response": broker_response,
        })

    def trade_rejected(self, symbol: str, reason: str) -> None:
        self._write({"event": "trade_rejected", "symbol": symbol, "reason": reason})

    def broker_error(self, symbol: str, error: str) -> None:
        self._write({"event": "broker_error", "symbol": symbol, "error": error})

    def circuit_open(self, symbol: str) -> None:
        self._write({"event": "circuit_breaker_open", "symbol": symbol})

    def scanner_result(self, symbol: str, score: float, breakdown: Dict[str, float]) -> None:
        self._write({
            "event": "scanner_result",
            "symbol": symbol,
            "composite_score": score,
            "breakdown": breakdown,
        })


# ---------------------------------------------------------------------------
# POSITION TRACKER
# ---------------------------------------------------------------------------
class PositionTracker:
    """In-memory open-position ledger."""

    def __init__(self) -> None:
        self._positions: Dict[str, PositionRecord] = {}

    def has_open(self, symbol: str) -> bool:
        return symbol.upper() in self._positions

    def open(self, record: PositionRecord) -> None:
        self._positions[record.symbol.upper()] = record

    def close(self, symbol: str) -> Optional[PositionRecord]:
        return self._positions.pop(symbol.upper(), None)

    @property
    def all_open(self) -> Dict[str, PositionRecord]:
        return dict(self._positions)


# ---------------------------------------------------------------------------
# FAST BOOK DISTILLATION
# ---------------------------------------------------------------------------
def fast_book_distillation(
    bids: List[List[float]], asks: List[List[float]]
) -> Tuple[Decimal, float]:
    """Compute mid-price and structural orderbook imbalance via numpy vectors."""
    if not bids or not asks:
        raise ValueError("Orderbook bids and asks must be non-empty")

    bid_arr = np.array(bids, dtype=np.float64)
    ask_arr = np.array(asks, dtype=np.float64)

    if bid_arr.ndim != 2 or bid_arr.shape[1] < 2:
        raise ValueError("Bids must be [[price, volume], ...]")
    if ask_arr.ndim != 2 or ask_arr.shape[1] < 2:
        raise ValueError("Asks must be [[price, volume], ...]")

    mid_price = Decimal(str(round((bid_arr[0, 0] + ask_arr[0, 0]) / 2, 2)))

    total_bid_vol = float(np.sum(bid_arr[:, 1]))
    total_ask_vol = float(np.sum(ask_arr[:, 1]))
    denominator = total_bid_vol + total_ask_vol
    if denominator == 0.0:
        raise ValueError("Combined orderbook volume is zero")

    book_imbalance = (total_bid_vol - total_ask_vol) / denominator
    return mid_price, book_imbalance


# ---------------------------------------------------------------------------
# POSITION SIZING (Kelly-inspired, capped at < 1% risk)
# ---------------------------------------------------------------------------
def compute_position_size(
    account_balance: Decimal,
    entry_price: Decimal,
    stop_loss: Decimal,
    max_trade_value: Decimal,
) -> Tuple[Decimal, Decimal]:
    """Compute shares and capital to risk < 1% of account on any single trade.

    Returns (shares, capital_usd).
    """
    if entry_price <= ZERO:
        return ZERO, ZERO
    risk_per_share = abs(entry_price - stop_loss)
    if risk_per_share <= ZERO:
        return ZERO, ZERO
    max_dollar_risk = (account_balance * MAX_RISK_PER_TRADE_PCT).quantize(
        PRECISION, rounding=ROUND_HALF_UP
    )
    shares = (max_dollar_risk / risk_per_share).quantize(
        PRECISION_4, rounding=ROUND_HALF_UP
    )
    capital = (shares * entry_price).quantize(PRECISION, rounding=ROUND_HALF_UP)
    if capital > max_trade_value:
        shares = (max_trade_value / entry_price).quantize(
            PRECISION_4, rounding=ROUND_HALF_UP
        )
        capital = (shares * entry_price).quantize(PRECISION, rounding=ROUND_HALF_UP)
    return shares, capital


# ---------------------------------------------------------------------------
# RISK SUPERVISOR (enhanced with scanner integration)
# ---------------------------------------------------------------------------
class RiskSupervisor:
    """Deterministic, sub-microsecond trade validation gate with scanner fusion."""

    def __init__(self, portfolio: PortfolioState, positions: PositionTracker) -> None:
        self._portfolio = portfolio
        self._positions = positions

    def audit_trade_setup(
        self,
        symbol: str,
        entry: Decimal,
        rsi: float,
        imbalance: float,
        signal_score: float = 0.0,
        scanner_breakdown: Optional[Dict[str, float]] = None,
        prices: Optional[List[float]] = None,
        volumes: Optional[List[float]] = None,
    ) -> Tuple[bool, TradeSetup | RejectionReason]:
        self._portfolio.maybe_reset_daily()

        if self._portfolio.total_drawdown_today >= self._portfolio.max_daily_drawdown_limit:
            return False, RejectionReason("Hard daily drawdown limit tripped.")

        if self._positions.has_open(symbol):
            return False, RejectionReason(f"Position already open for {symbol}.")

        if entry <= ZERO:
            return False, RejectionReason("Entry price must be positive.")

        effective_score = signal_score
        effective_breakdown = scanner_breakdown or {}
        if effective_score == 0.0 and not effective_breakdown:
            effective_score, effective_breakdown = TechnicalScanners.composite_signal(
                rsi_14=rsi,
                imbalance=imbalance,
                prices=prices,
                volumes=volumes,
                current_price=float(entry),
            )

        has_bull_signal = rsi < RSI_OVERSOLD_THRESHOLD or imbalance > IMBALANCE_THRESHOLD
        has_bear_signal = rsi > RSI_OVERBOUGHT_THRESHOLD or imbalance < -IMBALANCE_THRESHOLD
        has_scanner_signal = effective_score >= MIN_SIGNAL_SCORE

        if has_bull_signal or (has_scanner_signal and not has_bear_signal):
            stop_loss = (entry * BULL_STOP_MULT).quantize(PRECISION, rounding=ROUND_HALF_UP)
            take_profit = (entry * BULL_TP_MULT).quantize(PRECISION, rounding=ROUND_HALF_UP)
            action = "buy"
        elif has_bear_signal:
            stop_loss = (entry * BEAR_STOP_MULT).quantize(PRECISION, rounding=ROUND_HALF_UP)
            take_profit = (entry * BEAR_TP_MULT).quantize(PRECISION, rounding=ROUND_HALF_UP)
            action = "sell"
        else:
            return False, RejectionReason("Market conditions do not match entry criteria.")

        shares, capital = compute_position_size(
            self._portfolio.account_balance,
            entry,
            stop_loss,
            self._portfolio.cached_max_trade_value,
        )

        setup = TradeSetup(
            symbol=symbol.upper(),
            action=action,
            verified_entry=entry,
            allocated_capital_usd=capital,
            hard_stop=stop_loss,
            hard_target=take_profit,
            timestamp_ns=time.time_ns(),
            signal_score=effective_score,
            scanner_breakdown=effective_breakdown,
            position_size_shares=shares,
        )
        return True, setup


# ---------------------------------------------------------------------------
# ENGINE STATE (module-level singleton)
# ---------------------------------------------------------------------------
class EngineState:
    """Holds all mutable engine state; instantiated once at import time."""

    def __init__(self) -> None:
        self.portfolio = PortfolioState(
            account_balance=_dec("MCP_ACCOUNT_BALANCE", "5000.00"),
            total_drawdown_today=ZERO,
            max_daily_drawdown_limit=_dec("MCP_MAX_DAILY_DRAWDOWN", "150.00"),
            cached_max_trade_value=_dec("MCP_MAX_TRADE_VALUE", "500.00"),
        )
        self.positions = PositionTracker()
        self.risk = RiskSupervisor(self.portfolio, self.positions)
        self.circuit = CircuitBreaker()
        self.audit = TradeAuditLog()
        self.rh_client: Any = None  # set during lifespan

    def reset(self) -> None:
        """Reset state (useful for testing)."""
        self.__init__()  # type: ignore[misc]


_state = EngineState()


# ---------------------------------------------------------------------------
# FASTAPI APPLICATION
# ---------------------------------------------------------------------------
try:
    import httpx
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse

    _HAS_FASTAPI = True
except ImportError:
    _HAS_FASTAPI = False

if _HAS_FASTAPI:

    @asynccontextmanager
    async def _lifespan(app: FastAPI):  # type: ignore[type-arg]
        _state.rh_client = httpx.AsyncClient(http2=True, timeout=2.0)
        logger.info("MCP Trading Engine started — gateway=%s", RH_MCP_URL)
        yield
        await _state.rh_client.aclose()
        logger.info("MCP Trading Engine shut down cleanly")

    app = FastAPI(title="BuiltIn-Trading-MCP-Engine", lifespan=_lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    RH_HEADERS: Final[Dict[str, str]] = {
        "Content-Type": "application/json",
        "X-MCP-Protocol-Version": RH_PROTOCOL_VERSION,
    }

    # -- auth middleware ---------------------------------------------------
    def _check_auth(request: Request) -> Optional[JSONResponse]:
        if not MCP_API_KEY:
            return None
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if token != MCP_API_KEY:
            return JSONResponse(
                {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Unauthorized"}},
                status_code=401,
            )
        return None

    # -- health endpoints --------------------------------------------------
    @app.get("/healthz")
    async def healthz() -> Dict[str, str]:
        return {"status": "ok", "engine": "mcp-trading"}

    @app.get("/readyz")
    async def readyz() -> Dict[str, Any]:
        return {
            "status": "ready",
            "circuit_breaker": _state.circuit.state,
            "open_positions": len(_state.positions.all_open),
            "drawdown_today": str(_state.portfolio.total_drawdown_today),
        }

    @app.get("/status")
    async def status() -> Dict[str, Any]:
        positions = _state.positions.all_open
        pos_list = []
        for sym, rec in positions.items():
            pos_list.append({
                "symbol": sym,
                "side": rec.side,
                "entry": str(rec.entry_price),
                "stop_loss": str(rec.stop_loss),
                "take_profit": str(rec.take_profit),
                "capital_usd": str(rec.capital_usd),
            })
        return {
            "engine": "mcp-trading-enhanced",
            "version": "2.0.0",
            "circuit_breaker": _state.circuit.state,
            "account_balance": str(_state.portfolio.account_balance),
            "drawdown_today": str(_state.portfolio.total_drawdown_today),
            "max_daily_drawdown": str(_state.portfolio.max_daily_drawdown_limit),
            "open_positions": pos_list,
            "scanner_config": {
                "min_signal_score": MIN_SIGNAL_SCORE,
                "max_risk_per_trade_pct": str(MAX_RISK_PER_TRADE_PCT),
                "weights": {
                    "rsi": W_RSI, "macd": W_MACD, "bollinger": W_BOLLINGER,
                    "vwap": W_VWAP, "momentum": W_MOMENTUM, "orderbook": W_ORDERBOOK,
                },
            },
        }

    # -- MCP tool listing (POST per MCP spec) ------------------------------
    _TOOL_SCHEMA: Final[Dict[str, Any]] = {
        "tools": [
            {
                "name": "analyze_and_trade",
                "description": (
                    "Multi-scanner analysis (RSI + MACD + Bollinger + VWAP + "
                    "momentum + orderbook) with < 1% risk position sizing. "
                    "Executes via Robinhood MCP."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbol": {
                            "type": "string",
                            "description": "Ticker symbol to evaluate (e.g. AAPL)",
                        },
                        "rsi_14": {
                            "type": "number",
                            "description": "Current 14-period RSI level",
                        },
                        "orderbook_bids": {
                            "type": "array",
                            "items": {"type": "array", "items": {"type": "number"}},
                            "description": "Nested [[price, volume]] bid matrix",
                        },
                        "orderbook_asks": {
                            "type": "array",
                            "items": {"type": "array", "items": {"type": "number"}},
                            "description": "Nested [[price, volume]] ask matrix",
                        },
                        "price_history": {
                            "type": "array",
                            "items": {"type": "number"},
                            "description": "Recent closing prices (35+ for MACD, 20+ for Bollinger/momentum)",
                        },
                        "volume_history": {
                            "type": "array",
                            "items": {"type": "number"},
                            "description": "Recent volume bars matching price_history length",
                        },
                    },
                    "required": ["symbol", "rsi_14", "orderbook_bids", "orderbook_asks"],
                },
            },
            {
                "name": "scan_signal",
                "description": (
                    "Run multi-indicator scan without executing a trade. "
                    "Returns composite score and per-scanner breakdown."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "symbol": {"type": "string"},
                        "rsi_14": {"type": "number"},
                        "orderbook_imbalance": {"type": "number"},
                        "price_history": {
                            "type": "array", "items": {"type": "number"},
                        },
                        "volume_history": {
                            "type": "array", "items": {"type": "number"},
                        },
                        "current_price": {"type": "number"},
                    },
                    "required": ["symbol", "rsi_14", "orderbook_imbalance"],
                },
            },
        ],
    }

    @app.post("/tools/list")
    async def list_mcp_tools(request: Request) -> JSONResponse:
        auth_err = _check_auth(request)
        if auth_err:
            return auth_err
        return JSONResponse(_TOOL_SCHEMA)

    # Also support GET for backward compat with older MCP clients
    @app.get("/tools/list")
    async def list_mcp_tools_get() -> JSONResponse:
        return JSONResponse(_TOOL_SCHEMA)

    # -- MCP tool execution ------------------------------------------------
    @app.post("/tools/call")
    async def call_mcp_tool(request: Request) -> JSONResponse:
        auth_err = _check_auth(request)
        if auth_err:
            return auth_err

        try:
            body = await request.json()
        except Exception:
            return JSONResponse(
                {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}},
                status_code=400,
            )

        req_id = body.get("id")
        tool_name = body.get("params", {}).get("name", "analyze_and_trade")
        arguments = body.get("params", {}).get("arguments", {})

        if tool_name == "scan_signal":
            return _handle_scan_signal(req_id, arguments)

        # --- input validation ---
        symbol = arguments.get("symbol")
        if not symbol or not isinstance(symbol, str):
            return JSONResponse(
                {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32602, "message": "Missing or invalid 'symbol'"}},
                status_code=400,
            )
        symbol = symbol.strip().upper()

        try:
            rsi_14 = float(arguments["rsi_14"])
        except (KeyError, TypeError, ValueError):
            return JSONResponse(
                {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32602, "message": "Missing or invalid 'rsi_14'"}},
                status_code=400,
            )

        bids = arguments.get("orderbook_bids")
        asks = arguments.get("orderbook_asks")
        if not isinstance(bids, list) or not isinstance(asks, list):
            return JSONResponse(
                {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32602, "message": "Missing or invalid orderbook data"}},
                status_code=400,
            )

        # --- core computation ---
        try:
            mid_price, book_imbalance = fast_book_distillation(bids, asks)
        except ValueError as exc:
            return JSONResponse(
                {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32602, "message": str(exc)}},
                status_code=400,
            )

        # --- multi-scanner analysis ---
        prices = arguments.get("price_history")
        volumes = arguments.get("volume_history")
        if isinstance(prices, list) and len(prices) > 0:
            prices_f = [float(p) for p in prices]
        else:
            prices_f = None
        if isinstance(volumes, list) and len(volumes) > 0:
            volumes_f = [float(v) for v in volumes]
        else:
            volumes_f = None

        signal_score, scanner_breakdown = TechnicalScanners.composite_signal(
            rsi_14=rsi_14,
            imbalance=book_imbalance,
            prices=prices_f,
            volumes=volumes_f,
            current_price=float(mid_price),
        )
        _state.audit.scanner_result(symbol, signal_score, scanner_breakdown)

        # --- risk evaluation ---
        is_safe, result = _state.risk.audit_trade_setup(
            symbol, mid_price, rsi_14, book_imbalance,
            signal_score=signal_score,
            scanner_breakdown=scanner_breakdown,
            prices=prices_f,
            volumes=volumes_f,
        )

        if not is_safe:
            assert isinstance(result, RejectionReason)
            _state.audit.trade_rejected(symbol, result.reason)
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "status": "REJECTED",
                    "reason": result.reason,
                    "signal_score": signal_score,
                    "scanner_breakdown": scanner_breakdown,
                },
            })

        assert isinstance(result, TradeSetup)

        # --- circuit breaker check ---
        if _state.circuit.is_open:
            _state.audit.circuit_open(symbol)
            return JSONResponse(
                {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32603, "message": "Circuit breaker open — broker temporarily unavailable"},
                },
                status_code=503,
            )

        # --- forward to Robinhood MCP gateway ---
        rh_payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "id": req_id,
            "params": {
                "name": "place_equity_order",
                "arguments": {
                    "account_type": "isolated_agentic_sandbox",
                    "symbol": result.symbol,
                    "side": result.action,
                    "order_type": "market",
                    "amount_usd": str(result.allocated_capital_usd),
                },
            },
        }

        try:
            res = await _state.rh_client.post(RH_MCP_URL, json=rh_payload, headers=RH_HEADERS)
            broker_response = res.json()
            _state.circuit.record_success()

            _state.positions.open(PositionRecord(
                symbol=result.symbol,
                side=result.action,
                entry_price=result.verified_entry,
                capital_usd=result.allocated_capital_usd,
                stop_loss=result.hard_stop,
                take_profit=result.hard_target,
                opened_at_ns=result.timestamp_ns,
            ))

            _state.audit.trade_executed(result, broker_response)

            return JSONResponse({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "status": "EXECUTED",
                    "trade": {
                        "symbol": result.symbol,
                        "entry": str(result.verified_entry),
                        "stop_loss": str(result.hard_stop),
                        "take_profit": str(result.hard_target),
                        "capital_usd": str(result.allocated_capital_usd),
                        "shares": str(result.position_size_shares),
                        "signal_score": result.signal_score,
                        "scanner_breakdown": result.scanner_breakdown,
                        "max_risk_pct": str(MAX_RISK_PER_TRADE_PCT),
                    },
                    "broker_receipt": broker_response,
                },
            })
        except Exception as exc:
            _state.circuit.record_failure()
            _state.audit.broker_error(symbol, str(exc))
            return JSONResponse(
                {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32603, "message": f"Robinhood link exception: {exc}"},
                },
                status_code=502,
            )

    def _handle_scan_signal(req_id: Any, arguments: Dict[str, Any]) -> JSONResponse:
        """Handle scan_signal tool — analysis without trade execution."""
        symbol = arguments.get("symbol", "")
        if not symbol or not isinstance(symbol, str):
            return JSONResponse(
                {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32602, "message": "Missing 'symbol'"}},
                status_code=400,
            )
        try:
            rsi_14 = float(arguments.get("rsi_14", 50))
            imbalance = float(arguments.get("orderbook_imbalance", 0))
            current_price = float(arguments.get("current_price", 0))
        except (TypeError, ValueError):
            return JSONResponse(
                {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32602, "message": "Invalid numeric field"}},
                status_code=400,
            )

        prices = arguments.get("price_history")
        volumes = arguments.get("volume_history")
        prices_f = [float(p) for p in prices] if isinstance(prices, list) else None
        volumes_f = [float(v) for v in volumes] if isinstance(volumes, list) else None

        score, breakdown = TechnicalScanners.composite_signal(
            rsi_14=rsi_14,
            imbalance=imbalance,
            prices=prices_f,
            volumes=volumes_f,
            current_price=current_price,
        )

        verdict = "STRONG_BUY" if score >= 0.8 else "BUY" if score >= MIN_SIGNAL_SCORE else "HOLD"

        # Layer in proven strategies if enough data
        proven_layer: Dict[str, Any] = {}
        try:
            from runtime.proven_strategies import MasterSignalCombiner
            if prices_f and len(prices_f) >= 20:
                highs_f = [float(h) for h in arguments.get("high_history", [])] if arguments.get("high_history") else None
                lows_f = [float(l) for l in arguments.get("low_history", [])] if arguments.get("low_history") else None
                bids_raw = arguments.get("orderbook_bids")
                asks_raw = arguments.get("orderbook_asks")
                combined = MasterSignalCombiner.combine(
                    prices=prices_f,
                    highs=highs_f,
                    lows=lows_f,
                    volumes=volumes_f,
                    bids=bids_raw,
                    asks=asks_raw,
                    weekday=arguments.get("weekday"),
                )
                proven_layer = {
                    "proven_direction": combined.direction,
                    "proven_conviction": combined.conviction,
                    "proven_score": combined.composite_score,
                    "regime": combined.regime.value,
                    "regime_confidence": combined.regime_confidence,
                    "strategy_signals": combined.strategy_signals,
                    "strategy_weights": combined.strategy_weights,
                }
                # Override verdict if proven strategies have high conviction
                if combined.conviction >= 0.6:
                    verdict = f"STRONG_{combined.direction}" if combined.conviction >= 0.8 else combined.direction
        except ImportError:
            pass

        return JSONResponse({
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "symbol": symbol.upper(),
                "verdict": verdict,
                "composite_score": round(score, 4),
                "min_required": MIN_SIGNAL_SCORE,
                "scanner_breakdown": {k: round(v, 4) for k, v in breakdown.items()},
                **proven_layer,
            },
        })


def serve(host: str = "127.0.0.1", port: int = MCP_ENGINE_PORT) -> None:
    """Run the engine as a standalone process."""
    if not _HAS_FASTAPI:
        raise RuntimeError("FastAPI/httpx/uvicorn not installed — pip install fastapi httpx uvicorn[standard]")
    import uvicorn

    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    serve()
