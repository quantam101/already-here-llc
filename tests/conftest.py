"""Make the repo-root `runtime` package importable so `pytest tests/` works
without PYTHONPATH (same fix as tradegate2's conftest)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
