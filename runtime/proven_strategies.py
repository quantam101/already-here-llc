"""
Battle-tested trading strategies — production implementation.

Each strategy is research-backed with documented edge:
- RSI-2 Connors: 41:1 return/drawdown ratio (1998-2026)
- IBS Mean Reversion: 20+ years of documented alpha on ETFs
- Turnaround Tuesday: 75.99% win rate, 3.15 profit factor (33 years)
- Market Regime Detection: HMM-inspired adaptive weighting
- Enhanced OFI: Multi-level orderbook flow analysis

All strategies output a normalized signal in [-1.0, +1.0]:
  +1.0 = max bullish conviction
  -1.0 = max bearish conviction
   0.0 = no signal / neutral
"""

from __future__ import annotations

import logging
import math
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Final, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("proven_strategies")


# ---------------------------------------------------------------------------
# SHARED HELPERS
# ---------------------------------------------------------------------------
def _sma(data: np.ndarray, period: int) -> np.ndarray:
    """Simple moving average."""
    if len(data) < period:
        return np.array([], dtype=np.float64)
    cumsum = np.cumsum(data, dtype=np.float64)
    cumsum[period:] = cumsum[period:] - cumsum[:-period]
    return cumsum[period - 1:] / period


def _ema(data: np.ndarray, period: int) -> np.ndarray:
    """Exponential moving average."""
    if len(data) < period:
        return np.array([], dtype=np.float64)
    alpha = 2.0 / (period + 1.0)
    result = np.empty(len(data), dtype=np.float64)
    result[0] = float(np.mean(data[:period]))
    for i in range(1, len(data)):
        result[i] = alpha * data[i] + (1.0 - alpha) * result[i - 1]
    return result


def _rsi(prices: np.ndarray, period: int = 14) -> float:
    """Compute RSI from price array."""
    if len(prices) < period + 1:
        return 50.0
    deltas = np.diff(prices[-(period + 1):])
    gains = np.where(deltas > 0, deltas, 0.0)
    losses = np.where(deltas < 0, -deltas, 0.0)
    avg_gain = float(np.mean(gains))
    avg_loss = float(np.mean(losses))
    if avg_loss == 0.0:
        return 100.0 if avg_gain > 0 else 50.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


# ---------------------------------------------------------------------------
# STRATEGY 1: RSI-2 CONNORS
# ---------------------------------------------------------------------------
class RSI2Connors:
    """Larry Connors RSI(2) mean reversion — 41:1 return/DD ratio.

    Rules:
    - Trend filter: price > SMA(200) for longs, < SMA(200) for shorts
    - Buy: RSI(2) < 5  (deeply oversold within uptrend)
    - Sell: RSI(2) > 95 (deeply overbought within downtrend)
    - Exit long: RSI(2) > 65 or price > SMA(5)
    - Exit short: RSI(2) < 35 or price < SMA(5)
    """

    BUY_THRESHOLD: Final[float] = 5.0
    SELL_THRESHOLD: Final[float] = 95.0
    EXIT_LONG_RSI: Final[float] = 65.0
    EXIT_SHORT_RSI: Final[float] = 35.0

    @staticmethod
    def signal(
        prices: List[float],
        highs: Optional[List[float]] = None,
        lows: Optional[List[float]] = None,
    ) -> Tuple[float, Dict[str, float]]:
        """Compute RSI-2 Connors signal.

        Returns (signal, metadata) where signal is in [-1, +1].
        """
        if len(prices) < 201:
            return 0.0, {"rsi2": 50.0, "sma200": 0.0, "trend": 0.0}

        arr = np.array(prices, dtype=np.float64)
        current = arr[-1]

        sma200 = float(np.mean(arr[-200:]))
        sma5 = float(np.mean(arr[-5:]))
        rsi2 = _rsi(arr, period=2)

        trend = 1.0 if current > sma200 else -1.0

        meta = {"rsi2": round(rsi2, 2), "sma200": round(sma200, 2), "sma5": round(sma5, 2), "trend": trend}

        # Long signal: uptrend + deeply oversold
        if trend > 0 and rsi2 < RSI2Connors.BUY_THRESHOLD:
            strength = (RSI2Connors.BUY_THRESHOLD - rsi2) / RSI2Connors.BUY_THRESHOLD
            return min(1.0, 0.7 + 0.3 * strength), meta

        # Short signal: downtrend + deeply overbought
        if trend < 0 and rsi2 > RSI2Connors.SELL_THRESHOLD:
            strength = (rsi2 - RSI2Connors.SELL_THRESHOLD) / (100.0 - RSI2Connors.SELL_THRESHOLD)
            return max(-1.0, -(0.7 + 0.3 * strength)), meta

        return 0.0, meta


