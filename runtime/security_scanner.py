from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import FrozenSet, List, Tuple

SECRET_MARKERS: Tuple[str, ...] = (
    "sk-",
    "API_KEY=",
    "BEGIN PRIVATE KEY",
    "AWS_SECRET",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
)

EXCLUDED_DIRS: FrozenSet[str] = frozenset({
    ".git", "node_modules", ".next", "__pycache__", ".pytest_cache",
})

SELF_FILES: FrozenSet[str] = frozenset({
    "security_scanner.py",
})


@dataclass(frozen=True)
class ScanFinding:
    path: str
    markers: Tuple[str, ...]


def scan_text(text: str) -> Tuple[str, ...]:
    lowered = text.lower()
    return tuple(marker for marker in SECRET_MARKERS if marker.lower() in lowered)


def _is_scannable(path: Path) -> bool:
    return path.is_file() and path.name not in SELF_FILES and not any(
        part in EXCLUDED_DIRS for part in path.parts
    )


def scan_repo(root: str = ".") -> List[ScanFinding]:
    return [
        ScanFinding(path=str(file_path), markers=markers)
        for file_path in Path(root).rglob("*")
        if _is_scannable(file_path)
        for markers in (scan_text(_read_safe(file_path)),)
        if markers
    ]


def _read_safe(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""
