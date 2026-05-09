from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import networkx as nx


@dataclass(frozen=True)
class KGEdge:
    src: str
    dst: str
    rel: str
    metadata: dict[str, Any]


class L5KnowledgeGraph:
    """
    MVP: in-process NetworkX graph. A Neo4j adapter can be added later.
    """

    def __init__(self) -> None:
        self._g = nx.MultiDiGraph()

    def add_edge(self, *, src: str, dst: str, rel: str, metadata: dict[str, Any] | None = None) -> None:
        self._g.add_edge(src, dst, key=rel, rel=rel, **(metadata or {}))

    def neighbors(self, *, node: str) -> list[str]:
        if node not in self._g:
            return []
        return list(self._g.successors(node))

