"""
Minimal HTTP health/readiness server for Kubernetes probes.

Runs on port 8080 and exposes:
  GET /healthz  — liveness probe (200 if process is running)
  GET /readyz   — readiness probe (200 if sovereign core initializes)
  GET /metrics  — telemetry event count (structured JSON)

This module is the container entrypoint for the runtime Deployment.
It initializes the SovereignAutomationCore once at startup and keeps
the process alive to satisfy Kubernetes pod lifecycle.
"""

from __future__ import annotations

import json
import os
import signal
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional

from .sovereign_core import SovereignAutomationCore


class _State:
    core: Optional[SovereignAutomationCore] = None
    ready: bool = False


def _init_core() -> None:
    try:
        _State.core = SovereignAutomationCore()
        dim = int(os.getenv("GMAOS_EMBEDDING_DIM", "384"))
        result = _State.core.execute(
            system_declaration="Health check initialization.",
            dynamic_context="Startup self-test.",
            objective="Verify runtime initialization.",
            embedding_vector=[0.001] * dim,
            namespace="health-check",
        )
        _State.ready = result.status in ("ok", "approval_required")
    except Exception as exc:
        print(f"[health_server] init failed: {exc}", file=sys.stderr)
        _State.ready = False


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/healthz":
            self._json_response(200, {"status": "alive"})
        elif self.path == "/readyz":
            if _State.ready and _State.core is not None:
                self._json_response(200, {"status": "ready"})
            else:
                self._json_response(503, {"status": "not_ready"})
        elif self.path == "/metrics":
            events = _State.core.telemetry.drain() if _State.core else []
            self._json_response(200, {"telemetry_events": len(events)})
        else:
            self._json_response(404, {"error": "not_found"})

    def _json_response(self, code: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args: object) -> None:
        if self.path not in ("/healthz", "/readyz"):
            super().log_message(format, *args)


def main() -> None:
    port = int(os.getenv("GMAOS_HEALTH_PORT", "8080"))
    print(f"[health_server] initializing sovereign core...")
    _init_core()
    print(f"[health_server] ready={_State.ready}, starting on :{port}")

    server = HTTPServer(("0.0.0.0", port), HealthHandler)

    def _shutdown(signum: int, frame: object) -> None:
        print(f"[health_server] received signal {signum}, shutting down")
        server.shutdown()

    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("[health_server] stopped")


if __name__ == "__main__":
    main()
