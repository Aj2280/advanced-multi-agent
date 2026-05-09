from __future__ import annotations

import json
import os
from dataclasses import dataclass
from time import time
from typing import Any


@dataclass(frozen=True)
class Experience:
    ts: float
    task: str
    response: str
    score: float
    metadata: dict[str, Any]


class ExperienceCollector:
    def __init__(self, *, path: str = ".local/experience.jsonl") -> None:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        self.path = path

    def log(self, *, task: str, response: str, score: float, metadata: dict[str, Any] | None = None) -> None:
        exp = Experience(ts=time(), task=task, response=response, score=score, metadata=metadata or {})
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(exp.__dict__, ensure_ascii=False) + "\n")

