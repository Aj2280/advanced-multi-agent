from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from time import time
from typing import Any


@dataclass(frozen=True)
class WorkingItem:
    ts: float
    kind: str
    content: str
    metadata: dict[str, Any]


class L1WorkingMemory:
    def __init__(self, *, maxlen: int = 200) -> None:
        self._buf: deque[WorkingItem] = deque(maxlen=maxlen)

    def append(self, *, kind: str, content: str, metadata: dict[str, Any] | None = None) -> None:
        self._buf.append(
            WorkingItem(ts=time(), kind=kind, content=content, metadata=metadata or {})
        )

    def recent(self, *, limit: int = 20) -> list[WorkingItem]:
        if limit <= 0:
            return []
        return list(self._buf)[-limit:]

