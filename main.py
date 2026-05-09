from __future__ import annotations

import argparse
import asyncio
import os
from dataclasses import dataclass

from agents.meta_agent import MetaAgent
from communication.router import ProviderRouter
from memory.unified_memory import UnifiedMemory, UnifiedMemoryConfig, UnifiedMemoryMode
from observability.metrics import Metrics
from observability.tracer import Tracer


@dataclass(frozen=True)
class RunConfig:
    mode: str
    agents: list[str]
    pattern: str
    memory: str
    reflect: bool
    serve_metrics: bool
    health: bool
    prompt: str


def _parse_args() -> RunConfig:
    p = argparse.ArgumentParser()
    p.add_argument("--mode", default="swarm", choices=["swarm"])
    p.add_argument("--agents", default="researcher,coder,analyst,writer")
    p.add_argument("--pattern", default="debate", choices=["debate", "competitive", "pipeline"])
    p.add_argument("--memory", default="all", choices=["none", "l1", "l2", "l3", "l4", "all"])
    p.add_argument("--reflect", action="store_true")
    p.add_argument(
        "--serve-metrics",
        action="store_true",
        help="Keep process alive after run so http://localhost:9102/metrics remains accessible.",
    )
    p.add_argument(
        "--health",
        action="store_true",
        help="Ping each configured provider and print status.",
    )
    p.add_argument("prompt", nargs="+")
    a = p.parse_args()
    return RunConfig(
        mode=a.mode,
        agents=[x.strip() for x in a.agents.split(",") if x.strip()],
        pattern=a.pattern,
        memory=a.memory,
        reflect=bool(a.reflect),
        serve_metrics=bool(a.serve_metrics),
        health=bool(a.health),
        prompt=" ".join(a.prompt).strip(),
    )


async def _amain(cfg: RunConfig) -> int:
    tracer = Tracer.from_env()
    metrics = Metrics()

    router = ProviderRouter.from_yaml(
        path="config/models.yaml",
        env=os.environ,
        tracer=tracer,
        metrics=metrics,
    )

    if cfg.health:
        # Minimal ping: run one short completion per agent/provider selection.
        providers = ["gemini", "groq", "openrouter", "cerebras", "openai"]
        for name in providers:
            try:
                out = await router.complete(
                    system="You are a health check.",
                    user="Reply with: OK",
                    agent=name,  # use agent name to reuse agent→provider routing
                    extra_context={},
                )
                print(f"{name}: OK ({out[:30]!r})")
            except Exception as e:  # noqa: BLE001
                print(f"{name}: FAIL ({type(e).__name__}: {e})")
        return 0

    memory = UnifiedMemory(
        config=UnifiedMemoryConfig.from_env(mode=UnifiedMemoryMode(cfg.memory)),
        tracer=tracer,
        metrics=metrics,
    )

    agent = MetaAgent(
        router=router,
        memory=memory,
        tracer=tracer,
        metrics=metrics,
    )

    with tracer.span("run.main", attributes={"pattern": cfg.pattern, "reflect": cfg.reflect}):
        result = await agent.run(
            prompt=cfg.prompt,
            agent_names=cfg.agents,
            pattern=cfg.pattern,
            reflect=cfg.reflect,
        )

    print(result.final_output)

    if cfg.serve_metrics:
        # Keep process alive so Prometheus / browser can scrape while user inspects.
        print("\n[metrics] Serving at http://localhost:9102/metrics (Ctrl+C to stop)")
        while True:
            await asyncio.sleep(3600)
    return 0


def main() -> int:
    # Auto-load .env for local runs (so users don't have to `source .env`).
    try:
        from dotenv import load_dotenv  # type: ignore

        load_dotenv(".env", override=False)
    except Exception:
        pass

    cfg = _parse_args()
    return asyncio.run(_amain(cfg))


if __name__ == "__main__":
    raise SystemExit(main())

