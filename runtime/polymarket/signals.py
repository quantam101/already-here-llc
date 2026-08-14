"""Signal confluence adapter for Polymarket copy trades.

Reuses the ensemble-confluence idea from the 90% win-rate stock trading agent
(profitenginev5/trading-agent) and adapts it to binary prediction-market prices.

The adapter fetches public price history and live order-book / market metadata
from the Polymarket CLOB and Gamma API, runs a small ensemble of technical and
microstructure indicators, and returns a directional confluence score.  The
orchestrator can use this score as an additional filter: only copy a smart
wallet's fill when the short-term market signal agrees with the wallet's side.
"""

from __future__ import annotations

import logging
import statistics
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

import requests

from .config import PolymarketConfig

logger = logging.getLogger("polymarket-tracker")


def _to_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).strip() or default)
    except (ValueError, TypeError):
        return default


def _parse_json_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            import json
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return []

CLOB_PRICES_HISTORY = "https://clob.polymarket.com/prices-history"
CLOB_ORDER_BOOK = "https://clob.polymarket.com/book"
CLOB_MARKETS_BY_TOKEN = "https://clob.polymarket.com/markets-by-token/{token_id}"
GAMMA_MARKETS = "https://gamma-api.polymarket.com/markets"


@dataclass(frozen=True)
class ConfluenceAssessment:
    token_id: str
    side: str
    agree: bool
    score: Decimal
    confidence: Decimal
    details: Dict[str, Any]


def _rsi(prices: List[float], period: int = 14) -> float:
    """Simple RSI over a price series."""
    if len(prices) < period + 1:
        return 50.0
    gains = []
    losses = []
    for prev, curr in zip(prices[-period - 1 : -1], prices[-period:]):
        diff = curr - prev
        if diff > 0:
            gains.append(diff)
            losses.append(0.0)
        else:
            gains.append(0.0)
            losses.append(abs(diff))
    avg_gain = sum(gains) / period if gains else 0.0
    avg_loss = sum(losses) / period if losses else 0.0
    if avg_loss == 0:
        return 100.0 if avg_gain > 0 else 50.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def _sma(prices: List[float], period: int) -> float:
    if len(prices) < period:
        return prices[-1] if prices else 0.0
    return statistics.mean(prices[-period:])


def _std(prices: List[float], period: int) -> float:
    if len(prices) < period:
        return 0.0
    return statistics.stdev(prices[-period:]) if len(prices[-period:]) > 1 else 0.0


def _momentum_signal(prices: List[float], fast: int = 5, slow: int = 20) -> Tuple[int, float]:
    """Return signal (+1/-1/0) and normalized strength for price momentum."""
    if len(prices) < slow:
        return 0, 0.0
    fast_sma = _sma(prices, fast)
    slow_sma = _sma(prices, slow)
    if slow_sma == 0:
        return 0, 0.0
    diff_pct = (fast_sma - slow_sma) / slow_sma
    if diff_pct > 0.001:
        return 1, min(abs(diff_pct) * 100, 1.0)
    if diff_pct < -0.001:
        return -1, min(abs(diff_pct) * 100, 1.0)
    return 0, 0.0


def _mean_reversion_signal(prices: List[float], period: int = 14) -> Tuple[int, float]:
    """Oversold/overbought signal using RSI extremes."""
    if len(prices) < period + 1:
        return 0, 0.0
    rsi = _rsi(prices, period)
    if rsi < 30:
        return 1, (30 - rsi) / 30
    if rsi > 70:
        return -1, (rsi - 70) / 30
    return 0, 0.0


def _bollinger_signal(prices: List[float], period: int = 20, std: float = 2.0) -> Tuple[int, float]:
    """Bollinger band break/bounce signal."""
    if len(prices) < period:
        return 0, 0.0
    mean = _sma(prices, period)
    stdev = _std(prices, period)
    if stdev == 0:
        return 0, 0.0
    upper = mean + std * stdev
    lower = mean - std * stdev
    last = prices[-1]
    if last < lower:
        return 1, min((lower - last) / stdev, 1.0)
    if last > upper:
        return -1, min((last - upper) / stdev, 1.0)
    return 0, 0.0


