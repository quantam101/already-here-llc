"""Adaptive online-learning layer for the Polymarket tracker.

Retrains wallet scores and confluence thresholds from realized paper-trade
outcomes stored in `closed_trades`.  No external ML services are required;
everything is deterministic, auditable, and restart-safe in SQLite.
"""

from __future__ import annotations

import logging
import math
import threading
import time
from decimal import Decimal
from typing import Any, Dict, List, Optional

from .config import PolymarketConfig
from .state import StateManager
from .utils import CircuitBreaker

logger = logging.getLogger("polymarket-tracker")


class AdaptiveLearner:
    """Hardened online-learning loop for wallet and confluence models."""

    def __init__(self, config: PolymarketConfig, state: StateManager) -> None:
        self._config = config
        self._state = state
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._circuit = CircuitBreaker(
            "adaptive-learner",
            failure_threshold=5,
            reset_timeout_seconds=300.0,
        )

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._retrain_loop, daemon=True, name="poly-adaptive-learner"
        )
        self._thread.start()
        logger.info("Adaptive learner started; interval=%ss", self._config.adaptive_retrain_interval_seconds)

    def stop(self) -> None:
        self._running = False
        if self._stop_event:
            self._stop_event.set()

    def _retrain_loop(self) -> None:
        # Run an initial retrain soon after start so models are not stale.
        initial_wait = min(10.0, float(self._config.adaptive_retrain_interval_seconds))
        if self._stop_event.wait(initial_wait):
            return
        while self._running and not self._stop_event.is_set():
            try:
                if self._circuit.state in ("closed", "half_open"):
                    self.retrain()
                    self._circuit.record_success()
                else:
                    logger.warning("Adaptive learner circuit open; skipping retrain")
            except Exception:
                logger.exception("Adaptive retrain failed")
                self._circuit.record_failure()
            self._stop_event.wait(self._config.adaptive_retrain_interval_seconds)

    def retrain(self) -> Dict[str, Any]:
        """Retrain wallet and confluence models from closed paper trades."""
        if not self._config.adaptive_learning_enabled:
            return {"enabled": False}

        cutoff = time.time() - (self._config.adaptive_lookback_days * 86400)
        trades = self._state.get_closed_trades(since=cutoff)
        paper_trades = [t for t in trades if t.get("strategy") == "paper"]

        if len(paper_trades) < self._config.adaptive_min_trades:
            logger.info(
                "Adaptive retrain skipped: only %s closed paper trades (need %s)",
                len(paper_trades),
                self._config.adaptive_min_trades,
            )
            return {"enabled": True, "paper_trades": len(paper_trades), "skipped": True}

        wallet_result = self.retrain_wallets(paper_trades)
        confluence_result = self.retrain_confluence(paper_trades)

        summary = {
            "enabled": True,
            "paper_trades": len(paper_trades),
            "wallets_scored": wallet_result["count"],
            "top_wallet": wallet_result.get("top_wallet"),
            "confluence_threshold": confluence_result.get("threshold"),
            "confluence_min_confidence": confluence_result.get("min_confidence"),
        }
        logger.info("Adaptive retrain complete: %s", summary)
        return summary

    def retrain_wallets(self, trades: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compute per-wallet adaptive scores from realized paper outcomes."""
        by_wallet: Dict[str, List[Dict[str, Any]]] = {}
        for t in trades:
            w = (t.get("wallet") or "").lower()
            if w:
                by_wallet.setdefault(w, []).append(t)

        raw_metrics: List[Dict[str, Any]] = []
        for wallet, wt in by_wallet.items():
            if len(wt) < self._config.adaptive_min_trades:
                continue
            wins = sum(1 for t in wt if (t.get("pnl") or 0) > 0)
            losses = len(wt) - wins
            total_pnl = sum(float(t.get("pnl") or 0) for t in wt)
            win_rate = (wins / len(wt)) * 100.0

            gross_profit = sum(max(float(t.get("pnl") or 0), 0.0) for t in wt)
            gross_loss = sum(abs(min(float(t.get("pnl") or 0), 0.0)) for t in wt)
            profit_factor = gross_profit / gross_loss if gross_loss > 0 else (10.0 if gross_profit > 0 else 0.0)

            returns = [float(t.get("pnl") or 0) for t in wt]
            sharpe_like = self._sharpe_like(returns)

            raw_metrics.append(
                {
                    "wallet": wallet,
                    "trade_count": len(wt),
                    "wins": wins,
                    "losses": losses,
                    "win_rate": win_rate,
                    "profit_factor": profit_factor,
                    "total_pnl": total_pnl,
                    "sharpe_like": sharpe_like,
                }
            )

        if not raw_metrics:
            return {"count": 0}

        # Normalize to 0-1 within the cohort so scores are comparable across time.
        max_pnl = max(max((m["total_pnl"] for m in raw_metrics), key=abs), 0.0001)
        max_pf = max(max(m["profit_factor"] for m in raw_metrics), 1.0)
        max_tc = max(max(m["trade_count"] for m in raw_metrics), 1)

        for m in raw_metrics:
            norm_wr = m["win_rate"] / 100.0
            norm_pf = min(max(m["profit_factor"] / max_pf, 0.0), 1.0)
            norm_pnl = math.tanh(m["total_pnl"] / max_pnl)
            norm_tc = math.log1p(m["trade_count"]) / math.log1p(max_tc)

            score = (
                float(self._config.adaptive_wallet_win_rate_weight) * norm_wr
                + float(self._config.adaptive_wallet_profit_factor_weight) * norm_pf
                + float(self._config.adaptive_wallet_pnl_weight) * norm_pnl
                + float(self._config.adaptive_wallet_trade_count_weight) * norm_tc
            )
            # A wallet must be profitable, have a positive edge, and rank in the
            # top half of the scored cohort to pass the adaptive filter.
            passes = (
                m["total_pnl"] > 0
                and m["profit_factor"] >= 1.0
                and m["trade_count"] >= self._config.adaptive_min_trades
                and score >= 0.5
            )
            m["score"] = round(score, 6)
            m["passes"] = bool(passes)

        # Sort descending by score.
        raw_metrics.sort(key=lambda x: x["score"], reverse=True)

        top_wallet: Optional[str] = None
        for m in raw_metrics:
            self._state.set_adaptive_wallet_score(m)
            if top_wallet is None and m["passes"]:
                top_wallet = m["wallet"]

        return {
            "count": len(raw_metrics),
            "top_wallet": top_wallet,
            "top_score": raw_metrics[0]["score"] if raw_metrics else 0.0,
        }

    def retrain_confluence(self, trades: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Learn confluence score/confidence thresholds from realized outcomes."""
        trades_with_conf = [
            t for t in trades
            if t.get("confluence_confidence") is not None
            and float(t.get("confluence_confidence") or 0) > 0
        ]
        if len(trades_with_conf) < self._config.adaptive_min_trades:
            return {"reason": "not enough confluence-tagged trades"}

        # Learn min_confidence threshold.
        sorted_by_conf = sorted(
            trades_with_conf, key=lambda x: float(x.get("confluence_confidence") or 0), reverse=True
        )
        best_conf: Optional[float] = None
        best_conf_win_rate = 0.0
        best_conf_pnl = 0.0
        best_conf_count = 0
        cumulative: List[Dict[str, Any]] = []
        for t in sorted_by_conf:
            cumulative.append(t)
            wins = sum(1 for c in cumulative if (c.get("pnl") or 0) > 0)
            count = len(cumulative)
            wr = (wins / count) * 100.0
            pnl = sum(float(c.get("pnl") or 0) for c in cumulative)
            # Cumulative is sorted from highest confidence down; the current confidence
            # is the lowest confidence in the set.  We want the highest-confidence cutoff
            # that still has enough samples and meets the target win rate.
            if count >= self._config.adaptive_min_trades and wr >= float(self._config.adaptive_confluence_target_win_rate):
                best_conf = float(t.get("confluence_confidence") or 0)
                best_conf_win_rate = wr
                best_conf_pnl = pnl
                best_conf_count = count
                break

        # Learn score threshold (aligned with trade side).
        aligned = []
        for t in trades_with_conf:
            side = str(t.get("side", "")).upper()
            raw_score = float(t.get("confluence_score") or 0)
            desired_sign = 1 if side == "BUY" else -1 if side == "SELL" else 0
            aligned_score = raw_score * desired_sign if desired_sign else abs(raw_score)
            aligned.append({**t, "aligned_score": aligned_score})

        sorted_by_score = sorted(aligned, key=lambda x: x["aligned_score"], reverse=True)
        best_score: Optional[float] = None
        best_score_win_rate = 0.0
        best_score_pnl = 0.0
        best_score_count = 0
        cumulative = []
        for t in sorted_by_score:
            cumulative.append(t)
            wins = sum(1 for c in cumulative if (c.get("pnl") or 0) > 0)
            count = len(cumulative)
            wr = (wins / count) * 100.0
            pnl = sum(float(c.get("pnl") or 0) for c in cumulative)
            if count >= self._config.adaptive_min_trades and wr >= float(self._config.adaptive_confluence_target_win_rate):
                best_score = t["aligned_score"]
                best_score_win_rate = wr
                best_score_pnl = pnl
                best_score_count = count
                break

        result: Dict[str, Any] = {"reason": "no passing threshold found"}
        if best_conf is not None or best_score is not None:
            result = {
                "threshold": best_score if best_score is not None else float(self._config.confluence_threshold),
                "min_confidence": best_conf if best_conf is not None else float(self._config.confluence_min_confidence),
                "target_win_rate": float(self._config.adaptive_confluence_target_win_rate),
                "win_rate": best_score_win_rate if best_score is not None else best_conf_win_rate,
                "total_pnl": best_score_pnl if best_score is not None else best_conf_pnl,
                "trade_count": best_score_count if best_score is not None else best_conf_count,
                "updated_at": time.time(),
            }
            self._state.set_adaptive_confluence_threshold(result)
        return result

    @staticmethod
    def _sharpe_like(returns: List[float]) -> float:
        if not returns:
            return 0.0
        n = len(returns)
        mean = sum(returns) / n
        variance = sum((r - mean) ** 2 for r in returns) / n
        std = math.sqrt(variance) if variance > 0 else 0.0
        if std == 0:
            return 0.0
        return (mean / std) * math.sqrt(n)

    def status(self) -> Dict[str, Any]:
        return {
            "enabled": self._config.adaptive_learning_enabled,
            "running": self._running,
            "circuit": self._circuit.state,
            "interval_seconds": self._config.adaptive_retrain_interval_seconds,
        }
