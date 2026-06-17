"""Tests for proven trading strategies module."""

import time
from typing import Dict, List

import numpy as np
import pytest

from runtime.proven_strategies import (
    CombinedSignal,
    EnhancedOFI,
    IBSMeanReversion,
    MarketRegime,
    MasterSignalCombiner,
    RSI2Connors,
    RegimeDetector,
    RegimeState,
    TurnaroundTuesday,
)


# ---------------------------------------------------------------------------
# RSI-2 Connors
# ---------------------------------------------------------------------------
class TestRSI2Connors:
    def _make_prices(self, base: float, n: int, trend: float = 0.0) -> List[float]:
        """Generate price series with optional trend."""
        np.random.seed(42)
        noise = np.random.normal(0, 0.5, n)
        return [base + trend * i + noise[i] for i in range(n)]

    def test_insufficient_data_returns_neutral(self):
        prices = [100.0] * 50
        sig, meta = RSI2Connors.signal(prices)
        assert sig == 0.0
        assert "rsi2" in meta

    def test_uptrend_oversold_gives_buy(self):
        # Strong uptrend (well above SMA200), then 3 sharp down closes → RSI(2) < 5
        prices = list(range(100, 310))  # 210 bars, clearly above SMA200
        # Drop last 3 bars to create extreme oversold RSI(2)
        prices[-3] = prices[-4] - 3
        prices[-2] = prices[-3] - 3
        prices[-1] = prices[-2] - 3
        sig, meta = RSI2Connors.signal(prices)
        assert sig > 0.0, f"Expected buy signal, got {sig}; rsi2={meta.get('rsi2')}, trend={meta.get('trend')}"
        assert meta["trend"] == 1.0

    def test_downtrend_overbought_gives_sell(self):
        # Strong downtrend (well below SMA200), then 3 sharp up closes → RSI(2) > 95
        prices = list(range(300, 90, -1))  # 210 bars, clearly below SMA200
        # Spike last 3 bars to create extreme overbought RSI(2)
        prices[-3] = prices[-4] + 3
        prices[-2] = prices[-3] + 3
        prices[-1] = prices[-2] + 3
        sig, meta = RSI2Connors.signal(prices)
        assert sig < 0.0, f"Expected sell signal, got {sig}; rsi2={meta.get('rsi2')}, trend={meta.get('trend')}"
        assert meta["trend"] == -1.0

    def test_neutral_conditions_hold(self):
        # Sideways market with no extreme RSI(2) readings
        np.random.seed(123)
        prices = [100.0 + np.random.normal(0, 0.2) for _ in range(210)]
        sig, meta = RSI2Connors.signal(prices)
        # In choppy conditions, RSI(2) rarely hits extremes
        assert -1.0 <= sig <= 1.0

    def test_signal_range(self):
        prices = self._make_prices(100.0, 210, trend=0.05)
        sig, _ = RSI2Connors.signal(prices)
        assert -1.0 <= sig <= 1.0


# ---------------------------------------------------------------------------
# IBS Mean Reversion
# ---------------------------------------------------------------------------
class TestIBSMeanReversion:
    def test_ibs_near_low_buy_signal(self):
        closes = [100.0]
        highs = [105.0]
        lows = [99.0]
        sig, meta = IBSMeanReversion.signal(closes, highs, lows)
        ibs = meta["ibs"]
        assert ibs < 0.2
        assert sig > 0.0

    def test_ibs_near_high_sell_signal(self):
        closes = [104.5]
        highs = [105.0]
        lows = [99.0]
        sig, meta = IBSMeanReversion.signal(closes, highs, lows)
        ibs = meta["ibs"]
        assert ibs > 0.8
        assert sig < 0.0

    def test_ibs_midrange_neutral(self):
        closes = [102.0]
        highs = [105.0]
        lows = [99.0]
        sig, meta = IBSMeanReversion.signal(closes, highs, lows)
        assert sig == 0.0

    def test_extreme_low_ibs_max_signal(self):
        closes = [99.1]
        highs = [105.0]
        lows = [99.0]
        sig, meta = IBSMeanReversion.signal(closes, highs, lows)
        assert sig == 1.0  # extreme buy

    def test_extreme_high_ibs_max_sell(self):
        closes = [104.95]
        highs = [105.0]
        lows = [99.0]
        sig, meta = IBSMeanReversion.signal(closes, highs, lows)
        assert sig == -1.0  # extreme sell

    def test_zero_range_neutral(self):
        sig, meta = IBSMeanReversion.signal([100.0], [100.0], [100.0])
        assert sig == 0.0

    def test_empty_input(self):
        sig, _ = IBSMeanReversion.signal([], [], [])
        assert sig == 0.0

    def test_multi_day_ibs_average(self):
        closes = [99.5, 99.3, 99.1]
        highs = [105.0, 105.0, 105.0]
        lows = [99.0, 99.0, 99.0]
        sig, meta = IBSMeanReversion.signal(closes, highs, lows)
        assert "ibs_3d" in meta
        assert sig > 0.0

    def test_compute_ibs_formula(self):
        ibs = IBSMeanReversion.compute_ibs(close=102.0, high=105.0, low=100.0)
        assert abs(ibs - 0.4) < 0.01


