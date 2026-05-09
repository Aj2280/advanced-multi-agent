from __future__ import annotations

from agents.patterns.debate import DebatePattern


class CompetitivePattern(DebatePattern):
    """
    MVP: identical to DebatePattern but conceptually 'race + select best'.
    """

