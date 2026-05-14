from __future__ import annotations

import os
from pathlib import Path

from workbench.errors import PathEscapeError


def normalize_relative_path(raw: str) -> str:
    s = (raw or "").strip().replace("\\", "/").lstrip("/")
    if not s or s == ".":
        raise PathEscapeError("Path must be a non-empty relative path.")
    parts: list[str] = []
    for p in s.split("/"):
        if p in ("", "."):
            continue
        if p == "..":
            raise PathEscapeError("Path segments '..' are not allowed.")
        parts.append(p)
    if not parts:
        raise PathEscapeError("Path must be a non-empty relative path.")
    return "/".join(parts)


def resolve_under_root(*, root: Path, relative: str) -> Path:
    rel = normalize_relative_path(relative)
    candidate = (root / rel).resolve()
    root_res = root.resolve()
    try:
        candidate.relative_to(root_res)
    except ValueError as e:
        raise PathEscapeError("Path resolves outside workspace root.") from e
    return candidate


def ensure_portable_relative_path(path: Path, *, root: Path) -> str:
    rel = path.resolve().relative_to(root.resolve())
    return rel.as_posix()


def safe_filename(name: str) -> str:
    cleaned = "".join(c for c in name if c.isalnum() or c in ("-", "_"))[:64]
    if not cleaned:
        raise PathEscapeError("Invalid session directory name.")
    return cleaned


def default_workbench_root() -> Path:
    return Path(os.environ.get("AMA_WORKBENCH_ROOT", ".local/workbenches")).resolve()