def _support_resistance_signal(prices: List[float], period: int = 15) -> Tuple[int, float]:
    """Signal based on proximity to recent support/resistance extremes."""
    if len(prices) < period:
        return 0, 0.0
    window = prices[-period:]
    support = min(window)
    resistance = max(window)
    last = prices[-1]
    if support == 0 or resistance == 0 or support == resistance:
        return 0, 0.0
    dist_to_support = abs(last - support) / support
    dist_to_resistance = abs(last - resistance) / resistance
    if dist_to_support < 0.02:
        return 1, 1 - dist_to_support / 0.02
    if dist_to_resistance < 0.02:
        return -1, 1 - dist_to_resistance / 0.02
    return 0, 0.0


class ClobPriceHistory:
    """Fetch and cache Polymarket CLOB price history for a token."""

    def __init__(self, base_url: str = CLOB_PRICES_HISTORY) -> None:
        self._base_url = base_url
        self._cache: Dict[str, List[float]] = {}

    def fetch(self, token_id: str, interval: str = "max", fidelity: int = 60, force: bool = False) -> List[float]:
        if not token_id or token_id == "0":
            return []
        if not force and token_id in self._cache:
            return self._cache[token_id]
        try:
            resp = requests.get(
                self._base_url,
                params={"market": token_id, "interval": interval, "fidelity": fidelity},
                timeout=15,
            )
            if not resp.ok:
                logger.warning("CLOB price history HTTP %s for %s", resp.status_code, token_id[:10])
                return self._cache.get(token_id, [])
            data = resp.json()
            history = sorted(data.get("history", []), key=lambda x: x.get("t", 0))
            prices = [float(p["p"]) for p in history if "p" in p]
            if prices:
                self._cache[token_id] = prices
            return prices
        except Exception as exc:
            logger.warning("Failed to fetch price history for %s: %s", token_id[:10], exc)
            return self._cache.get(token_id, [])

    def get(self, token_id: str) -> List[float]:
        return self._cache.get(token_id, [])


class ClobOrderBook:
    """Fetch and cache live CLOB order-book state for a token."""

    def __init__(self, base_url: str = CLOB_ORDER_BOOK) -> None:
        self._base_url = base_url
        self._cache: Dict[str, Optional[Dict[str, Any]]] = {}

    def fetch(self, token_id: str) -> Optional[Dict[str, Any]]:
        if not token_id or token_id == "0":
            return None
        if token_id in self._cache:
            return self._cache[token_id]
        try:
            resp = requests.get(self._base_url, params={"token_id": token_id}, timeout=15)
            if not resp.ok:
                logger.warning("CLOB order book HTTP %s for %s", resp.status_code, token_id[:10])
                self._cache[token_id] = None
                return None
            data = resp.json()
            bids = data.get("bids", [])
            asks = data.get("asks", [])
            if not bids or not asks:
                self._cache[token_id] = None
                return None
            # Bids are ascending; asks descending.
            best_bid = float(bids[-1]["price"])
            best_bid_size = float(bids[-1]["size"])
            best_ask = float(asks[0]["price"])
            best_ask_size = float(asks[0]["size"])
            spread = best_ask - best_bid
            mid = (best_ask + best_bid) / 2.0
            total_bid_size = sum(float(b["size"]) for b in bids)
            total_ask_size = sum(float(a["size"]) for a in asks)
            self._cache[token_id] = {
                "best_bid": best_bid,
                "best_ask": best_ask,
                "best_bid_size": best_bid_size,
                "best_ask_size": best_ask_size,
                "spread": spread,
                "mid": mid,
                "spread_pct": spread / mid if mid else 0.0,
                "total_bid_size": total_bid_size,
                "total_ask_size": total_ask_size,
                "imbalance": (total_bid_size - total_ask_size) / (total_bid_size + total_ask_size)
                if (total_bid_size + total_ask_size) > 0
                else 0.0,
            }
            return self._cache[token_id]
        except Exception as exc:
            logger.warning("Failed to fetch order book for %s: %s", token_id[:10], exc)
            self._cache[token_id] = None
            return None


