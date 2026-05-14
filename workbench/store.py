from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock

from workbench.paths import default_workbench_root
from workbench.session import SessionWorkspace


@dataclass
class SessionRecord:
    id: str
    created_at: datetime
    workspace: SessionWorkspace


class SessionStore:
    """
    In-memory session registry (single-node production).
    For horizontal scale, replace with Redis + object storage.
    """

    def __init__(self, *, root: Path | None = None) -> None:
        self._root = (root or default_workbench_root()).resolve()
        self._root.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._sessions: dict[str, SessionRecord] = {}

    def create(self) -> SessionRecord:
        while True:
            sid = uuid.uuid4().hex
            path = self._root / sid
            if not path.exists():
                break
        ws = SessionWorkspace(path)
        rec = SessionRecord(id=sid, created_at=datetime.now(UTC), workspace=ws)
        with self._lock:
            self._sessions[sid] = rec
        return rec

    def get(self, session_id: str) -> SessionRecord | None:
        with self._lock:
            return self._sessions.get(session_id)

    def delete(self, session_id: str) -> bool:
        with self._lock:
            return self._sessions.pop(session_id, None) is not None
