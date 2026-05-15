from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from ama_api.app import app
from ama_api.state import reset_state_for_tests


@pytest.fixture(autouse=True)
def _reset():
    reset_state_for_tests()
    yield
    reset_state_for_tests()


def test_preview_serves_index_html(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AMA_WORKBENCH_ROOT", str(tmp_path / "wb"))
    c = TestClient(app)
    r = c.post("/v1/sessions")
    sid = r.json()["id"]
    c.put(
        f"/v1/sessions/{sid}/file",
        json={"path": "index.html", "content": "<html><body>hi</body></html>"},
    )
    pr = c.get(f"/v1/sessions/{sid}/preview", params={"path": "index.html"})
    assert pr.status_code == 200
    assert "hi" in pr.text


def test_preview_path_route_and_relative_assets(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AMA_WORKBENCH_ROOT", str(tmp_path / "wb"))
    c = TestClient(app)
    r = c.post("/v1/sessions")
    sid = r.json()["id"]
    c.put(
        f"/v1/sessions/{sid}/file",
        json={
            "path": "index.html",
            "content": '<html><head><link rel="stylesheet" href="app.css"></head><body>ok</body></html>',
        },
    )
    c.put(f"/v1/sessions/{sid}/file", json={"path": "app.css", "content": "body{color:red}"})
    pr = c.get(f"/v1/sessions/{sid}/preview/index.html")
    assert pr.status_code == 200
    css = c.get(f"/v1/sessions/{sid}/preview/app.css")
    assert css.status_code == 200
    assert "color:red" in css.text
