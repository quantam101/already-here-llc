"""
Autonomous Trading Orchestrator — Production-Ready Agent Fleet Manager.

Runs a continuous loop that:
1. Fetches live market data (watchlist symbols)
2. Computes RSI-14 from recent price history
3. Runs multi-scanner analysis via the MCP trading engine
4. Executes trades that pass risk gates via Robinhood MCP
5. Monitors open positions for trailing stops and take-profit exits
6. Logs everything to NDJSON audit trail

Designed for 24/7 autonomous operation on OCI or any Linux host.
Accessible from phone/laptop via the engine's CORS-enabled API.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import time
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, Final, List, Optional

logger = logging.getLogger("trading_orchestrator")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
)

_env = os.environ.get

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
WATCHLIST: Final[List[str]] = [
    s.strip().upper()
    for s in _env("MCP_WATCHLIST", "AAPL,MSFT,NVDA,TSLA,AMD,GOOG,AMZN,META,SPY,QQQ").split(",")
    if s.strip()
]
SCAN_INTERVAL_SEC: Final[float] = float(_env("MCP_SCAN_INTERVAL", "30"))
ENGINE_URL: Final[str] = _env("MCP_ENGINE_URL", "http://127.0.0.1:8000")
RH_MCP_URL: Final[str] = _env("MCP_RH_GATEWAY_URL", "https://agent.robinhood.com/mcp/trading")
API_KEY: Final[str] = _env("MCP_API_KEY", "")
DATA_DIR: Final[str] = _env("MCP_DATA_DIR", "./data")
MAX_CONCURRENT_SCANS: Final[int] = int(_env("MCP_MAX_CONCURRENT_SCANS", "5"))
TRAILING_STOP_PCT: Final[float] = float(_env("MCP_TRAILING_STOP_PCT", "0.003"))
POSITION_CHECK_INTERVAL: Final[float] = float(_env("MCP_POSITION_CHECK_SEC", "10"))

os.makedirs(DATA_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# DOMAIN
# ---------------------------------------------------------------------------
@dataclass
class PriceBuffer:
    """Rolling price + volume buffer per symbol."""
    symbol: str
    prices: List[float] = field(default_factory=list)
    volumes: List[float] = field(default_factory=list)
    max_len: int = 100
    last_update: float = 0.0

    def append(self, price: float, volume: float) -> None:
        self.prices.append(price)
        self.volumes.append(volume)
        if len(self.prices) > self.max_len:
            self.prices = self.prices[-self.max_len:]
            self.volumes = self.volumes[-self.max_len:]
        self.last_update = time.time()

    @property
    def has_enough_data(self) -> bool:
        return len(self.prices) >= 35

    def compute_rsi(self, period: int = 14) -> float:
        """Compute RSI-14 from price buffer."""
        if len(self.prices) < period + 1:
            return 50.0  # neutral when insufficient data
        changes = [
            self.prices[i] - self.prices[i - 1]
            for i in range(len(self.prices) - period, len(self.prices))
        ]
        gains = [c for c in changes if c > 0]
        losses = [-c for c in changes if c < 0]
        avg_gain = sum(gains) / period if gains else 0.0
        avg_loss = sum(losses) / period if losses else 0.0001
        rs = avg_gain / avg_loss
        return 100.0 - (100.0 / (1.0 + rs))


@dataclass
class TrackedPosition:
    symbol: str
    side: str
    entry_price: float
    stop_loss: float
    take_profit: float
    high_water: float
    opened_at: float


# ---------------------------------------------------------------------------
# MARKET DATA AGENT
# ---------------------------------------------------------------------------
class MarketDataAgent:
    """Fetches live market data from Robinhood MCP."""

    def __init__(self) -> None:
        self._client: Any = None

    async def start(self) -> None:
        import httpx
        self._client = httpx.AsyncClient(http2=True, timeout=5.0)
        logger.info("MarketDataAgent started")

    async def stop(self) -> None:
        if self._client:
            await self._client.aclose()

    async def fetch_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch current quote from Robinhood MCP get_stock_quote tool."""
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "id": f"quote-{symbol}-{int(time.time())}",
            "params": {
                "name": "get_stock_quote",
                "arguments": {"symbol": symbol},
            },
        }
        headers = {
            "Content-Type": "application/json",
            "X-MCP-Protocol-Version": "2026-04-27",
        }
        try:
            res = await self._client.post(RH_MCP_URL, json=payload, headers=headers)
            data = res.json()
            if "result" in data:
                return data["result"]
            logger.warning("Quote error for %s: %s", symbol, data.get("error", "unknown"))
            return None
        except Exception as exc:
            logger.warning("Failed to fetch quote for %s: %s", symbol, exc)
            return None

    async def fetch_orderbook(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch orderbook from Robinhood MCP."""
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "id": f"book-{symbol}-{int(time.time())}",
            "params": {
                "name": "get_order_book",
                "arguments": {"symbol": symbol},
            },
        }
        headers = {
            "Content-Type": "application/json",
            "X-MCP-Protocol-Version": "2026-04-27",
        }
        try:
            res = await self._client.post(RH_MCP_URL, json=payload, headers=headers)
            data = res.json()
            if "result" in data:
                return data["result"]
            return None
        except Exception as exc:
            logger.warning("Failed to fetch orderbook for %s: %s", symbol, exc)
            return None


# ---------------------------------------------------------------------------
# SCANNER AGENT
# ---------------------------------------------------------------------------
class ScannerAgent:
    """Runs multi-indicator scans via the local MCP engine."""

    def __init__(self) -> None:
        self._client: Any = None

    async def start(self) -> None:
        import httpx
        self._client = httpx.AsyncClient(timeout=5.0)
        logger.info("ScannerAgent started — engine=%s", ENGINE_URL)

    async def stop(self) -> None:
        if self._client:
            await self._client.aclose()

    async def scan(
        self, symbol: str, rsi: float, imbalance: float,
        prices: List[float], volumes: List[float], current_price: float,
    ) -> Optional[Dict[str, Any]]:
        """Run scan_signal on the local MCP engine."""
        payload = {
            "id": f"scan-{symbol}-{int(time.time())}",
            "params": {
                "name": "scan_signal",
                "arguments": {
                    "symbol": symbol,
                    "rsi_14": rsi,
                    "orderbook_imbalance": imbalance,
                    "price_history": prices,
                    "volume_history": volumes,
                    "current_price": current_price,
                },
            },
        }
        headers = {"Content-Type": "application/json"}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
        try:
            res = await self._client.post(
                f"{ENGINE_URL}/tools/call", json=payload, headers=headers,
            )
            data = res.json()
            return data.get("result")
        except Exception as exc:
            logger.warning("Scan failed for %s: %s", symbol, exc)
            return None

    async def execute_trade(
        self, symbol: str, rsi: float, bids: List[List[float]],
        asks: List[List[float]], prices: List[float], volumes: List[float],
    ) -> Optional[Dict[str, Any]]:
        """Execute trade via the local MCP engine → Robinhood."""
        payload = {
            "id": f"trade-{symbol}-{int(time.time())}",
            "params": {
                "arguments": {
                    "symbol": symbol,
                    "rsi_14": rsi,
                    "orderbook_bids": bids,
                    "orderbook_asks": asks,
                    "price_history": prices,
                    "volume_history": volumes,
                },
            },
        }
        headers = {"Content-Type": "application/json"}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
        try:
            res = await self._client.post(
                f"{ENGINE_URL}/tools/call", json=payload, headers=headers,
            )
            data = res.json()
            return data.get("result") or data.get("error")
        except Exception as exc:
            logger.error("Trade execution failed for %s: %s", symbol, exc)
            return None


# ---------------------------------------------------------------------------
# POSITION MONITOR AGENT
# ---------------------------------------------------------------------------
class PositionMonitorAgent:
    """Monitors open positions for trailing stops and exit signals."""

    def __init__(self) -> None:
        self._positions: Dict[str, TrackedPosition] = {}
        self._client: Any = None

    async def start(self) -> None:
        import httpx
        self._client = httpx.AsyncClient(timeout=5.0)
        logger.info("PositionMonitorAgent started")

    async def stop(self) -> None:
        if self._client:
            await self._client.aclose()

    def track(self, symbol: str, side: str, entry: float, stop: float, tp: float) -> None:
        self._positions[symbol.upper()] = TrackedPosition(
            symbol=symbol.upper(),
            side=side,
            entry_price=entry,
            stop_loss=stop,
            take_profit=tp,
            high_water=entry,
            opened_at=time.time(),
        )
        logger.info("Tracking %s %s @ %.2f (stop=%.2f, tp=%.2f)", side, symbol, entry, stop, tp)

    def check_exit(self, symbol: str, current_price: float) -> Optional[str]:
        """Check if position should exit. Returns exit reason or None."""
        pos = self._positions.get(symbol.upper())
        if not pos:
            return None

        if pos.side == "buy":
            if current_price > pos.high_water:
                pos.high_water = current_price
                new_stop = current_price * (1.0 - TRAILING_STOP_PCT)
                if new_stop > pos.stop_loss:
                    pos.stop_loss = new_stop
            if current_price <= pos.stop_loss:
                return f"STOP_HIT at {current_price:.2f} (stop={pos.stop_loss:.2f})"
            if current_price >= pos.take_profit:
                return f"TAKE_PROFIT at {current_price:.2f} (target={pos.take_profit:.2f})"
        elif pos.side == "sell":
            if current_price < pos.high_water:
                pos.high_water = current_price
                new_stop = current_price * (1.0 + TRAILING_STOP_PCT)
                if new_stop < pos.stop_loss:
                    pos.stop_loss = new_stop
            if current_price >= pos.stop_loss:
                return f"STOP_HIT at {current_price:.2f} (stop={pos.stop_loss:.2f})"
            if current_price <= pos.take_profit:
                return f"TAKE_PROFIT at {current_price:.2f} (target={pos.take_profit:.2f})"

        return None

    def close_position(self, symbol: str) -> Optional[TrackedPosition]:
        return self._positions.pop(symbol.upper(), None)

    @property
    def open_count(self) -> int:
        return len(self._positions)

    @property
    def all_symbols(self) -> List[str]:
        return list(self._positions.keys())


# ---------------------------------------------------------------------------
# AUDIT AGENT
# ---------------------------------------------------------------------------
class AuditAgent:
    """Structured NDJSON logging for all orchestrator decisions."""

    def __init__(self) -> None:
        self._path = os.path.join(DATA_DIR, "orchestrator_audit.jsonl")

    def log(self, event: str, data: Dict[str, Any]) -> None:
        entry = {"ts": time.time(), "event": event, **data}
        try:
            with open(self._path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, sort_keys=True, default=str) + "\n")
        except OSError:
            logger.exception("Audit write failed")


# ---------------------------------------------------------------------------
# ORCHESTRATOR (main loop)
# ---------------------------------------------------------------------------
class TradingOrchestrator:
    """Production-ready autonomous trading agent fleet manager."""

    def __init__(self) -> None:
        self.market_data = MarketDataAgent()
        self.scanner = ScannerAgent()
        self.monitor = PositionMonitorAgent()
        self.audit = AuditAgent()
        self.buffers: Dict[str, PriceBuffer] = {
            sym: PriceBuffer(symbol=sym) for sym in WATCHLIST
        }
        self._running = False
        self._scan_count = 0
        self._trade_count = 0

    async def start(self) -> None:
        await self.market_data.start()
        await self.scanner.start()
        await self.monitor.start()
        self._running = True
        self.audit.log("orchestrator_started", {
            "watchlist": WATCHLIST,
            "scan_interval": SCAN_INTERVAL_SEC,
            "engine_url": ENGINE_URL,
        })
        logger.info(
            "TradingOrchestrator started — %d symbols, %.0fs interval",
            len(WATCHLIST), SCAN_INTERVAL_SEC,
        )

    async def stop(self) -> None:
        self._running = False
        await self.market_data.stop()
        await self.scanner.stop()
        await self.monitor.stop()
        self.audit.log("orchestrator_stopped", {
            "scans": self._scan_count,
            "trades": self._trade_count,
        })
        logger.info("TradingOrchestrator stopped — %d scans, %d trades", self._scan_count, self._trade_count)

    async def run_forever(self) -> None:
        """Main event loop — scan → analyze → trade → monitor."""
        await self.start()

        loop = asyncio.get_event_loop()
        stop_event = asyncio.Event()

        def _handle_signal() -> None:
            logger.info("Shutdown signal received")
            stop_event.set()

        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, _handle_signal)

        try:
            while not stop_event.is_set():
                cycle_start = time.time()

                # Phase 1: Fetch market data for all watchlist symbols
                await self._fetch_all_quotes()

                # Phase 2: Check exits on open positions
                await self._check_exits()

                # Phase 3: Scan for new opportunities
                await self._scan_opportunities()

                self._scan_count += 1

                # Wait for next interval
                elapsed = time.time() - cycle_start
                wait_time = max(0, SCAN_INTERVAL_SEC - elapsed)
                if wait_time > 0:
                    try:
                        await asyncio.wait_for(stop_event.wait(), timeout=wait_time)
                    except asyncio.TimeoutError:
                        pass

        finally:
            await self.stop()

    async def _fetch_all_quotes(self) -> None:
        """Fetch quotes for all watchlist symbols concurrently."""
        sem = asyncio.Semaphore(MAX_CONCURRENT_SCANS)

        async def _fetch_one(symbol: str) -> None:
            async with sem:
                quote = await self.market_data.fetch_quote(symbol)
                if quote and "last_trade_price" in quote:
                    price = float(quote["last_trade_price"])
                    volume = float(quote.get("volume", 0))
                    self.buffers[symbol].append(price, volume)

        await asyncio.gather(
            *[_fetch_one(sym) for sym in WATCHLIST],
            return_exceptions=True,
        )

    async def _check_exits(self) -> None:
        """Check all open positions for exit signals."""
        for symbol in list(self.monitor.all_symbols):
            buf = self.buffers.get(symbol)
            if not buf or not buf.prices:
                continue
            current_price = buf.prices[-1]
            exit_reason = self.monitor.check_exit(symbol, current_price)
            if exit_reason:
                pos = self.monitor.close_position(symbol)
                if pos:
                    pnl = (current_price - pos.entry_price) if pos.side == "buy" else (pos.entry_price - current_price)
                    self.audit.log("position_closed", {
                        "symbol": symbol,
                        "side": pos.side,
                        "entry": pos.entry_price,
                        "exit": current_price,
                        "pnl": round(pnl, 4),
                        "reason": exit_reason,
                        "hold_time_sec": round(time.time() - pos.opened_at, 1),
                    })
                    logger.info(
                        "CLOSED %s %s — entry=%.2f exit=%.2f pnl=%.4f reason=%s",
                        pos.side, symbol, pos.entry_price, current_price, pnl, exit_reason,
                    )

    async def _scan_opportunities(self) -> None:
        """Scan all symbols and execute trades that pass risk gates."""
        sem = asyncio.Semaphore(MAX_CONCURRENT_SCANS)

        async def _scan_one(symbol: str) -> None:
            async with sem:
                buf = self.buffers[symbol]
                if not buf.prices:
                    return

                # Skip if we already have an open position
                if symbol in self.monitor.all_symbols:
                    return

                current_price = buf.prices[-1]
                rsi = buf.compute_rsi()

                # Fetch orderbook for this symbol
                book = await self.market_data.fetch_orderbook(symbol)
                if not book:
                    return

                bids = book.get("bids", [])
                asks = book.get("asks", [])
                if not bids or not asks:
                    return

                # Compute imbalance
                bid_vol = sum(b[1] for b in bids if len(b) >= 2)
                ask_vol = sum(a[1] for a in asks if len(a) >= 2)
                total_vol = bid_vol + ask_vol
                imbalance = (bid_vol - ask_vol) / total_vol if total_vol > 0 else 0.0

                # Run scanner
                scan_result = await self.scanner.scan(
                    symbol=symbol,
                    rsi=rsi,
                    imbalance=imbalance,
                    prices=buf.prices,
                    volumes=buf.volumes,
                    current_price=current_price,
                )

                if not scan_result:
                    return

                verdict = scan_result.get("verdict", "HOLD")
                score = scan_result.get("composite_score", 0)

                self.audit.log("scan_completed", {
                    "symbol": symbol,
                    "verdict": verdict,
                    "score": score,
                    "rsi": round(rsi, 2),
                    "imbalance": round(imbalance, 4),
                    "price": current_price,
                })

                if verdict in ("BUY", "STRONG_BUY"):
                    # Execute trade via engine
                    trade_result = await self.scanner.execute_trade(
                        symbol=symbol,
                        rsi=rsi,
                        bids=bids,
                        asks=asks,
                        prices=buf.prices,
                        volumes=buf.volumes,
                    )

                    if trade_result and trade_result.get("status") == "EXECUTED":
                        trade_info = trade_result.get("trade", {})
                        entry = float(trade_info.get("entry", current_price))
                        stop = float(trade_info.get("stop_loss", 0))
                        tp = float(trade_info.get("take_profit", 0))
                        side = "buy"

                        self.monitor.track(symbol, side, entry, stop, tp)
                        self._trade_count += 1

                        self.audit.log("trade_executed", {
                            "symbol": symbol,
                            "side": side,
                            "entry": entry,
                            "stop": stop,
                            "take_profit": tp,
                            "score": score,
                            "shares": trade_info.get("shares"),
                            "capital": trade_info.get("capital_usd"),
                        })

                        logger.info(
                            "TRADE %s %s @ %.2f (stop=%.2f tp=%.2f score=%.3f)",
                            side, symbol, entry, stop, tp, score,
                        )
                    elif trade_result:
                        self.audit.log("trade_result", {
                            "symbol": symbol,
                            "result": trade_result,
                        })

        await asyncio.gather(
            *[_scan_one(sym) for sym in WATCHLIST],
            return_exceptions=True,
        )


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------
async def main() -> None:
    orchestrator = TradingOrchestrator()
    await orchestrator.run_forever()


if __name__ == "__main__":
    asyncio.run(main())
