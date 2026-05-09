from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class TraceContext(BaseModel):
    trace_id: str | None = None
    span_id: str | None = None


class AgentMessage(BaseModel):
    kind: Literal["user", "agent", "system", "event"]
    sender: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    trace: TraceContext | None = None


class SwarmTask(BaseModel):
    task_id: str
    target_agent: str
    prompt: str
    context: dict[str, Any] = Field(default_factory=dict)
    reply_to: str | None = None  # Topic to send the result back to

