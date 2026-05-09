from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlanNode:
    id: str
    agent: str
    prompt: str
    depends_on: list[str]


class Planner:
    """
    MVP DAG planner: produces a small static DAG based on selected agents.
    """

    def build(self, *, user_prompt: str, agent_names: list[str]) -> list[PlanNode]:
        nodes: list[PlanNode] = []
        for a in agent_names:
            nodes.append(
                PlanNode(
                    id=f"{a}.draft",
                    agent=a,
                    prompt=user_prompt,
                    depends_on=[],
                )
            )

        # If writer is present, depend on others so it can synthesize.
        if "writer" in agent_names:
            deps = [n.id for n in nodes if n.agent != "writer"]
            nodes = [n for n in nodes if n.agent != "writer"]
            nodes.append(
                PlanNode(
                    id="writer.synthesize",
                    agent="writer",
                    prompt=user_prompt,
                    depends_on=deps,
                )
            )

        return nodes

