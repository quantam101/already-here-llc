"""Resilient Polygon log listener via WebSocket and HTTP RPC failovers."""

from __future__ import annotations

import json
import logging
import threading
import time
from typing import Any, Callable, Dict, List, Optional

import requests

from .abi import (
    ALL_FILL_TOPICS,
    ALL_TRANSFER_TOPICS,
    parse_log,
)
from .config import PolymarketConfig
from .utils import CircuitBreaker

logger = logging.getLogger("polymarket-tracker")


class PolymarketListener:
    """Real-time log listener with exponential-backoff reconnect and HTTP fallback."""

    def __init__(
        self,
        config: PolymarketConfig,
        on_fill: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_transfer: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> None:
        self._config = config
        self._on_fill = on_fill
        self._on_transfer = on_transfer
        self._cb = CircuitBreaker("polygon-ws", failure_threshold=5, reset_timeout_seconds=30.0)
        self._ws: Any = None
        self._ws_thread: Optional[threading.Thread] = None
        self._http_thread: Optional[threading.Thread] = None
        self._running = False
        self._reconnect_delay = config.reconnect_delay_seconds
        self._http_index = 0
        self._last_seen_block = 0
        self._http_lock = threading.Lock()

    @property
    def running(self) -> bool:
        return self._running

    def _addresses(self) -> List[str]:
        addrs = list(self._config.exchange_addresses)
        if self._config.conditional_tokens_address:
            addrs.append(self._config.conditional_tokens_address.lower())
        return list({a.lower() for a in addrs})

    def _subscribe_payloads(self) -> List[Dict[str, Any]]:
        fill_filter = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "eth_subscribe",
            "params": [
                "logs",
                {
                    "address": self._config.exchange_addresses,
                    "topics": [list(ALL_FILL_TOPICS)],
                },
            ],
        }
        transfer_filter = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "eth_subscribe",
            "params": [
                "logs",
                {
                    "address": [self._config.conditional_tokens_address],
                    "topics": [list(ALL_TRANSFER_TOPICS)],
                },
            ],
        }
        return [fill_filter, transfer_filter]

    def _on_ws_message(self, ws: Any, message: str) -> None:
        try:
            payload = json.loads(message)
        except json.JSONDecodeError:
            return
        if payload.get("id") in (1, 2):
            # subscription confirmation
            logger.info("WS subscription confirmed id=%s", payload.get("id"))
            return
        params = payload.get("params", {})
        if not params:
            return
        log = params.get("result", {})
        if not isinstance(log, dict):
            return
        self._cb.record_success()
        self._reconnect_delay = self._config.reconnect_delay_seconds
        block = log.get("blockNumber")
        if block:
            try:
                self._last_seen_block = int(block, 16) if isinstance(block, str) else int(block)
            except Exception:
                pass
        parsed = parse_log(log)
        if not parsed:
            return
        if parsed["event"].startswith("OrderFilled") or parsed["event"].startswith("OrdersMatched"):
            if self._on_fill:
                self._on_fill(parsed)
        elif parsed["event"].startswith("Transfer"):
            if self._on_transfer:
                self._on_transfer(parsed)

    def _on_ws_open(self, ws: Any) -> None:
        logger.info("Polygon WebSocket connected")
        self._cb.record_success()
        for payload in self._subscribe_payloads():
            try:
                ws.send(json.dumps(payload))
            except Exception as exc:
                logger.warning("Failed to send WS subscribe: %s", exc)

    def _on_ws_error(self, ws: Any, error: Any) -> None:
        logger.warning("Polygon WebSocket error: %s", error)
        self._cb.record_failure()

    def _on_ws_close(self, ws: Any, *args: Any) -> None:
        logger.info("Polygon WebSocket closed")
        self._cb.record_failure()

    def _ws_loop(self) -> None:
        import websocket

        while self._running:
            if self._cb.is_open:
                logger.warning("WS circuit open; sleeping %.1fs", self._reconnect_delay)
                time.sleep(self._reconnect_delay)
                self._reconnect_delay = min(
                    self._reconnect_delay * 2, self._config.reconnect_max_delay_seconds
                )
                continue

            if not self._config.polygon_ws_url:
                time.sleep(self._config.http_poll_interval_seconds)
                continue

            try:
                self._ws = websocket.WebSocketApp(
                    self._config.polygon_ws_url,
                    on_open=self._on_ws_open,
                    on_message=self._on_ws_message,
                    on_error=self._on_ws_error,
                    on_close=self._on_ws_close,
                )
                self._ws.run_forever(ping_interval=30, ping_timeout=10)
            except Exception as exc:
                logger.warning("WS loop exception: %s", exc)
                self._cb.record_failure()

            if not self._running:
                break

            logger.info("WS reconnect in %.1fs", self._reconnect_delay)
            time.sleep(self._reconnect_delay)
            self._reconnect_delay = min(
                self._reconnect_delay * 2, self._config.reconnect_max_delay_seconds
            )

    def _http_rpc_call(self, url: str, method: str, params: List[Any]) -> Any:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        }
        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if "error" in data:
            raise RuntimeError(str(data["error"]))
        return data.get("result")

    def _fetch_http_logs(
        self, from_block: int, to_block: int, addresses: List[str], topics: List[str]
    ) -> List[Dict[str, Any]]:
        urls = self._config.polygon_http_urls
        if not urls:
            return []
        for _ in range(len(urls)):
            url = urls[self._http_index % len(urls)]
            self._http_index += 1
            try:
                result = self._http_rpc_call(
                    url,
                    "eth_getLogs",
                    [
                        {
                            "fromBlock": hex(from_block),
                            "toBlock": hex(to_block),
                            "address": addresses,
                            "topics": [topics],
                        }
                    ],
                )
                if result:
                    return result
            except Exception as exc:
                logger.warning("HTTP RPC failed %s: %s", url, exc)
        return []

    def backfill(self, blocks: Optional[int] = None, process: bool = True) -> int:
        """Backfill recent blocks via HTTP RPC. Returns number of logs processed."""
        if not self._config.polygon_http_urls:
            return 0
        try:
            url = self._config.polygon_http_urls[0]
            block_hex = self._http_rpc_call(url, "eth_blockNumber", [])
            latest = int(block_hex, 16)
            from_block = max(0, latest - (blocks or self._config.backfill_blocks))
            total = 0
            # Chunk requests to respect RPC limits
            chunk_size = 2000
            current = from_block
            while current <= latest:
                to_block = min(current + chunk_size, latest)
                if process:
                    logs = self._fetch_http_logs(
                        current,
                        to_block,
                        self._config.exchange_addresses,
                        list(ALL_FILL_TOPICS),
                    )
                    for log in logs:
                        parsed = parse_log(log)
                        if parsed and self._on_fill:
                            self._on_fill(parsed)
                            total += 1
                current = to_block + 1
            self._last_seen_block = latest
            logger.info("Backfilled %d logs from blocks %s to %s", total, from_block, latest)
            return total
        except Exception as exc:
            logger.warning("Backfill failed: %s", exc)
            return 0

    def _http_poll_loop(self) -> None:
        """Poll HTTP RPC endpoints for new logs when WebSocket is unavailable."""
        if not self._config.polygon_http_urls:
            return

        # Seed last seen block without processing stale history.
        try:
            self.backfill(self._config.backfill_blocks, process=False)
        except Exception as exc:
            logger.warning("Initial HTTP seed failed: %s", exc)

        while self._running:
            try:
                url = self._config.polygon_http_urls[self._http_index % len(self._config.polygon_http_urls)]
                latest_hex = self._http_rpc_call(url, "eth_blockNumber", [])
                latest = int(latest_hex, 16)
                from_block = self._last_seen_block + 1 if self._last_seen_block else max(0, latest - self._config.backfill_blocks)
                if from_block <= latest:
                    total = 0
                    chunk_size = 2000
                    current = from_block
                    while current <= latest:
                        to_block = min(current + chunk_size, latest)
                        logs = self._fetch_http_logs(
                            current,
                            to_block,
                            self._config.exchange_addresses,
                            list(ALL_FILL_TOPICS),
                        )
                        for log in logs:
                            parsed = parse_log(log)
                            if parsed and self._on_fill:
                                self._on_fill(parsed)
                            if parsed and parsed["event"].startswith("Transfer") and self._on_transfer:
                                self._on_transfer(parsed)
                            total += 1
                        current = to_block + 1
                    self._last_seen_block = latest
                    if total:
                        logger.info("HTTP poll fetched %d logs up to block %d", total, latest)
            except Exception as exc:
                logger.warning("HTTP poll loop error: %s", exc)
                # Rotate to the next HTTP endpoint for the next poll.
                self._http_index += 1

            time.sleep(self._config.http_poll_interval_seconds)

    def start(self) -> None:
        """Start the listener in a background thread."""
        if self._running:
            return
        self._running = True

        if self._config.polygon_ws_url:
            try:
                import websocket  # noqa: F401
                self._ws_thread = threading.Thread(target=self._ws_loop, daemon=True, name="poly-listener-ws")
                self._ws_thread.start()
            except ImportError:
                logger.warning("websocket-client not installed; using HTTP poll only")

        self._http_thread = threading.Thread(target=self._http_poll_loop, daemon=True, name="poly-listener-http")
        self._http_thread.start()
        logger.info("Polymarket listener started")

    def stop(self) -> None:
        self._running = False
        if self._ws:
            try:
                self._ws.close()
            except Exception:
                pass

    def status(self) -> Dict[str, Any]:
        return {
            "running": self._running,
            "last_seen_block": self._last_seen_block,
            "circuit_breaker": self._cb.status(),
            "websocket_url_configured": bool(self._config.polygon_ws_url),
            "http_endpoints": len(self._config.polygon_http_urls),
            "http_poll_active": bool(self._http_thread and self._http_thread.is_alive()),
        }
