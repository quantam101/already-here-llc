"""
Native MCP-compliant agentic trading engine.

Exposes a Streamable HTTP MCP Server (JSON-RPC 2.0) that performs
low-latency technical analysis and routes validated orders to
Robinhood's production MCP gateway.

Agent-agnostic: works identically with Claude, ChatGPT, Cursor, Grok,
or any MCP-capable client.

Architecture
~~~~~~~~~~~~
Inbound market data → Fast book distillation (numpy) → Risk supervisor
→ JSON-RPC 2.0 payload → Robinhood MCP gateway (persistent HTTP/2 pool)

All financial arithmetic uses ``Decimal`` to avoid floating-point drift.
Configuration is env-var-driven with safe defaults.
"""

from __future__ import annotations

import asyncio
import logging
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

RH_MCP_URL: Final[str] = _env("MCP_RH_GATEWAY_URL", "https://agent.robinhood.com/mcp/trading")
RH_PROTOCOL_VERSION: Final[str] = _env("MCP_RH_PROTOCOL_VERSION", "2026-04-27")
MCP_API_KEY: Final[str] = _env("MCP_API_KEY", "")
MCP_ENGINE_PORT: Final[int] = int(_env("MCP_ENGINE_PORT", "8000"))

# Risk constants
BULL_STOP_MULT: Final[Decimal] = _dec("MCP_BULL_STOP_MULT", "0.985")
BULL_TP_MULT: Final[Decimal] = _dec("MCP_BULL_TP_MULT", "1.045")
RSI_OVERSOLD_THRESHOLD: Final[float] = float(_env("MCP_RSI_OVERSOLD", "35.0"))
IMBALANCE_THRESHOLD: Final[float] = float(_env("MCP_IMBALANCE_THRESHOLD", "0.20"))

# Circuit breaker
CB_FAILURE_THRESHOLD: Final[int] = int(_env("MCP_CB_FAILURE_THRESHOLD", "5"))
CB_RESET_SECONDS: Final[float] = float(_env("MCP_CB_RESET_SECONDS", "60"))


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
        import json

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
            "broker_response": broker_response,
        })

    def trade_rejected(self, symbol: str, reason: str) -> None:
        self._write({"event": "trade_rejected", "symbol": symbol, "reason": reason})

    def broker_error(self, symbol: str, error: str) -> None:
        self._write({"event": "broker_error", "symbol": symbol, "error": error})

    def circuit_open(self, symbol: str) -> None:
        self._write({"event": "circuit_breaker_open", "symbol": symbol})


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
# RISK SUPERVISOR
# ---------------------------------------------------------------------------
class RiskSupervisor:
    """Deterministic, sub-microsecond trade validation gate."""

    def __init__(self, portfolio: PortfolioState, positions: PositionTracker) -> None:
        self._portfolio = portfolio
        self._positions = positions

    def audit_trade_setup(
        self,
        symbol: str,
        entry: Decimal,
        rsi: float,
        imbalance: float,
    ) -> Tuple[bool, TradeSetup | RejectionReason]:
        self._portfolio.maybe_reset_daily()

        if self._portfolio.total_drawdown_today >= self._portfolio.max_daily_drawdown_limit:
            return False, RejectionReason("Hard daily drawdown limit tripped.")

        if self._positions.has_open(symbol):
            return False, RejectionReason(f"Position already open for {symbol}.")

        if entry <= ZERO:
            return False, RejectionReason("Entry price must be positive.")

        if rsi < RSI_OVERSOLD_THRESHOLD or imbalance > IMBALANCE_THRESHOLD:
            stop_loss = (entry * BULL_STOP_MULT).quantize(PRECISION, rounding=ROUND_HALF_UP)
            take_profit = (entry * BULL_TP_MULT).quantize(PRECISION, rounding=ROUND_HALF_UP)

            setup = TradeSetup(
                symbol=symbol.upper(),
                action="buy",
                verified_entry=entry,
                allocated_capital_usd=self._portfolio.cached_max_trade_value,
                hard_stop=stop_loss,
                hard_target=take_profit,
                timestamp_ns=time.time_ns(),
            )
            return True, setup

        return False, RejectionReason("Market conditions do not match entry criteria.")


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

    # -- MCP tool listing (POST per MCP spec) ------------------------------
    _TOOL_SCHEMA: Final[Dict[str, Any]] = {
        "tools": [{
            "name": "analyze_and_trade",
            "description": (
                "Runs localized low-latency technical scans and executes "
                "orders via Robinhood MCP."
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
                },
                "required": ["symbol", "rsi_14", "orderbook_bids", "orderbook_asks"],
            },
        }],
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
        arguments = body.get("params", {}).get("arguments", {})

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

        # --- risk evaluation ---
        is_safe, result = _state.risk.audit_trade_setup(symbol, mid_price, rsi_14, book_imbalance)

        if not is_safe:
            assert isinstance(result, RejectionReason)
            _state.audit.trade_rejected(symbol, result.reason)
            return JSONResponse({
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"status": "REJECTED", "reason": result.reason},
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

            # track position
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


def serve(host: str = "127.0.0.1", port: int = MCP_ENGINE_PORT) -> None:
    """Run the engine as a standalone process."""
    if not _HAS_FASTAPI:
        raise RuntimeError("FastAPI/httpx/uvicorn not installed — pip install fastapi httpx uvicorn[standard]")
    import uvicorn

    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    serve()
