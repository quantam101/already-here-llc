from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import FrozenSet, List, Tuple


def _placeholder(value: str) -> bool:
    """Return True for values that are obviously placeholder/non-secret examples."""
    lowered = value.strip("\"'").lower()
    placeholders = (
        "your_", "<", ">", "placeholder", "example", "localhost",
        "xxxxxxxx", "xxxxxx", "xxxxx", "0000000000", "1234567890",
        "test", "fake", "dummy", "mock", "sample", "none",
    )
    return any(p in lowered for p in placeholders) or lowered in ("", "true", "false")


_SECRET_PATTERNS: Tuple[Tuple[str, re.Pattern], ...] = (
    ("sk-api-key", re.compile(r"sk-[a-zA-Z0-9]{20,}")),
    (
        "API_KEY",
        re.compile(
            r"^[A-Z_]+(?:_[A-Z_]+)*_API_KEY(?:_[A-Z_]+)*[ \t]*=[ \t]*(['\"]?)([^\n\"'#'<>]+)\1",
            re.IGNORECASE | re.MULTILINE,
        ),
    ),
    ("PRIVATE KEY", re.compile(r"BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY")),
    (
        "AWS_SECRET",
        re.compile(
            r"^[A-Z_]*AWS_SECRET[A-Z_]*[ \t]*=[ \t]*(['\"]?)([^\n\"'#'<>]+)\1",
            re.IGNORECASE | re.MULTILINE,
        ),
    ),
)

EXCLUDED_DIRS: FrozenSet[str] = frozenset({
    ".git", "node_modules", ".next", "__pycache__", ".pytest_cache",
    ".tmp", "tmp", ".devin-files",
})

EXCLUDED_SUFFIXES: FrozenSet[str] = frozenset({
    ".png", ".jpg", ".jpeg", ".webp", ".ico", ".gif", ".svg",
    ".mp4", ".mov", ".webm", ".mp3", ".wav",
    ".zip", ".tar", ".gz", ".pdf", ".lock",
    ".pem", ".crt", ".key",
})

# Security scanners and deployment helpers may contain secret-detection regexes.
EXCLUDED_NAMES: FrozenSet[str] = frozenset({
    "security_scanner.py",
    "verifier.py",
    "redteam-agent.mjs",
    "socrates-agent.mjs",
    "deploy.sh",
})


@dataclass(frozen=True)
class ScanFinding:
    path: str
    markers: Tuple[str, ...]


def _findings_for(text: str) -> List[str]:
    findings: List[str] = []
    for marker_name, pattern in _SECRET_PATTERNS:
        for match in pattern.finditer(text):
            groups = match.groups()
            # Group 1, when present, is the assigned value.  If it is a placeholder
            # (e.g. "xxx", "YOUR_KEY", "test"), ignore it.
            if groups and _placeholder(groups[0]):
                continue
            if not groups and _placeholder(match.group(0)):
                continue
            findings.append(marker_name)
            break
    return findings


def scan_text(text: str) -> Tuple[str, ...]:
    return tuple(_findings_for(text))


def _is_scannable(path: Path) -> bool:
    if not path.is_file() or path.name in EXCLUDED_NAMES:
        return False
    if any(part in EXCLUDED_DIRS for part in path.parts):
        return False
    if path.suffix.lower() in EXCLUDED_SUFFIXES:
        return False
    return True


def scan_repo(root: str = ".") -> List[ScanFinding]:
    return [
        ScanFinding(path=str(file_path), markers=tuple(findings))
        for file_path in Path(root).rglob("*")
        if _is_scannable(file_path)
        for findings in (_findings_for(_read_safe(file_path)),)
        if findings
    ]


def _read_safe(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""
