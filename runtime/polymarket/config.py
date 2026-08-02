"""Environment-driven configuration with military-grade safe defaults."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Optional, Sequence


def _env_list(name: str, default: Sequence[str] = ()) -> List[str]:
    raw = os.environ.get(name, "")
    if not raw:
        return list(default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


def _env_decimal(name: str, default: str) -> Decimal:
    try:
        return Decimal(os.environ.get(name, default))
    except Exception:
        return Decimal(default)


@dataclass(frozen=True)
class PolymarketConfig:
    """Immutable runtime configuration. No secrets are embedded."""

    # Polygon endpoints — primary WebSocket + HTTP failovers
    polygon_ws_url: str = ""
    polygon_http_urls: List[str] = field(default_factory=list)

    # Telegram
    telegram_bot_token: str = ""
    telegram_chat_ids: List[int] = field(default_factory=list)

    # Watch lists
    watched_wallets: List[str] = field(default_factory=list)
    exchange_addresses: List[str] = field(default_factory=list)
    conditional_tokens_address: str = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045"

    # Historical / market data sources
    subgraph_url: Optional[str] = None
    clob_api_url: str = "https://clob.polymarket.com"
    clob_api_key: str = ""
    polynode_api_key: str = ""

    # State
    db_path: str = "./data/polymarket_tracker.db"
    redis_url: Optional[str] = None

    # Ingestion tuning
    reconnect_delay_seconds: float = 1.0
    reconnect_max_delay_seconds: float = 60.0
    backfill_blocks: int = 100
    http_poll_interval_seconds: float = 5.0

    # Alert tuning
    alert_cooldown_seconds: int = 60
    max_daily_alerts_per_wallet: int = 100
    telegram_timeout_seconds: float = 2.0

    # Risk guardrails
    max_slippage_pct: Decimal = Decimal("2.0")
    fixed_order_usd: Decimal = Decimal("50.00")
    min_wallet_profit_usd: Decimal = Decimal("10000.00")
    min_win_rate_pct: Decimal = Decimal("65.0")
    min_sharpe_ratio: Decimal = Decimal("1.0")
    blacklist_market_ids: List[str] = field(default_factory=list)
    whitelist_only: bool = False

    # Signal confluence (90% win-rate ensemble idea adapted to prediction markets)
    confluence_enabled: bool = False
    confluence_threshold: Decimal = Decimal("0.20")
    confluence_min_confidence: Decimal = Decimal("50.0")

    # Portfolio-level risk guard (daily/weekly loss, drawdown, streaks)
    portfolio_daily_loss_limit: Decimal = Decimal("200.00")
    portfolio_weekly_loss_limit: Decimal = Decimal("500.00")
    portfolio_max_drawdown_pct: Decimal = Decimal("30.0")
    portfolio_min_win_rate_pct: Decimal = Decimal("50.0")
    portfolio_consecutive_loss_limit: int = 5

    # Sovereign / telemetry
    audit_log_path: str = "./data/polymarket_audit.jsonl"
    telemetry_service: str = "polymarket-tracker"
    log_level: str = "INFO"

    @classmethod
    def from_env(cls) -> "PolymarketConfig":
        return cls(
            polygon_ws_url=os.environ.get("POLYGON_WS_URL", ""),
            polygon_http_urls=_env_list(
                "POLYGON_HTTP_URLS",
                [
                    "https://polygon-rpc.com",
                    "https://polygon.drpc.org",
                    "https://polygon-bor-rpc.publicnode.com",
                ],
            ),
            telegram_bot_token=os.environ.get("TELEGRAM_BOT_TOKEN", ""),
            telegram_chat_ids=[
                int(x.strip())
                for x in os.environ.get("TELEGRAM_CHAT_IDS", "").split(",")
                if x.strip().lstrip("-").isdigit()
            ],
            watched_wallets=[w.lower() for w in _env_list("WATCHED_WALLETS")],
            exchange_addresses=[
                a.lower()
                for a in _env_list(
                    "POLYMARKET_EXCHANGE_ADDRESSES",
                    [
                        "0xE111180000d2663C0091e4f400237545B87B996B",
                        "0xe2222d279d744050d28e00520010520000310F59",
                        "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
                    ],
                )
            ],
            conditional_tokens_address=os.environ.get(
                "POLYMARKET_CONDITIONAL_TOKENS_ADDRESS",
                "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
            ),
            subgraph_url=os.environ.get("POLYMARKET_SUBGRAPH_URL") or None,
            clob_api_url=os.environ.get("POLYMARKET_CLOB_API_URL", "https://clob.polymarket.com"),
            clob_api_key=os.environ.get("POLYMARKET_CLOB_API_KEY", ""),
            polynode_api_key=os.environ.get("POLYNODE_API_KEY", ""),
            db_path=os.environ.get("POLYMARKET_DB_PATH", "./data/polymarket_tracker.db"),
            redis_url=os.environ.get("REDIS_URL") or None,
            reconnect_delay_seconds=float(
                os.environ.get("POLYMARKET_RECONNECT_DELAY_SECONDS", "1.0")
            ),
            reconnect_max_delay_seconds=float(
                os.environ.get("POLYMARKET_RECONNECT_MAX_DELAY_SECONDS", "60.0")
            ),
            backfill_blocks=_env_int("POLYMARKET_BACKFILL_BLOCKS", 100),
            http_poll_interval_seconds=float(
                os.environ.get("POLYMARKET_HTTP_POLL_INTERVAL_SECONDS", "5.0")
            ),
            alert_cooldown_seconds=_env_int("POLYMARKET_ALERT_COOLDOWN_SECONDS", 60),
            max_daily_alerts_per_wallet=_env_int("POLYMARKET_MAX_DAILY_ALERTS", 100),
            telegram_timeout_seconds=float(
                os.environ.get("TELEGRAM_TIMEOUT_SECONDS", "2.0")
            ),
            max_slippage_pct=_env_decimal("POLYMARKET_MAX_SLIPPAGE_PCT", "2.0"),
            fixed_order_usd=_env_decimal("POLYMARKET_FIXED_ORDER_USD", "50.00"),
            min_wallet_profit_usd=_env_decimal("POLYMARKET_MIN_PROFIT_USD", "10000.00"),
            min_win_rate_pct=_env_decimal("POLYMARKET_MIN_WIN_RATE_PCT", "65.0"),
            min_sharpe_ratio=_env_decimal("POLYMARKET_MIN_SHARPE_RATIO", "1.0"),
            blacklist_market_ids=[m.lower() for m in _env_list("POLYMARKET_BLACKLIST_MARKET_IDS")],
            whitelist_only=(os.environ.get("POLYMARKET_WHITELIST_ONLY", "false").lower() == "true"),
            confluence_enabled=(os.environ.get("POLYMARKET_CONFLUENCE_ENABLED", "false").lower() == "true"),
            confluence_threshold=_env_decimal("POLYMARKET_CONFLUENCE_THRESHOLD", "0.20"),
            confluence_min_confidence=_env_decimal("POLYMARKET_CONFLUENCE_MIN_CONFIDENCE", "50.0"),
            portfolio_daily_loss_limit=_env_decimal("POLYMARKET_PORTFOLIO_DAILY_LOSS_LIMIT", "200.00"),
            portfolio_weekly_loss_limit=_env_decimal("POLYMARKET_PORTFOLIO_WEEKLY_LOSS_LIMIT", "500.00"),
            portfolio_max_drawdown_pct=_env_decimal("POLYMARKET_PORTFOLIO_MAX_DRAWDOWN_PCT", "30.0"),
            portfolio_min_win_rate_pct=_env_decimal("POLYMARKET_PORTFOLIO_MIN_WIN_RATE_PCT", "50.0"),
            portfolio_consecutive_loss_limit=_env_int("POLYMARKET_PORTFOLIO_CONSECUTIVE_LOSS_LIMIT", 5),
            audit_log_path=os.environ.get("POLYMARKET_AUDIT_LOG", "./data/polymarket_audit.jsonl"),
            telemetry_service=os.environ.get("POLYMARKET_TELEMETRY_SERVICE", "polymarket-tracker"),
            log_level=os.environ.get("POLYMARKET_LOG_LEVEL", "INFO"),
        )

    @property
    def has_telegram(self) -> bool:
        return bool(self.telegram_bot_token and self.telegram_chat_ids)

    @property
    def has_polygon(self) -> bool:
        return bool(self.polygon_ws_url) or bool(self.polygon_http_urls)
