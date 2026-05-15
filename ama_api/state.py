from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

from agents.meta_agent import MetaAgent
from communication.router import ProviderRouter
from memory.unified_memory import UnifiedMemory, UnifiedMemoryConfig, UnifiedMemoryMode
from observability.metrics import Metrics
from observability.tracer import Tracer
from workbench.coordinator import BuildCoordinator
from workbench.store import SessionStore

_ROOT = Path(__file__).resolve().parent.parent


def _default_wb_root() -> Path:
    default = str(_ROOT / ".local" / "workbenches")
    return Path(os.environ.get("AMA_WORKBENCH_ROOT", default)).resolve()


class AppState:
    tracer: Tracer
    metrics: Metrics
    router: ProviderRouter
    store: SessionStore
    coordinator: BuildCoordinator

    def __init__(self) -> None:
        load_dotenv(dotenv_path=_ROOT / ".env", override=False)
        self.tracer = Tracer.from_env()
        self.metrics = Metrics()
        self.router = ProviderRouter.from_yaml(
            path=str(_ROOT / "config" / "models.yaml"),
            env=os.environ,
            tracer=self.tracer,
            metrics=self.metrics,
        )
        self.store = SessionStore(root=_default_wb_root())
        self.coordinator = BuildCoordinator(router=self.router, tracer=self.tracer)

    def meta_agent(self, memory_mode: str, session_id: str) -> MetaAgent:
        os.environ["AMA_SESSION_ID"] = session_id
        memory = UnifiedMemory(
            config=UnifiedMemoryConfig.from_env(mode=UnifiedMemoryMode(memory_mode)),
            tracer=self.tracer,
            metrics=self.metrics,
        )
        return MetaAgent(
            router=self.router,
            memory=memory,
            tracer=self.tracer,
            metrics=self.metrics,
        )


_state: AppState | None = None


def reset_state_for_tests() -> None:
    global _state
    _state = None


def get_state() -> AppState:
    global _state
    if _state is None:
        _state = AppState()
    return _state
