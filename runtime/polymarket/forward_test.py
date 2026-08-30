"""Out-of-sample walk-forward test for the Polymarket copy strategy.

The test splits historical fills into a training window and a test window:
1. Profile wallets on closed-market outcomes in the training window.
2. Apply the same filter rules used in production.
3. Copy BUY fills from qualified wallets in the test window.
4. Evaluate P&L against closed-market settlement prices.

This produces an honest, out-of-sample estimate of how the strategy would have
performed going forward from a chosen training cutoff.
"""

from __future__ import annotations

import argparse
import logging
import os
import statistics
import sys
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional

if __name__ == "__main__" and __package__ is None:
    _repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    sys.path.insert(0, _repo_root)
    __package__ = "runtime.polymarket"

from .backtest import BacktestTrade, BacktestWalletProfiler, MarketOracle, SubgraphLoader, _normalize_fill
from .config import PolymarketConfig

logger = logging.getLogger("polymarket-tracker")


@dataclass(frozen=True)
class WalkForwardResult:
    wallet: str
    train_trades: int
    train_pnl: Decimal
    train_win_rate: Decimal
    test_trades: int
    test_pnl: Decimal
    test_win_rate: Decimal
    test_drawdown_pct: Decimal


def _to_decimal(value: Any) -> Decimal:
    return Decimal(str(value)) if value is not None else Decimal("0")


