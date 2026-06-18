"""
Paper Trading Simulator — Live Market Data + 11-Strategy Engine.

Fetches real-time market data via Finnhub WebSocket (~50ms latency) with
Yahoo Finance fallback, runs all 11 proven strategies with regime-adaptive
weighting, and simulates paper trades starting from $100.

Goal: Demonstrate time to reach $1000 (10x return).

Architecture:
- Market data: Finnhub WebSocket (primary, ~50ms) → REST (secondary) → Yahoo (fallback)
- Strategy engine: MasterSignalCombiner (11 strategies, regime-adaptive)
- Risk management: 2% max risk/trade, trailing stops, daily drawdown limit
- Execution: Paper fills at market price + realistic spread simulation
- Audit: NDJSON append-only log at ./data/paper_trading_audit.jsonl
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import signal
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Final, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("paper_trader")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
)

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
STARTING_CAPITAL: Final[float] = float(os.environ.get("PT_STARTING_CAPITAL", "100.0"))
TARGET_CAPITAL: Final[float] = float(os.environ.get("PT_TARGET_CAPITAL", "1000.0"))
WATCHLIST: Final[List[str]] = [
    s.strip().upper()
    for s in os.environ.get(
        "PT_WATCHLIST", "AAPL,MSFT,NVDA,TSLA,AMD,GOOG,AMZN,META,SPY,QQQ"
    ).split(",")
    if s.strip()
]
SCAN_INTERVAL_SEC: Final[float] = float(os.environ.get("PT_SCAN_INTERVAL", "60"))
MAX_POSITIONS: Final[int] = int(os.environ.get("PT_MAX_POSITIONS", "5"))
MAX_RISK_PER_TRADE: Final[float] = float(os.environ.get("PT_MAX_RISK_PCT", "0.02"))
STOP_LOSS_PCT: Final[float] = float(os.environ.get("PT_STOP_LOSS_PCT", "0.005"))
TAKE_PROFIT_PCT: Final[float] = float(os.environ.get("PT_TAKE_PROFIT_PCT", "0.035"))
TRAILING_STOP_PCT: Final[float] = float(os.environ.get("PT_TRAILING_STOP_PCT", "0.003"))
DAILY_DRAWDOWN_LIMIT: Final[float] = float(os.environ.get("PT_DAILY_DD_LIMIT", "0.06"))
# Lower conviction threshold for paper trading — more aggressive to test strategy edge
MIN_CONVICTION: Final[float] = float(os.environ.get("PT_MIN_CONVICTION", "0.20"))
SPREAD_BPS: Final[float] = float(os.environ.get("PT_SPREAD_BPS", "5.0"))  # simulated spread
DATA_DIR: Final[str] = os.environ.get("PT_DATA_DIR", "./data")

os.makedirs(DATA_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# DATA CLASSES
# ---------------------------------------------------------------------------
@dataclass
class PaperPosition:
    symbol: str
    side: str  # "long" or "short"
    entry_price: float
    shares: float
    stop_loss: float
    take_profit: float
    high_water: float
    opened_at: float
    strategy_signals: Dict[str, float] = field(default_factory=dict)
    regime: str = "unknown"

    @property
    def notional(self) -> float:
        return self.entry_price * self.shares


@dataclass
class TradeRecord:
    symbol: str
    side: str
    entry_price: float
    exit_price: float
    shares: float
    pnl: float
    pnl_pct: float
    hold_time_sec: float
    exit_reason: str
    regime: str
    strategy_signals: Dict[str, float]
    timestamp: float


@dataclass
class DailyStats:
    date: str
    starting_balance: float
    ending_balance: float
    trades: int
    wins: int
    losses: int
    total_pnl: float
    max_drawdown: float
    regime_transitions: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# MARKET DATA FETCHER
# ---------------------------------------------------------------------------
class MarketDataFetcher:
    """Fetches live market data via yfinance."""

    def __init__(self) -> None:
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._last_fetch: Dict[str, float] = {}
        self._price_history: Dict[str, List[float]] = {sym: [] for sym in WATCHLIST}
        self._volume_history: Dict[str, List[float]] = {sym: [] for sym in WATCHLIST}
        self._high_history: Dict[str, List[float]] = {sym: [] for sym in WATCHLIST}
        self._low_history: Dict[str, List[float]] = {sym: [] for sym in WATCHLIST}

    def fetch_live_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch latest price data for a symbol.
        
        Uses two timeframes combined:
        - 1y daily for deep history (200+ bars for RSI-2 Connors)
        - 5d 5m for intraday granularity and current price
        """
        import yfinance as yf

        try:
            ticker = yf.Ticker(symbol)
            
            # First, get deep daily history for RSI-2 (needs 200+ bars)
            if not self._price_history.get(symbol) or len(self._price_history[symbol]) < 200:
                daily = ticker.history(period="1y", interval="1d")
                if not daily.empty and len(daily) >= 50:
                    self._price_history[symbol] = [float(c) for c in daily["Close"].dropna().tolist()[-250:]]
                    self._volume_history[symbol] = [float(v) for v in daily["Volume"].dropna().tolist()[-250:]]
                    self._high_history[symbol] = [float(h) for h in daily["High"].dropna().tolist()[-250:]]
                    self._low_history[symbol] = [float(l) for l in daily["Low"].dropna().tolist()[-250:]]

            # Then get intraday for latest price
            hist = ticker.history(period="5d", interval="5m")
            if hist.empty:
                hist = ticker.history(period="1mo", interval="1d")
            if hist.empty:
                logger.warning("No data for %s", symbol)
                return None

            latest = hist.iloc[-1]
            close = float(latest["Close"])
            volume = float(latest["Volume"])
            high = float(latest["High"])
            low = float(latest["Low"])
            open_price = float(latest["Open"])

            # Update the latest price in history (append intraday close)
            if self._price_history[symbol] and abs(close - self._price_history[symbol][-1]) > 0.001:
                self._price_history[symbol].append(close)
                self._volume_history[symbol].append(volume)
                self._high_history[symbol].append(high)
                self._low_history[symbol].append(low)
                # Trim to 300 max
                if len(self._price_history[symbol]) > 300:
                    self._price_history[symbol] = self._price_history[symbol][-300:]
                    self._volume_history[symbol] = self._volume_history[symbol][-300:]
                    self._high_history[symbol] = self._high_history[symbol][-300:]
                    self._low_history[symbol] = self._low_history[symbol][-300:]

            self._cache[symbol] = {
                "price": close,
                "volume": volume,
                "high": high,
                "low": low,
                "open": open_price,
                "timestamp": time.time(),
            }
            self._last_fetch[symbol] = time.time()

            return self._cache[symbol]

        except Exception as exc:
            logger.warning("Failed to fetch data for %s: %s", symbol, exc)
            return None

    def get_price_history(self, symbol: str) -> List[float]:
        return self._price_history.get(symbol, [])

    def get_volume_history(self, symbol: str) -> List[float]:
        return self._volume_history.get(symbol, [])

    def get_high_history(self, symbol: str) -> List[float]:
        return self._high_history.get(symbol, [])

    def get_low_history(self, symbol: str) -> List[float]:
        return self._low_history.get(symbol, [])

    def get_current_price(self, symbol: str) -> Optional[float]:
        cached = self._cache.get(symbol)
        if cached and time.time() - cached["timestamp"] < 120:
            return cached["price"]
        data = self.fetch_live_data(symbol)
        return data["price"] if data else None


