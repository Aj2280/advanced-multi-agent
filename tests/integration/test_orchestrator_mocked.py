import os

import pytest

from agents.meta_agent import MetaAgent
from memory.unified_memory import UnifiedMemory, UnifiedMemoryConfig, UnifiedMemoryMode
from observability.metrics import Metrics
from observability.tracer import Tracer


class FakeRouter:
    async def complete(self, *, system: str, user: str, agent: str, extra_context=None, model=None) -> str:  # noqa: ANN001
        # Deterministic output so tests don't need network access.
        if agent == "writer" and extra_context and extra_context.get("inputs"):
            return "## Final\n\nSYNTHESIZED"
        return f"## {agent}\n\n{user[:50]}"


@pytest.mark.asyncio
async def test_meta_agent_runs_end_to_end_without_network(tmp_path) -> None:
    os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = ""

    tracer = Tracer.from_env()
    metrics = Metrics(port=9103)  # avoid conflicts in parallel test runs

    mem_cfg = UnifiedMemoryConfig(
        mode=UnifiedMemoryMode.none,
        session_id="test",
        redis_url="redis://localhost:6379/0",
        sqlite_path=str(tmp_path / "episodic.db"),
        chroma_persist_dir=str(tmp_path / "chroma"),
    )
    memory = UnifiedMemory(config=mem_cfg, tracer=tracer, metrics=metrics)

    agent = MetaAgent(router=FakeRouter(), memory=memory, tracer=tracer, metrics=metrics)  # type: ignore[arg-type]
    res = await agent.run(
        prompt="hello world",
        agent_names=["researcher", "writer"],
        pattern="debate",
        reflect=False,
    )
    assert "Final" in res.final_output