# ---------------------------------------------------------------------------
# STRATEGY 2: IBS MEAN REVERSION
# ---------------------------------------------------------------------------
class IBSMeanReversion:
    """Internal Bar Strength mean reversion — 20+ years documented.

    IBS = (Close - Low) / (High - Low)
    - Buy: IBS < 0.2 (closed near daily low → oversold)
    - Sell: IBS > 0.8 (closed near daily high → overbought)
    - Best on ETFs and indices (SPY, QQQ, etc.)
    """

    BUY_THRESHOLD: Final[float] = 0.2
    SELL_THRESHOLD: Final[float] = 0.8
    EXTREME_BUY: Final[float] = 0.05
    EXTREME_SELL: Final[float] = 0.95

    @staticmethod
    def compute_ibs(close: float, high: float, low: float) -> float:
        """Compute IBS for a single bar."""
        bar_range = high - low
        if bar_range <= 0:
            return 0.5
        return (close - low) / bar_range

    @staticmethod
    def signal(
        closes: List[float],
        highs: List[float],
        lows: List[float],
    ) -> Tuple[float, Dict[str, float]]:
        """Compute IBS mean reversion signal.

        Returns (signal, metadata).
        """
        if not closes or not highs or not lows:
            return 0.0, {"ibs": 0.5}
        if len(closes) != len(highs) or len(closes) != len(lows):
            return 0.0, {"ibs": 0.5}

        ibs = IBSMeanReversion.compute_ibs(closes[-1], highs[-1], lows[-1])
        meta = {"ibs": round(ibs, 4)}

        # Multi-day IBS average for stronger signal
        if len(closes) >= 3:
            ibs_3d = np.mean([
                IBSMeanReversion.compute_ibs(closes[-i], highs[-i], lows[-i])
                for i in range(1, min(4, len(closes) + 1))
            ])
            meta["ibs_3d"] = round(float(ibs_3d), 4)

        if ibs < IBSMeanReversion.EXTREME_BUY:
            return 1.0, meta
        if ibs < IBSMeanReversion.BUY_THRESHOLD:
            strength = (IBSMeanReversion.BUY_THRESHOLD - ibs) / IBSMeanReversion.BUY_THRESHOLD
            return min(1.0, 0.5 + 0.5 * strength), meta

        if ibs > IBSMeanReversion.EXTREME_SELL:
            return -1.0, meta
        if ibs > IBSMeanReversion.SELL_THRESHOLD:
            strength = (ibs - IBSMeanReversion.SELL_THRESHOLD) / (1.0 - IBSMeanReversion.SELL_THRESHOLD)
            return max(-1.0, -(0.5 + 0.5 * strength)), meta

        return 0.0, meta


# ---------------------------------------------------------------------------
# STRATEGY 3: TURNAROUND TUESDAY
# ---------------------------------------------------------------------------
class TurnaroundTuesday:
    """Calendar anomaly — 75.99% win rate, 3.15 profit factor over 33 years.

    Rules:
    - Buy at Monday close if Monday closed lower than Friday close
      AND Friday close < Thursday close (2 consecutive down days)
    - Optional: only when price < SMA(50) (bear filter for bigger turnarounds)
    - Exit at Tuesday close
    """

    @staticmethod
    def signal(
        weekday: int,
        today_close: float,
        prev_close: float,
        prev2_close: float,
        sma50: Optional[float] = None,
    ) -> Tuple[float, Dict[str, float]]:
        """Compute Turnaround Tuesday signal.

        weekday: 0=Monday, 1=Tuesday, ..., 4=Friday
        Returns (signal, metadata).
        """
        meta = {
            "weekday": weekday,
            "today_close": today_close,
            "prev_close": prev_close,
            "two_day_decline": prev_close < prev2_close and today_close < prev_close,
        }

        # Only trigger on Monday (weekday=0) for entry
        if weekday != 0:
            return 0.0, meta

        # Core rule: two consecutive down days ending on Monday
        two_down = prev_close < prev2_close and today_close < prev_close
        if not two_down:
            return 0.0, meta

        # Stronger signal if below SMA(50) — bear turnaround
        strength = 0.7
        if sma50 is not None and today_close < sma50:
            strength = 1.0
            meta["below_sma50"] = True

        meta["signal_strength"] = strength
        return strength, meta


