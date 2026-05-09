from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TeachingArtifact:
    expert: str
    student: str
    lesson: str


class TeachingProtocol:
    """
    MVP placeholder for expert→student transfer.
    """

    def transfer(self, *, expert_output: str, student_constraints: str) -> TeachingArtifact:
        lesson = f"Constraints:\n{student_constraints}\n\nExpert snippet:\n{expert_output[:2000]}"
        return TeachingArtifact(expert="expert", student="student", lesson=lesson)