class WalkForwardForwardTest:
    """Out-of-sample forward test using a train/test split."""

    def __init__(
        self,
        wallets: List[str],
        train_start: int,
        train_end: int,
        test_start: int,
        test_end: int,
        fixed_order_usd: Decimal = Decimal("50"),
        starting_bankroll: Decimal = Decimal("1000"),
        min_wallet_profit: Decimal = Decimal("10000"),
        min_wallet_win_rate: Decimal = Decimal("65"),
        min_wallet_sharpe: Decimal = Decimal("1"),
    ) -> None:
        self.wallets = [w.lower() for w in wallets if w]
        self.train_start = train_start
        self.train_end = train_end
        self.test_start = test_start
        self.test_end = test_end
        self.fixed_order_usd = fixed_order_usd
        self.starting_bankroll = starting_bankroll
        self.min_wallet_profit = min_wallet_profit
        self.min_wallet_win_rate = min_wallet_win_rate
        self.min_wallet_sharpe = min_wallet_sharpe
        self.oracle = MarketOracle()
        self.loader = SubgraphLoader()
        self.profiler = BacktestWalletProfiler(self.oracle)

    def _passes_filter(self, stats: Any) -> bool:
        return (
            stats.trades >= 10
            and stats.pnl >= self.min_wallet_profit
            and stats.win_rate >= self.min_wallet_win_rate
            and stats.sharpe >= self.min_wallet_sharpe
        )

    def _pnl_for_fill(self, fill: Dict[str, Any]) -> Optional[Decimal]:
        """Compute P&L for a single fixed-size copy trade if the market is closed."""
        token_id = fill.get("token_id")
        if not token_id:
            return None
        exit_p = self.oracle.exit_price(token_id)
        if exit_p is None:
            return None
        entry_p = Decimal(str(fill["price"]))
        if entry_p <= 0:
            return None
        shares = self.fixed_order_usd / entry_p
        return (exit_p - entry_p) * shares

    def run(self) -> Dict[str, Any]:
        self.oracle.load_closed_markets()
        logger.info(
            "Walk-forward test: train %s-%s, test %s-%s",
            self.train_start,
            self.train_end,
            self.test_start,
            self.test_end,
        )

        # Fetch the full range once; split into train/test by timestamp.
        raw_fills = self.loader.fetch_fills(self.wallets, self.train_start, self.test_end, first=5000)
        logger.info("Fetched %d raw OrderFilled events", len(raw_fills))

        normalized: List[Dict[str, Any]] = []
        for event in raw_fills:
            wallet = (event.get("maker") or "").lower()
            if wallet not in self.wallets:
                wallet = (event.get("taker") or "").lower()
            if wallet not in self.wallets:
                continue
            norm = _normalize_fill(event, wallet)
            if norm:
                normalized.append(norm)

        train_fills = [f for f in normalized if self.train_start <= f["timestamp"] < self.train_end]
        test_fills = [f for f in normalized if self.test_start <= f["timestamp"] < self.test_end]
        logger.info("Train fills: %d, Test fills: %d", len(train_fills), len(test_fills))

        # Phase 1: profile on training window.
        train_stats = self.profiler.profile(train_fills)
        qualified = {w: s for w, s in train_stats.items() if self._passes_filter(s)}
        logger.info(
            "Wallet filter on training: %d/%d qualified (>$%s, >%s%% win, sharpe>%s)",
            len(qualified),
            len(train_stats),
            self.min_wallet_profit,
            self.min_wallet_win_rate,
            self.min_wallet_sharpe,
        )

        # Phase 2: copy qualified BUY fills in test window.
        trades: List[BacktestTrade] = []
        for fill in test_fills:
            if fill["wallet"] not in qualified:
                continue
            if fill["wallet_side"] != "BUY":
                continue
            pnl = self._pnl_for_fill(fill)
            if pnl is None:
                continue
            entry_p = Decimal(str(fill["price"]))
            shares = self.fixed_order_usd / entry_p
            info = self.oracle.resolve(fill["token_id"]) or {}
            trades.append(
                BacktestTrade(
                    wallet=fill["wallet"],
                    token_id=fill["token_id"],
                    outcome=info.get("outcome", ""),
                    slug=info.get("slug", ""),
                    side=fill["wallet_side"],
                    entry_price=entry_p.quantize(Decimal("0.0001")),
                    exit_price=self.oracle.exit_price(fill["token_id"]) or Decimal("0"),
                    shares=shares.quantize(Decimal("0.0001")),
                    notional_usd=self.fixed_order_usd.quantize(Decimal("0.01")),
                    pnl=pnl.quantize(Decimal("0.01")),
                    roi=(((self.oracle.exit_price(fill["token_id"]) or Decimal("0")) / entry_p) - 1) * 100,
                    timestamp=fill["timestamp"],
                    tx_hash=fill["transaction_hash"],
                    confluence_score=Decimal("0"),
                    confluence_confidence=Decimal("0"),
                )
            )

        # Metrics
        pnls = [t.pnl for t in trades]
        wins = sum(1 for p in pnls if p > 0)
        losses = sum(1 for p in pnls if p < 0)
        total = len(pnls)
        win_rate = (Decimal(wins) / Decimal(total) * 100).quantize(Decimal("0.01")) if total else Decimal("0")
        total_pnl = sum(pnls, Decimal("0")).quantize(Decimal("0.01"))

        peak = self.starting_bankroll
        dd = Decimal("0")
        balance = self.starting_bankroll
        for p in pnls:
            balance += p
            if balance > peak:
                peak = balance
            dd = max(dd, peak - balance)
        max_dd_pct = (dd / peak * 100).quantize(Decimal("0.01")) if peak else Decimal("0")

        sharpe = Decimal("0")
        if len(pnls) > 1:
            try:
                mean = statistics.mean([float(p) for p in pnls])
                std = statistics.stdev([float(p) for p in pnls])
                if std:
                    sharpe = Decimal(str(mean / std)).quantize(Decimal("0.001"))
            except statistics.StatisticsError:
                pass

        return {
            "wallets": self.wallets,
            "train_window": {"start": self.train_start, "end": self.train_end, "fills": len(train_fills)},
            "test_window": {"start": self.test_start, "end": self.test_end, "fills": len(test_fills)},
            "qualified_train_wallets": list(qualified.keys()),
            "test_trades": total,
            "winners": wins,
            "losers": losses,
            "win_rate": str(win_rate),
            "total_pnl": str(total_pnl),
            "final_bankroll": str((self.starting_bankroll + total_pnl).quantize(Decimal("0.01"))),
            "roi_pct": str(((self.starting_bankroll + total_pnl - self.starting_bankroll) / self.starting_bankroll * 100).quantize(Decimal("0.01"))),
            "max_drawdown": str(dd.quantize(Decimal("0.01"))),
            "max_drawdown_pct": str(max_dd_pct),
            "sharpe": str(sharpe),
            "trades": [{
                "wallet": t.wallet,
                "token_id": t.token_id,
                "slug": t.slug,
                "side": t.side,
                "entry_price": str(t.entry_price),
                "exit_price": str(t.exit_price),
                "notional_usd": str(t.notional_usd),
                "pnl": str(t.pnl),
                "roi": str(t.roi),
                "timestamp": t.timestamp,
                "tx_hash": t.tx_hash,
            } for t in trades],
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="Polymarket walk-forward out-of-sample test")
    parser.add_argument("--wallets", required=True, help="Comma-separated watched wallet addresses")
    parser.add_argument("--train-start", type=int, required=True)
    parser.add_argument("--train-end", type=int, required=True)
    parser.add_argument("--test-start", type=int, required=True)
    parser.add_argument("--test-end", type=int, required=True)
    parser.add_argument("--fixed-usd", type=float, default=50.0)
    parser.add_argument("--bankroll", type=float, default=1000.0)
    parser.add_argument("--min-profit", type=float, default=10000.0)
    parser.add_argument("--min-win-rate", type=float, default=65.0)
    parser.add_argument("--min-sharpe", type=float, default=1.0)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    wf = WalkForwardForwardTest(
        wallets=[w.strip() for w in args.wallets.split(",") if w.strip()],
        train_start=args.train_start,
        train_end=args.train_end,
        test_start=args.test_start,
        test_end=args.test_end,
        fixed_order_usd=Decimal(str(args.fixed_usd)),
        starting_bankroll=Decimal(str(args.bankroll)),
        min_wallet_profit=Decimal(str(args.min_profit)),
        min_wallet_win_rate=Decimal(str(args.min_win_rate)),
        min_wallet_sharpe=Decimal(str(args.min_sharpe)),
    )
    result = wf.run()
    print(result)


if __name__ == "__main__":
    main()
