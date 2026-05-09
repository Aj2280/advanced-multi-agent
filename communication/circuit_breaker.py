from __future__ import annotations

import time
from dataclasses import dataclass


@dataclass
class CircuitState:
    consecutive_failures: int = 0
    open_until_ts: float = 0.0

    def is_open(self) -> bool:
        return time.time() < self.open_until_ts


class CircuitBreaker:
    def __init__(self, *, max_consecutive_failures: int, open_seconds: int = 30) -> None:
        self.max_consecutive_failures = max_consecutive_failures
        self.open_seconds = open_seconds
        self._state = CircuitState()

    def allow_request(self) -> bool:
        return not self._state.is_open()

    def on_success(self) -> None:
        self._state.consecutive_failures = 0
        self._state.open_until_ts = 0.0

    def on_failure(self) -> None:
        self._state.consecutive_failures += 1
        if self._state.consecutive_failures >= self.max_consecutive_failures:
            self._state.open_until_ts = time.time() + self.open_seconds

    @property
    def state(self) -> CircuitState:
        return self._state