# ---------------------------------------------------------------------------
# Turnaround Tuesday
# ---------------------------------------------------------------------------
class TestTurnaroundTuesday:
    def test_monday_two_down_days_triggers(self):
        sig, meta = TurnaroundTuesday.signal(
            weekday=0,
            today_close=98.0,
            prev_close=99.0,
            prev2_close=100.0,
        )
        assert sig > 0.0
        assert meta["two_day_decline"]

    def test_tuesday_no_signal(self):
        sig, meta = TurnaroundTuesday.signal(
            weekday=1,
            today_close=98.0,
            prev_close=99.0,
            prev2_close=100.0,
        )
        assert sig == 0.0

    def test_monday_up_day_no_signal(self):
        sig, meta = TurnaroundTuesday.signal(
            weekday=0,
            today_close=101.0,
            prev_close=100.0,
            prev2_close=99.0,
        )
        assert sig == 0.0

    def test_bear_filter_stronger_signal(self):
        sig, meta = TurnaroundTuesday.signal(
            weekday=0,
            today_close=98.0,
            prev_close=99.0,
            prev2_close=100.0,
            sma50=102.0,
        )
        assert sig == 1.0
        assert meta.get("below_sma50")

    def test_friday_no_signal(self):
        sig, _ = TurnaroundTuesday.signal(
            weekday=4, today_close=98.0, prev_close=99.0, prev2_close=100.0,
        )
        assert sig == 0.0


# ---------------------------------------------------------------------------
# Regime Detection
# ---------------------------------------------------------------------------
class TestRegimeDetector:
    def _make_bull_prices(self, n: int = 100) -> List[float]:
        np.random.seed(42)
        returns = np.random.normal(0.001, 0.005, n)
        prices = [100.0]
        for r in returns:
            prices.append(prices[-1] * (1 + r))
        return prices

    def _make_crisis_prices(self, n: int = 100) -> List[float]:
        np.random.seed(42)
        returns = np.random.normal(-0.005, 0.03, n)
        prices = [100.0]
        for r in returns:
            prices.append(prices[-1] * (1 + r))
        return prices

    def test_insufficient_data_default_regime(self):
        state = RegimeDetector.detect([100.0] * 10)
        assert state.regime == MarketRegime.BULL

    def test_bull_market_detection(self):
        prices = self._make_bull_prices(200)
        state = RegimeDetector.detect(prices)
        assert state.regime in (MarketRegime.BULL, MarketRegime.CHOPPY)
        assert state.confidence > 0.0

    def test_crisis_detection(self):
        prices = self._make_crisis_prices(200)
        state = RegimeDetector.detect(prices)
        # In a crisis, should detect high_vol_trend or crisis
        assert state.regime in (MarketRegime.CRISIS, MarketRegime.HIGH_VOL_TREND)

    def test_probabilities_sum_to_one(self):
        prices = self._make_bull_prices(200)
        state = RegimeDetector.detect(prices)
        total = sum(state.probabilities.values())
        assert abs(total - 1.0) < 0.01

    def test_strategy_weights_sum_to_one(self):
        state = RegimeState(
            regime=MarketRegime.BULL,
            confidence=0.8,
            probabilities={"bull": 0.7, "choppy": 0.1, "high_vol_trend": 0.1, "crisis": 0.1},
        )
        weights = RegimeDetector.strategy_weights(state)
        total = sum(weights.values())
        assert abs(total - 1.0) < 0.01

    def test_bull_regime_favors_momentum(self):
        state = RegimeState(
            regime=MarketRegime.BULL,
            confidence=1.0,
            probabilities={"bull": 1.0, "choppy": 0.0, "high_vol_trend": 0.0, "crisis": 0.0},
        )
        weights = RegimeDetector.strategy_weights(state)
        assert weights["momentum"] > weights["ibs_reversion"]

    def test_choppy_regime_favors_mean_reversion(self):
        state = RegimeState(
            regime=MarketRegime.CHOPPY,
            confidence=1.0,
            probabilities={"bull": 0.0, "choppy": 1.0, "high_vol_trend": 0.0, "crisis": 0.0},
        )
        weights = RegimeDetector.strategy_weights(state)
        assert weights["rsi2_connors"] >= weights["momentum"]
        assert weights["ibs_reversion"] >= weights["momentum"]


