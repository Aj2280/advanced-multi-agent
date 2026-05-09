from __future__ import annotations

from typing import Any

from agents.base_agent import AgentResult, BaseAgent
from communication.router import ProviderRouter
from agents.sandbox import Sandbox
import re


class CoderAgent(BaseAgent):
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
            
            # Secure Sandbox Execution
            code_match = re.search(r'```python\n(.*?)\n```', content, re.DOTALL)
            execution_log = ""
            if code_match:
                code_to_run = code_match.group(1)
                execution_log = Sandbox.execute_python(code_to_run, timeout_s=5)
                content += f"\n\n--- Sandbox Execution Result ---\n{execution_log}"

            return AgentResult(agent_name=self.name, content=content, metadata={"kind": "code", "executed": bool(code_match)})

