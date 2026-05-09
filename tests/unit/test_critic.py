from agents.critic import Critic


def test_critic_prefers_structured_longer_content() -> None:
    c = Critic()
    a = c.score(agent_name="a", content="short")
    b = c.score(agent_name="b", content="## Title\n\n" + ("x" * 1300))
    assert b.score > a.score