class GammaMarketMetadata:
    """Fetch and cache Gamma market metadata (volume, liquidity, price change)."""

    def __init__(self, base_url: str = GAMMA_MARKETS) -> None:
        self._base_url = base_url
        self._cache: Dict[str, Optional[Dict[str, Any]]] = {}

    def fetch(self, token_id: str) -> Optional[Dict[str, Any]]:
        if not token_id or token_id == "0":
            return None
        if token_id in self._cache:
            return self._cache[token_id]
        try:
            resp = requests.get(
                self._base_url, params={"clobTokenIds": token_id, "limit": 1}, timeout=15
            )
            if not resp.ok:
                logger.warning("Gamma metadata HTTP %s for %s", resp.status_code, token_id[:10])
                self._cache[token_id] = None
                return None
            data = resp.json()
            if not data:
                self._cache[token_id] = None
                return None
            market = data[0]
            outcome_prices = _parse_json_list(market.get("outcomePrices"))
            self._cache[token_id] = {
                "volume_24h": _to_float(market.get("volume24hr")),
                "volume_total": _to_float(market.get("volume")),
                "liquidity": _to_float(market.get("liquidity")),
                "spread": _to_float(market.get("spread")),
                "best_bid": _to_float(market.get("bestBid")),
                "best_ask": _to_float(market.get("bestAsk")),
                "one_day_change": _to_float(market.get("oneDayPriceChange")),
                "one_week_change": _to_float(market.get("oneWeekPriceChange")),
                "outcome_prices": [_to_float(p) for p in outcome_prices],
            }
            return self._cache[token_id]
        except Exception as exc:
            logger.warning("Failed to fetch Gamma metadata for %s: %s", token_id[:10], exc)
            self._cache[token_id] = None
            return None


def _order_book_signal(book: Optional[Dict[str, Any]], max_spread_pct: float = 0.05) -> Tuple[int, float]:
    """Return direction/strength from order-book imbalance and spread."""
    if not book:
        return 0, 0.0
    spread_pct = book.get("spread_pct", 0.0)
    if spread_pct > max_spread_pct:
        return 0, 0.0
    imbalance = book.get("imbalance", 0.0)
    if imbalance > 0.2:
        return 1, min(imbalance, 1.0)
    if imbalance < -0.2:
        return -1, min(abs(imbalance), 1.0)
    return 0, 0.0


def _metadata_signal(metadata: Optional[Dict[str, Any]]) -> Tuple[int, float]:
    """Return direction/strength from 24h price change and volume attention."""
    if not metadata:
        return 0, 0.0
    one_day = metadata.get("one_day_change", 0.0)
    volume_24h = metadata.get("volume_24h", 0.0)
    if volume_24h <= 0:
        return 0, 0.0
    # Normalize strength around a 2% daily move.
    strength = min(abs(one_day) / 0.02, 1.0)
    if one_day > 0.001:
        return 1, strength
    if one_day < -0.001:
        return -1, strength
    return 0, 0.0


