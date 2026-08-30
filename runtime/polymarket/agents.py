"""Enterprise multi-agent ASI coordination layer for the Polymarket tracker.

Each sub-agent owns a specific process (wallet scoring, confluence learning,
risk, security, execution).  A MetaAgent polls their published states, applies
military-grade consensus rules, and emits a single system decision that the
orchestrator follows.  Everything is deterministic, auditable, and persisted in
SQLite so the fleet is restart-safe and tamper-evident.
"""

from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Callable, Dict, List, Optional

from .adaptive import AdaptiveLearner
from .config import PolymarketConfig
from .dark_pool_macro import DarkPoolMacroOverlay
from .portfolio import PortfolioRiskGuard
from .risk import RiskGuard
from .state import StateManager
from .utils import CircuitBreaker

logger = logging.getLogger("polymarket-tracker")


class AgentBus:
    """Lightweight in-memory pub/sub bus for inter-agent messaging."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._subs: Dict[str, List[Callable[[Dict[str, Any]], None]]] = defaultdict(list)

    def subscribe(self, channel: str, callback: Callable[[Dict[str, Any]], None]) -> None:
        with self._lock:
            self._subs[channel].append(callback)

    def publish(self, channel: str, message: Dict[str, Any]) -> None:
        with self._lock:
            handlers = list(self._subs.get(channel, []))
        for fn in handlers:
            try:
                fn(message)
            except Exception:
                logger.exception("AgentBus handler failed on %s", channel)


@dataclass
class AgentRecommendation:
    """Consensus output from the MetaAgent for a single trade intent."""

    allow: bool = True
    position_scale: Decimal = Decimal("1")
    min_confidence: Decimal = Decimal("0")
    kill_switch: bool = False
    training_mode: bool = False
    live_mode: bool = False
    reasons: List[str] = field(default_factory=list)


class BaseAgent(ABC):
    """Thread-safe agent base with circuit-breaker protection and state telemetry."""

    def __init__(self, name: str, config: PolymarketConfig, state: StateManager, bus: AgentBus) -> None:
        self.name = name
        self._config = config
        self._state = state
        self._bus = bus
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._circuit = CircuitBreaker(name, failure_threshold=5, reset_timeout_seconds=300.0)
        self._last_status: Dict[str, Any] = {"agent": name, "state": "created"}

    def start(self, interval_seconds: float = 60.0) -> None:
        if self._running:
            return
        self._running = True
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._loop, args=(interval_seconds,), daemon=True, name=f"poly-agent-{self.name}"
        )
        self._thread.start()
        logger.info("Agent %s started (interval=%ss)", self.name, interval_seconds)

    def stop(self) -> None:
        self._running = False
        self._stop_event.set()

    def _loop(self, interval_seconds: float) -> None:
        while self._running and not self._stop_event.is_set():
            try:
                if self._circuit.state in ("closed", "half_open"):
                    status = self.tick()
                    self._last_status = status
                    status["agent"] = self.name
                    status["updated_at"] = time.time()
                    self._state.set_agent_status(self.name, status)
                    self._bus.publish(f"agent.{self.name}", status)
                    self._circuit.record_success()
                else:
                    logger.warning("Agent %s circuit open; skipping tick", self.name)
            except Exception:
                logger.exception("Agent %s tick failed", self.name)
                self._circuit.record_failure()
            self._stop_event.wait(interval_seconds)

    @abstractmethod
    def tick(self) -> Dict[str, Any]:
        """Execute one agent cycle and return a status dictionary."""

    def status(self) -> Dict[str, Any]:
        return {
            "agent": self.name,
            **self._last_status,
            "circuit": self._circuit.state,
            "running": self._running,
        }


class WalletScoringAgent(BaseAgent):
    """Adaptive wallet scorer that retrains from realized paper outcomes."""

    def __init__(self, config: PolymarketConfig, state: StateManager, bus: AgentBus) -> None:
        super().__init__("wallet-scorer", config, state, bus)
        self._learner = AdaptiveLearner(config, state)

    def tick(self) -> Dict[str, Any]:
        if not self._config.adaptive_learning_enabled:
            return {"enabled": False}
        cutoff = time.time() - (self._config.adaptive_lookback_days * 86400)
        trades = self._state.get_closed_trades(since=cutoff)
        paper_trades = [t for t in trades if t.get("strategy") == "paper"]
        if len(paper_trades) < self._config.adaptive_min_trades:
            return {"enabled": True, "paper_trades": len(paper_trades), "skipped": True}
        result = self._learner.retrain_wallets(paper_trades)
        scores = self._state.get_all_adaptive_wallet_scores()
        return {
            "enabled": True,
            "paper_trades": len(paper_trades),
            "wallets_scored": result.get("count", 0),
            "top_wallet": result.get("top_wallet"),
            "top_score": result.get("top_score", 0.0),
            "passing_wallets": sum(1 for s in scores if s.get("passes")),
        }


class ConfluenceAgent(BaseAgent):
    """Adaptive confluence-threshold learner."""

    def __init__(self, config: PolymarketConfig, state: StateManager, bus: AgentBus) -> None:
        super().__init__("confluence-learner", config, state, bus)
        self._learner = AdaptiveLearner(config, state)

    def tick(self) -> Dict[str, Any]:
        if not self._config.adaptive_learning_enabled:
            return {"enabled": False}
        cutoff = time.time() - (self._config.adaptive_lookback_days * 86400)
        trades = self._state.get_closed_trades(since=cutoff)
        paper_trades = [t for t in trades if t.get("strategy") == "paper"]
        if len(paper_trades) < self._config.adaptive_min_trades:
            return {"enabled": True, "paper_trades": len(paper_trades), "skipped": True}
        result = self._learner.retrain_confluence(paper_trades)
        latest = self._state.get_adaptive_confluence_threshold()
        return {
            "enabled": True,
            "paper_trades": len(paper_trades),
            "threshold": result.get("threshold"),
            "min_confidence": result.get("min_confidence"),
            "win_rate": result.get("win_rate"),
            "trade_count": result.get("trade_count"),
            "latest_threshold": latest.get("threshold") if latest else None,
        }


class DarkPoolMacroAgent(BaseAgent):
    """Macro overlay using delayed FINRA dark-pool institutional sentiment."""

    def __init__(self, config: PolymarketConfig, state: StateManager, bus: AgentBus) -> None:
        super().__init__("dark-pool-macro", config, state, bus)
        self._overlay = DarkPoolMacroOverlay(
            tickers=config.dark_pool_macro_tickers,
            db_path=config.dark_pool_db_path,
            min_shares=config.dark_pool_min_shares,
            min_notional=config.dark_pool_min_notional,
            min_prev_shares=config.dark_pool_min_prev_shares,
        )

    def tick(self) -> Dict[str, Any]:
        if not self._config.dark_pool_macro_enabled:
            return {"enabled": False}
        try:
            self._overlay.refresh(weeks_back=2)
            signal = self._overlay.signal()
            return {
                "enabled": True,
                "bias": signal["bias"],
                "exposure_multiplier": signal["exposure_multiplier"],
                "score": signal["score"],
                "macro_tickers": signal["macro_tickers"],
                "accumulation_count": signal["accumulation_count"],
                "distribution_count": signal["distribution_count"],
                "details": signal["details"][:5],
            }
        except Exception:
            logger.exception("DarkPoolMacroAgent tick failed")
            return {"enabled": True, "error": True}


class RiskAgent(BaseAgent):
    """Portfolio and per-trade risk supervisor."""

    def __init__(self, config: PolymarketConfig, state: StateManager, bus: AgentBus) -> None:
        super().__init__("risk-guard", config, state, bus)
        self._portfolio = PortfolioRiskGuard(config, state)
        self._risk = RiskGuard(config, state)

    def tick(self) -> Dict[str, Any]:
        assessment = self._portfolio.assess()
        return {
            "can_trade": assessment.can_trade,
            "position_scale": str(assessment.position_scale),
            "recommended_min_confidence": str(assessment.recommended_min_confidence) if assessment.recommended_min_confidence else None,
            "daily_pnl": str(assessment.daily_pnl),
            "weekly_pnl": str(assessment.weekly_pnl),
            "win_rate": str(assessment.win_rate),
            "consecutive_losses": assessment.consecutive_losses,
            "max_drawdown": str(assessment.max_drawdown),
            "reasons": assessment.reasons,
        }


class SecurityAgent(BaseAgent):
    """Tamper-evident audit and anomaly-detection agent."""

    def __init__(self, config: PolymarketConfig, state: StateManager, bus: AgentBus) -> None:
        super().__init__("security-audit", config, state, bus)

    def tick(self) -> Dict[str, Any]:
        closed = self._state.get_closed_trades(order="ASC")
        anomalies: List[str] = []

        # Detect duplicate closed-trade IDs (data integrity).
        ids = [str(t.get("id")) for t in closed]
        if len(ids) != len(set(ids)):
            dupes = len(ids) - len(set(ids))
            anomalies.append(f"duplicate_closed_trade_ids:{dupes}")

        # Detect impossible binary-market payouts.
        for t in closed:
            amount = float(t.get("amount", 0) or 0)
            entry = float(t.get("entry_price", 0) or 0)
            pnl = float(t.get("pnl", 0) or 0)
            if amount > 0 and entry > 0 and entry < 1:
                max_buy_payout = amount * (1 - entry) / entry
                max_sell_payout = amount
                max_loss = max(max_buy_payout, max_sell_payout)
                if abs(pnl) > max_loss * 1.05:
                    anomalies.append(f"impossible_payout:{t.get('id','')[:16]}:{pnl:.2f}")
                    break  # log one sample per pass

        # Hash-chain over closed trades.
        prev = self._state.get_latest_audit_hash()
        payload = json.dumps(
            [{k: t.get(k) for k in ("id", "closed_at", "pnl", "roi")} for t in closed],
            sort_keys=True,
            default=str,
        )
        record_hash = hashlib.sha256((prev + payload).encode("utf-8")).hexdigest()

        # Drawdown / kill-switch anomaly.
        peak = Decimal("0")
        running = Decimal("0")
        max_dd = Decimal("0")
        for t in closed:
            running += Decimal(str(t.get("pnl", 0) or 0))
            if running > peak:
                peak = running
            dd = peak - running
            if dd > max_dd:
                max_dd = dd
        drawdown_pct = (max_dd / self._config.paper_starting_bankroll * 100) if self._config.paper_starting_bankroll else Decimal("0")
        if (
            drawdown_pct >= self._config.meta_kill_switch_drawdown_pct
            and not (self._config.paper_unlimited_training and self._config.paper_trading)
        ):
            anomalies.append(f"kill_switch_drawdown:{drawdown_pct:.2f}%")

        self._state.record_audit_event(
            "closed_trades_snapshot",
            "all",
            record_hash,
            prev,
            anomalies,
        )

        return {
            "enabled": self._config.security_audit_enabled,
            "chain_hash": record_hash,
            "closed_trade_count": len(closed),
            "anomalies": anomalies,
            "max_drawdown_pct": float(drawdown_pct),
        }


class ExecutionAgent(BaseAgent):
    """Execution readiness and kill-switch enforcer."""

    def __init__(self, config: PolymarketConfig, state: StateManager, bus: AgentBus) -> None:
        super().__init__("execution", config, state, bus)

    def _training_target_reached(self) -> bool:
        if self._config.paper_training_target_win_rate <= 0:
            return False
        lookback = time.time() - (self._config.paper_training_lookback_days * 86400)
        trades = self._state.get_closed_paper_trades(since=lookback)
        total = len(trades)
        if total < self._config.paper_training_min_sample_trades:
            return False
        wins = sum(1 for t in trades if (t.get("pnl") or 0) > 0)
        win_rate = (wins / total) * 100
        return win_rate >= float(self._config.paper_training_target_win_rate)

    def tick(self) -> Dict[str, Any]:
        live_env = self._config.live_execution_enabled if hasattr(self._config, "live_execution_enabled") else False
        live_ready = (
            live_env
            and bool(self._config.telegram_bot_token)
            and bool(self._config.polygon_http_urls)
        )
        training_target = self._training_target_reached()
        return {
            "live_ready": live_ready,
            "paper_trading": self._config.paper_trading,
            "training_target_reached": training_target,
            "paper_bypass_portfolio_guard": self._config.paper_bypass_portfolio_guard,
            "paper_max_open_positions": self._config.paper_max_open_positions,
        }


class MetaAgent(BaseAgent):
    """Super-intelligent coordination agent: reads all agents and emits a single system decision."""

    def __init__(self, config: PolymarketConfig, state: StateManager, bus: AgentBus) -> None:
        super().__init__("meta", config, state, bus)
        self._agents: List[BaseAgent] = []
        self._latest_decision: Dict[str, Any] = {}

    def register(self, agent: BaseAgent) -> None:
        self._agents.append(agent)

    def tick(self) -> Dict[str, Any]:
        statuses: Dict[str, Dict[str, Any]] = {}
        for agent in self._agents:
            try:
                statuses[agent.name] = agent.status()
            except Exception:
                logger.exception("Failed to read status from %s", agent.name)
                statuses[agent.name] = {"error": True}

        risk = statuses.get("risk-guard", {})
        security = statuses.get("security-audit", {})
        wallet = statuses.get("wallet-scorer", {})
        confluence = statuses.get("confluence-learner", {})
        execution = statuses.get("execution", {})
        macro = statuses.get("dark-pool-macro", {})

        reasons: List[str] = []

        kill_switch = bool(security.get("anomalies"))
        if kill_switch:
            reasons.append("security anomalies detected")

        drawdown_pct = security.get("max_drawdown_pct", 0.0)
        # In unlimited paper-training mode, drawdown kill switch is suppressed so
        # the trainer can continue collecting outcomes until the win-rate target is met.
        if (
            drawdown_pct >= float(self._config.meta_kill_switch_drawdown_pct)
            and not (self._config.paper_unlimited_training and self._config.paper_trading)
        ):
            kill_switch = True
            reasons.append(f"max drawdown {drawdown_pct:.2f}% >= kill switch")

        if not risk.get("can_trade", True) and not self._config.paper_bypass_portfolio_guard:
            kill_switch = True
            reasons.append("portfolio risk gate tripped")

        training_mode = self._config.paper_trading and not execution.get("training_target_reached", False)
        live_mode = execution.get("live_ready", False) and not kill_switch and not training_mode

        # Position scale is the most conservative of risk, meta cap, and kill switch.
        try:
            risk_scale = Decimal(str(risk.get("position_scale") or "1"))
        except Exception:
            risk_scale = Decimal("1")
        meta_scale = self._config.meta_max_position_scale
        position_scale = min(risk_scale, meta_scale) if not kill_switch else Decimal("0")

        # Apply FINRA dark-pool macro overlay: risk-off reduces exposure, risk-on allows up to 1.5x.
        macro_multiplier = Decimal("1")
        if self._config.dark_pool_macro_enabled and macro.get("enabled"):
            try:
                macro_multiplier = Decimal(str(macro.get("exposure_multiplier") or "1"))
            except Exception:
                macro_multiplier = Decimal("1")
            if macro_multiplier < Decimal("1"):
                reasons.append(f"dark-pool macro risk-off: multiplier {macro_multiplier}")
            elif macro_multiplier > Decimal("1"):
                reasons.append(f"dark-pool macro risk-on: multiplier {macro_multiplier}")
            position_scale = position_scale * macro_multiplier

        # Confidence threshold: prefer learned confluence; fall back to config.
        learned_conf = confluence.get("min_confidence")
        if learned_conf is not None:
            try:
                min_confidence = Decimal(str(learned_conf))
            except Exception:
                min_confidence = self._config.confluence_min_confidence
        else:
            min_confidence = self._config.confluence_min_confidence

        # System confidence is a weighted consensus of subsystem health.
        wallet_score = float(wallet.get("top_score", 0.0) or 0.0)
        confluence_wr = float(confluence.get("win_rate", 0.0) or 0.0) / 100.0
        risk_health = 1.0 if risk.get("can_trade", True) else 0.0
        security_health = 0.0 if security.get("anomalies") else 1.0
        macro_health = float(macro.get("exposure_multiplier", 1.0) or 1.0) if macro.get("enabled") else 1.0
        macro_health = max(0.0, min(1.0, macro_health))
        system_confidence = (
            0.30 * wallet_score
            + 0.20 * confluence_wr
            + 0.20 * risk_health
            + 0.15 * security_health
            + 0.15 * macro_health
        )

        decision = {
            "allow": not kill_switch,
            "position_scale": str(position_scale),
            "min_confidence": str(min_confidence),
            "kill_switch": kill_switch,
            "training_mode": training_mode,
            "live_mode": live_mode,
            "system_confidence": round(system_confidence, 4),
            "macro": {
                "enabled": bool(macro.get("enabled")),
                "bias": macro.get("bias"),
                "exposure_multiplier": str(macro_multiplier),
                "score": macro.get("score"),
            },
            "reasons": reasons,
            "agent_statuses": {k: v for k, v in statuses.items() if isinstance(v, dict)},
        }
        self._latest_decision = decision
        self._state.record_meta_decision(decision)
        self._bus.publish("meta.decision", decision)
        return decision

    def recommend(self, event: Optional[Dict[str, Any]] = None) -> AgentRecommendation:
        dec = self._latest_decision or self._state.get_latest_meta_decision()
        if not dec:
            # No decision yet: default permissive so the MetaAgent does not block ingestion.
            return AgentRecommendation()
        return AgentRecommendation(
            allow=bool(dec.get("allow", True)),
            position_scale=Decimal(str(dec.get("position_scale", "1"))),
            min_confidence=Decimal(str(dec.get("min_confidence", "0"))),
            kill_switch=bool(dec.get("kill_switch", False)),
            training_mode=bool(dec.get("training_mode", False)),
            live_mode=bool(dec.get("live_mode", False)),
            reasons=list(dec.get("reasons", [])),
        )

    def status(self) -> Dict[str, Any]:
        return {
            "agents": [a.name for a in self._agents],
            "latest_decision": self._latest_decision,
            "stored_decision": self._state.get_latest_meta_decision(),
        }


class AgentSwarm:
    """Convenience wrapper that wires all agents and exposes orchestrator-facing helpers."""

    def __init__(self, config: PolymarketConfig, state: StateManager) -> None:
        self.config = config
        self.state = state
        self.bus = AgentBus()
        self.meta = MetaAgent(config, state, self.bus)
        self.wallet = WalletScoringAgent(config, state, self.bus)
        self.confluence = ConfluenceAgent(config, state, self.bus)
        self.risk = RiskAgent(config, state, self.bus)
        self.security = SecurityAgent(config, state, self.bus)
        self.execution = ExecutionAgent(config, state, self.bus)
        self.dark_pool_macro = DarkPoolMacroAgent(config, state, self.bus)

        self.meta.register(self.wallet)
        self.meta.register(self.confluence)
        self.meta.register(self.risk)
        self.meta.register(self.security)
        self.meta.register(self.execution)
        self.meta.register(self.dark_pool_macro)

    def start(self) -> None:
        if not self.config.meta_agent_enabled:
            return
        # Sub-agents run at staggered cadences to avoid DB write storms.
        self.wallet.start(float(self.config.adaptive_retrain_interval_seconds))
        self.confluence.start(float(self.config.adaptive_retrain_interval_seconds) + 5)
        self.risk.start(30.0)
        self.security.start(60.0)
        self.dark_pool_macro.start(300.0)
        self.execution.start(30.0)
        self.meta.start(float(self.config.meta_agent_interval_seconds))
        logger.info("Agent swarm started; meta interval=%ss", self.config.meta_agent_interval_seconds)

    def stop(self) -> None:
        self.meta.stop()
        self.execution.stop()
        self.dark_pool_macro.stop()
        self.security.stop()
        self.risk.stop()
        self.confluence.stop()
        self.wallet.stop()

    def recommend(self, event: Optional[Dict[str, Any]] = None) -> AgentRecommendation:
        return self.meta.recommend(event)

    def status(self) -> Dict[str, Any]:
        return {
            "enabled": self.config.meta_agent_enabled,
            "meta": self.meta.status(),
            "agents": self.state.get_all_agent_statuses(),
            "latest_decision": self.state.get_latest_meta_decision(),
        }
