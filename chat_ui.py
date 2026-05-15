from __future__ import annotations

import asyncio
import os
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import streamlit as st
from dotenv import load_dotenv
from redis.exceptions import ConnectionError as RedisConnectionError

from agents.meta_agent import MetaAgent, MetaAgentResult
from communication.router import ProviderRouter
from memory.unified_memory import UnifiedMemory, UnifiedMemoryConfig, UnifiedMemoryMode
from observability.metrics import Metrics
from observability.tracer import Tracer

ROOT = Path(__file__).resolve().parent

_SANDBOX_MARK = "--- Sandbox Execution Result ---"


@dataclass
class AgentStack:
    tracer: Tracer
    metrics: Metrics
    router: ProviderRouter


@dataclass
class ChatRunArtifact:
    """Structured output from one swarm run (for workspace + debug UI)."""

    summary_markdown: str
    by_agent: dict[str, str]
    judge_report: str | None
    pattern: str
    events: list[dict[str, Any]] = field(default_factory=list)
    judge_meta: dict[str, Any] | None = None


@st.cache_resource
def _get_stack() -> AgentStack:
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


def _split_sandbox(body: str) -> tuple[str, str | None]:
    if _SANDBOX_MARK not in body:
        return body, None
    main, rest = body.split(_SANDBOX_MARK, 1)
    return main.rstrip(), rest.strip() or None


def _render_mixed_content(text: str) -> None:
    """Render markdown interleaved with fenced code blocks (bolt-style preview)."""
    if not text.strip():
        return
    parts = text.split("```")
    for i, part in enumerate(parts):
        if i % 2 == 0:
            if part.strip():
                st.markdown(part)
            continue
        first_nl = part.find("\n")
        lang = "text"
        body = part
        if first_nl != -1:
            maybe = part[:first_nl].strip()
            rest = part[first_nl + 1 :]
            if maybe and len(maybe) < 24 and "\n" not in maybe:
                known = ("python", "bash", "json", "typescript", "tsx", "js", "yaml")
                lang = maybe if maybe in known else "text"
                body = rest
        use_ln = lang == "python"
        st.code(
            body.strip(),
            language=None if lang == "text" else lang,
            line_numbers=use_ln,
        )


def _render_swarm_workspace(art: ChatRunArtifact) -> None:
    if not art.by_agent:
        return

    st.divider()
    st.subheader("Multi-agent workspace")
    st.caption(
        "Each agent: source (left) and run output / sandbox (right), like an editor and terminal."
    )

    if art.pattern in ("debate", "competitive") and art.judge_meta:
        w = art.judge_meta.get("winner")
        sc = art.judge_meta.get("score")
        if sc is not None:
            st.success(f"Debate winner: **{w}** (score {sc})")
        else:
            st.success(f"Debate winner: **{w}**")

    tabs = st.tabs(list(art.by_agent.keys()))
    for tab, (agent_name, raw) in zip(tabs, art.by_agent.items(), strict=True):
        with tab:
            meta = art.events
            node_ev = [e for e in meta if e.get("agent") == agent_name]
            if node_ev:
                with st.expander(f"Trace · {agent_name}", expanded=False):
                    st.json(node_ev)
            main, sandbox = _split_sandbox(raw)
            src_col, out_col = st.columns([1, 1], gap="medium")
            with src_col:
                st.markdown("**Source**")
                _render_mixed_content(main)
            with out_col:
                st.markdown("**Run output**")
                if sandbox:
                    st.code(sandbox, language="text", line_numbers=True)
                else:
                    st.caption("No sandbox output. The coder runs fenced Python blocks.")

    if art.judge_report:
        with st.expander("Judge full report", expanded=False):
            st.markdown(art.judge_report)

    with st.expander("Run debugger", expanded=False):
        st.markdown("**Pattern**")
        st.code(art.pattern, language="text")
        st.markdown("**Progress timeline**")
        if art.events:
            st.json(art.events)
        else:
            st.caption("No progress events recorded.")


def _run_once(
    prompt: str,
    *,
    pattern: str,
    memory_mode: str,
    reflect: bool,
    agents: list[str],
    progress_cb,
) -> ChatRunArtifact:
    stack = _get_stack()
    events: list[dict[str, Any]] = []
    judge_meta: dict[str, Any] | None = None

    def _wrap_progress(evt: dict[str, Any]) -> None:
        events.append(dict(evt))
        nonlocal judge_meta
        if evt.get("type") == "judge_done":
            judge_meta = {
                "winner": evt.get("winner"),
                "score": evt.get("score"),
                "reasons": evt.get("reasons"),
            }
        if progress_cb:
            progress_cb(evt)

    async def _run_with_memory(mode: str) -> ChatRunArtifact:
        st.session_state["last_effective_memory_mode"] = mode
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
                progress_cb=_wrap_progress,
            )
        return _build_artifact(result, pattern=pattern, events=events, judge_meta=judge_meta)

    async def _amain() -> ChatRunArtifact:
        try:
            return await _run_with_memory(memory_mode)
        except RedisConnectionError as e:
            st.session_state["last_memory_fallback_reason"] = f"{type(e).__name__}: {e}"
            return await _run_with_memory("none")
        except Exception as e:  # noqa: BLE001
            msg = str(e)
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


