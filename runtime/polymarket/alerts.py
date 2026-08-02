"""Telegram alert dispatcher with rate limiting, circuit breaker, and formatting."""

from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional

import requests

from .config import PolymarketConfig
from .state import StateManager
from .utils import CircuitBreaker, RateLimiter

logger = logging.getLogger("polymarket-tracker")


def _fmt_usd(value: Decimal) -> str:
    return f"${value:,.2f}"


def _fmt_addr(addr: str) -> str:
    a = addr.lower()
    if len(a) >= 10:
        return f"{a[:6]}...{a[-4:]}"
    return a


@dataclass(frozen=True)
class TelegramAlertResult:
    ok: bool
    chat_id: int
    message_id: Optional[int]
    error: Optional[str]
    latency_ms: float


class TelegramAlertEngine:
    """Sub-second Telegram alert engine with per-wallet cooldowns and circuit breaker."""

    API_BASE = "https://api.telegram.org/bot{token}/{method}"

    def __init__(self, config: PolymarketConfig, state: StateManager) -> None:
        self._token = config.telegram_bot_token
        self._chat_ids = config.telegram_chat_ids
        self._timeout = config.telegram_timeout_seconds
        self._state = state
        self._cooldown = config.alert_cooldown_seconds
        self._max_daily = config.max_daily_alerts_per_wallet
        self._cb = CircuitBreaker("telegram", failure_threshold=3, reset_timeout_seconds=30.0)
        self._rate = RateLimiter(max_calls=20, window_seconds=1)
        self._last_alert_at: Dict[str, float] = {}

    def _api_url(self, method: str) -> str:
        return self.API_BASE.format(token=self._token, method=method)

    @property
    def ready(self) -> bool:
        return bool(self._token and self._chat_ids)

    def _build_message(self, event: Dict[str, Any], score: Optional[Dict[str, Any]]) -> str:
        wallet = event.get("wallet", event.get("maker", event.get("taker", "unknown")))
        role = event.get("role", "UNKNOWN")
        side = event.get("side") or "-"
        size = Decimal(event.get("amount_usd", 0))
        price = Decimal(event.get("price", 0))
        market = event.get("market_name") or event.get("token_id", "")[-8:] or "Unknown"
        tx_hash = event.get("tx_hash", "")
        sharpe = score.get("sharpe") if score else None
        win_rate = score.get("win_rate") if score else None
        profit = score.get("profit_usd") if score else None
        confluence_score = event.get("confluence_score")
        confluence_confidence = event.get("confluence_confidence")
        portfolio_scale = event.get("portfolio_scale")

        lines = [
            "🚨 *POLYMARKET SMART WALLET ALERT*",
            f"",
            f"👤 *Wallet:* `{_fmt_addr(wallet)}`",
            f"🏷️ *Role:* `{role}` | *Side:* `{side}`",
            f"📈 *Market:* `{market}`",
            f"💰 *Size:* {_fmt_usd(size)} @ {price:.4f}",
        ]
        if profit is not None:
            lines.append(f"📊 *Wallet 30D P&L:* {_fmt_usd(Decimal(str(profit)))}")
        if win_rate is not None:
            lines.append(f"🎯 *Win Rate:* {Decimal(str(win_rate)):.1f}%")
        if sharpe is not None:
            lines.append(f"⚡ *Sharpe:* {Decimal(str(sharpe)):.2f}")
        if confluence_score is not None:
            lines.append(f"🧩 *Confluence Score:* {confluence_score}")
        if confluence_confidence is not None:
            lines.append(f"🧠 *Confluence Confidence:* {confluence_confidence}%")
        if portfolio_scale is not None:
            lines.append(f"📏 *Portfolio Scale:* {portfolio_scale}x")
        if tx_hash:
            lines.append(f"🔗 [View on Polygonscan](https://polygonscan.com/tx/{tx_hash})")
        lines.append("")
        lines.append("⛔ *Auto-execution is DISABLED — manual approval required.*")
        return "\n".join(lines)

    def _should_alert(self, wallet: str) -> bool:
        if not self.ready:
            return False
        if self._cb.is_open:
            return False
        now = time.monotonic()
        last = self._last_alert_at.get(wallet, 0)
        if now - last < self._cooldown:
            return False
        if self._state.alert_count_today(wallet) >= self._max_daily:
            logger.warning("Daily alert cap reached for %s", wallet)
            return False
        return True

    def send_alert(
        self,
        event: Dict[str, Any],
        score: Optional[Dict[str, Any]] = None,
    ) -> List[TelegramAlertResult]:
        wallet = event.get("wallet", event.get("maker", event.get("taker", "unknown")))
        if not self._should_alert(wallet):
            return []

        if not self._rate.is_allowed():
            logger.warning("Telegram rate limit active; skipping alert for %s", wallet)
            return []

        message = self._build_message(event, score)
        results: List[TelegramAlertResult] = []
        alert_id = hashlib.sha256(
            f"{wallet}:{event.get('tx_hash','')}:{event.get('log_index',0)}:{time.time()}".encode()
        ).hexdigest()[:16]

        for chat_id in self._chat_ids:
            start = time.monotonic()
            try:
                resp = requests.post(
                    self._api_url("sendMessage"),
                    json={
                        "chat_id": chat_id,
                        "text": message,
                        "parse_mode": "Markdown",
                        "disable_web_page_preview": False,
                    },
                    timeout=self._timeout,
                )
                latency = (time.monotonic() - start) * 1000
                if resp.ok:
                    data = resp.json()
                    ok = data.get("ok", False)
                    message_id = data["result"].get("message_id") if ok else None
                    results.append(
                        TelegramAlertResult(
                            ok=ok,
                            chat_id=chat_id,
                            message_id=message_id,
                            error=None,
                            latency_ms=latency,
                        )
                    )
                    if ok:
                        self._cb.record_success()
                        self._last_alert_at[wallet] = time.monotonic()
                    else:
                        self._cb.record_failure()
                else:
                    results.append(
                        TelegramAlertResult(
                            ok=False,
                            chat_id=chat_id,
                            message_id=None,
                            error=f"HTTP {resp.status_code}",
                            latency_ms=latency,
                        )
                    )
                    self._cb.record_failure()
            except Exception as exc:
                latency = (time.monotonic() - start) * 1000
                results.append(
                    TelegramAlertResult(
                        ok=False,
                        chat_id=chat_id,
                        message_id=None,
                        error=str(exc),
                        latency_ms=latency,
                    )
                )
                self._cb.record_failure()

        any_ok = any(r.ok for r in results)
        self._state.record_alert(
            alert_id,
            wallet,
            event.get("tx_hash", ""),
            message,
            "sent" if any_ok else "failed",
        )
        return results

    def status(self) -> Dict[str, Any]:
        return {
            "ready": self.ready,
            "chats": len(self._chat_ids),
            "circuit_breaker": self._cb.status(),
            "rate_limiter": self._rate.status(),
        }