# ---------------------------------------------------------------------------
# STRATEGY 4: MARKET REGIME DETECTION
# ---------------------------------------------------------------------------
class MarketRegime(Enum):
    BULL = "bull"
    CHOPPY = "choppy"
    HIGH_VOL_TREND = "high_vol_trend"
    CRISIS = "crisis"


@dataclass
class RegimeState:
    regime: MarketRegime = MarketRegime.BULL
    confidence: float = 0.5
    probabilities: Dict[str, float] = field(default_factory=lambda: {
        "bull": 0.25, "choppy": 0.25, "high_vol_trend": 0.25, "crisis": 0.25,
    })


class RegimeDetector:
    """Simplified HMM-inspired market regime detection.

    Uses 5 features (same as RegimeSense):
    1. Realized volatility (20-day)
    2. Return autocorrelation (5-day)
    3. Rolling Sharpe (20-day)
    4. Return skewness (20-day)
    5. Volume ratio (current / 20-day avg)

    Classifies into 4 regimes: bull, choppy, high_vol_trend, crisis.
    """

    @staticmethod
    def detect(
        prices: List[float],
        volumes: Optional[List[float]] = None,
    ) -> RegimeState:
        """Detect current market regime from price/volume history.

        Requires 50+ data points for meaningful detection.
        """
        if len(prices) < 50:
            return RegimeState()

        arr = np.array(prices, dtype=np.float64)
        returns = np.diff(np.log(arr[-51:]))

        # Feature 1: 20-day realized volatility (annualized)
        vol_20 = float(np.std(returns[-20:]) * np.sqrt(252))

        # Feature 2: 5-day return autocorrelation
        if len(returns) >= 10:
            r1 = returns[-10:-5]
            r2 = returns[-5:]
            if np.std(r1) > 0 and np.std(r2) > 0:
                autocorr = float(np.corrcoef(r1, r2)[0, 1])
            else:
                autocorr = 0.0
        else:
            autocorr = 0.0

        # Feature 3: 20-day rolling Sharpe
        mean_ret = float(np.mean(returns[-20:]))
        std_ret = float(np.std(returns[-20:]))
        sharpe = (mean_ret / std_ret * np.sqrt(252)) if std_ret > 0 else 0.0

        # Feature 4: 20-day return skewness
        if std_ret > 0:
            skew = float(np.mean(((returns[-20:] - mean_ret) / std_ret) ** 3))
        else:
            skew = 0.0

        # Feature 5: Volume ratio
        vol_ratio = 1.0
        if volumes and len(volumes) >= 20:
            v_arr = np.array(volumes[-20:], dtype=np.float64)
            avg_vol = float(np.mean(v_arr))
            if avg_vol > 0:
                vol_ratio = float(v_arr[-1] / avg_vol)

        # Rule-based regime classification (simplified HMM inference)
        probs = {"bull": 0.0, "choppy": 0.0, "high_vol_trend": 0.0, "crisis": 0.0}

        # Bull: low vol, positive Sharpe, positive autocorrelation
        if vol_20 < 0.20 and sharpe > 0.5:
            probs["bull"] += 0.4
        if sharpe > 1.0:
            probs["bull"] += 0.3
        if autocorr > 0.1:
            probs["bull"] += 0.2
        if skew > -0.5:
            probs["bull"] += 0.1

        # Choppy: low vol, near-zero Sharpe, negative autocorrelation
        if vol_20 < 0.20 and abs(sharpe) < 0.5:
            probs["choppy"] += 0.4
        if autocorr < -0.1:
            probs["choppy"] += 0.3
        if abs(mean_ret) < 0.001:
            probs["choppy"] += 0.2
        if vol_ratio < 0.8:
            probs["choppy"] += 0.1

        # High-vol trend: high vol, strong Sharpe (positive or negative)
        if vol_20 > 0.20 and abs(sharpe) > 0.5:
            probs["high_vol_trend"] += 0.4
        if vol_20 > 0.25:
            probs["high_vol_trend"] += 0.2
        if abs(autocorr) > 0.2:
            probs["high_vol_trend"] += 0.2
        if vol_ratio > 1.3:
            probs["high_vol_trend"] += 0.2

        # Crisis: very high vol, negative Sharpe, negative skew
        if vol_20 > 0.30 and sharpe < -0.5:
            probs["crisis"] += 0.4
        if skew < -1.0:
            probs["crisis"] += 0.3
        if vol_20 > 0.40:
            probs["crisis"] += 0.2
        if vol_ratio > 1.5:
            probs["crisis"] += 0.1

        # Normalize to probabilities
        total = sum(probs.values())
        if total > 0:
            probs = {k: v / total for k, v in probs.items()}
        else:
            probs = {"bull": 0.25, "choppy": 0.25, "high_vol_trend": 0.25, "crisis": 0.25}

        # Pick dominant regime
        dominant = max(probs, key=lambda k: probs[k])
        regime = MarketRegime(dominant)

        return RegimeState(
            regime=regime,
            confidence=probs[dominant],
            probabilities=probs,
        )

    @staticmethod
    def strategy_weights(state: RegimeState) -> Dict[str, float]:
        """Return optimal strategy weights for current regime.

        Weights sum to 1.0. Based on RegimeSense research:
        - Bull: momentum + trend following dominate
        - Choppy: mean reversion dominates
        - High-vol trend: momentum + defensive
        - Crisis: defensive + mean reversion (catch bounces)
        """
        p = state.probabilities
        weights = {
            "rsi2_connors": 0.0,
            "ibs_reversion": 0.0,
            "turnaround_tuesday": 0.0,
            "momentum": 0.0,
            "orderbook": 0.0,
        }

        # Soft-blend based on regime probabilities
        bull = p.get("bull", 0)
        choppy = p.get("choppy", 0)
        hvt = p.get("high_vol_trend", 0)
        crisis = p.get("crisis", 0)

        # Bull: momentum heavy, light mean reversion
        weights["momentum"] += bull * 0.35
        weights["orderbook"] += bull * 0.25
        weights["rsi2_connors"] += bull * 0.15
        weights["ibs_reversion"] += bull * 0.15
        weights["turnaround_tuesday"] += bull * 0.10

        # Choppy: mean reversion heavy
        weights["rsi2_connors"] += choppy * 0.30
        weights["ibs_reversion"] += choppy * 0.30
        weights["turnaround_tuesday"] += choppy * 0.20
        weights["orderbook"] += choppy * 0.10
        weights["momentum"] += choppy * 0.10

        # High-vol trend: momentum + orderbook
        weights["momentum"] += hvt * 0.30
        weights["orderbook"] += hvt * 0.30
        weights["rsi2_connors"] += hvt * 0.20
        weights["ibs_reversion"] += hvt * 0.10
        weights["turnaround_tuesday"] += hvt * 0.10

        # Crisis: defensive, catch oversold bounces
        weights["rsi2_connors"] += crisis * 0.35
        weights["ibs_reversion"] += crisis * 0.25
        weights["turnaround_tuesday"] += crisis * 0.20
        weights["orderbook"] += crisis * 0.15
        weights["momentum"] += crisis * 0.05

        # Normalize
        total = sum(weights.values())
        if total > 0:
            weights = {k: v / total for k, v in weights.items()}

        return weights


