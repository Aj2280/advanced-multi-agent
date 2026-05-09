from __future__ import annotations

from typing import Any

from agents.base_agent import AgentResult, BaseAgent
from communication.router import ProviderRouter
from duckduckgo_search import DDGS
import re


class ResearcherAgent(BaseAgent):
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
            # Give the agent instructions on how to use the search tool
            enhanced_instruction = self.instruction + "\n\nTOOL USAGE: To search the live internet, output exactly: [SEARCH: your query here]. If you use this, the system will append search results and you can then provide your final answer."

            content = await self.router.complete(
                system=enhanced_instruction,
                user=prompt,
                agent=self.name,
                extra_context=context,
            )
            
            # Check if the agent requested a search
            search_match = re.search(r'\[SEARCH:\s*(.*?)\]', content)
            if search_match:
                query = search_match.group(1).strip()
                print(f"\n🌍 [Researcher] Searching the web for: '{query}'...")
                
                try:
                    with DDGS() as ddgs:
                        results = list(ddgs.text(query, max_results=3))
                    
                    search_context = f"\n\n--- Live Web Search Results for '{query}' ---\n"
                    for res in results:
                        search_context += f"Source: {res.get('title')}\nSnippet: {res.get('body')}\n\n"
                        
                    # Second pass: Give the agent the search results to formulate a final answer
                    content = await self.router.complete(
                        system=self.instruction,
                        user=prompt + search_context,
                        agent=self.name,
                        extra_context=context,
                    )
                except Exception as e:
                    print(f"Web search failed: {e}")

            return AgentResult(agent_name=self.name, content=content, metadata={"kind": "research", "searched": bool(search_match)})

