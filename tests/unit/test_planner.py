from agents.planner import Planner


def test_planner_adds_writer_dependency() -> None:
    nodes = Planner().build(user_prompt="x", agent_names=["researcher", "writer"])
    assert [n.agent for n in nodes] == ["researcher", "writer"]
    writer = nodes[-1]
    assert writer.agent == "writer"
    assert writer.depends_on == ["researcher.draft"]

