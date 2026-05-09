from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Callable

from agents.base_agent import AgentResult, BaseAgent
from agents.critic import Critic, ScoredCandidate
from agents.planner import PlanNode


@dataclass(frozen=True)
class DebateResult:
    finalists: list[ScoredCandidate]
    winner: ScoredCandidate
    by_agent: dict[str, AgentResult]


class DebatePattern:
    def __init__(self, *, critic: Critic) -> None:
        self.critic = critic

    async def run(
        self,
        *,
        nodes: list[PlanNode],
        agents: dict[str, BaseAgent],
        context: dict[str, Any],
        reflect: bool,
        progress_cb: Callable[[dict[str, Any]], None] | None = None,
    ) -> DebateResult:
        # Execute respecting dependencies using simple topological batching.
        by_id: dict[str, AgentResult] = {}
        by_agent: dict[str, AgentResult] = {}

        async def run_node(n: PlanNode) -> tuple[PlanNode, AgentResult]:
            if progress_cb:
                progress_cb({"type": "agent_start", "agent": n.agent, "node_id": n.id})
            dep_text = "\n\n".join(by_id[d].content for d in n.depends_on)
            node_ctx = dict(context)
            if dep_text:
                node_ctx["inputs"] = dep_text
            res = await agents[n.agent].run(prompt=n.prompt, context=node_ctx)
            if reflect:
                res = AgentResult(
                    agent_name=res.agent_name,
                    content=agents[n.agent].reflect(prompt=n.prompt, draft=res.content),
                    metadata=res.metadata,
                )
            if progress_cb:
                progress_cb({"type": "agent_done", "agent": n.agent, "node_id": n.id})
            return n, res

        pending = list(nodes)
        while pending:
            ready = [n for n in pending if all(d in by_id for d in n.depends_on)]
            if not ready:
                missing = {d for n in pending for d in n.depends_on if d not in by_id}
                raise RuntimeError(f"Planner produced unsatisfied dependencies: {sorted(missing)}")

            batch = await asyncio.gather(*(run_node(n) for n in ready))
            for n, r in batch:
                by_id[n.id] = r
                by_agent[r.agent_name] = r
            pending = [n for n in pending if n not in ready]

        candidates: list[ScoredCandidate] = []
        for agent_name, r in by_agent.items():
            # writer.synthesize can be treated as final output directly, but still score it.
            candidates.append(self.critic.score(agent_name=agent_name, content=r.content))

        candidates.sort(key=lambda x: x.score, reverse=True)
        winner = candidates[0]
        if progress_cb:
            progress_cb(
                {
                    "type": "judge_done",
                    "winner": winner.agent_name,
                    "score": winner.score,
                    "reasons": winner.reasons,
                }
            )
        return DebateResult(finalists=candidates, winner=winner, by_agent=by_agent)

