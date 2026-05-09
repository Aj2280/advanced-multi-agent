from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from pathlib import Path
import uuid

import streamlit as st
from dotenv import load_dotenv
from redis.exceptions import ConnectionError as RedisConnectionError

from agents.meta_agent import MetaAgent
from communication.router import ProviderRouter
from memory.unified_memory import UnifiedMemory, UnifiedMemoryConfig, UnifiedMemoryMode
from observability.metrics import Metrics
from observability.tracer import Tracer


ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class AgentStack:
    tracer: Tracer
    metrics: Metrics
    router: ProviderRouter


@st.cache_resource
def _get_stack() -> AgentStack:
    # Streamlit reruns the script often; keep global init in a cached resource.
    # This avoids OpenTelemetry "Overriding of current TracerProvider" issues.
    load_dotenv(dotenv_path=ROOT / ".env", override=False)

    tracer = Tracer.from_env()
    metrics = Metrics()
    router = ProviderRouter.from_yaml(
        path=str(ROOT / "config" / "models.yaml"),
        env=os.environ,
        tracer=tracer,
        metrics=metrics,
    )
    return AgentStack(tracer=tracer, metrics=metrics, router=router)


def _run_once(
    prompt: str,
    *,
    pattern: str,
    memory_mode: str,
    reflect: bool,
    agents: list[str],
    progress_cb,
) -> str:
    stack = _get_stack()

    async def _run_with_memory(mode: str) -> str:
        st.session_state["last_effective_memory_mode"] = mode
        # Ensure a stable session id across Streamlit reruns + chat messages.
        os.environ["AMA_SESSION_ID"] = st.session_state.get("ama_session_id", "")
        memory = UnifiedMemory(
            config=UnifiedMemoryConfig.from_env(mode=UnifiedMemoryMode(mode)),
            tracer=stack.tracer,
            metrics=stack.metrics,
        )
        agent = MetaAgent(
            router=stack.router,
            memory=memory,
            tracer=stack.tracer,
            metrics=stack.metrics,
        )

        with stack.tracer.span("run.chat_ui", attributes={"pattern": pattern, "reflect": reflect}):
            result = await agent.run(
                prompt=prompt,
                agent_names=agents,
                pattern=pattern,
                reflect=reflect,
                progress_cb=progress_cb,
            )
        out = result.final_output
        if st.session_state.get("show_judge") and result.judge_report:
            out = out.rstrip() + "\n\n---\n\n" + result.judge_report
        return out

    async def _amain() -> str:
        try:
            return await _run_with_memory(memory_mode)
        except RedisConnectionError as e:
            st.session_state["last_memory_fallback_reason"] = f"{type(e).__name__}: {e}"
            return await _run_with_memory("none")
        except Exception as e:  # noqa: BLE001
            msg = str(e)
            # Some redis errors are wrapped in other exception types; fall back based on message.
            redisish = any(
                needle in msg
                for needle in (
                    "localhost:6379",
                    "127.0.0.1:6379",
                    "Error 61",
                    "Errno 61",
                    "Connection refused",
                    "connect()",
                )
            )
            if redisish:
                st.session_state["last_memory_fallback_reason"] = f"{type(e).__name__}: {e}"
                return await _run_with_memory("none")
            raise

    return asyncio.run(_amain())


def _strip_self_check(text: str) -> str:
    # The project has an MVP "reflection" feature that appends a "## Self-check" section.
    # For chat UX, hide that section unless the user explicitly asks for it.
    marker = "\n## Self-check\n"
    if marker in text:
        return text.split(marker, 1)[0].rstrip()
    return text


def _format_chat_history(messages: list[dict], *, limit: int = 10) -> str:
    tail = messages[-limit:] if limit > 0 else messages
    lines: list[str] = []
    for m in tail:
        role = str(m.get("role", "")).upper()
        content = str(m.get("content", "")).strip()
        if not content:
            continue
        lines.append(f"{role}: {content}")
    return "\n".join(lines).strip()


st.set_page_config(page_title="Agent Chat UI", layout="centered")
st.title("Agent Chat UI")
st.caption("A simple local chat website for your swarm agent.")

if "ama_session_id" not in st.session_state:
    st.session_state["ama_session_id"] = uuid.uuid4().hex

with st.sidebar:
    st.subheader("Run settings")
    agent_csv = st.text_input("Agents (comma-separated)", value="researcher,coder,analyst,writer")
    pattern = st.selectbox("Pattern", options=["debate", "competitive", "pipeline"], index=0)
    memory_mode = st.selectbox("Memory", options=["none", "l1", "l2", "l3", "l4", "all"], index=0)
    reflect = st.toggle("Reflect", value=False)
    st.session_state["show_judge"] = st.toggle("Show judge (winner + reasons)", value=True)
    include_history = st.toggle("Include chat history (recommended)", value=True)
    st.caption(
        "If Docker/Redis isn't running, choose memory = none (or the app will auto-fallback)."
    )
    st.caption(f"Session: `{st.session_state['ama_session_id'][:8]}`")

if reason := st.session_state.get("last_memory_fallback_reason"):
    st.warning(f"Memory fallback to `none` (Redis not available): {reason}")

if "messages" not in st.session_state:
    st.session_state.messages = []

for m in st.session_state.messages:
    with st.chat_message(m["role"]):
        st.markdown(m["content"])

user_text = st.chat_input("Type a message and press Enter…")
if user_text:
    st.session_state.messages.append({"role": "user", "content": user_text})
    with st.chat_message("user"):
        st.markdown(user_text)

    agents = [a.strip() for a in agent_csv.split(",") if a.strip()]
    with st.chat_message("assistant"):
        status = st.status("Working…", expanded=True)
        agent_lines: dict[str, str] = {}

        def _progress_cb(evt):
            t = evt.get("type")
            if t == "agent_start":
                agent_lines[evt["agent"]] = f"- `{evt['agent']}`: running…"
            elif t == "agent_done":
                agent_lines[evt["agent"]] = f"- `{evt['agent']}`: done"
            elif t == "judge_done":
                status.update(label=f"Judging… winner: {evt.get('winner')}", state="running")
            status.markdown("\n".join(agent_lines.values()) if agent_lines else "Starting…")

        with st.spinner("Thinking…"):
            try:
                prompt = user_text
                if include_history:
                    history = _format_chat_history(st.session_state.messages, limit=12)
                    if history:
                        prompt = prompt + "\n\n[CHAT HISTORY]\n" + history
                reply = _run_once(
                    prompt,
                    pattern=pattern,
                    memory_mode=memory_mode,
                    reflect=reflect,
                    agents=agents,
                    progress_cb=_progress_cb,
                )
                reply = _strip_self_check(reply)
            except Exception as e:  # noqa: BLE001
                reply = f"Error while running agent:\n\n`{e}`"
        status.update(label="Done", state="complete")
        st.markdown(reply)

    st.session_state.messages.append({"role": "assistant", "content": reply})

