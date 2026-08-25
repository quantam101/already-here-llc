"""
LLM-powered trading analyst — TradingAgents-inspired intelligence layer.

Patterns adapted from TauricResearch/TradingAgents (100k stars, Apache-2.0):
- Pre-fetch-then-inject: all data gathered BEFORE LLM invocation (prevents hallucination)
- Two-model pattern: fast model for structure, capable model for reasoning
- Five-tier rating: Buy / Overweight / Hold / Underweight / Sell
- Bull/Bear mini-debate: configurable rounds, direct rebuttals
- Structured output with _coerce_float for numeric fields LLM may emit as "N/A"
- Memory log: append-only JSONL for deferred reflection (lesson injection future hook)

Integrates with the existing MCP trading engine — call via the `llm_analyze` tool.
Gracefully degrades when ANTHROPIC_API_KEY is unset (returns neutral placeholders).
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("llm_analyst")

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------
ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL_DEEP: str = os.environ.get("MCP_LLM_DEEP_MODEL", "claude-sonnet-4-6")
MODEL_QUICK: str = os.environ.get("MCP_LLM_QUICK_MODEL", "claude-haiku-4-5-20251001")
FINNHUB_API_KEY: str = os.environ.get("FINNHUB_API_KEY", "")
LLM_ENABLED: bool = os.environ.get("MCP_LLM_ENABLED", "true").lower() == "true"
MAX_DEBATE_ROUNDS: int = int(os.environ.get("MCP_MAX_DEBATE_ROUNDS", "1"))
MEMORY_LOG_PATH: str = os.environ.get("MCP_MEMORY_LOG", "./data/trade_memory.jsonl")
NEWS_LOOKBACK_DAYS: int = int(os.environ.get("MCP_NEWS_LOOKBACK_DAYS", "7"))
NEWS_LIMIT: int = int(os.environ.get("MCP_NEWS_LIMIT", "10"))


# ---------------------------------------------------------------------------
# FIVE-TIER RATING (TradingAgents scale)
# ---------------------------------------------------------------------------
class FiveTierRating(str, Enum):
    BUY = "Buy"
    OVERWEIGHT = "Overweight"
    HOLD = "Hold"
    UNDERWEIGHT = "Underweight"
    SELL = "Sell"


# ---------------------------------------------------------------------------
# DATA SCHEMAS
# ---------------------------------------------------------------------------
@dataclass
class SentimentReport:
    overall_band: str  # Bearish | Slightly Bearish | Neutral | Slightly Bullish | Bullish | Strongly Bullish
    overall_score: float  # 0-10
    confidence: str  # low | medium | high
    narrative: str
    news_count: int
    sources: List[str] = field(default_factory=list)


@dataclass
class DebateRound:
    round_number: int
    bull_argument: str
    bear_argument: str


@dataclass
class AnalystDecision:
    symbol: str
    rating: FiveTierRating
    executive_summary: str
    bull_thesis: str
    bear_thesis: str
    conviction: float  # 0.0-1.0 absolute
    conviction_direction: str  # "bullish" | "bearish" | "neutral"
    sentiment: SentimentReport
    debate_rounds: List[DebateRound]
    technical_context: Dict[str, Any]
    fundamentals: Dict[str, Any]
    timestamp: float


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------
def _coerce_float(value: Any, default: float = 0.0) -> float:
    """Coerce LLM numeric outputs that may be 'N/A', 'none', or None."""
    if value is None or str(value).strip().lower() in ("n/a", "none", "null", ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _anthropic_client():
    try:
        import anthropic
        return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    except ImportError:
        raise RuntimeError("anthropic not installed — pip install anthropic")


def _llm(prompt: str, system: str = "", model: str = MODEL_QUICK, max_tokens: int = 512) -> str:
    """Single synchronous LLM call. Returns empty string on any failure."""
    if not ANTHROPIC_API_KEY or not LLM_ENABLED:
        return ""
    try:
        client = _anthropic_client()
        kwargs: Dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            kwargs["system"] = system
        response = client.messages.create(**kwargs)
        return response.content[0].text if response.content else ""
    except Exception as exc:
        logger.warning("LLM call failed (%s): %s", model, exc)
        return ""


def _parse_json(text: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    """Parse JSON from LLM output, stripping markdown fences if present."""
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        stripped = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        return fallback


# ---------------------------------------------------------------------------
# DATA FETCHERS (pre-fetch pattern — no tool calls at LLM inference time)
# ---------------------------------------------------------------------------
def _fetch_finnhub_news(symbol: str) -> List[Dict[str, Any]]:
    """Fetch recent company news from Finnhub REST. Returns [] on any failure."""
    if not FINNHUB_API_KEY:
        return []
    try:
        import httpx
        from datetime import datetime, timedelta
        end = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=NEWS_LOOKBACK_DAYS)).strftime("%Y-%m-%d")
        res = httpx.get(
            "https://finnhub.io/api/v1/company-news",
            params={"symbol": symbol, "from": start, "to": end, "token": FINNHUB_API_KEY},
            timeout=5.0,
        )
        items = res.json() if res.status_code == 200 else []
        return items[:NEWS_LIMIT] if isinstance(items, list) else []
    except Exception as exc:
        logger.warning("Finnhub news failed for %s: %s", symbol, exc)
        return []


def _fetch_yfinance_fundamentals(symbol: str) -> Dict[str, Any]:
    """Fetch basic fundamentals from yfinance. Returns {} on any failure."""
    try:
        import yfinance as yf
        info = yf.Ticker(symbol).info
        return {
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "market_cap": info.get("marketCap"),
            "revenue_growth": info.get("revenueGrowth"),
            "profit_margins": info.get("profitMargins"),
            "debt_to_equity": info.get("debtToEquity"),
            "beta": info.get("beta"),
            "week_52_high": info.get("fiftyTwoWeekHigh"),
            "week_52_low": info.get("fiftyTwoWeekLow"),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "short_name": info.get("shortName", symbol),
        }
    except Exception as exc:
        logger.warning("yfinance fundamentals failed for %s: %s", symbol, exc)
        return {}


# ---------------------------------------------------------------------------
# SENTIMENT ANALYST (pre-fetch-then-inject)
# ---------------------------------------------------------------------------
class LLMSentimentAnalyst:
    """
    Pre-fetch all data before LLM invocation — the TradingAgents A+ insight.
    Prevents the model from hallucinating under prompt pressure.
    Falls back gracefully to Neutral when data or API key unavailable.
    """

    _VALID_BANDS = {
        "Bearish", "Slightly Bearish", "Neutral",
        "Slightly Bullish", "Bullish", "Strongly Bullish",
    }

    def analyze(self, symbol: str) -> SentimentReport:
        news = _fetch_finnhub_news(symbol)
        if not news or not ANTHROPIC_API_KEY:
            return SentimentReport(
                overall_band="Neutral",
                overall_score=5.0,
                confidence="low" if not news else "medium",
                narrative="Insufficient news data for sentiment analysis." if not news else "API key not configured.",
                news_count=len(news),
                sources=["finnhub-company-news"] if news else [],
            )

        news_block = "\n".join(
            f"- [{item.get('source', '')}] {item.get('headline', '')}: {item.get('summary', '')[:200]}"
            for item in news
        )

        system = (
            "You are a financial sentiment analyst. Analyze the news and return ONLY valid JSON "
            "with these exact fields:\n"
            '{"overall_band": "<Bearish|Slightly Bearish|Neutral|Slightly Bullish|Bullish|Strongly Bullish>", '
            '"overall_score": <float 0-10>, '
            '"confidence": "<low|medium|high>", '
            '"narrative": "<2-3 sentence explanation>"}'
        )
        prompt = f"Analyze sentiment for {symbol} based on recent news:\n\n{news_block}\n\nReturn the JSON report."
        raw = _llm(prompt, system=system, model=MODEL_QUICK, max_tokens=400)

        data = _parse_json(raw, {})
        band = data.get("overall_band", "Neutral")
        if band not in self._VALID_BANDS:
            band = "Neutral"

        return SentimentReport(
            overall_band=band,
            overall_score=_coerce_float(data.get("overall_score"), 5.0),
            confidence=data.get("confidence", "low") if data.get("confidence") in ("low", "medium", "high") else "low",
            narrative=data.get("narrative", raw[:400]) if data else "Parse error.",
            news_count=len(news),
            sources=["finnhub-company-news"],
        )


# ---------------------------------------------------------------------------
# BULL / BEAR DEBATE
# ---------------------------------------------------------------------------
class LLMBullBearDebate:
    """
    Two-LLM debate where bear directly rebuts bull and vice versa.
    Risk-judge call at the end produces normalized conviction score.
    Uses deep model for both sides (quality over speed).
    """

    def debate(
        self,
        symbol: str,
        tech_summary: str,
        sentiment: SentimentReport,
        fundamentals: Dict[str, Any],
        rounds: int = MAX_DEBATE_ROUNDS,
    ) -> Tuple[float, str, List[DebateRound]]:
        """Returns (conviction [-1,+1], direction, debate_rounds)."""
        if not ANTHROPIC_API_KEY:
            return 0.0, "neutral", []

        ctx = _build_analyst_context(symbol, tech_summary, sentiment, fundamentals)
        debate_rounds: List[DebateRound] = []
        bear_arg = ""
        bull_arg = ""

        for r in range(max(1, rounds)):
            bull_system = (
                f"You are the BULL RESEARCHER for {symbol}. Build the strongest evidence-based bullish case. "
                "Cover growth potential, competitive advantages, technical momentum, and sentiment tailwinds. "
                "If a bear argument is provided, rebut its specific claims with data. Be concise (≤150 words)."
            )
            bull_prompt = ctx + (f"\n\nBear's previous argument:\n{bear_arg}" if bear_arg else "")
            bull_arg = _llm(bull_prompt, system=bull_system, model=MODEL_DEEP, max_tokens=300)

            bear_system = (
                f"You are the BEAR RESEARCHER for {symbol}. Build the strongest evidence-based bearish case. "
                "Cover risks, competitive threats, valuation concerns, technical weakness, and sentiment headwinds. "
                "Directly rebut the bull's specific claims with counter-evidence. Be concise (≤150 words)."
            )
            bear_prompt = ctx + f"\n\nBull's argument:\n{bull_arg}"
            bear_arg = _llm(bear_prompt, system=bear_system, model=MODEL_DEEP, max_tokens=300)

            debate_rounds.append(DebateRound(
                round_number=r + 1,
                bull_argument=bull_arg,
                bear_argument=bear_arg,
            ))

        # Risk judge
        judge_prompt = (
            f"You are a risk manager judging a bull/bear debate for {symbol}.\n\n"
            f"Bull final argument:\n{bull_arg}\n\n"
            f"Bear final argument:\n{bear_arg}\n\n"
            'Score net conviction from -1.0 (strong sell) to +1.0 (strong buy). '
            'Return ONLY JSON: {"conviction": <float>, "reasoning": "<one sentence>"}'
        )
        raw = _llm(judge_prompt, model=MODEL_QUICK, max_tokens=150)
        data = _parse_json(raw, {})
        conviction = max(-1.0, min(1.0, _coerce_float(data.get("conviction"), 0.0)))
        direction = "bullish" if conviction > 0.05 else ("bearish" if conviction < -0.05 else "neutral")

        return conviction, direction, debate_rounds


def _build_analyst_context(
    symbol: str,
    tech_summary: str,
    sentiment: SentimentReport,
    fundamentals: Dict[str, Any],
) -> str:
    fund_lines = []
    if fundamentals:
        fund_lines = [
            f"  P/E: {fundamentals.get('pe_ratio', 'N/A')} | Fwd P/E: {fundamentals.get('forward_pe', 'N/A')}",
            f"  Rev Growth: {fundamentals.get('revenue_growth', 'N/A')} | Margins: {fundamentals.get('profit_margins', 'N/A')}",
            f"  Beta: {fundamentals.get('beta', 'N/A')} | Sector: {fundamentals.get('sector', 'N/A')}",
            f"  52w High: {fundamentals.get('week_52_high', 'N/A')} | 52w Low: {fundamentals.get('week_52_low', 'N/A')}",
        ]
    fund_block = "\n".join(fund_lines) if fund_lines else "  No fundamental data available."

    return (
        f"=== ANALYST CONTEXT: {symbol} ===\n\n"
        f"Technical Analysis:\n{tech_summary}\n\n"
        f"Sentiment: {sentiment.overall_band} (score {sentiment.overall_score:.1f}/10, {sentiment.confidence} confidence)\n"
        f"{sentiment.narrative}\n\n"
        f"Fundamentals:\n{fund_block}"
    )


# ---------------------------------------------------------------------------
# MASTER LLM ANALYST
# ---------------------------------------------------------------------------
class LLMTradingAnalyst:
    """
    Orchestrates: pre-fetch → sentiment → debate → five-tier rating → memory log.
    All heavy LLM calls use MODEL_DEEP; quick structured calls use MODEL_QUICK.
    """

    def __init__(self) -> None:
        self._sentiment_agent = LLMSentimentAnalyst()
        self._debate_agent = LLMBullBearDebate()
        os.makedirs(os.path.dirname(os.path.abspath(MEMORY_LOG_PATH)), exist_ok=True)

    def analyze(
        self,
        symbol: str,
        technical_score: float,
        scanner_breakdown: Dict[str, float],
        current_price: float,
        rsi: float,
        verdict: str,
    ) -> AnalystDecision:
        # 1. Pre-fetch fundamentals
        fundamentals = _fetch_yfinance_fundamentals(symbol)

        # 2. Sentiment (pre-fetch + single quick LLM call)
        sentiment = self._sentiment_agent.analyze(symbol)

        # 3. Format technical context for debate
        tech_summary = _format_technical(symbol, technical_score, scanner_breakdown, current_price, rsi, verdict)

        # 4. Bull/Bear debate (deep model, configurable rounds)
        conviction_raw, direction, debate_rounds = self._debate_agent.debate(
            symbol=symbol,
            tech_summary=tech_summary,
            sentiment=sentiment,
            fundamentals=fundamentals,
        )

        # 5. Five-tier rating
        rating = _conviction_to_five_tier(conviction_raw, technical_score, sentiment.overall_score)

        # 6. Executive summary synthesis
        executive_summary = self._synthesize(symbol, rating, conviction_raw, sentiment, debate_rounds)

        bull_thesis = debate_rounds[-1].bull_argument if debate_rounds else ""
        bear_thesis = debate_rounds[-1].bear_argument if debate_rounds else ""

        decision = AnalystDecision(
            symbol=symbol,
            rating=rating,
            executive_summary=executive_summary,
            bull_thesis=bull_thesis,
            bear_thesis=bear_thesis,
            conviction=abs(conviction_raw),
            conviction_direction=direction,
            sentiment=sentiment,
            debate_rounds=debate_rounds,
            technical_context={
                "composite_score": technical_score,
                "scanner_breakdown": scanner_breakdown,
                "current_price": current_price,
                "rsi": rsi,
                "verdict": verdict,
            },
            fundamentals=fundamentals,
            timestamp=time.time(),
        )

        _memory_log(decision)
        return decision

    def _synthesize(
        self,
        symbol: str,
        rating: FiveTierRating,
        conviction: float,
        sentiment: SentimentReport,
        debate_rounds: List[DebateRound],
    ) -> str:
        if not ANTHROPIC_API_KEY or not debate_rounds:
            return f"{symbol}: {rating.value} — multi-factor analysis complete."

        last = debate_rounds[-1]
        prompt = (
            f"Write a 2-sentence executive summary for {symbol}.\n"
            f"Rating: {rating.value} | Conviction: {conviction:+.2f} | Sentiment: {sentiment.overall_band}\n\n"
            f"Bull: {last.bull_argument[:200]}\nBear: {last.bear_argument[:200]}\n\n"
            "Return ONLY the 2-sentence summary. No headers."
        )
        result = _llm(prompt, model=MODEL_QUICK, max_tokens=200)
        return result or f"{symbol}: {rating.value}."


# ---------------------------------------------------------------------------
# PURE FUNCTIONS
# ---------------------------------------------------------------------------
def _conviction_to_five_tier(
    conviction: float,
    technical_score: float,
    sentiment_score: float,
) -> FiveTierRating:
    """
    Blend LLM conviction + technical score + sentiment into five-tier rating.
    Weights: 50% conviction, 30% technical, 20% sentiment.
    """
    # Normalize technical from [0.45, 1.0] range to [-1, +1]
    norm_tech = max(-1.0, min(1.0, (technical_score - 0.45) / 0.275 - 1.0))
    # Normalize sentiment from [0, 10] to [-1, +1]
    norm_sent = (sentiment_score - 5.0) / 5.0

    blended = 0.5 * conviction + 0.3 * norm_tech + 0.2 * norm_sent

    if blended >= 0.55:
        return FiveTierRating.BUY
    if blended >= 0.15:
        return FiveTierRating.OVERWEIGHT
    if blended >= -0.15:
        return FiveTierRating.HOLD
    if blended >= -0.55:
        return FiveTierRating.UNDERWEIGHT
    return FiveTierRating.SELL


def _format_technical(
    symbol: str,
    score: float,
    breakdown: Dict[str, float],
    price: float,
    rsi: float,
    verdict: str,
) -> str:
    lines = [
        f"Symbol: {symbol} | Price: ${price:.2f} | RSI: {rsi:.1f}",
        f"Composite Score: {score:.4f} | Signal: {verdict}",
        "Scanner Breakdown:",
    ]
    for k, v in sorted(breakdown.items()):
        lines.append(f"  {k}: {v:.4f}")
    return "\n".join(lines)


def _memory_log(decision: AnalystDecision) -> None:
    """Append-only JSONL memory log — deferred reflection hook."""
    entry = {
        "ts": decision.timestamp,
        "symbol": decision.symbol,
        "rating": decision.rating.value,
        "conviction": round(decision.conviction, 4),
        "conviction_direction": decision.conviction_direction,
        "sentiment_band": decision.sentiment.overall_band,
        "sentiment_score": decision.sentiment.overall_score,
        "technical_score": decision.technical_context.get("composite_score"),
        "technical_verdict": decision.technical_context.get("verdict"),
        "executive_summary": decision.executive_summary,
    }
    try:
        with open(MEMORY_LOG_PATH, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, sort_keys=True, default=str) + "\n")
    except OSError:
        logger.warning("Memory log write failed: %s", MEMORY_LOG_PATH)
