from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from workbench.errors import CommandNotAllowedError


def _default_allowlist() -> frozenset[tuple[str, ...]]:
    return frozenset(
        {
            ("npm", "install"),
            ("npm", "ci"),
            ("npm", "run", "build"),
            ("npm", "run", "lint"),
            ("npx", "tsc", "--noEmit"),
            ("node", "--version"),
        }
    )


def _load_allowlist_from_env() -> frozenset[tuple[str, ...]]:
    raw = os.environ.get("AMA_WORKBENCH_CMD_ALLOWLIST_JSON", "").strip()
    if not raw:
        return _default_allowlist()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError("AMA_WORKBENCH_CMD_ALLOWLIST_JSON must be valid JSON") from e
    if not isinstance(data, list):
        raise ValueError("AMA_WORKBENCH_CMD_ALLOWLIST_JSON must be a JSON list of argv arrays")
    out: list[tuple[str, ...]] = []
    for item in data:
        if not isinstance(item, list) or not all(isinstance(x, str) for x in item):
            raise ValueError("Each allowlist entry must be a JSON array of strings")
        if not item:
            continue
        out.append(tuple(item))
    return frozenset(out)


@dataclass(frozen=True)
class CommandResult:
    argv: tuple[str, ...]
    exit_code: int
    stdout: str
    stderr: str


class CommandRunner:
    """
    Runs subprocesses only inside cwd with an explicit argv allowlist.
    Production defaults are conservative; extend via AMA_WORKBENCH_CMD_ALLOWLIST_JSON.
    """

    def __init__(
        self,
        *,
        cwd: Path,
        allowlist: frozenset[tuple[str, ...]] | None = None,
        timeout_s: float | None = None,
    ) -> None:
        self._cwd = cwd.resolve()
        self._allow = allowlist if allowlist is not None else _load_allowlist_from_env()
        self._timeout = float(os.environ.get("AMA_WORKBENCH_CMD_TIMEOUT_S", "600"))
        if timeout_s is not None:
            self._timeout = float(timeout_s)

    def allowed(self, argv: list[str]) -> bool:
        t = tuple(argv)
        return t in self._allow

    def run(self, argv: list[str], *, env: dict[str, str] | None = None) -> CommandResult:
        if not argv:
            raise CommandNotAllowedError("Empty argv.")
        tup = tuple(argv)
        if tup not in self._allow:
            raise CommandNotAllowedError(
                f"Command not allowed: {argv!r}. "
                "Configure AMA_WORKBENCH_CMD_ALLOWLIST_JSON to extend the allowlist."
            )
        if not self._cwd.is_dir():
            raise FileNotFoundError(f"Working directory does not exist: {self._cwd}")
        proc = subprocess.run(
            argv,
            cwd=str(self._cwd),
            env={**os.environ, **(env or {})},
            capture_output=True,
            text=True,
            timeout=self._timeout,
            check=False,
            shell=False,
        )
        return CommandResult(
            argv=tup,
            exit_code=int(proc.returncode),
            stdout=proc.stdout or "",
            stderr=proc.stderr or "",
        )

    def to_public_dict(self, res: CommandResult) -> dict[str, Any]:
        return {
            "argv": list(res.argv),
            "exit_code": res.exit_code,
            "stdout": res.stdout[-200_000:],
            "stderr": res.stderr[-200_000:],
        }
