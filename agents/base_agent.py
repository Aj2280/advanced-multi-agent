from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Any

from observability.metrics import Metrics
from observability.tracer import Tracer


@dataclass(frozen=True)
class AgentResult:
    agent_name: str
    content: str
    metadata: dict[str, Any] | None = None


class BaseAgent(abc.ABC):
    def __init__(
        self,
        *,
        name: str,
        instruction: str,
        tracer: Tracer,
        metrics: Metrics,
    ) -> None:
        self.name = name
        self.instruction = instruction
        self.tracer = tracer
        self.metrics = metrics

    @abc.abstractmethod
    async def run(self, *, prompt: str, context: dict[str, Any]) -> AgentResult: ...

    def reflect(self, *, prompt: str, draft: str) -> str:
        # MVP reflection: lightweight self-critique that doesn't require an extra model call.
        issues: list[str] = []
        if len(draft.strip()) < 200:
            issues.append("too short (likely missing details)")
        if "##" not in draft:
            issues.append("no structure (missing markdown sections)")
        if not issues:
            return draft
        return (
            draft
            + "\n\n"
            + "## Self-check\n"
            + "\n".join(f"- {i}" for i in issues)
            + "\n"
        )

