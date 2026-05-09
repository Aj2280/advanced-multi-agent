from memory.l1_working import L1WorkingMemory


def test_l1_recent() -> None:
    m = L1WorkingMemory(maxlen=3)
    m.append(kind="a", content="1")
    m.append(kind="b", content="2")
    m.append(kind="c", content="3")
    m.append(kind="d", content="4")
    recent = m.recent(limit=10)
    assert [x.content for x in recent] == ["2", "3", "4"]

