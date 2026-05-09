from __future__ import annotations

import json
from dataclasses import dataclass
from time import time
from typing import Any

import redis


@dataclass(frozen=True)
class SessionItem:
    ts: float
    kind: str
    content: str
    metadata: dict[str, Any]


class L2SessionMemory:
    def __init__(self, *, redis_url: str, ttl_s: int = 60 * 60 * 24) -> None:
        self._r = redis.Redis.from_url(redis_url, decode_responses=True)
        self._ttl_s = ttl_s

    def append(self, *, session_id: str, kind: str, content: str, metadata: dict[str, Any]) -> None:
        key = f"ama:session:{session_id}"
        payload = json.dumps({"ts": time(), "kind": kind, "content": content, "metadata": metadata})
        pipe = self._r.pipeline()
        pipe.rpush(key, payload)
        pipe.expire(key, self._ttl_s)
        pipe.execute()

    def recent(self, *, session_id: str, limit: int = 50) -> list[SessionItem]:
        key = f"ama:session:{session_id}"
        raw = self._r.lrange(key, max(0, -limit), -1) if limit > 0 else []
        items: list[SessionItem] = []
        for r in raw:
            d = json.loads(r)
            items.append(
                SessionItem(
                    ts=float(d["ts"]),
                    kind=str(d["kind"]),
                    content=str(d["content"]),
                    metadata=dict(d.get("metadata") or {}),
                )
            )
        return items