def _build_artifact(
    result: MetaAgentResult,
    *,
    pattern: str,
    events: list[dict[str, Any]],
    judge_meta: dict[str, Any] | None,
) -> ChatRunArtifact:
    summary = _strip_self_check(result.final_output)
    judge_report = result.judge_report if st.session_state.get("show_judge") else None
    if judge_report:
        summary = summary.rstrip() + "\n\n---\n\n" + judge_report
    return ChatRunArtifact(
        summary_markdown=summary,
        by_agent=dict(result.by_agent),
        judge_report=judge_report,
        pattern=pattern,
        events=list(events),
        judge_meta=judge_meta,
    )


def _strip_self_check(text: str) -> str:
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


def _render_historical_assistant(m: dict[str, Any]) -> None:
    st.markdown(m.get("content", ""))
    art_dict = m.get("artifact")
    if not art_dict:
        return
    art = ChatRunArtifact(**art_dict)
    _render_swarm_workspace(art)


def _artifact_to_dict(art: ChatRunArtifact) -> dict[str, Any]:
    return {
        "summary_markdown": art.summary_markdown,
        "by_agent": art.by_agent,
        "judge_report": art.judge_report,
        "pattern": art.pattern,
        "events": art.events,
        "judge_meta": art.judge_meta,
    }


st.set_page_config(page_title="Swarm Lab", layout="wide", initial_sidebar_state="expanded")
st.title("Swarm Lab")
st.caption(
    "Multi-agent orchestration with debate, code execution, and a workspace-style trace — "
    "local alternative to a bolt-style agent panel."
)

if "ama_session_id" not in st.session_state:
    st.session_state.ama_session_id = uuid.uuid4().hex

with st.sidebar:
    st.subheader("Run settings")
    agent_csv = st.text_input("Agents (comma-separated)", value="researcher,coder,analyst,writer")
    pattern = st.selectbox("Pattern", options=["debate", "competitive", "pipeline"], index=0)
    memory_mode = st.selectbox("Memory", options=["none", "l1", "l2", "l3", "l4", "all"], index=0)
    reflect = st.toggle("Reflect", value=False)
    st.session_state["show_judge"] = st.toggle("Show judge (winner + reasons)", value=True)
    include_history = st.toggle("Include chat history (recommended)", value=True)
    
    st.divider()
    st.subheader("Appearance")
    theme_choice = st.selectbox(
        "Theme Preference",
        options=["System", "Light", "Dark"],
        index=0,
        help="Select 'System' to follow your OS settings."
    )
    
    # CSS Injection for theme overrides
    if theme_choice == "Light":
        st.markdown("""
            <style>
                [data-testid="stAppViewContainer"] { background-color: #FFFFFF; color: #31333F; }
                [data-testid="stSidebar"] { background-color: #F0F2F6; }
                .stMarkdown { color: #31333F; }
                [data-testid="stChatMessage"] { background-color: #F0F2F6; border: 1px solid #E6E9EF; }
            </style>
        """, unsafe_allow_html=True)
    elif theme_choice == "Dark":
        st.markdown("""
            <style>
                [data-testid="stAppViewContainer"] { background-color: #0E1117; color: #FAFAFA; }
                [data-testid="stSidebar"] { background-color: #262730; }
                .stMarkdown { color: #FAFAFA; }
                [data-testid="stChatMessage"] { background-color: #1E2129; border: 1px solid #30333D; }
            </style>
        """, unsafe_allow_html=True)

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
        if m["role"] == "assistant" and m.get("artifact"):
            _render_historical_assistant(m)
        else:
            st.markdown(m.get("content", ""))

user_text = st.chat_input("Describe what you want the swarm to build or analyze…")
if user_text:
    st.session_state.messages.append({"role": "user", "content": user_text})
    with st.chat_message("user"):
        st.markdown(user_text)

    agents = [a.strip() for a in agent_csv.split(",") if a.strip()]
    with st.chat_message("assistant"):
        status = st.status("Working…", expanded=True)
        agent_lines: dict[str, str] = {}

        def _progress_cb(evt: dict[str, Any]) -> None:
            t = evt.get("type")
            if t == "agent_start":
                agent_lines[str(evt["agent"])] = f"- `{evt['agent']}`: running…"
            elif t == "agent_done":
                agent_lines[str(evt["agent"])] = f"- `{evt['agent']}`: done"
            elif t == "judge_done":
                status.update(
                    label=f"Judging… winner: {evt.get('winner')} (score {evt.get('score')})",
                    state="running",
                )
            status.markdown("\n".join(agent_lines.values()) if agent_lines else "Starting…")

        with st.spinner("Agents thinking…"):
            try:
                prompt = user_text
                if include_history:
                    history = _format_chat_history(st.session_state.messages, limit=12)
                    if history:
                        prompt = prompt + "\n\n[CHAT HISTORY]\n" + history
                artifact = _run_once(
                    prompt,
                    pattern=pattern,
                    memory_mode=memory_mode,
                    reflect=reflect,
                    agents=agents,
                    progress_cb=_progress_cb,
                )
            except Exception as e:  # noqa: BLE001
                err = f"Error while running agent:\n\n`{e}`"
                status.update(label="Failed", state="error")
                st.markdown(err)
                st.session_state.messages.append({"role": "assistant", "content": err})
            else:
                status.update(label="Done", state="complete")
                st.markdown(artifact.summary_markdown)
                _render_swarm_workspace(artifact)
                st.session_state.messages.append(
                    {
                        "role": "assistant",
                        "content": artifact.summary_markdown,
                        "artifact": _artifact_to_dict(artifact),
                    }
                )