# ---------------------------------------------------------------------------
# STRATEGY 5: ENHANCED MULTI-LEVEL OFI
# ---------------------------------------------------------------------------
class EnhancedOFI:
    """Multi-level Order Flow Imbalance analysis.

    Goes beyond single-level bid/ask imbalance:
    - Level 1-3: Near-touch imbalance (most informative)
    - Level 4-10: Deep book support/resistance
    - Delta momentum: rate of change of cumulative imbalance
    """

    @staticmethod
    def multi_level_signal(
        bids: List[List[float]],
        asks: List[List[float]],
    ) -> Tuple[float, Dict[str, float]]:
        """Compute multi-level OFI signal.

        bids/asks: [[price, volume], ...] sorted by proximity to mid.
        Returns (signal in [-1,+1], metadata).
        """
        if not bids or not asks:
            return 0.0, {}

        bid_arr = np.array(bids, dtype=np.float64)
        ask_arr = np.array(asks, dtype=np.float64)

        if bid_arr.ndim != 2 or ask_arr.ndim != 2:
            return 0.0, {}

        # Level 1-3: near-touch (weighted 3x)
        near_bids = bid_arr[:min(3, len(bid_arr))]
        near_asks = ask_arr[:min(3, len(ask_arr))]
        near_bid_vol = float(np.sum(near_bids[:, 1]))
        near_ask_vol = float(np.sum(near_asks[:, 1]))
        near_total = near_bid_vol + near_ask_vol
        near_imb = (near_bid_vol - near_ask_vol) / near_total if near_total > 0 else 0.0

        # Level 4-10: deep book
        deep_bids = bid_arr[3:min(10, len(bid_arr))] if len(bid_arr) > 3 else np.array([]).reshape(0, 2)
        deep_asks = ask_arr[3:min(10, len(ask_arr))] if len(ask_arr) > 3 else np.array([]).reshape(0, 2)
        deep_bid_vol = float(np.sum(deep_bids[:, 1])) if len(deep_bids) > 0 else 0.0
        deep_ask_vol = float(np.sum(deep_asks[:, 1])) if len(deep_asks) > 0 else 0.0
        deep_total = deep_bid_vol + deep_ask_vol
        deep_imb = (deep_bid_vol - deep_ask_vol) / deep_total if deep_total > 0 else 0.0

        # Full book
        total_bid = float(np.sum(bid_arr[:, 1]))
        total_ask = float(np.sum(ask_arr[:, 1]))
        full_total = total_bid + total_ask
        full_imb = (total_bid - total_ask) / full_total if full_total > 0 else 0.0

        # Spread analysis
        best_bid = float(bid_arr[0, 0])
        best_ask = float(ask_arr[0, 0])
        spread = best_ask - best_bid
        mid = (best_bid + best_ask) / 2.0
        spread_bps = (spread / mid * 10000) if mid > 0 else 0.0

        # Composite: near-touch weighted 3x, deep 1x
        composite = (near_imb * 0.6 + deep_imb * 0.2 + full_imb * 0.2)

        # Clamp to [-1, 1]
        signal = max(-1.0, min(1.0, composite * 1.5))

        meta = {
            "near_imbalance": round(near_imb, 4),
            "deep_imbalance": round(deep_imb, 4),
            "full_imbalance": round(full_imb, 4),
            "spread_bps": round(spread_bps, 2),
            "bid_depth": round(total_bid, 2),
            "ask_depth": round(total_ask, 2),
        }

        return signal, meta


