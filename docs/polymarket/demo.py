#!/usr/bin/env python3
"""Short marketing demo for the Polymarket tracker."""

import os
import sys
from datetime import datetime, timezone
from decimal import Decimal

_repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, _repo_root)

from runtime.polymarket.backtest import WalkForwardBacktest

WALLET = "0x93b110ff31deb58847e841b3cbc6535b3e7b746e"
START = 1771363200
END = 1785634560


def print_banner(title: str) -> None:
    line = "=" * 64
    print(f"\n{line}\n{title.center(64)}\n{line}\n")


def main() -> None:
    print_banner("Polymarket Smart Wallet Tracker — Demo")
    print("Wallet:", WALLET)
    print("Window:", datetime.fromtimestamp(START, tz=timezone.utc).date(), "→", datetime.fromtimestamp(END, tz=timezone.utc).date())
    print("Starting bankroll: $1,000")
    print("Fixed trade size:  $50")
    print("Loading on-chain OrderFilled events from Goldsky...\n")

    bt = WalkForwardBacktest(
        wallets=[WALLET],
        fixed_order_usd=Decimal("50"),
        starting_bankroll=Decimal("1000"),
        min_wallet_profit=Decimal("0"),
        min_wallet_win_rate=Decimal("0"),
        min_wallet_sharpe=Decimal("-100"),
        use_confluence=False,
    )
    result = bt.run(START, END, first=5000)

    print_banner("Backtest Result")
    print(f"{'Total trades:':<24} {result['total_trades']}")
    print(f"{'Winners:':<24} {result['winners']}")
    print(f"{'Losers:':<24} {result['losers']}")
    print(f"{'Win rate:':<24} {result['win_rate']}%")
    print(f"{'Total P&L:':<24} ${result['total_pnl']}")
    print(f"{'Final bankroll:':<24} ${result['final_bankroll']}")
    print(f"{'ROI:':<24} {result['roi_pct']}%")
    print(f"{'Max drawdown:':<24} {result['max_drawdown_pct']}%")
    print(f"{'Profit factor:':<24} {result['profit_factor']}")
    print(f"{'Sharpe:':<24} {result['sharpe']}")

    # monthly breakdown
    monthly = {}
    for t in result["trades"]:
        ts = int(t["timestamp"])
        key = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m")
        monthly[key] = monthly.get(key, Decimal("0")) + Decimal(t["pnl"])
    print_banner("P&L by Month")
    for k in sorted(monthly):
        print(f"{k}: ${monthly[k]}")

    print_banner("Alert Example")
    print("🚨 Polymarket whale trade\n")
    print(f"Wallet:    {WALLET}")
    print("Token:     0x1724...702980")
    print("Market:    xrp-up-or-down-february-17-4pm-et")
    print("Side:      BUY")
    print("Shares:    75.76")
    print("Price:     0.6600")
    print("USD:       $50.00")
    print("Confluence Score: 0.42\n")

    print("Live execution is DISABLED by default.")
    print("Set POLYMARKET_LIVE_EXECUTION=true only after your own forward test.\n")


if __name__ == "__main__":
    main()
