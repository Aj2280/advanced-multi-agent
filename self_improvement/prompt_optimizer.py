from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PromptOptimization:
    original: str
    suggested: str
    reason: str


class PromptOptimizer:
    """
    MVP: simple rewrite suggestions. In production, this can be trained from ExperienceCollector logs.
    """

    def suggest(self, *, prompt: str) -> PromptOptimization:
        suggested = prompt.strip()
        if not suggested.endswith("."):
            suggested += "."
        suggested += "\n\nReturn a structured markdown answer with clear sections."
        return PromptOptimization(
            original=prompt,
            suggested=suggested,
            reason="Add explicit output-format constraint to reduce ambiguity.",
        )

