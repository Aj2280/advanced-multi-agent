from __future__ import annotations

import sys
from pathlib import Path

import pytest

from workbench.errors import CommandNotAllowedError
from workbench.runner import CommandRunner


def test_runner_allowlist_accepts_python_print(tmp_path: Path) -> None:
    exe = sys.executable
    allow = frozenset({(exe, "-c", "print(42)")})
    r = CommandRunner(cwd=tmp_path, allowlist=allow, timeout_s=30.0)
    out = r.run([exe, "-c", "print(42)"])
    assert out.exit_code == 0
    assert "42" in out.stdout


def test_runner_rejects_unknown(tmp_path: Path) -> None:
    exe = sys.executable
    r = CommandRunner(cwd=tmp_path, allowlist=frozenset({(exe, "-c", "print(1)")}))
    with pytest.raises(CommandNotAllowedError):
        r.run(["rm", "-rf", "/"])