class SignalConfluence:
    """
    Lightweight ensemble of short-term signals for Polymarket token prices.

    Sources:
      - CLOB price-history technicals (momentum, RSI, Bollinger, support/resistance)
      - CLOB order-book microstructure (spread, bid/ask imbalance)
      - Gamma market metadata (24h price change, volume, liquidity)

    Mirrors the confluence idea from the 90% win-rate stock trading agent but
    uses only public Polymarket data and pure-Python statistics.
    """

    def __init__(self, config: Optional[PolymarketConfig] = None, state: Optional[Any] = None) -> None:
        self.config = config or PolymarketConfig.from_env()
        self._state = state
        self._history = ClobPriceHistory()
        self._order_book = ClobOrderBook()
        self._metadata = GammaMarketMetadata()

    def _prices_for(self, token_id: str) -> List[float]:
        if not self.config.confluence_enabled:
            return []
        return self._history.fetch(token_id)

    def _order_book_for(self, token_id: str) -> Optional[Dict[str, Any]]:
        if not self.config.confluence_enabled or not getattr(self.config, "confluence_use_order_book", True):
            return None
        return self._order_book.fetch(token_id)

    def _metadata_for(self, token_id: str) -> Optional[Dict[str, Any]]:
        if not self.config.confluence_enabled or not getattr(self.config, "confluence_use_market_metadata", True):
            return None
        return self._metadata.fetch(token_id)

    def assess(self, token_id: str, side: str, current_price: Optional[Decimal] = None) -> ConfluenceAssessment:
        side = (side or "").upper()
        if side not in ("BUY", "SELL") or not self.config.confluence_enabled:
            return ConfluenceAssessment(
                token_id=token_id or "",
                side=side or "-",
                agree=True,
                score=Decimal("0"),
                confidence=Decimal("0"),
                details={"reason": "confluence disabled"},
            )

        prices = self._prices_for(token_id)
        if not prices:
            return ConfluenceAssessment(
                token_id=token_id,
                side=side,
                agree=True,
                score=Decimal("0"),
                confidence=Decimal("0"),
                details={"reason": "no price history"},
            )

        if current_price is not None:
            prices = prices + [float(current_price)]

        max_spread = float(getattr(self.config, "confluence_max_spread_pct", Decimal("0.05")))

        signal_generators = [
            ("momentum", _momentum_signal(prices)),
            ("mean_reversion", _mean_reversion_signal(prices)),
            ("bollinger", _bollinger_signal(prices)),
            ("support_resistance", _support_resistance_signal(prices)),
            ("order_book", _order_book_signal(self._order_book_for(token_id), max_spread_pct=max_spread)),
            ("market_metadata", _metadata_signal(self._metadata_for(token_id))),
        ]

        raw_score = 0.0
        total_strength = 0.0
        contributors: List[str] = []
        for signal_name, (direction, strength) in signal_generators:
            raw_score += direction * strength
            total_strength += strength
            if direction != 0:
                contributors.append(f"{signal_name}: {direction} (s={strength:.2f})")

        score = Decimal(str(raw_score / max(total_strength, 1.0))).quantize(Decimal("0.01"))
        confidence = Decimal(str(min(total_strength / 6.0, 1.0) * 100)).quantize(Decimal("0.01"))

        # BUY is positive, SELL is negative.
        desired_sign = 1 if side == "BUY" else -1
        threshold, min_confidence = self._adaptive_thresholds()
        agree = score * Decimal(desired_sign) >= Decimal(str(threshold))
        confidence_ok = confidence >= Decimal(str(min_confidence))

        return ConfluenceAssessment(
            token_id=token_id,
            side=side,
            agree=agree and confidence_ok,
            score=score,
            confidence=confidence,
            details={
                "contributors": contributors,
                "total_strength": round(total_strength, 2),
                "price_points": len(prices),
                "order_book": self._order_book_for(token_id) is not None,
                "market_metadata": self._metadata_for(token_id) is not None,
                "adaptive_threshold": str(threshold),
                "adaptive_min_confidence": str(min_confidence),
            },
        )

    def _adaptive_thresholds(self) -> Tuple[Decimal, Decimal]:
        """Return adaptive thresholds if learned, otherwise config defaults."""
        if not self.config.adaptive_learning_enabled or self._state is None:
            return self.config.confluence_threshold, self.config.confluence_min_confidence
        threshold = self._state.get_adaptive_confluence_threshold()
        if threshold:
            return (
                Decimal(str(threshold.get("threshold", self.config.confluence_threshold))),
                Decimal(str(threshold.get("min_confidence", self.config.confluence_min_confidence))),
            )
        return self.config.confluence_threshold, self.config.confluence_min_confidence

    def status(self) -> Dict[str, Any]:
        threshold, min_confidence = self._adaptive_thresholds()
        return {
            "enabled": self.config.confluence_enabled,
            "threshold": str(self.config.confluence_threshold),
            "min_confidence": str(self.config.confluence_min_confidence),
            "adaptive_threshold": str(threshold),
            "adaptive_min_confidence": str(min_confidence),
            "use_order_book": getattr(self.config, "confluence_use_order_book", True),
            "use_market_metadata": getattr(self.config, "confluence_use_market_metadata", True),
            "max_spread_pct": str(getattr(self.config, "confluence_max_spread_pct", Decimal("0.05"))),
            "cached_tokens": len(self._history._cache),
        }