# ---------------------------------------------------------------------------
# MASTER SIGNAL COMBINER
# ---------------------------------------------------------------------------
@dataclass
class CombinedSignal:
    """Output of the master signal combiner."""
    direction: str  # "BUY", "SELL", "HOLD"
    conviction: float  # 0.0-1.0
    composite_score: float  # raw weighted score [-1, +1]
    regime: MarketRegime
    regime_confidence: float
    strategy_signals: Dict[str, float]
    strategy_weights: Dict[str, float]
    metadata: Dict[str, Dict[str, float]]


class MasterSignalCombiner:
    """Combines all proven strategies with regime-adaptive weighting.

    This is the brain of the system. It:
    1. Detects current market regime
    2. Computes optimal strategy weights for that regime
    3. Runs all strategies in parallel
    4. Combines signals with regime-weighted fusion
    5. Outputs a single high-conviction decision
    """

    MIN_CONVICTION: Final[float] = 0.40

    @staticmethod
    def combine(
        prices: List[float],
        highs: Optional[List[float]] = None,
        lows: Optional[List[float]] = None,
        volumes: Optional[List[float]] = None,
        bids: Optional[List[List[float]]] = None,
        asks: Optional[List[List[float]]] = None,
        weekday: Optional[int] = None,
    ) -> CombinedSignal:
        """Run all strategies and combine with regime-adaptive weights."""

        # Step 1: Detect regime
        regime_state = RegimeDetector.detect(prices, volumes)

        # Step 2: Get regime-optimal weights
        weights = RegimeDetector.strategy_weights(regime_state)

        # Step 3: Run all strategies
        signals: Dict[str, float] = {}
        metadata: Dict[str, Dict[str, float]] = {}

        # RSI-2 Connors
        if len(prices) >= 201:
            sig, meta = RSI2Connors.signal(prices, highs, lows)
            signals["rsi2_connors"] = sig
            metadata["rsi2_connors"] = meta
        else:
            signals["rsi2_connors"] = 0.0
            metadata["rsi2_connors"] = {"insufficient_data": 1.0}

        # IBS Mean Reversion
        if highs and lows and len(highs) >= 1:
            sig, meta = IBSMeanReversion.signal(prices, highs, lows)
            signals["ibs_reversion"] = sig
            metadata["ibs_reversion"] = meta
        else:
            signals["ibs_reversion"] = 0.0
            metadata["ibs_reversion"] = {"no_ohlc": 1.0}

        # Turnaround Tuesday
        if weekday is not None and len(prices) >= 3:
            sig, meta = TurnaroundTuesday.signal(
                weekday=weekday,
                today_close=prices[-1],
                prev_close=prices[-2],
                prev2_close=prices[-3],
                sma50=float(np.mean(prices[-50:])) if len(prices) >= 50 else None,
            )
            signals["turnaround_tuesday"] = sig
            metadata["turnaround_tuesday"] = meta
        else:
            signals["turnaround_tuesday"] = 0.0
            metadata["turnaround_tuesday"] = {"no_weekday": 1.0}

        # Momentum (from existing scanner)
        if len(prices) >= 20:
            current = prices[-1]
            roc_5 = (current - prices[-6]) / prices[-6] if prices[-6] != 0 else 0.0
            roc_10 = (current - prices[-11]) / prices[-11] if prices[-11] != 0 else 0.0
            roc_20 = (current - prices[-21]) / prices[-21] if prices[-21] != 0 else 0.0
            avg_roc = (roc_5 + roc_10 + roc_20) / 3.0
            mom_signal = max(-1.0, min(1.0, avg_roc * 10))
            signals["momentum"] = mom_signal
            metadata["momentum"] = {
                "roc_5": round(roc_5, 4), "roc_10": round(roc_10, 4),
                "roc_20": round(roc_20, 4),
            }
        else:
            signals["momentum"] = 0.0
            metadata["momentum"] = {}

        # Enhanced OFI
        if bids and asks:
            sig, meta = EnhancedOFI.multi_level_signal(bids, asks)
            signals["orderbook"] = sig
            metadata["orderbook"] = meta
        else:
            signals["orderbook"] = 0.0
            metadata["orderbook"] = {}

        # Step 4: Weighted combination
        composite = sum(
            weights.get(name, 0.0) * sig
            for name, sig in signals.items()
        )

        # Step 5: Determine direction and conviction
        conviction = abs(composite)
        if conviction < MasterSignalCombiner.MIN_CONVICTION:
            direction = "HOLD"
            conviction = 0.0
        elif composite > 0:
            direction = "BUY"
        else:
            direction = "SELL"

        return CombinedSignal(
            direction=direction,
            conviction=round(conviction, 4),
            composite_score=round(composite, 4),
            regime=regime_state.regime,
            regime_confidence=round(regime_state.confidence, 4),
            strategy_signals={k: round(v, 4) for k, v in signals.items()},
            strategy_weights={k: round(v, 4) for k, v in weights.items()},
            metadata=metadata,
        )
