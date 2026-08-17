"""FINRA OTC ATS Transparency data fetcher.

Fetches weekly symbol-level dark-pool volume from FINRA's public data API:
    https://api.finra.org/data/group/otcMarket/name/weeklySummary
"""

from __future__ import annotations

import calendar
import logging
import os
import time
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Dict, Iterable, List, Optional

import requests

logger = logging.getLogger("dark_pool")

FINRA_API_URL = os.environ.get(
    "FINRA_API_URL", "https://api.finra.org/data/group/otcMarket/name/weeklySummary"
)

TIER_ORDER = ["T1", "T2", "OTCE"]


@dataclass(frozen=True)
class DarkPoolWeeklyRow:
    symbol: str
    name: str
    week_start: str
    summary_start_date: str
    last_reported_date: str
    shares: int
    trades: int
    notional: int
    avg_trade_size: float
    product_type: str
    tier: str
    summary_type: str
    market_participant: Optional[str]
    mpid: Optional[str]


class FinraClient:
    """Client for FINRA OTC weekly summary API."""

    def __init__(self, url: str = FINRA_API_URL, api_key: Optional[str] = None) -> None:
        self._url = url
        self._api_key = api_key
        self._session = requests.Session()
        self._session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
        })

    def _post(self, body: Dict[str, Any]) -> List[Dict[str, Any]]:
        try:
            resp = self._session.post(self._url, json=body, timeout=60)
            resp.raise_for_status()
            if resp.status_code == 204:
                return []
            data = resp.json()
            return data if isinstance(data, list) else []
        except requests.HTTPError as exc:
            logger.warning("FINRA HTTP error: %s", exc.response.text[:500])
            return []
        except Exception as exc:
            logger.warning("FINRA fetch failed: %s", exc)
            return []

    def fetch_weekly_summary(
        self,
        summary_type: str = "ATS_W_SMBL",
        tier: Optional[str] = None,
        week_start: Optional[str] = None,
        symbols: Optional[Iterable[str]] = None,
        limit: int = 5000,
        max_pages: int = 20,
        sleep: float = 0.25,
    ) -> List[DarkPoolWeeklyRow]:
        """Fetch weekly dark-pool symbol summaries with pagination.

        The FINRA ``weeklySummary`` dataset is partitioned by ``weekStartDate``
        and ``tierIdentifier``.  To get complete, recent results we always filter
        by ``summaryStartDate`` when a week is supplied; callers that need a
        rolling window should use :meth:`fetch_recent_weeks`.
        """
        rows: List[DarkPoolWeeklyRow] = []
        offset = 0
        filters: List[Dict[str, Any]] = [
            {"compareType": "EQUAL", "fieldName": "summaryTypeCode", "fieldValue": summary_type},
        ]
        if tier:
            filters.append({"compareType": "EQUAL", "fieldName": "tierIdentifier", "fieldValue": tier})
        if week_start:
            filters.append({"compareType": "EQUAL", "fieldName": "summaryStartDate", "fieldValue": week_start})
        if symbols:
            symbols = sorted({s.upper().strip() for s in symbols if s and s.strip()})
            if symbols:
                filters.append({"compareType": "IN", "fieldName": "issueSymbolIdentifier", "fieldValue": symbols})

        for page in range(max_pages):
            body = {
                "compareFilters": filters,
                "limit": limit,
                "offset": offset,
            }
            data = self._post(body)
            if not data:
                break
            for item in data:
                shares = int(item.get("totalWeeklyShareQuantity") or 0)
                trades = int(item.get("totalWeeklyTradeCount") or 0)
                notional = int(item.get("totalNotionalSum") or 0)
                rows.append(
                    DarkPoolWeeklyRow(
                        symbol=str(item.get("issueSymbolIdentifier") or "").upper(),
                        name=str(item.get("issueName") or ""),
                        week_start=str(item.get("weekStartDate") or ""),
                        summary_start_date=str(item.get("summaryStartDate") or ""),
                        last_reported_date=str(item.get("lastReportedDate") or ""),
                        shares=shares,
                        trades=trades,
                        notional=notional,
                        avg_trade_size=(shares / trades) if trades else 0.0,
                        product_type=str(item.get("productTypeCode") or ""),
                        tier=str(item.get("tierIdentifier") or ""),
                        summary_type=str(item.get("summaryTypeCode") or ""),
                        market_participant=item.get("marketParticipantName") or None,
                        mpid=item.get("MPID") or None,
                    )
                )
            if len(data) < limit:
                break
            offset += limit
            if sleep:
                time.sleep(sleep)

        return rows

    @staticmethod
    def _monday_of(dt: date) -> date:
        return dt - timedelta(days=dt.weekday())

    def fetch_recent_weeks(
        self,
        weeks_back: int = 8,
        tiers: Optional[Iterable[str]] = None,
        summary_type: str = "ATS_W_SMBL",
        symbols: Optional[Iterable[str]] = None,
        limit: int = 5000,
        max_pages: int = 20,
        sleep: float = 0.25,
    ) -> List[DarkPoolWeeklyRow]:
        """Fetch the most recent weekly summaries by probing recent Mondays.

        FINRA data is published with a 1- to 4-week lag and the API has no
        descending sort, so we start at the current calendar Monday and walk
        backwards until we find a populated week, then collect ``weeks_back``
        weeks of history.
        """
        tiers = list(tiers or TIER_ORDER)
        today = date.today()
        this_monday = self._monday_of(today)

        rows: List[DarkPoolWeeklyRow] = []
        fetched_weeks: set = set()

        # Find the latest published Monday (usually 1-4 weeks behind today).
        latest_monday: Optional[date] = None
        for lag in range(0, 12):
            probe = this_monday - timedelta(weeks=lag)
            probe_str = probe.isoformat()
            probe_rows = self.fetch_weekly_summary(
                summary_type=summary_type,
                week_start=probe_str,
                limit=1,
                max_pages=1,
                sleep=0,
            )
            if probe_rows:
                latest_monday = probe
                break
            if sleep:
                time.sleep(sleep)

        if not latest_monday:
            logger.warning("Could not find any recent FINRA data")
            return rows

        for i in range(weeks_back):
            week = latest_monday - timedelta(weeks=i)
            week_str = week.isoformat()
            if week_str in fetched_weeks:
                continue
            fetched_weeks.add(week_str)
            for tier in tiers:
                page_rows = self.fetch_weekly_summary(
                    summary_type=summary_type,
                    tier=tier,
                    week_start=week_str,
                    symbols=symbols,
                    limit=limit,
                    max_pages=max_pages,
                    sleep=sleep,
                )
                rows.extend(page_rows)

        logger.info("Fetched %d FINRA rows across %d weeks", len(rows), len(fetched_weeks))
        return rows


def fetch_latest_week(client: Optional[FinraClient] = None, weeks_back: int = 4) -> List[DarkPoolWeeklyRow]:
    """Convenience wrapper: fetch recent weekly summaries."""
    client = client or FinraClient()
    return client.fetch_recent_weeks(weeks_back=weeks_back)
