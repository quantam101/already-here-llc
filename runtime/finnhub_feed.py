"""
Finnhub Real-Time WebSocket Feed — Sub-second market data.

Replaces Yahoo Finance's 1-5 minute delayed data with Finnhub's ~50ms
real-time trade stream via WebSocket. Falls back to Yahoo for historical
data (250-bar daily history for RSI-2 Connors etc.).

Free tier: 60 REST calls/min + WebSocket for 50 symbols simultaneously.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional

logger = logging.getLogger("finnhub_feed")

FINNHUB_API_KEY: str = os.environ.get("FINNHUB_API_KEY", "")
FINNHUB_WS_URL: str = "wss://ws.finnhub.io?token={key}"
FINNHUB_REST_URL: str = "https://finnhub.io/api/v1"


class FinnhubRealtimeFeed:
    """Real-time market data via Finnhub WebSocket + REST.

    Architecture:
    - WebSocket: streams real-time trades for all subscribed symbols (~50ms latency)
    - REST: quote endpoint for on-demand price checks (60/min free tier)
    - Yahoo (imported lazily): deep daily history for strategy calculations

    Thread-safe: WebSocket runs in background thread, prices updated atomically.
    """

    def __init__(self, symbols: List[str], api_key: str = "") -> None:
        self._api_key = api_key or FINNHUB_API_KEY
        if not self._api_key:
            logger.warning("No FINNHUB_API_KEY set — falling back to Yahoo Finance only")

        self._symbols = [s.upper() for s in symbols]
        self._lock = threading.Lock()

        # Real-time state (updated by WebSocket)
        self._last_trade_price: Dict[str, float] = {}
        self._last_trade_volume: Dict[str, int] = {}
        self._last_trade_time: Dict[str, float] = {}
        self._trade_count: Dict[str, int] = defaultdict(int)

        # Aggregated OHLCV per scan window (reset each scan)
        self._window_high: Dict[str, float] = {}
        self._window_low: Dict[str, float] = {}
        self._window_open: Dict[str, float] = {}
        self._window_volume: Dict[str, int] = defaultdict(int)

        # Historical data (loaded once from Yahoo, updated incrementally)
        self._price_history: Dict[str, List[float]] = {s: [] for s in self._symbols}
        self._volume_history: Dict[str, List[float]] = {s: [] for s in self._symbols}
        self._high_history: Dict[str, List[float]] = {s: [] for s in self._symbols}
        self._low_history: Dict[str, List[float]] = {s: [] for s in self._symbols}
        self._history_loaded: Dict[str, bool] = {s: False for s in self._symbols}

        # WebSocket state
        self._ws = None
        self._ws_thread: Optional[threading.Thread] = None
        self._ws_connected = False
        self._ws_reconnect_delay = 1.0
        self._running = False

        # Stats
        self._total_trades_received = 0
        self._ws_connect_time: Optional[float] = None

    def start(self) -> None:
        """Start the real-time feed (WebSocket + history load)."""
        self._running = True
        if self._api_key:
            self._ws_thread = threading.Thread(
                target=self._ws_loop, daemon=True, name="finnhub-ws"
            )
            self._ws_thread.start()
            logger.info(
                "Finnhub WebSocket starting for %d symbols", len(self._symbols)
            )
        else:
            logger.info("Running in Yahoo-only mode (no FINNHUB_API_KEY)")

    def stop(self) -> None:
        """Stop the real-time feed."""
        self._running = False
        if self._ws:
            try:
                self._ws.close()
            except Exception:
                pass
        logger.info(
            "Finnhub feed stopped — %d total trades received",
            self._total_trades_received,
        )

    # ------------------------------------------------------------------
    # PUBLIC API (matches MarketDataFetcher interface)
    # ------------------------------------------------------------------

    def fetch_live_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch latest data for a symbol. Uses WebSocket price if available,
        falls back to REST quote, then Yahoo Finance."""
        symbol = symbol.upper()

        # Load historical data if not done yet
        if not self._history_loaded.get(symbol, False):
            self._load_history(symbol)

        # Try WebSocket price first (fastest, <50ms old)
        with self._lock:
            ws_price = self._last_trade_price.get(symbol)
            ws_time = self._last_trade_time.get(symbol, 0)

        if ws_price and (time.time() - ws_time) < 30:
            # Use WebSocket data
            with self._lock:
                high = self._window_high.get(symbol, ws_price)
                low = self._window_low.get(symbol, ws_price)
                open_price = self._window_open.get(symbol, ws_price)
                volume = self._window_volume.get(symbol, 0)

            self._update_history_from_ws(symbol, ws_price, volume, high, low)

            return {
                "price": ws_price,
                "volume": volume,
                "high": high,
                "low": low,
                "open": open_price,
                "timestamp": ws_time,
                "source": "finnhub_ws",
            }

        # Fallback to REST quote
        if self._api_key:
            rest_data = self._rest_quote(symbol)
            if rest_data:
                return rest_data

        # Final fallback: Yahoo Finance
        return self._yahoo_fallback(symbol)

    def get_price_history(self, symbol: str) -> List[float]:
        symbol = symbol.upper()
        if not self._history_loaded.get(symbol, False):
            self._load_history(symbol)
        return self._price_history.get(symbol, [])

    def get_volume_history(self, symbol: str) -> List[float]:
        symbol = symbol.upper()
        if not self._history_loaded.get(symbol, False):
            self._load_history(symbol)
        return self._volume_history.get(symbol, [])

    def get_high_history(self, symbol: str) -> List[float]:
        symbol = symbol.upper()
        if not self._history_loaded.get(symbol, False):
            self._load_history(symbol)
        return self._high_history.get(symbol, [])

    def get_low_history(self, symbol: str) -> List[float]:
        symbol = symbol.upper()
        if not self._history_loaded.get(symbol, False):
            self._load_history(symbol)
        return self._low_history.get(symbol, [])

    def get_current_price(self, symbol: str) -> Optional[float]:
        """Get the most recent price (WebSocket > REST > Yahoo)."""
        symbol = symbol.upper()
        with self._lock:
            ws_price = self._last_trade_price.get(symbol)
            ws_time = self._last_trade_time.get(symbol, 0)

        if ws_price and (time.time() - ws_time) < 30:
            return ws_price

        data = self.fetch_live_data(symbol)
        return data["price"] if data else None

    def reset_window(self) -> None:
        """Reset the per-scan OHLCV window. Call at start of each scan cycle."""
        with self._lock:
            self._window_high.clear()
            self._window_low.clear()
            self._window_open.clear()
            self._window_volume.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Get feed statistics."""
        return {
            "ws_connected": self._ws_connected,
            "total_trades_received": self._total_trades_received,
            "symbols_with_data": len(self._last_trade_price),
            "uptime_sec": (time.time() - self._ws_connect_time)
            if self._ws_connect_time
            else 0,
            "source": "finnhub_ws" if self._ws_connected else "fallback",
        }

    # ------------------------------------------------------------------
    # WebSocket Implementation
    # ------------------------------------------------------------------

    def _ws_loop(self) -> None:
        """Background loop: connect, subscribe, process messages, reconnect."""
        import websocket

        while self._running:
            try:
                url = FINNHUB_WS_URL.format(key=self._api_key)
                self._ws = websocket.WebSocketApp(
                    url,
                    on_message=self._on_ws_message,
                    on_open=self._on_ws_open,
                    on_error=self._on_ws_error,
                    on_close=self._on_ws_close,
                )
                self._ws.run_forever(ping_interval=30, ping_timeout=10)
            except Exception as exc:
                logger.warning("WebSocket error: %s", exc)

            if not self._running:
                break

            # Exponential backoff on reconnect
            logger.info(
                "WebSocket disconnected — reconnecting in %.1fs",
                self._ws_reconnect_delay,
            )
            time.sleep(self._ws_reconnect_delay)
            self._ws_reconnect_delay = min(self._ws_reconnect_delay * 2, 30.0)

    def _on_ws_open(self, ws: Any) -> None:
        """Subscribe to all symbols on connection."""
        self._ws_connected = True
        self._ws_connect_time = time.time()
        self._ws_reconnect_delay = 1.0  # Reset backoff

        for symbol in self._symbols:
            ws.send(json.dumps({"type": "subscribe", "symbol": symbol}))

        logger.info("Finnhub WebSocket connected — subscribed to %d symbols", len(self._symbols))

    def _on_ws_message(self, ws: Any, message: str) -> None:
        """Process incoming trade messages."""
        try:
            data = json.loads(message)
        except json.JSONDecodeError:
            return

        if data.get("type") != "trade":
            return

        trades = data.get("data", [])
        if not trades:
            return

        with self._lock:
            for trade in trades:
                symbol = trade.get("s", "")
                price = trade.get("p", 0.0)
                volume = trade.get("v", 0)
                ts = trade.get("t", 0) / 1000.0  # ms → sec

                if not symbol or not price:
                    continue

                self._last_trade_price[symbol] = price
                self._last_trade_volume[symbol] = volume
                self._last_trade_time[symbol] = ts if ts > 1e9 else time.time()
                self._trade_count[symbol] += 1
                self._total_trades_received += 1

                # Update scan window OHLCV
                if symbol not in self._window_open:
                    self._window_open[symbol] = price
                self._window_high[symbol] = max(
                    self._window_high.get(symbol, price), price
                )
                self._window_low[symbol] = min(
                    self._window_low.get(symbol, price), price
                )
                self._window_volume[symbol] += volume

    def _on_ws_error(self, ws: Any, error: Any) -> None:
        logger.warning("Finnhub WS error: %s", error)
        self._ws_connected = False

    def _on_ws_close(self, ws: Any, close_code: Any = None, close_msg: Any = None) -> None:
        self._ws_connected = False
        logger.info("Finnhub WS closed (code=%s)", close_code)

    # ------------------------------------------------------------------
    # News & Sentiment (free tier: company news endpoint)
    # ------------------------------------------------------------------

    def fetch_news(self, symbol: str, days_back: int = 3) -> List[Dict[str, Any]]:
        """Fetch recent company news for sentiment analysis (free tier).

        Returns list of articles with headline, summary, source, datetime.
        Use with FinBERT sentiment strategy for trade signal enhancement.
        """
        import urllib.request
        from datetime import datetime, timedelta

        if not self._api_key:
            return []

        today = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        url = (
            f"{FINNHUB_REST_URL}/company-news"
            f"?symbol={symbol}&from={start}&to={today}&token={self._api_key}"
        )

        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                articles = json.loads(resp.read().decode())

            if not articles:
                return []

            return [
                {
                    "headline": a.get("headline", ""),
                    "summary": a.get("summary", ""),
                    "source": a.get("source", ""),
                    "datetime": a.get("datetime", 0),
                    "url": a.get("url", ""),
                    "category": a.get("category", ""),
                }
                for a in articles[:20]  # Limit to 20 most recent
            ]
        except Exception as exc:
            logger.debug("News fetch failed for %s: %s", symbol, exc)
            return []

    # ------------------------------------------------------------------
    # REST Fallback
    # ------------------------------------------------------------------

    def _rest_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch quote via Finnhub REST API (60 calls/min free tier)."""
        import urllib.request

        url = f"{FINNHUB_REST_URL}/quote?symbol={symbol}&token={self._api_key}"
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                data = json.loads(resp.read().decode())

            if not data or data.get("c", 0) == 0:
                return None

            price = data["c"]  # current
            high = data["h"]  # high of day
            low = data["l"]  # low of day
            open_price = data["o"]  # open
            prev_close = data["pc"]  # previous close

            self._update_history_from_ws(symbol, price, 0, high, low)

            return {
                "price": price,
                "volume": 0,
                "high": high,
                "low": low,
                "open": open_price,
                "prev_close": prev_close,
                "timestamp": time.time(),
                "source": "finnhub_rest",
            }
        except Exception as exc:
            logger.debug("REST quote failed for %s: %s", symbol, exc)
            return None

    # ------------------------------------------------------------------
    # Yahoo Finance Fallback (for history + when WS is down)
    # ------------------------------------------------------------------

    def _load_history(self, symbol: str) -> None:
        """Load deep daily history from Yahoo Finance (250 bars for RSI-2)."""
        try:
            import yfinance as yf

            ticker = yf.Ticker(symbol)
            daily = ticker.history(period="1y", interval="1d")

            if not daily.empty and len(daily) >= 50:
                self._price_history[symbol] = [
                    float(c) for c in daily["Close"].dropna().tolist()[-250:]
                ]
                self._volume_history[symbol] = [
                    float(v) for v in daily["Volume"].dropna().tolist()[-250:]
                ]
                self._high_history[symbol] = [
                    float(h) for h in daily["High"].dropna().tolist()[-250:]
                ]
                self._low_history[symbol] = [
                    float(l) for l in daily["Low"].dropna().tolist()[-250:]
                ]
                self._history_loaded[symbol] = True
                logger.info(
                    "Loaded %d bars history for %s",
                    len(self._price_history[symbol]),
                    symbol,
                )
        except Exception as exc:
            logger.warning("Failed to load history for %s: %s", symbol, exc)

    def _yahoo_fallback(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fallback to Yahoo Finance for current price."""
        try:
            import yfinance as yf

            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d", interval="5m")
            if hist.empty:
                hist = ticker.history(period="1mo", interval="1d")
            if hist.empty:
                return None

            latest = hist.iloc[-1]
            price = float(latest["Close"])
            volume = float(latest["Volume"])
            high = float(latest["High"])
            low = float(latest["Low"])
            open_price = float(latest["Open"])

            self._update_history_from_ws(symbol, price, volume, high, low)

            return {
                "price": price,
                "volume": volume,
                "high": high,
                "low": low,
                "open": open_price,
                "timestamp": time.time(),
                "source": "yahoo_fallback",
            }
        except Exception as exc:
            logger.warning("Yahoo fallback failed for %s: %s", symbol, exc)
            return None

    # ------------------------------------------------------------------
    # History Management
    # ------------------------------------------------------------------

    def _update_history_from_ws(
        self, symbol: str, price: float, volume: int, high: float, low: float
    ) -> None:
        """Append latest price to history if it differs from last entry."""
        if not self._price_history.get(symbol):
            return

        last = self._price_history[symbol][-1]
        if abs(price - last) > 0.001:
            self._price_history[symbol].append(price)
            self._volume_history[symbol].append(float(volume))
            self._high_history[symbol].append(high)
            self._low_history[symbol].append(low)

            # Trim to 300 max
            if len(self._price_history[symbol]) > 300:
                self._price_history[symbol] = self._price_history[symbol][-300:]
                self._volume_history[symbol] = self._volume_history[symbol][-300:]
                self._high_history[symbol] = self._high_history[symbol][-300:]
                self._low_history[symbol] = self._low_history[symbol][-300:]
