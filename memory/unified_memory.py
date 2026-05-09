from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Any

from memory.l1_working import L1WorkingMemory
from memory.l2_session import L2SessionMemory
from memory.l3_episodic import L3EpisodicMemory
from memory.l4_semantic import L4SemanticMemory
from memory.l5_knowledge_graph import L5KnowledgeGraph
from observability.metrics import Metrics
from observability.tracer import Tracer


class UnifiedMemoryMode(str, Enum):
    none = "none"
    l1 = "l1"
    l2 = "l2"
    l3 = "l3"
    l4 = "l4"
    all = "all"


@dataclass(frozen=True)
class UnifiedMemoryConfig:
    mode: UnifiedMemoryMode
    session_id: str
    redis_url: str
    sqlite_path: str
    chroma_persist_dir: str

    @staticmethod
    def from_env(*, mode: UnifiedMemoryMode) -> "UnifiedMemoryConfig":
        return UnifiedMemoryConfig(
            mode=mode,
            session_id=os.environ.get("AMA_SESSION_ID", uuid.uuid4().hex),
            redis_url=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
            sqlite_path=os.environ.get("SQLITE_PATH", ".local/episodic.db"),
            chroma_persist_dir=os.environ.get("CHROMA_PERSIST_DIR", ".local/chroma"),
        )


class UnifiedMemory:
    def __init__(self, *, config: UnifiedMemoryConfig, tracer: Tracer, metrics: Metrics) -> None:
        self.config = config
        self.tracer = tracer
        self.metrics = metrics

        self.l1 = L1WorkingMemory()
        self.kg = L5KnowledgeGraph()

        self.l2: L2SessionMemory | None = None
        self.l3: L3EpisodicMemory | None = None
        self.l4: L4SemanticMemory | None = None

        if config.mode in (UnifiedMemoryMode.l2, UnifiedMemoryMode.all):
            self.l2 = L2SessionMemory(redis_url=config.redis_url)
        if config.mode in (UnifiedMemoryMode.l3, UnifiedMemoryMode.all):
            self.l3 = L3EpisodicMemory(sqlite_path=config.sqlite_path)
        if config.mode in (UnifiedMemoryMode.l4, UnifiedMemoryMode.all):
            self.l4 = L4SemanticMemory(persist_dir=config.chroma_persist_dir)

    async def write_event(self, *, kind: str, content: str, metadata: dict[str, Any] | None = None) -> None:
        md = metadata or {}
        with self.tracer.span("memory.write", attributes={"kind": kind, "mode": self.config.mode.value}):
            self.l1.append(kind=kind, content=content, metadata=md)
            self.metrics.memory_writes_total.labels(kind=kind).inc()

            if self.l2:
                self.l2.append(
                    session_id=self.config.session_id,
                    kind=kind,
                    content=content,
                    metadata=md,
                )
            if self.l3:
                self.l3.append(kind=kind, content=content, metadata=md)
            if self.l4:
                self.l4.add(kind=kind, content=content, metadata=md)

    async def recall(self, *, query: str, limit: int = 5) -> dict[str, Any]:
        with self.tracer.span("memory.recall", attributes={"mode": self.config.mode.value}):
            out: dict[str, Any] = {"l1": [], "l2": [], "l3": [], "l4": []}
            out["l1"] = [x.content for x in self.l1.recent(limit=limit)]
            if self.l2:
                out["l2"] = [x.content for x in self.l2.recent(session_id=self.config.session_id, limit=limit)]
            if self.l3:
                out["l3"] = [r.content for r in self.l3.search(query=query, limit=limit)]
            if self.l4:
                out["l4"] = [h.content for h in self.l4.query(text=query, limit=limit)]
            return out

