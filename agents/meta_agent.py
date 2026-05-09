from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from agents.orchestrator import Orchestrator
from communication.router import ProviderRouter
from memory.unified_memory import UnifiedMemory
from observability.metrics import Metrics
from observability.tracer import Tracer


@dataclass(frozen=True)
class MetaAgentResult:
    final_output: str
    by_agent: dict[str, str]
    judge_report: str | None = None


class MetaAgent:
    """
    MVP meta-orchestrator: wraps Orchestrator and is the place to add SLA monitoring,
    dynamic routing, and autoscaling triggers later.
    """

    def __init__(
        self,
        *,
        router: ProviderRouter,
        memory: UnifiedMemory,
        tracer: Tracer,
        metrics: Metrics,
    ) -> None:
        self.orchestrator = Orchestrator(router=router, memory=memory, tracer=tracer, metrics=metrics)
        self.tracer = tracer

    async def run(
        self,
        *,
        prompt: str,
        agent_names: list[str],
        pattern: str,
        reflect: bool,
        progress_cb: Callable[[dict[str, Any]], None] | None = None,
    ) -> MetaAgentResult:
        with self.tracer.span("meta_agent.run", attributes={"pattern": pattern}):
            res = await self.orchestrator.run(
                prompt=prompt,
                agent_names=agent_names,
                pattern=pattern,
                reflect=reflect,
                progress_cb=progress_cb,
            )
            return MetaAgentResult(
                final_output=res.final_output, by_agent=res.by_agent, judge_report=res.judge_report
            )

