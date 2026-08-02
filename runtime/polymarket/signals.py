"""Signal confluence adapter for Polymarket copy trades.

Reuses the ensemble-confluence idea from the 90% win-rate stock trading agent
(profitenginev5/trading-agent) and adapts it to binary prediction-market prices.

The adapter fetches public price history from the Polymarket CLOB, runs a small
set of technical indicators, and returns a directional confluence score.  The
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

CLOB_PRICES_HISTORY = "https://clob.polymarket.com/prices-history"


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


class SignalConfluence:
    """
    Lightweight ensemble of short-term signals for Polymarket token prices.

    Mirrors the confluence idea from the 90% win-rate stock trading agent but
    uses only public CLOB price data and pure-Python statistics.
    """

    def __init__(self, config: Optional[PolymarketConfig] = None) -> None:
        self.config = config or PolymarketConfig.from_env()
        self._history = ClobPriceHistory()

    def _prices_for(self, token_id: str) -> List[float]:
        if not self.config.confluence_enabled:
            return []
        return self._history.fetch(token_id)

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

        signals = [
            _momentum_signal(prices),
            _mean_reversion_signal(prices),
            _bollinger_signal(prices),
            _support_resistance_signal(prices),
        ]

        raw_score = 0.0
        total_strength = 0.0
        contributors: List[str] = []
        for signal_name, (direction, strength) in [
            ("momentum", _momentum_signal(prices)),
            ("mean_reversion", _mean_reversion_signal(prices)),
            ("bollinger", _bollinger_signal(prices)),
            ("support_resistance", _support_resistance_signal(prices)),
        ]:
            raw_score += direction * strength
            total_strength += strength
            if direction != 0:
                contributors.append(f"{signal_name}: {direction} (s={strength:.2f})")

        score = Decimal(str(raw_score / max(total_strength, 1.0))).quantize(Decimal("0.01"))
        confidence = Decimal(str(min(total_strength / 4.0, 1.0) * 100)).quantize(Decimal("0.01"))

        # BUY is positive, SELL is negative.
        desired_sign = 1 if side == "BUY" else -1
        agree = score * Decimal(desired_sign) >= Decimal(str(self.config.confluence_threshold))

        return ConfluenceAssessment(
            token_id=token_id,
            side=side,
            agree=agree,
            score=score,
            confidence=confidence,
            details={
                "contributors": contributors,
                "total_strength": round(total_strength, 2),
                "price_points": len(prices),
            },
        )

    def status(self) -> Dict[str, Any]:
        return {
            "enabled": self.config.confluence_enabled,
            "threshold": str(self.config.confluence_threshold),
            "min_confidence": str(self.config.confluence_min_confidence),
            "cached_tokens": len(self._history._cache),
        }
