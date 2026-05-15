from __future__ import annotations

import asyncio
import os
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import yaml

from agents.critic import Critic
from agents.patterns.competitive import CompetitivePattern
from agents.patterns.debate import DebatePattern
from agents.patterns.pipeline import PipelinePattern
from agents.planner import Planner
from agents.specialists.analyst import AnalystAgent
from agents.specialists.builder import BuilderAgent
from agents.specialists.coder import CoderAgent
from agents.specialists.researcher import ResearcherAgent
from agents.specialists.writer import WriterAgent
from communication.router import ProviderRouter
from memory.unified_memory import UnifiedMemory
from observability.metrics import Metrics
from observability.tracer import Tracer


@dataclass(frozen=True)
class OrchestratorResult:
    final_output: str
    by_agent: dict[str, str]
    judge_report: str | None = None


class Orchestrator:
    def __init__(
        self,
        *,
        router: ProviderRouter,
        memory: UnifiedMemory,
        tracer: Tracer,
        metrics: Metrics,
        agents_config_path: str = "config/agents.yaml",
    ) -> None:
        self.router = router
        self.memory = memory
        self.tracer = tracer
        self.metrics = metrics
        self.planner = Planner()
        self.critic = Critic()
        self.agents_config_path = agents_config_path

    def _load_agent_instructions(self) -> dict[str, str]:
        with open(self.agents_config_path, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        agents = data.get("agents", {})
        return {k: (v.get("instruction") or "") for k, v in agents.items()}

    def _build_agents(self, names: list[str]) -> dict[str, Any]:
        instructions = self._load_agent_instructions()
        built: dict[str, Any] = {}
        for n in names:
            instr = instructions.get(n, "")
            if n == "researcher":
                built[n] = ResearcherAgent(
                    router=self.router,
                    name=n,
                    instruction=instr,
                    tracer=self.tracer,
                    metrics=self.metrics,
                )
            elif n == "coder":
                built[n] = CoderAgent(
                    router=self.router,
                    name=n,
                    instruction=instr,
                    tracer=self.tracer,
                    metrics=self.metrics,
                )
            elif n == "analyst":
                built[n] = AnalystAgent(
                    router=self.router,
                    name=n,
                    instruction=instr,
                    tracer=self.tracer,
                    metrics=self.metrics,
                )
            elif n == "writer":
                built[n] = WriterAgent(
                    router=self.router,
                    name=n,
                    instruction=instr,
                    tracer=self.tracer,
                    metrics=self.metrics,
                )
            elif n == "builder":
                built[n] = BuilderAgent(
                    router=self.router,
                    name=n,
                    instruction=instr,
                    tracer=self.tracer,
                    metrics=self.metrics,
                )
            else:
                raise ValueError(f"Unknown agent: {n}")
        return built

    async def run(
        self,
        *,
        prompt: str,
        agent_names: list[str],
        pattern: str,
        reflect: bool,
        timeout_s: float = 120.0,
        progress_cb: Callable[[dict[str, Any]], None] | None = None,
    ) -> OrchestratorResult:
        with self.tracer.span("orchestrator.run", attributes={"pattern": pattern}):
            agents = self._build_agents(agent_names)
            nodes = self.planner.build(user_prompt=prompt, agent_names=agent_names)

            recall = await self.memory.recall(query=prompt, limit=5)
            recall_lines: list[str] = []
            for tier in ("l2", "l3", "l4", "l1"):
                items = recall.get(tier) or []
                if not items:
                    continue
                recall_lines.append(f"[{tier.upper()}]")
                for x in items[:5]:
                    recall_lines.append(f"- {x}")
                recall_lines.append("")
            recall_block = ""
            if recall_lines:
                recall_block = (
                    "\n\n[MEMORY RECALL]\n"
                    "Use the items below as prior context and answer accordingly.\n\n"
                    + "\n".join(recall_lines).strip()
                )

            # Make memory recall explicit in the actual prompts, not just hidden in JSON context.
            if recall_block:
                nodes = [
                    type(n)(
                        id=n.id,
                        agent=n.agent,
                        prompt=(n.prompt + recall_block),
                        depends_on=n.depends_on,
                    )
                    for n in nodes
                ]
            # Provide explicit meaning so LLMs don't confuse this with CPU/GPU "unified memory".
            base_context: dict[str, Any] = {
                "memory_mode": self.memory.config.mode.value,
                "memory_mode_meaning": {
                    "none": "No external memory backends (only transient in-process context).",
                    "l1": "L1 working memory only (in-process recent events).",
                    "l2": "L2 session memory (Redis).",
                    "l3": "L3 episodic memory (SQLite FTS).",
                    "l4": "L4 semantic memory (Chroma vector store).",
                    "all": "Enable all tiers: L1 + Redis (L2) + SQLite (L3) + Chroma (L4).",
                },
                "memory_recall": recall,
            }
            await self.memory.write_event(
                kind="user_prompt",
                content=prompt,
                metadata={"agents": agent_names},
            )

            # HITL (Human-in-the-loop) Check for critical workflows (disabled for API / headless).
            _hitl_off = os.environ.get("AMA_DISABLE_HITL", "").lower() in ("1", "true", "yes")
            if not _hitl_off and ("CRITICAL" in prompt.upper() or pattern == "pipeline"):
                msg = f"\\n[HITL] About to execute pattern={pattern!r} (critical workflow)."
                print(msg)
                approval = input("[HITL] Do you approve this execution? (y/n): ")
                if approval.lower() != "y":
                    raise RuntimeError("Execution aborted by human.")

            if pattern == "debate":
                runner = DebatePattern(critic=self.critic)
                res = await asyncio.wait_for(
                    runner.run(
                        nodes=nodes,
                        agents=agents,
                        context=base_context,
                        reflect=reflect,
                        progress_cb=progress_cb,
                    ),
                    timeout=timeout_s,
                )
                final = res.winner.content
                by_agent = {k: v.content for k, v in res.by_agent.items()}
                judge_report = self._judge_report(res.finalists, winner=res.winner)
            elif pattern == "competitive":
                runner = CompetitivePattern(critic=self.critic)
                res = await asyncio.wait_for(
                    runner.run(
                        nodes=nodes,
                        agents=agents,
                        context=base_context,
                        reflect=reflect,
                        progress_cb=progress_cb,
                    ),
                    timeout=timeout_s,
                )
                final = res.winner.content
                by_agent = {k: v.content for k, v in res.by_agent.items()}
                judge_report = self._judge_report(res.finalists, winner=res.winner)
            elif pattern == "pipeline":
                runner = PipelinePattern()
                res = await asyncio.wait_for(
                    runner.run(
                        nodes=nodes,
                        agents=agents,
                        context=base_context,
                        reflect=reflect,
                        progress_cb=progress_cb,
                    ),
                    timeout=timeout_s,
                )
                by_agent = {r.agent_name: r.content for r in res.outputs}
                final = res.outputs[-1].content if res.outputs else ""
                judge_report = None
            else:
                raise ValueError(f"Unknown pattern: {pattern}")

            # Persist each agent's output for episodic/semantic memory (if enabled).
            for agent, content in by_agent.items():
                await self.memory.write_event(
                    kind="agent_output",
                    content=content,
                    metadata={"agent": agent, "pattern": pattern},
                )
            await self.memory.write_event(
                kind="final_output",
                content=final,
                metadata={"pattern": pattern},
            )
            return OrchestratorResult(
                final_output=final,
                by_agent=by_agent,
                judge_report=judge_report,
            )

    def _judge_report(self, finalists, *, winner) -> str:
        lines: list[str] = []
        lines.append("## Judge")
        lines.append(f"**Winner**: `{winner.agent_name}` (score: {winner.score:.2f})")
        if winner.reasons:
            lines.append("")
            lines.append("**Why it won**:")
            lines.extend([f"- {r}" for r in winner.reasons])
        lines.append("")
        lines.append("**Scores**:")
        for c in finalists[:5]:
            lines.append(f"- `{c.agent_name}`: {c.score:.2f}")
        return "\n".join(lines).strip() + "\n"

