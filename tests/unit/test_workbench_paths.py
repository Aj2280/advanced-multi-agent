from __future__ import annotations

import pytest

from workbench.errors import PathEscapeError
from workbench.paths import normalize_relative_path, resolve_under_root
from workbench.session import SessionWorkspace


def test_normalize_rejects_parent() -> None:
    with pytest.raises(PathEscapeError):
        normalize_relative_path("../etc/passwd")


def test_resolve_stays_under_root(tmp_path) -> None:
    root = tmp_path / "s"
    root.mkdir()
    p = resolve_under_root(root=root, relative="a/b.txt")
    assert p == root / "a" / "b.txt"


def test_list_tree_after_write(tmp_path) -> None:
    ws = SessionWorkspace(tmp_path / "w")
    ws.write_text("x/y.md", "# hi")
    assert "x/y.md" in ws.list_tree()
