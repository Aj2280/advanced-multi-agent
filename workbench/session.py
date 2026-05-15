from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from workbench.errors import LimitExceededError, WorkbenchError
from workbench.paths import (
    ensure_portable_relative_path,
    normalize_relative_path,
    resolve_under_root,
)


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


def _max_file_bytes() -> int:
    return _int_env("AMA_WORKBENCH_MAX_FILE_BYTES", 500_000)


def _max_total_bytes() -> int:
    return _int_env("AMA_WORKBENCH_MAX_TOTAL_BYTES", 5_000_000)


def _max_files() -> int:
    return _int_env("AMA_WORKBENCH_MAX_FILES", 200)


@dataclass
class SessionWorkspace:
    """
    Filesystem operations confined to a single session directory with hard limits.
    """

    root: Path
    max_file_bytes: int = field(default_factory=_max_file_bytes)
    max_total_bytes: int = field(default_factory=_max_total_bytes)
    max_files: int = field(default_factory=_max_files)

    def __post_init__(self) -> None:
        self.root = self.root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _current_usage(self) -> tuple[int, int]:
        total = 0
        count = 0
        for p in self.root.rglob("*"):
            if p.is_file():
                count += 1
                total += p.stat().st_size
        return count, total

    def list_tree(self) -> list[str]:
        paths: list[str] = []
        for p in sorted(self.root.rglob("*")):
            if p.is_file():
                paths.append(ensure_portable_relative_path(p, root=self.root))
        return paths

    def read_text(self, relative: str) -> str:
        path = resolve_under_root(root=self.root, relative=relative)
        if not path.is_file():
            raise FileNotFoundError(relative)
        data = path.read_text(encoding="utf-8")
        if len(data.encode("utf-8")) > self.max_file_bytes:
            raise LimitExceededError("File exceeds max_file_bytes.")
        return data

    def write_text(self, relative: str, content: str) -> None:
        rel_key = normalize_relative_path(relative)
        path = resolve_under_root(root=self.root, relative=rel_key)
        encoded = content.encode("utf-8")
        if len(encoded) > self.max_file_bytes:
            raise LimitExceededError("Content exceeds max_file_bytes.")

        count, total = self._current_usage()
        if path.exists() and path.is_file():
            total -= path.stat().st_size
            count -= 1
        if count + 1 > self.max_files:
            raise LimitExceededError("Too many files in workspace.")
        if total + len(encoded) > self.max_total_bytes:
            raise LimitExceededError("Workspace total size limit exceeded.")

        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def apply_files(self, files: list[dict[str, str]]) -> list[str]:
        written: list[str] = []
        for spec in files:
            rel = spec.get("path") or ""
            content = spec.get("content")
            if content is None:
                raise WorkbenchError("Each file entry must include path and content.")
            if not isinstance(content, str):
                raise WorkbenchError("File content must be a string.")
            self.write_text(rel, content)
            written.append(normalize_relative_path(rel))
        return written

    def read_manifest_json(self) -> dict[str, Any] | None:
        p = self.root / "package.json"
        if not p.is_file():
            return None
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return None
