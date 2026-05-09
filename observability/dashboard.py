from __future__ import annotations

from dataclasses import dataclass, field

from rich.console import Console
from rich.live import Live
from rich.table import Table


@dataclass
class DashboardState:
    title: str = "advanced-multi-agent"
    rows: dict[str, str] = field(default_factory=dict)


class Dashboard:
    def __init__(self) -> None:
        self._console = Console()
        self._state = DashboardState()
        self._live: Live | None = None

    def start(self, *, title: str) -> None:
        self._state.title = title
        self._live = Live(self._render(), console=self._console, refresh_per_second=8)
        self._live.start()

    def stop(self) -> None:
        if self._live:
            self._live.stop()
            self._live = None

    def set(self, *, key: str, value: str) -> None:
        self._state.rows[key] = value
        if self._live:
            self._live.update(self._render())

    def _render(self) -> Table:
        t = Table(title=self._state.title)
        t.add_column("Component")
        t.add_column("Status")
        for k, v in sorted(self._state.rows.items()):
            t.add_row(k, v)
        return t

