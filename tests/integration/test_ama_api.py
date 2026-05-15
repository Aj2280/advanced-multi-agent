from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from ama_api.app import app
from ama_api.state import reset_state_for_tests


@pytest.fixture(autouse=True)
def _reset_api_state(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
    reset_state_for_tests()
    yield
    reset_state_for_tests()


def test_health() -> None:
    c = TestClient(app)
    r = c.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_session_create_list_write_read(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AMA_WORKBENCH_ROOT", str(tmp_path / "wb"))
    c = TestClient(app)
    r = c.post("/v1/sessions")
    assert r.status_code == 200
    sid = r.json()["id"]
    r2 = c.get(f"/v1/sessions/{sid}/files")
    assert r2.json()["files"] == []
    wr = c.put(
        f"/v1/sessions/{sid}/file",
        json={"path": "src/hello.txt", "content": "hello"},
    )
    assert wr.status_code == 200
    rd = c.get(f"/v1/sessions/{sid}/file", params={"path": "src/hello.txt"})
    assert rd.status_code == 200
    assert rd.json()["content"] == "hello"
