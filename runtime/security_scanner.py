from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import FrozenSet, List, Tuple

_SECRET_PATTERNS: Tuple[Tuple[str, re.Pattern[str]], ...] = (
    # OpenAI / Anthropic / generic long API-key prefixes
    ("api-key-token", re.compile(r"\bsk-(?:ant-|proj-|live-|test-)?[A-Za-z0-9_-]{20,}")),
    # GitHub personal / fine-grained tokens
    ("github-token", re.compile(r"\b(?:ghp_|github_pat_|ghu_|ghs_|gho_)[A-Za-z0-9_\-]{20,}")),
    # AWS access key id / aws secret access key assignment
    ("aws-key", re.compile(r"\b(?:AKIA[A-Z0-9]{16}|aws[_-]?(?:secret|access)[_\-]?key\s*=\s*[\"']?[A-Za-z0-9/+=]{8,})")),
    # PEM private key block
    ("private-key", re.compile(r"-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----")),
)

# File names / extensions that are never useful to scan for textual secrets.
_EXCLUDED_PATHS: FrozenSet[str] = frozenset({
    ".env.example",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
})

_EXCLUDED_DIRS: FrozenSet[str] = frozenset({
    ".git", "node_modules", ".next", "__pycache__", ".pytest_cache", "tests",
})

_EXCLUDED_EXTS: FrozenSet[str] = frozenset({
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".mp3", ".mp4", ".webm", ".ogg", ".wav",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
    ".lock",
})

# Scanner files that intentionally list forbidden marker strings.
_SCANNER_FILES: FrozenSet[str] = frozenset({
    "security_scanner.py",
    "verifier.py",
    "redteam-agent.mjs",
    "socrates-agent.mjs",
})

# Values that are clearly placeholders / variables and should not be reported.
_PLACEHOLDER_RE = re.compile(
    r"^(\$\{|.*<.*|.*>.*|YOUR_.*|MY_.*|EXAMPLE.*|SAMPLE.*|DUMMY.*|"
    r"PLACEHOLDER.*|CHANGEME.*|TODO.*|FIXME.*|TEST.*|XXX.*|.*test.*|"
    r"[a-z_][a-z0-9_]*)$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class ScanFinding:
    path: str
    markers: Tuple[str, ...]


def _looks_like_secret(value: str) -> bool:
    """Heuristic filter to strip variable names and placeholder tokens."""
    if len(value) < 8:
        return False
    if _PLACEHOLDER_RE.match(value):
        return False
    # Reject bare variable-name-looking values (lowercase + underscores only).
    if re.fullmatch(r"[a-z_][a-z0-9_]*", value):
        return False
    return True


def _is_scannable(path: Path) -> bool:
    if not path.is_file():
        return False
    if path.name in _EXCLUDED_PATHS or path.name in _SCANNER_FILES:
        return False
    if path.suffix.lower() in _EXCLUDED_EXTS:
        return False
    if any(part in _EXCLUDED_DIRS for part in path.parts):
        return False
    return True


def _read_safe(path: Path) -> str:
    try:
        # Treat files with null bytes as binary and skip them.
        raw = path.read_bytes()
        if b"\x00" in raw[:8192]:
            return ""
        return raw.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def scan_text(text: str) -> Tuple[str, ...]:
    found: List[str] = []
    for label, pattern in _SECRET_PATTERNS:
        for match in pattern.finditer(text):
            value = ""
            if match.groups():
                value = match.group(1) or ""
            if label in ("api-key-token", "github-token", "aws-key", "private-key") or _looks_like_secret(value):
                found.append(label)
    return tuple(sorted(set(found)))


def scan_repo(root: str = ".") -> List[ScanFinding]:
    return [
        ScanFinding(path=str(file_path), markers=markers)
        for file_path in Path(root).rglob("*")
        if _is_scannable(file_path)
        for markers in (scan_text(_read_safe(file_path)),)
        if markers
    ]
