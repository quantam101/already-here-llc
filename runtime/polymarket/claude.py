"""Anthropic Claude signal summarizer for Polymarket alerts.

Disabled by default. When `CLAUDE_API_KEY` and `POLYMARKET_CLAUDE_ENABLED` are
set, each qualifying fill is summarized into a one-line "Alpha Brief" that is
prepended to the Telegram alert.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, List, Optional

import requests

from .utils import CircuitBreaker

logger = logging.getLogger("polymarket-tracker")


@dataclass(frozen=True)
class ClaudeSummary:
    text: str
    model: str
    latency_ms: float
    error: Optional[str] = None


class ClaudeSummarizer:
    """Optional Claude 3/4 summarizer with circuit breaker and zero-spend fallback."""

    DEFAULT_MODEL = "claude-3-5-sonnet-20241022"
    API_URL = "https://api.anthropic.com/v1/messages"

    def __init__(
        self,
        api_key: Optional[str] = None,
        enabled: Optional[bool] = None,
        model: Optional[str] = None,
        max_tokens: int = 120,
        timeout: float = 4.0,
    ) -> None:
        self._api_key = (api_key or os.environ.get("CLAUDE_API_KEY", "")).strip()
        if enabled is None:
            enabled = os.environ.get("POLYMARKET_CLAUDE_ENABLED", "false").lower() == "true"
        self._enabled = enabled and bool(self._api_key)
        self._model = model or os.environ.get("POLYMARKET_CLAUDE_MODEL") or self.DEFAULT_MODEL
        self._max_tokens = max_tokens
        self._timeout = timeout
        self._cb = CircuitBreaker("claude", failure_threshold=3, reset_timeout_seconds=60.0)

    @property
    def ready(self) -> bool:
        return self._enabled and bool(self._api_key) and not self._cb.is_open

    @staticmethod
    def _build_prompt(event: Dict[str, Any], score: Optional[Dict[str, Any]]) -> str:
        wallet = event.get("wallet", "unknown")
        role = event.get("role", "UNKNOWN")
        side = event.get("side") or "-"
        size = Decimal(event.get("amount_usd", 0))
        price = Decimal(event.get("price", 0))
        market = event.get("market_name") or event.get("token_id", "")[-12:] or "Unknown"
        confluence = event.get("confluence_score")
        confidence = event.get("confluence_confidence")

        score_bits: List[str] = []
        if score:
            score_bits.append(f"wallet 30D P&L ${score.get('profit_usd', '0')}")
            score_bits.append(f"win rate {score.get('win_rate', '0')}%")
            score_bits.append(f"Sharpe {score.get('sharpe', '0')}")
        if confluence is not None:
            score_bits.append(f"confluence score {confluence}")
        if confidence is not None:
            score_bits.append(f"confidence {confidence}%")

        return (
            f"You are a Polymarket prediction-market analyst. A tracked smart wallet just traded.\n\n"
            f"Wallet: {wallet}\n"
            f"Role: {role}\n"
            f"Side: {side}\n"
            f"Market token: {market}\n"
            f"Size: ${size:.2f} @ {price:.4f}\n"
            f"Context: {', '.join(score_bits)}\n\n"
            f"In one sentence, explain what this trade likely signals and whether it looks high-conviction. "
            f"Keep it under 200 characters and factual. No emojis."
        )

    def summarize(
        self, event: Dict[str, Any], score: Optional[Dict[str, Any]] = None
    ) -> Optional[ClaudeSummary]:
        if not self.ready:
            return None
        if self._cb.is_open:
            logger.debug("Claude circuit breaker open; skipping summary")
            return None

        prompt = self._build_prompt(event, score)
        headers = {
            "x-api-key": self._api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        body = {
            "model": self._model,
            "max_tokens": self._max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        start = time.monotonic()
        try:
            resp = requests.post(
                self.API_URL,
                headers=headers,
                json=body,
                timeout=self._timeout,
            )
            latency_ms = (time.monotonic() - start) * 1000
            if not resp.ok:
                self._cb.record_failure()
                logger.warning("Claude API HTTP %d: %s", resp.status_code, resp.text[:200])
                return ClaudeSummary(
                    text="",
                    model=self._model,
                    latency_ms=latency_ms,
                    error=f"HTTP {resp.status_code}",
                )
            data = resp.json()
            content_blocks = data.get("content", [])
            text = " ".join(
                block.get("text", "")
                for block in content_blocks
                if isinstance(block, dict) and block.get("type") == "text"
            ).strip()
            self._cb.record_success()
            return ClaudeSummary(text=text, model=self._model, latency_ms=latency_ms)
        except Exception as exc:
            self._cb.record_failure()
            latency_ms = (time.monotonic() - start) * 1000
            logger.warning("Claude summary failed: %s", exc)
            return ClaudeSummary(
                text="", model=self._model, latency_ms=latency_ms, error=str(exc)
            )

    def status(self) -> Dict[str, Any]:
        return {
            "ready": self.ready,
            "enabled": self._enabled,
            "model": self._model,
            "circuit_breaker": self._cb.status(),
        }


def _placeholder_event() -> Dict[str, Any]:
    """Used only for quick local smoke testing without network."""
    return {
        "wallet": "0x0000000000000000000000000000000000000000",
        "role": "TAKER",
        "side": "BUY",
        "amount_usd": "0",
        "price": "0",
        "token_id": "",
    }


if __name__ == "__main__":
    # Quick smoke: POLYMARKET_CLAUDE_ENABLED=true CLAUDE_API_KEY=... python runtime/polymarket/claude.py
    import time

    logging.basicConfig(level=logging.INFO)
    summarizer = ClaudeSummarizer()
    if not summarizer.ready:
        print("Claude not configured or not enabled")
    else:
        result = summarizer.summarize(_placeholder_event())
        print(result)
