"""Shared utilities: circuit breakers, decimal math, and safe helpers."""

from __future__ import annotations

import logging
import statistics
import time
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional

logger = logging.getLogger("polymarket-tracker")


def safe_div(numerator: Decimal, denominator: Decimal, default: Decimal = Decimal("0")) -> Decimal:
    if denominator == 0:
        return default
    return numerator / denominator


def sharpe_ratio(returns: List[Decimal], risk_free: Decimal = Decimal("0")) -> Decimal:
    """Annualized Sharpe on a series of per-trade returns (decimal)."""
    if not returns:
        return Decimal("0")
    try:
        mean = sum(returns) / Decimal(len(returns))
        std = Decimal(statistics.stdev(float(r) for r in returns))
    except Exception:
        return Decimal("0")
    if std == 0:
        return Decimal("0")
    return ((mean - risk_free) / std).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def win_rate(wins: int, total: int) -> Decimal:
    if total == 0:
        return Decimal("0")
    return (Decimal(wins) / Decimal(total) * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass
class CircuitBreaker:
    """Deterministic circuit breaker with exponential backoff."""

    name: str
    failure_threshold: int = 5
    reset_timeout_seconds: float = 60.0
    _failure_count: int = field(default=0, repr=False)
    _last_failure_time: float = field(default=0.0, repr=False)
    _state: str = field(default="closed", repr=False)  # closed | open | half_open

    @property
    def state(self) -> str:
        if self._state == "open":
            if time.monotonic() - self._last_failure_time >= self.reset_timeout_seconds:
                self._state = "half_open"
        return self._state

    def record_success(self) -> None:
        self._failure_count = 0
        self._state = "closed"

    def record_failure(self) -> None:
        self._failure_count += 1
        self._last_failure_time = time.monotonic()
        if self._failure_count >= self.failure_threshold:
            self._state = "open"
            logger.warning("Circuit breaker %s OPEN after %d failures", self.name, self._failure_count)

    @property
    def is_open(self) -> bool:
        return self.state == "open"

    def status(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "state": self.state,
            "failure_count": self._failure_count,
            "threshold": self.failure_threshold,
        }


@dataclass
class RateLimiter:
    """Token-bucket-ish rate limiter for alerts and outbound calls."""

    max_calls: int
    window_seconds: int
    _calls: List[float] = field(default_factory=list, repr=False)

    def is_allowed(self) -> bool:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        self._calls = [t for t in self._calls if t > cutoff]
        if len(self._calls) >= self.max_calls:
            return False
        self._calls.append(now)
        return True

    def status(self) -> Dict[str, Any]:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        return {
            "window_seconds": self.window_seconds,
            "max_calls": self.max_calls,
            "current_calls": len([t for t in self._calls if t > cutoff]),
        }
