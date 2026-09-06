from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import FrozenSet, List, Tuple

SECRET_PATTERNS: Tuple[re.Pattern[str], ...] = (
    # OpenAI-style keys (sk-... or sk-proj-...)
    re.compile(r"sk-(?:proj-)?[a-zA-Z0-9]{48,}"),
    # GitHub personal access tokens
    re.compile(r"ghp_[A-Za-z0-9_]{36,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{36,}"),
    # Any PEM private-key block (RSA, OpenSSH, EC, etc.)
    re.compile(r"BEGIN\s+(?:\w+\s+)?PRIVATE\s+KEY", re.IGNORECASE),
    # AWS secret access key literal
    re.compile(r"AWS_SECRET_ACCESS_KEY\s*=\s*['\"]?[A-Za-z0-9/+=]{32,}['\"]?", re.IGNORECASE),
    # Generic env-style API key / secret / token / password assignment with a
    # non-empty, non-placeholder literal value. This intentionally ignores:
    #   - lowercase parameter names like `api_key=finnhub_key`
    #   - env lookups like `process.env.X` or `Deno.env.get(...)`
    #   - template values like `${VAR}`, `<...>`, `your-*`, `test`, `dummy`, etc.
    re.compile(
        r"\b[A-Z][A-Z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD)\b[ \t]*=[ \t]*['\"]?([A-Za-z0-9_.~!@#%^&*()\-+=]{8,})['\"]?"
    ),
)

EXCLUDED_DIRS: FrozenSet[str] = frozenset({
    ".git", "node_modules", ".next", "__pycache__", ".pytest_cache",
    "public", "docs", "ops", "daily-command", "hermes", ".agents",
})

# Files that are part of the scanning toolchain or test harnesses and therefore
# contain the literal patterns as definitions/examples.
EXCLUDED_FILES: FrozenSet[str] = frozenset({
    "security_scanner.py",
    "verifier.py",
    "redteam-agent.mjs",
    "socrates-agent.mjs",
})

EXCLUDED_EXTENSIONS: FrozenSet[str] = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
    ".ttf", ".eot", ".mp3", ".mp4", ".mov", ".avi", ".mkv", ".pdf",
    ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
})

PLACEHOLDER_HINTS: Tuple[str, ...] = (
    "your", "example", "sample", "test", "mock", "dummy", "placeholder",
    "todo", "replace", "change", "set", "fake", "none", "null", "undefined",
    "xxxxxxxx", "xxxx-xxxx",
)

ENV_LOOKUP_PREFIXES: Tuple[str, ...] = (
    "process.env", "Deno.env", "Bun.env", "import.meta.env",
)


@dataclass(frozen=True)
class ScanFinding:
    path: str
    markers: Tuple[str, ...]


def _is_placeholder_or_safe_reference(value: str) -> bool:
    """Heuristic: skip values that are env lookups or clearly placeholder strings."""
    if any(value.startswith(prefix) for prefix in ENV_LOOKUP_PREFIXES):
        return True
    lowered = value.lower()
    if lowered in ("true", "false", "1", "0", "yes", "no"):
        return True
    if any(hint in lowered for hint in PLACEHOLDER_HINTS):
        return True
    if re.match(r"^(x+\-?)+$", value):
        return True
    return False


def _pattern_match(text: str, pattern: re.Pattern[str]) -> bool:
    match = pattern.search(text)
    if not match:
        return False
    # For the generic env assignment pattern, the captured group is the value;
    # ignore it if it is an env lookup or looks like a placeholder/template.
    if match.groups():
        value = match.group(1) or ""
        if _is_placeholder_or_safe_reference(value):
            return False
    return True


def scan_text(text: str) -> Tuple[str, ...]:
    return tuple(pattern.pattern for pattern in SECRET_PATTERNS if _pattern_match(text, pattern))


def _is_scannable(path: Path) -> bool:
    if not path.is_file():
        return False
    if path.name in EXCLUDED_FILES:
        return False
    if path.suffix.lower() in EXCLUDED_EXTENSIONS:
        return False
    if path.name in ("package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock"):
        return False
    if path.name.endswith(".example") or path.name.endswith(".sample") or path.name.endswith(".md") or path.name.endswith(".txt"):
        return False
    if any(part in EXCLUDED_DIRS for part in path.parts):
        return False
    return True


def _read_safe(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def scan_repo(root: str = ".") -> List[ScanFinding]:
    return [
        ScanFinding(path=str(file_path), markers=markers)
        for file_path in Path(root).rglob("*")
        if _is_scannable(file_path)
        for markers in (scan_text(_read_safe(file_path)),)
        if markers
    ]
