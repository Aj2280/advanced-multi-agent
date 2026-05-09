from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from agents.base_agent import AgentResult, BaseAgent
from agents.planner import PlanNode


@dataclass(frozen=True)
class PipelineResult:
    outputs: list[AgentResult]


class PipelinePattern:
    async def run(
        self,
        *,
        nodes: list[PlanNode],
        agents: dict[str, BaseAgent],
        context: dict[str, Any],
        reflect: bool,
        progress_cb: Callable[[dict[str, Any]], None] | None = None,
    ) -> PipelineResult:
        outputs: list[AgentResult] = []
        by_id: dict[str, AgentResult] = {}

        for n in nodes:
            if progress_cb:
                progress_cb({"type": "agent_start", "agent": n.agent, "node_id": n.id})
            dep_text = "\n\n".join(by_id[d].content for d in n.depends_on)
            node_ctx = dict(context)
            if dep_text:
                node_ctx["inputs"] = dep_text
            r = await agents[n.agent].run(prompt=n.prompt, context=node_ctx)
            if reflect:
                r = AgentResult(
                    agent_name=r.agent_name,
                    content=agents[n.agent].reflect(prompt=n.prompt, draft=r.content),
                    metadata=r.metadata,
                )
            outputs.append(r)
            by_id[n.id] = r
            if progress_cb:
                progress_cb({"type": "agent_done", "agent": n.agent, "node_id": n.id})

        return PipelineResult(outputs=outputs)

