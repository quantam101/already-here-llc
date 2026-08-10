from __future__ import annotations

from pathlib import Path
from typing import FrozenSet, List, Tuple

_SECRET_MARKERS: Tuple[str, ...] = (
    "sk-ant-",
    "sk-proj-",
    "sk_live_",
    "sk_test_",
    "BEGIN PRIVATE KEY",
    "BEGIN RSA PRIVATE KEY",
    "AWS_SECRET_ACCESS_KEY=",
)

_IGNORED_DIRS: FrozenSet[str] = frozenset({
    ".git", "node_modules", ".next", "__pycache__", ".pytest_cache",
})

_IGNORED_FILES: FrozenSet[str] = frozenset({
    "security_scanner.py",
    "verifier.py",
    "redteam-agent.mjs",
    "socrates-agent.mjs",
    "package-lock.json",
})

_RELATIVE_IGNORED: FrozenSet[str] = frozenset({
    "SKILL.md",
})

_BINARY_EXTENSIONS: FrozenSet[str] = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z",
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".webm",
    ".ttf", ".otf", ".woff", ".woff2", ".eot",
    ".exe", ".dll", ".so", ".dylib", ".bin",
    ".db", ".sqlite", ".sqlite3",
})


def scan_text(text: str) -> List[str]:
    lowered = text.lower()
    return [marker for marker in _SECRET_MARKERS if marker.lower() in lowered]


def _is_scannable(path: Path) -> bool:
    if not path.is_file():
        return False
    if path.suffix.lower() in _BINARY_EXTENSIONS:
        return False
    if path.name in _IGNORED_FILES:
        return False
    if any(part in _IGNORED_DIRS for part in path.parts):
        return False
    return True


def scan_repo(root: str = ".") -> List[str]:
    findings: List[str] = []
    root_path = Path(root).resolve()
    for path in root_path.rglob("*"):
        if not _is_scannable(path):
            continue
        rel = path.relative_to(root_path).as_posix()
        if rel in _RELATIVE_IGNORED:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        markers = scan_text(text)
        if markers:
            findings.append(f"{rel}: {','.join(markers)}")
    return findings
