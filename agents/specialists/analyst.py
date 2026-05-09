from __future__ import annotations

from typing import Any

from agents.base_agent import AgentResult, BaseAgent
from communication.router import ProviderRouter


class AnalystAgent(BaseAgent):
    def __init__(
        self,
        *,
        router: ProviderRouter,
        name: str,
        instruction: str,
        tracer,
        metrics,
    ) -> None:
        super().__init__(name=name, instruction=instruction, tracer=tracer, metrics=metrics)
        self.router = router

    async def run(self, *, prompt: str, context: dict[str, Any]) -> AgentResult:
        with self.tracer.span("agent.run", attributes={"agent": self.name}):
            content = await self.router.complete(
                system=self.instruction,
                user=prompt,
                agent=self.name,
                extra_context=context,
            )
            return AgentResult(agent_name=self.name, content=content, metadata={"kind": "analysis"})