# ---------------------------------------------------------------------------
# PAPER TRADING ENGINE
# ---------------------------------------------------------------------------
class PaperTradingEngine:
    """Simulates trades with realistic fills and tracks P&L."""

    def __init__(self, starting_capital: float = STARTING_CAPITAL) -> None:
        self.balance = starting_capital
        self.starting_capital = starting_capital
        self.peak_balance = starting_capital
        self.positions: Dict[str, PaperPosition] = {}
        self.trade_history: List[TradeRecord] = []
        self.daily_pnl = 0.0
        self.daily_trades = 0
        self.day_start_balance = starting_capital
        self.current_day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.strategy_pnl: Dict[str, float] = {}
        self.regime_history: List[Tuple[float, str]] = []
        self._start_time = time.time()

    @property
    def total_pnl(self) -> float:
        return self.balance - self.starting_capital

    @property
    def total_pnl_pct(self) -> float:
        return (self.balance / self.starting_capital - 1.0) * 100.0

    @property
    def win_rate(self) -> float:
        if self.total_trades == 0:
            return 0.0
        return self.winning_trades / self.total_trades * 100.0

    @property
    def unrealized_pnl(self) -> float:
        # This would need current prices - computed during scan cycle
        return 0.0

    @property
    def elapsed_hours(self) -> float:
        return (time.time() - self._start_time) / 3600.0

    def _apply_spread(self, price: float, side: str) -> float:
        """Simulate bid-ask spread for realistic fills."""
        spread = price * (SPREAD_BPS / 10000.0)
        if side == "long":
            return price + spread / 2  # buy at ask
        return price - spread / 2  # sell at bid

    def _position_size(self, price: float, stop_distance: float) -> float:
        """Kelly-inspired position sizing capped at MAX_RISK_PER_TRADE."""
        risk_amount = self.balance * MAX_RISK_PER_TRADE
        if stop_distance <= 0:
            stop_distance = price * STOP_LOSS_PCT
        shares = risk_amount / stop_distance
        # Cap at available balance
        max_shares = self.balance * 0.95 / price  # leave 5% buffer
        return min(shares, max_shares)

    def _check_daily_reset(self) -> None:
        """Reset daily stats if new trading day."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if today != self.current_day:
            logger.info(
                "Daily reset: day=%s pnl=%.2f trades=%d",
                self.current_day,
                self.daily_pnl,
                self.daily_trades,
            )
            self.current_day = today
            self.day_start_balance = self.balance
            self.daily_pnl = 0.0
            self.daily_trades = 0

    def _check_daily_drawdown(self) -> bool:
        """Return True if daily drawdown limit is breached.
        
        Uses equity (cash + position value) not just cash balance,
        since cash drops when positions are opened but that's not a loss.
        """
        if self.day_start_balance <= 0:
            return True
        # Equity = cash + sum of position notional values
        equity = self.balance + sum(p.entry_price * p.shares for p in self.positions.values())
        dd = (self.day_start_balance - equity) / self.day_start_balance
        return dd >= DAILY_DRAWDOWN_LIMIT

    def open_position(
        self,
        symbol: str,
        price: float,
        side: str,
        conviction: float,
        strategy_signals: Dict[str, float],
        regime: str,
    ) -> Optional[PaperPosition]:
        """Open a paper position with risk management."""
        self._check_daily_reset()

        # Safety checks
        if self._check_daily_drawdown():
            logger.warning("Daily drawdown limit hit — no new positions")
            return None
        if len(self.positions) >= MAX_POSITIONS:
            logger.info("Max positions reached (%d)", MAX_POSITIONS)
            return None
        if symbol in self.positions:
            logger.info("Already in position for %s", symbol)
            return None
        if conviction < MIN_CONVICTION:
            return None

        # Calculate entry with spread
        entry_price = self._apply_spread(price, side)

        # Calculate stops
        if side == "long":
            stop_loss = entry_price * (1.0 - STOP_LOSS_PCT)
            take_profit = entry_price * (1.0 + TAKE_PROFIT_PCT)
        else:
            stop_loss = entry_price * (1.0 + STOP_LOSS_PCT)
            take_profit = entry_price * (1.0 - TAKE_PROFIT_PCT)

        stop_distance = abs(entry_price - stop_loss)
        shares = self._position_size(entry_price, stop_distance)

        if shares * entry_price < 1.0:
            logger.info("Position too small for %s (balance=%.2f)", symbol, self.balance)
            return None

        # Execute paper fill
        cost = shares * entry_price
        self.balance -= cost

        position = PaperPosition(
            symbol=symbol,
            side=side,
            entry_price=entry_price,
            shares=shares,
            stop_loss=stop_loss,
            take_profit=take_profit,
            high_water=entry_price,
            opened_at=time.time(),
            strategy_signals=strategy_signals,
            regime=regime,
        )
        self.positions[symbol] = position
        logger.info(
            "OPENED %s %s: %.4f shares @ $%.2f (stop=$%.2f, tp=$%.2f, cost=$%.2f)",
            side.upper(),
            symbol,
            shares,
            entry_price,
            stop_loss,
            take_profit,
            cost,
        )
        return position

    def check_exits(self, current_prices: Dict[str, float]) -> List[TradeRecord]:
        """Check all positions for stop/take-profit/trailing stop exits."""
        closed_trades: List[TradeRecord] = []

        for symbol in list(self.positions.keys()):
            price = current_prices.get(symbol)
            if price is None:
                continue

            pos = self.positions[symbol]
            exit_reason = None
            exit_price = price

            if pos.side == "long":
                # Update high water mark & trailing stop
                if price > pos.high_water:
                    pos.high_water = price
                    new_stop = price * (1.0 - TRAILING_STOP_PCT)
                    if new_stop > pos.stop_loss:
                        pos.stop_loss = new_stop

                if price <= pos.stop_loss:
                    exit_reason = "STOP_LOSS"
                    exit_price = self._apply_spread(price, "short")  # sell at bid
                elif price >= pos.take_profit:
                    exit_reason = "TAKE_PROFIT"
                    exit_price = self._apply_spread(price, "short")
            else:  # short
                if price < pos.high_water:
                    pos.high_water = price
                    new_stop = price * (1.0 + TRAILING_STOP_PCT)
                    if new_stop < pos.stop_loss:
                        pos.stop_loss = new_stop

                if price >= pos.stop_loss:
                    exit_reason = "STOP_LOSS"
                    exit_price = self._apply_spread(price, "long")  # buy to cover
                elif price <= pos.take_profit:
                    exit_reason = "TAKE_PROFIT"
                    exit_price = self._apply_spread(price, "long")

            if exit_reason:
                trade = self._close_position(symbol, exit_price, exit_reason)
                if trade:
                    closed_trades.append(trade)

        return closed_trades

    def _close_position(
        self, symbol: str, exit_price: float, reason: str
    ) -> Optional[TradeRecord]:
        """Close a position and record the trade."""
        pos = self.positions.pop(symbol, None)
        if not pos:
            return None

        # Calculate P&L
        if pos.side == "long":
            pnl = (exit_price - pos.entry_price) * pos.shares
        else:
            pnl = (pos.entry_price - exit_price) * pos.shares

        pnl_pct = pnl / (pos.entry_price * pos.shares) * 100.0

        # Update balance
        if pos.side == "long":
            proceeds = pos.shares * exit_price
        else:
            # Short: return reserved margin + realized P&L
            proceeds = pos.shares * pos.entry_price + pnl
        self.balance += proceeds

        # Update peak
        if self.balance > self.peak_balance:
            self.peak_balance = self.balance

        # Update stats
        self.total_trades += 1
        self.daily_trades += 1
        self.daily_pnl += pnl
        if pnl > 0:
            self.winning_trades += 1
        else:
            self.losing_trades += 1

        # Track per-strategy P&L attribution
        for strategy, signal_val in pos.strategy_signals.items():
            if strategy not in self.strategy_pnl:
                self.strategy_pnl[strategy] = 0.0
            self.strategy_pnl[strategy] += pnl * abs(signal_val)

        hold_time = time.time() - pos.opened_at
        trade = TradeRecord(
            symbol=symbol,
            side=pos.side,
            entry_price=pos.entry_price,
            exit_price=exit_price,
            shares=pos.shares,
            pnl=pnl,
            pnl_pct=pnl_pct,
            hold_time_sec=hold_time,
            exit_reason=reason,
            regime=pos.regime,
            strategy_signals=pos.strategy_signals,
            timestamp=time.time(),
        )
        self.trade_history.append(trade)

        logger.info(
            "CLOSED %s %s: entry=$%.2f exit=$%.2f pnl=$%.4f (%.2f%%) reason=%s balance=$%.2f",
            pos.side.upper(),
            symbol,
            pos.entry_price,
            exit_price,
            pnl,
            pnl_pct,
            reason,
            self.balance,
        )
        return trade

    def get_status(self) -> Dict[str, Any]:
        """Return current trading status."""
        return {
            "balance": round(self.balance, 4),
            "starting_capital": self.starting_capital,
            "target": TARGET_CAPITAL,
            "total_pnl": round(self.total_pnl, 4),
            "total_pnl_pct": round(self.total_pnl_pct, 2),
            "progress_to_target": round(
                (self.balance - self.starting_capital)
                / (TARGET_CAPITAL - self.starting_capital)
                * 100,
                2,
            ),
            "peak_balance": round(self.peak_balance, 4),
            "open_positions": len(self.positions),
            "total_trades": self.total_trades,
            "win_rate": round(self.win_rate, 1),
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "daily_pnl": round(self.daily_pnl, 4),
            "elapsed_hours": round(self.elapsed_hours, 2),
            "positions": {
                sym: {
                    "side": p.side,
                    "entry": p.entry_price,
                    "shares": p.shares,
                    "stop": p.stop_loss,
                    "tp": p.take_profit,
                }
                for sym, p in self.positions.items()
            },
            "strategy_pnl": {k: round(v, 4) for k, v in self.strategy_pnl.items()},
        }


# ---------------------------------------------------------------------------
# AUDIT LOGGER
# ---------------------------------------------------------------------------
class AuditLogger:
    def __init__(self) -> None:
        self._path = os.path.join(DATA_DIR, "paper_trading_audit.jsonl")

    def log(self, event: str, data: Dict[str, Any]) -> None:
        entry = {
            "ts": time.time(),
            "iso": datetime.now(timezone.utc).isoformat(),
            "event": event,
            **data,
        }
        try:
            with open(self._path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, sort_keys=True, default=str) + "\n")
        except OSError:
            logger.exception("Audit write failed")


# ---------------------------------------------------------------------------
# PAPER TRADING ORCHESTRATOR
# ---------------------------------------------------------------------------
class PaperTradingOrchestrator:
    """Main orchestrator — fetches data, runs strategies, executes paper trades."""

    def __init__(self) -> None:
        # Use Finnhub real-time feed if API key is available, else Yahoo fallback
        finnhub_key = os.environ.get("FINNHUB_API_KEY", "")
        if finnhub_key:
            from runtime.finnhub_feed import FinnhubRealtimeFeed
            self.market_data = FinnhubRealtimeFeed(symbols=WATCHLIST, api_key=finnhub_key)
            self._using_finnhub = True
            logger.info("Using Finnhub real-time WebSocket feed (~50ms latency)")
        else:
            self.market_data = MarketDataFetcher()
            self._using_finnhub = False
            logger.info("Using Yahoo Finance feed (no FINNHUB_API_KEY set)")

        self.engine = PaperTradingEngine()
        self.audit = AuditLogger()
        self._running = False
        self._scan_count = 0
        self._last_regime = "unknown"

    async def start(self) -> None:
        self._running = True

        # Start Finnhub WebSocket feed if available
        if self._using_finnhub:
            self.market_data.start()

        self.audit.log("paper_trader_started", {
            "starting_capital": STARTING_CAPITAL,
            "target_capital": TARGET_CAPITAL,
            "watchlist": WATCHLIST,
            "scan_interval": SCAN_INTERVAL_SEC,
            "max_positions": MAX_POSITIONS,
            "max_risk_per_trade": MAX_RISK_PER_TRADE,
            "stop_loss_pct": STOP_LOSS_PCT,
            "take_profit_pct": TAKE_PROFIT_PCT,
            "trailing_stop_pct": TRAILING_STOP_PCT,
            "min_conviction": MIN_CONVICTION,
            "data_source": "finnhub_ws" if self._using_finnhub else "yahoo",
        })
        logger.info(
            "Paper Trading Started — $%.2f → $%.2f target | %d symbols | %ds interval | source=%s",
            STARTING_CAPITAL,
            TARGET_CAPITAL,
            len(WATCHLIST),
            int(SCAN_INTERVAL_SEC),
            "finnhub_ws" if self._using_finnhub else "yahoo",
        )

    async def stop(self) -> None:
        self._running = False

        # Stop Finnhub feed
        if self._using_finnhub:
            self.market_data.stop()

        status = self.engine.get_status()
        self.audit.log("paper_trader_stopped", status)
        logger.info("Paper Trading Stopped — Final balance: $%.2f (P&L: $%.2f)", self.engine.balance, self.engine.total_pnl)

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
                await self._run_scan_cycle()
                self._scan_count += 1

                # Check if target reached
                if self.engine.balance >= TARGET_CAPITAL:
                    logger.info(
                        "🎯 TARGET REACHED! $%.2f → $%.2f in %.1f hours (%d trades)",
                        STARTING_CAPITAL,
                        self.engine.balance,
                        self.engine.elapsed_hours,
                        self.engine.total_trades,
                    )
                    self.audit.log("target_reached", self.engine.get_status())
                    break

                # Status update every 10 scans
                if self._scan_count % 10 == 0:
                    self._log_status()

                wait_time = max(0, SCAN_INTERVAL_SEC - (time.time() - cycle_start))
                if wait_time > 0:
                    try:
                        await asyncio.wait_for(stop_event.wait(), timeout=wait_time)
                    except asyncio.TimeoutError:
                        pass
        finally:
            await self.stop()

    async def _run_scan_cycle(self) -> None:
        """One full scan cycle: fetch data → run strategies → manage positions."""
        from runtime.proven_strategies import MasterSignalCombiner

        # Reset Finnhub per-scan window for fresh OHLCV aggregation
        if self._using_finnhub and hasattr(self.market_data, "reset_window"):
            self.market_data.reset_window()

        # Fetch current prices for all watched symbols
        current_prices: Dict[str, float] = {}
        for symbol in WATCHLIST:
            data = self.market_data.fetch_live_data(symbol)
            if data:
                current_prices[symbol] = data["price"]

        if not current_prices:
            logger.warning("No market data available this cycle")
            return

        # Check exits on existing positions
        closed_trades = self.engine.check_exits(current_prices)
        for trade in closed_trades:
            self.audit.log("trade_closed", {
                "symbol": trade.symbol,
                "side": trade.side,
                "entry": trade.entry_price,
                "exit": trade.exit_price,
                "pnl": trade.pnl,
                "pnl_pct": trade.pnl_pct,
                "reason": trade.exit_reason,
                "regime": trade.regime,
                "hold_time_sec": trade.hold_time_sec,
                "balance": self.engine.balance,
            })

        # Scan for new opportunities
        for symbol in WATCHLIST:
            if symbol in self.engine.positions:
                continue
            price = current_prices.get(symbol)
            if not price:
                continue

            prices = self.market_data.get_price_history(symbol)
            volumes = self.market_data.get_volume_history(symbol)
            highs = self.market_data.get_high_history(symbol)
            lows = self.market_data.get_low_history(symbol)

            if len(prices) < 20:
                continue

            # Determine weekday for Turnaround Tuesday
            weekday = datetime.now(timezone.utc).weekday()

            try:
                combined = MasterSignalCombiner.combine(
                    prices=prices,
                    highs=highs if highs else None,
                    lows=lows if lows else None,
                    volumes=volumes if volumes else None,
                    bids=None,  # No orderbook in paper mode
                    asks=None,
                    weekday=weekday,
                )
            except Exception as exc:
                logger.warning("Strategy error for %s: %s", symbol, exc)
                continue

            # Track regime changes
            if combined.regime.value != self._last_regime:
                self._last_regime = combined.regime.value
                self.engine.regime_history.append((time.time(), combined.regime.value))
                self.audit.log("regime_change", {
                    "new_regime": combined.regime.value,
                    "confidence": combined.regime_confidence,
                })

            # Determine trade direction using raw composite score
            # (bypasses combiner's internal 0.40 threshold for more active trading)
            raw_score = combined.composite_score
            raw_conviction = abs(raw_score)

            if raw_conviction >= MIN_CONVICTION:
                side = "long" if raw_score > 0 else "short"

                # Only take shorts if conviction is higher (harder to profit)
                if side == "short" and raw_conviction < 0.30:
                    continue

                position = self.engine.open_position(
                    symbol=symbol,
                    price=price,
                    side=side,
                    conviction=raw_conviction,
                    strategy_signals=combined.strategy_signals,
                    regime=combined.regime.value,
                )
                if position:
                    self.audit.log("trade_opened", {
                        "symbol": symbol,
                        "side": side,
                        "entry": position.entry_price,
                        "shares": position.shares,
                        "stop": position.stop_loss,
                        "tp": position.take_profit,
                        "conviction": raw_conviction,
                        "composite_score": combined.composite_score,
                        "regime": combined.regime.value,
                        "strategy_signals": combined.strategy_signals,
                        "strategy_weights": combined.strategy_weights,
                        "balance": self.engine.balance,
                    })

    def _log_status(self) -> None:
        """Log periodic status update."""
        status = self.engine.get_status()

        # Add feed stats if using Finnhub
        if self._using_finnhub and hasattr(self.market_data, "get_stats"):
            status["feed_stats"] = self.market_data.get_stats()

        self.audit.log("status_update", status)
        source = "finnhub" if self._using_finnhub else "yahoo"
        logger.info(
            "Status: balance=$%.2f | pnl=$%.2f (%.1f%%) | trades=%d (%.0f%% win) | positions=%d | scans=%d | src=%s",
            status["balance"],
            status["total_pnl"],
            status["total_pnl_pct"],
            status["total_trades"],
            status["win_rate"],
            status["open_positions"],
            self._scan_count,
            source,
        )


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------
async def main() -> None:
    orchestrator = PaperTradingOrchestrator()
    await orchestrator.run_forever()


if __name__ == "__main__":
    asyncio.run(main())
