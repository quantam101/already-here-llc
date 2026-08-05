"""
Polymarket Smart Wallet Tracker & Copy-Alert Engine — Python Runtime.

Military-grade, fully autonomous, declarative VHLL agent runtime for tracking
smart wallets on Polygon, profiling on-chain performance, and dispatching
Telegram alerts with deterministic risk guardrails.

Public API:
    PolymarketConfig   — env-driven, zero-secret hardening
    PolymarketListener — resilient WebSocket + RPC log ingestion
    WalletProfiler     — P&L / win-rate / Sharpe scoring engine
    TelegramAlertEngine — sub-second alert dispatcher
    RiskGuard          — slippage, sizing, and blacklist controls
    PolymarketOrchestrator — sovereign agent coordinator
"""

from __future__ import annotations

from .config import PolymarketConfig
from .listener import PolymarketListener
from .profiler import WalletProfiler
from .alerts import TelegramAlertEngine
from .risk import RiskGuard
from .signals import SignalConfluence
from .portfolio import PortfolioRiskGuard
from .backtest import MarketOracle, SubgraphLoader, WalkForwardBacktest
from .orchestrator import PolymarketOrchestrator

__all__ = [
    "PolymarketConfig",
    "PolymarketListener",
    "WalletProfiler",
    "TelegramAlertEngine",
    "RiskGuard",
    "SignalConfluence",
    "PortfolioRiskGuard",
    "MarketOracle",
    "SubgraphLoader",
    "WalkForwardBacktest",
    "PolymarketOrchestrator",
]
