from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScoredCandidate:
    agent_name: str
    content: str
    score: float
    reasons: list[str]


class Critic:
    """
    MVP critic: heuristic scoring so it works without extra model calls.
    """

    def score(self, *, agent_name: str, content: str) -> ScoredCandidate:
        c = content.strip()
        reasons: list[str] = []
        score = 0.0

        if agent_name == "writer":
            score += 0.25
            reasons.append("writer synthesis preference")

        # Structure
        if "##" in c:
            score += 1.5
            reasons.append("structured markdown")
        if "- " in c:
            score += 0.5
            reasons.append("uses bullets")

        # Completeness proxy
        length = len(c)
        if length >= 1200:
            score += 2.0
            reasons.append("detailed")
        elif length >= 500:
            score += 1.0
            reasons.append("moderate detail")
        else:
            score -= 0.5
            reasons.append("too brief")

        # Evidence proxy
        if "http" in c or "```" in c:
            score += 0.5
            reasons.append("includes references or code")

        # Penalty: obvious hallucination marker
        if "TODO" in c or "lorem" in c.lower():
            score -= 0.75
            reasons.append("contains placeholders")

        return ScoredCandidate(agent_name=agent_name, content=content, score=score, reasons=reasons)