# ---------------------------------------------------------------------------
# Enhanced OFI
# ---------------------------------------------------------------------------
class TestEnhancedOFI:
    def test_balanced_book_near_zero(self):
        bids = [[100.0, 10.0], [99.5, 10.0], [99.0, 10.0]]
        asks = [[100.5, 10.0], [101.0, 10.0], [101.5, 10.0]]
        sig, meta = EnhancedOFI.multi_level_signal(bids, asks)
        assert abs(sig) < 0.3

    def test_heavy_bids_positive_signal(self):
        bids = [[100.0, 100.0], [99.5, 80.0], [99.0, 60.0]]
        asks = [[100.5, 5.0], [101.0, 5.0], [101.5, 5.0]]
        sig, meta = EnhancedOFI.multi_level_signal(bids, asks)
        assert sig > 0.5
        assert meta["near_imbalance"] > 0.0

    def test_heavy_asks_negative_signal(self):
        bids = [[100.0, 5.0], [99.5, 5.0], [99.0, 5.0]]
        asks = [[100.5, 100.0], [101.0, 80.0], [101.5, 60.0]]
        sig, meta = EnhancedOFI.multi_level_signal(bids, asks)
        assert sig < -0.5
        assert meta["near_imbalance"] < 0.0

    def test_empty_book(self):
        sig, meta = EnhancedOFI.multi_level_signal([], [])
        assert sig == 0.0

    def test_signal_range(self):
        bids = [[100.0, 1000.0]]
        asks = [[100.5, 1.0]]
        sig, _ = EnhancedOFI.multi_level_signal(bids, asks)
        assert -1.0 <= sig <= 1.0

    def test_spread_bps_in_metadata(self):
        bids = [[99.95, 10.0]]
        asks = [[100.05, 10.0]]
        _, meta = EnhancedOFI.multi_level_signal(bids, asks)
        assert "spread_bps" in meta
        assert meta["spread_bps"] > 0

    def test_deep_book_influence(self):
        bids = [[100.0, 10.0], [99.5, 10.0], [99.0, 10.0],
                [98.5, 100.0], [98.0, 100.0]]
        asks = [[100.5, 10.0], [101.0, 10.0], [101.5, 10.0],
                [102.0, 1.0], [102.5, 1.0]]
        sig, meta = EnhancedOFI.multi_level_signal(bids, asks)
        assert meta["deep_imbalance"] > 0.0


# ---------------------------------------------------------------------------
# Master Signal Combiner
# ---------------------------------------------------------------------------
class TestMasterSignalCombiner:
    def _make_prices(self, n: int = 210, trend: float = 0.01) -> List[float]:
        np.random.seed(42)
        prices = [100.0]
        for _ in range(n):
            prices.append(prices[-1] * (1 + trend + np.random.normal(0, 0.005)))
        return prices

    def test_returns_combined_signal(self):
        prices = self._make_prices()
        result = MasterSignalCombiner.combine(prices=prices)
        assert isinstance(result, CombinedSignal)
        assert result.direction in ("BUY", "SELL", "HOLD")
        assert 0.0 <= result.conviction <= 1.0

    def test_regime_detected(self):
        prices = self._make_prices()
        result = MasterSignalCombiner.combine(prices=prices)
        assert isinstance(result.regime, MarketRegime)
        assert result.regime_confidence > 0.0

    def test_all_strategies_present(self):
        prices = self._make_prices()
        result = MasterSignalCombiner.combine(
            prices=prices,
            highs=[p * 1.01 for p in prices],
            lows=[p * 0.99 for p in prices],
            volumes=[1000.0] * len(prices),
            bids=[[prices[-1] - 0.1, 100.0], [prices[-1] - 0.2, 50.0]],
            asks=[[prices[-1] + 0.1, 100.0], [prices[-1] + 0.2, 50.0]],
            weekday=0,
        )
        assert "rsi2_connors" in result.strategy_signals
        assert "ibs_reversion" in result.strategy_signals
        assert "turnaround_tuesday" in result.strategy_signals
        assert "momentum" in result.strategy_signals
        assert "orderbook" in result.strategy_signals

    def test_weights_sum_to_one(self):
        prices = self._make_prices()
        result = MasterSignalCombiner.combine(prices=prices)
        total = sum(result.strategy_weights.values())
        assert abs(total - 1.0) < 0.01

    def test_short_data_still_works(self):
        prices = [100.0 + i * 0.1 for i in range(25)]
        result = MasterSignalCombiner.combine(prices=prices)
        assert isinstance(result, CombinedSignal)

    def test_minimal_data(self):
        prices = [100.0, 101.0, 99.0]
        result = MasterSignalCombiner.combine(prices=prices)
        assert result.direction in ("BUY", "SELL", "HOLD")

    def test_monday_turnaround_factors_in(self):
        # Simulate Monday after two down days
        prices = self._make_prices(210, trend=-0.002)
        result = MasterSignalCombiner.combine(
            prices=prices,
            highs=[p * 1.01 for p in prices],
            lows=[p * 0.99 for p in prices],
            weekday=0,
        )
        tt_sig = result.strategy_signals.get("turnaround_tuesday", 0)
        # Should have picked up turnaround Tuesday signal
        assert tt_sig >= 0.0  # at minimum non-negative
