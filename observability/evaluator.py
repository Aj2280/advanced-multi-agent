from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class EvalCase:
    name: str
    prompt: str


class Evaluator:
    """
    MVP harness placeholder. In production this runs benchmark suites and compares outputs.
    """

    def __init__(self, *, cases: list[EvalCase]) -> None:
        self.cases = cases

