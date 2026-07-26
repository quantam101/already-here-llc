"""
Autonomous Trading Orchestrator — hardened agent fleet manager.

Default behavior is PAPER mode. Live order routing is blocked unless all live
trade gates are explicitly set. This prevents accidental real-money execution
from a deploy, PM2 restart, phone browser test, or CI-triggered release.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Final, List, Optional

logger = logging.getLogger("trading_orchestrator")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s %(message)s")

_env = os.environ.get

WATCHLIST: Final[List[str]] = [
    s.strip().upper()
    for s in _env("MCP_WATCHLIST", "AAPL,MSFT,NVDA,TSLA,AMD,GOOG,AMZN,META,SPY,QQQ").split(",")
    if s.strip()
]
SCAN_INTERVAL_SEC: Final[float] = float(_env("MCP_SCAN_INTERVAL", "30"))
ENGINE_URL: Final[str] = _env("MCP_ENGINE_URL", "http://mcp-engine:8000")
RH_MCP_URL: Final[str] = _env("MCP_RH_GATEWAY_URL", "https://agent.robinhood.com/mcp/trading")
API_KEY: Final[str] = _env("MCP_API_KEY", "")
DATA_DIR: Final[str] = _env("MCP_DATA_DIR", "./data")
MAX_CONCURRENT_SCANS: Final[int] = int(_env("MCP_MAX_CONCURRENT_SCANS", "5"))
TRAILING_STOP_PCT: Final[float] = float(_env("MCP_TRAILING_STOP_PCT", "0.003"))
POSITION_CHECK_INTERVAL: Final[float] = float(_env("MCP_POSITION_CHECK_SEC", "10"))

# Safety gates. Defaults are intentionally non-live.
TRADING_MODE: Final[str] = _env("MCP_TRADING_MODE", "paper").strip().lower()
LIVE_TRADING_ENABLED: Final[bool] = _env("MCP_LIVE_TRADING_ENABLED", "false").strip().lower() == "true"
MANUAL_APPROVAL_TOKEN: Final[str] = _env("MCP_MANUAL_APPROVAL_TOKEN", "")
LIVE_APPROVAL_TOKEN: Final[str] = _env("MCP_LIVE_APPROVAL_TOKEN", "")
REQUIRE_AUTH_FOR_LIVE: Final[bool] = _env("MCP_REQUIRE_AUTH_FOR_LIVE", "true").strip().lower() == "true"

os.makedirs(DATA_DIR, exist_ok=True)


def live_trade_allowed() -> bool:
    """Return True only when every live-trading gate is explicitly open."""
    if TRADING_MODE != "live":
        return False
    if not LIVE_TRADING_ENABLED:
        return False
    if REQUIRE_AUTH_FOR_LIVE and not API_KEY:
        return False
    if not MANUAL_APPROVAL_TOKEN or MANUAL_APPROVAL_TOKEN != LIVE_APPROVAL_TOKEN:
        return False
    return True


@dataclass
class PriceBuffer:
    symbol: str
    prices: List[float] = field(default_factory=list)
    volumes: List[float] = field(default_factory=list)
    max_len: int = 100
    last_update: float = 0.0

    def append(self, price: float, volume: float) -> None:
        if price <= 0:
            return
        self.prices.append(float(price))
        self.volumes.append(float(volume))
        if len(self.prices) > self.max_len:
            self.prices = self.prices[-self.max_len:]
            self.volumes = self.volumes[-self.max_len:]
        self.last_update = time.time()

    @property
    def has_enough_data(self) -> bool:
        return len(self.prices) >= 35

    def compute_rsi(self, period: int = 14) -> float:
        if len(self.prices) < period + 1:
            return 50.0
        changes = [self.prices[i] - self.prices[i - 1] for i in range(len(self.prices) - period, len(self.prices))]
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


class AuditAgent:
    def __init__(self) -> None:
        self._path = os.path.join(DATA_DIR, "orchestrator_audit.jsonl")

    def log(self, event: str, data: Dict[str, Any]) -> None:
        entry = {"ts": time.time(), "event": event, **data}
        try:
            with open(self._path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, sort_keys=True, default=str) + "\n")
        except OSError:
            logger.exception("Audit write failed")


class MarketDataAgent:
    def __init__(self) -> None:
        self._client: Any = None

    async def start(self) -> None:
        import httpx
        self._client = httpx.AsyncClient(http2=True, timeout=5.0)
        logger.info("MarketDataAgent started")

    async def stop(self) -> None:
        if self._client:
            await self._client.aclose()

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json", "X-MCP-Protocol-Version": "2026-04-27"}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
        return headers

    async def fetch_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "id": f"quote-{symbol}-{int(time.time())}",
            "params": {"name": "get_stock_quote", "arguments": {"symbol": symbol}},
        }
        try:
            res = await self._client.post(RH_MCP_URL, json=payload, headers=self._headers())
            data = res.json()
            if "result" in data:
                return data["result"]
            logger.warning("Quote error for %s: %s", symbol, data.get("error", "unknown"))
        except Exception as exc:
            logger.warning("Failed to fetch quote for %s: %s", symbol, exc)
        return None

    async def fetch_orderbook(self, symbol: str) -> Optional[Dict[str, Any]]:
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "id": f"book-{symbol}-{int(time.time())}",
            "params": {"name": "get_order_book", "arguments": {"symbol": symbol}},
        }
        try:
            res = await self._client.post(RH_MCP_URL, json=payload, headers=self._headers())
            data = res.json()
            return data.get("result")
        except Exception as exc:
            logger.warning("Failed to fetch orderbook for %s: %s", symbol, exc)
            return None


class ScannerAgent:
    def __init__(self) -> None:
        self._client: Any = None

    async def start(self) -> None:
        import httpx
        self._client = httpx.AsyncClient(timeout=5.0)
        logger.info("ScannerAgent started — engine=%s mode=%s live_allowed=%s", ENGINE_URL, TRADING_MODE, live_trade_allowed())

    async def stop(self) -> None:
        if self._client:
            await self._client.aclose()

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
        return headers

    async def scan(self, symbol: str, rsi: float, imbalance: float, prices: List[float], volumes: List[float], current_price: float, bids: List[List[float]], asks: List[List[float]]) -> Optional[Dict[str, Any]]:
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
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
                    "orderbook_bids": bids,
                    "orderbook_asks": asks,
                },
            },
        }
        try:
            res = await self._client.post(f"{ENGINE_URL}/tools/call", json=payload, headers=self._headers())
            data = res.json()
            return data.get("result")
        except Exception as exc:
            logger.warning("Scan failed for %s: %s", symbol, exc)
            return None

    async def execute_trade(self, symbol: str, rsi: float, bids: List[List[float]], asks: List[List[float]], prices: List[float], volumes: List[float]) -> Optional[Dict[str, Any]]:
        if not live_trade_allowed():
            return {
                "status": "PAPER_ONLY",
                "reason": "Live trading is disabled by safety gates",
                "mode": TRADING_MODE,
                "live_enabled": LIVE_TRADING_ENABLED,
                "auth_present": bool(API_KEY),
            }
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "id": f"trade-{symbol}-{int(time.time())}",
            "params": {
                "name": "analyze_and_trade",
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
        try:
            res = await self._client.post(f"{ENGINE_URL}/tools/call", json=payload, headers=self._headers())
            data = res.json()
            return data.get("result") or data.get("error")
        except Exception as exc:
            logger.error("Trade execution failed for %s: %s", symbol, exc)
            return None


class PositionMonitorAgent:
    def __init__(self) -> None:
        self._positions: Dict[str, TrackedPosition] = {}

    async def start(self) -> None:
        logger.info("PositionMonitorAgent started")

    async def stop(self) -> None:
        return None

    def track(self, symbol: str, side: str, entry: float, stop: float, tp: float) -> None:
        self._positions[symbol.upper()] = TrackedPosition(symbol.upper(), side, entry, stop, tp, entry, time.time())
        logger.info("Tracking %s %s @ %.2f (stop=%.2f, tp=%.2f)", side, symbol, entry, stop, tp)

    def check_exit(self, symbol: str, current_price: float) -> Optional[str]:
        pos = self._positions.get(symbol.upper())
        if not pos:
            return None
        if pos.side == "buy":
            if current_price > pos.high_water:
                pos.high_water = current_price
                pos.stop_loss = max(pos.stop_loss, current_price * (1.0 - TRAILING_STOP_PCT))
            if current_price <= pos.stop_loss:
                return f"STOP_HIT at {current_price:.2f}"
            if current_price >= pos.take_profit:
                return f"TAKE_PROFIT at {current_price:.2f}"
        if pos.side == "sell":
            if current_price < pos.high_water:
                pos.high_water = current_price
                pos.stop_loss = min(pos.stop_loss, current_price * (1.0 + TRAILING_STOP_PCT))
            if current_price >= pos.stop_loss:
                return f"STOP_HIT at {current_price:.2f}"
            if current_price <= pos.take_profit:
                return f"TAKE_PROFIT at {current_price:.2f}"
        return None

    def close_position(self, symbol: str) -> Optional[TrackedPosition]:
        return self._positions.pop(symbol.upper(), None)

    @property
    def open_count(self) -> int:
        return len(self._positions)

    @property
    def all_symbols(self) -> List[str]:
        return list(self._positions.keys())


class TradingOrchestrator:
    def __init__(self) -> None:
        self.market_data = MarketDataAgent()
        self.scanner = ScannerAgent()
        self.monitor = PositionMonitorAgent()
        self.audit = AuditAgent()
        self.buffers: Dict[str, PriceBuffer] = {sym: PriceBuffer(symbol=sym) for sym in WATCHLIST}
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
            "trading_mode": TRADING_MODE,
            "live_trade_allowed": live_trade_allowed(),
        })

    async def stop(self) -> None:
        self._running = False
        await self.market_data.stop()
        await self.scanner.stop()
        await self.monitor.stop()
        self.audit.log("orchestrator_stopped", {"scans": self._scan_count, "trades": self._trade_count})

    async def run_forever(self) -> None:
        await self.start()
        loop = asyncio.get_event_loop()
        stop_event = asyncio.Event()

        def _handle_signal() -> None:
            logger.info("Shutdown signal received")
            stop_event.set()

        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, _handle_signal)
            except NotImplementedError:
                pass

        try:
            while not stop_event.is_set():
                cycle_start = time.time()
                await self._fetch_all_quotes()
                await self._check_exits()
                await self._scan_opportunities()
                self._scan_count += 1
                wait_time = max(0, SCAN_INTERVAL_SEC - (time.time() - cycle_start))
                if wait_time > 0:
                    try:
                        await asyncio.wait_for(stop_event.wait(), timeout=wait_time)
                    except asyncio.TimeoutError:
                        pass
        finally:
            await self.stop()

    async def _fetch_all_quotes(self) -> None:
        sem = asyncio.Semaphore(MAX_CONCURRENT_SCANS)

        async def _fetch_one(symbol: str) -> None:
            async with sem:
                quote = await self.market_data.fetch_quote(symbol)
                if quote and "last_trade_price" in quote:
                    self.buffers[symbol].append(float(quote["last_trade_price"]), float(quote.get("volume", 0)))

        await asyncio.gather(*[_fetch_one(sym) for sym in WATCHLIST], return_exceptions=True)

    async def _check_exits(self) -> None:
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
                        "mode": TRADING_MODE,
                    })

    async def _scan_opportunities(self) -> None:
        sem = asyncio.Semaphore(MAX_CONCURRENT_SCANS)

        async def _scan_one(symbol: str) -> None:
            async with sem:
                buf = self.buffers[symbol]
                if not buf.prices or symbol in self.monitor.all_symbols:
                    return
                current_price = buf.prices[-1]
                rsi = buf.compute_rsi()
                book = await self.market_data.fetch_orderbook(symbol)
                if not book:
                    return
                bids = book.get("bids", [])
                asks = book.get("asks", [])
                if not bids or not asks:
                    return
                bid_vol = sum(float(b[1]) for b in bids if isinstance(b, list) and len(b) >= 2)
                ask_vol = sum(float(a[1]) for a in asks if isinstance(a, list) and len(a) >= 2)
                total_vol = bid_vol + ask_vol
                imbalance = (bid_vol - ask_vol) / total_vol if total_vol > 0 else 0.0
                scan_result = await self.scanner.scan(symbol, rsi, imbalance, buf.prices, buf.volumes, current_price, bids, asks)
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
                    "mode": TRADING_MODE,
                })
                if verdict in ("BUY", "STRONG_BUY"):
                    trade_result = await self.scanner.execute_trade(symbol, rsi, bids, asks, buf.prices, buf.volumes)
                    if not trade_result:
                        return
                    if trade_result.get("status") == "EXECUTED":
                        trade_info = trade_result.get("trade", {})
                        entry = float(trade_info.get("entry", current_price))
                        stop = float(trade_info.get("stop_loss", 0))
                        tp = float(trade_info.get("take_profit", 0))
                        self.monitor.track(symbol, "buy", entry, stop, tp)
                        self._trade_count += 1
                        self.audit.log("trade_executed", {"symbol": symbol, "entry": entry, "stop": stop, "take_profit": tp, "score": score})
                    else:
                        self.audit.log("trade_blocked_or_rejected", {"symbol": symbol, "result": trade_result})

        await asyncio.gather(*[_scan_one(sym) for sym in WATCHLIST], return_exceptions=True)


async def main() -> None:
    orchestrator = TradingOrchestrator()
    await orchestrator.run_forever()


if __name__ == "__main__":
    asyncio.run(main())
