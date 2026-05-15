from __future__ import annotations

import asyncio
import json
import mimetypes
import os
from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from ama_api.state import AppState, get_state
from workbench.errors import CommandNotAllowedError, PathEscapeError, WorkbenchError
from workbench.paths import resolve_under_root
from workbench.runner import CommandRunner
from workbench.store import SessionRecord

AppStateDep = Annotated[AppState, Depends(get_state)]


class WriteFileBody(BaseModel):
    path: str
    content: str = Field(..., max_length=2_000_000)


class CommandBody(BaseModel):
    argv: list[str]


class ScaffoldBody(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=20_000)
    run_npm_install: bool = False
    run_npm_build: bool = False


class SwarmBody(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=50_000)
    agent_names: list[str] = Field(default_factory=lambda: ["researcher", "coder", "writer"])
    pattern: str = Field(default="debate", pattern="^(debate|competitive|pipeline)$")
    reflect: bool = False
    memory_mode: str = Field(default="none", pattern="^(none|l1|l2|l3|l4|all)$")


def _cors_origins() -> list[str]:
    if os.environ.get("AMA_API_CORS_ALLOW_ALL", "").lower() in ("1", "true", "yes"):
        return ["*"]
    raw = os.environ.get("AMA_API_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]


def create_app() -> FastAPI:
    app = FastAPI(title="Advanced Multi-Agent Workbench API", version="1.0.0")

    origins = _cors_origins()
    allow_all = origins == ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=not allow_all,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(WorkbenchError)
    async def _wb_exc(_request, exc: WorkbenchError):
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=400, content={"detail": str(exc)})

    def _session_or_404(sid: str) -> SessionRecord:
        rec = get_state().store.get(sid)
        if not rec:
            raise HTTPException(status_code=404, detail="Session not found.")
        return rec

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/v1/sessions")
    def create_session(state: AppStateDep) -> dict[str, Any]:
        rec = state.store.create()
        return {"id": rec.id, "created_at": rec.created_at.isoformat()}

    @app.get("/v1/sessions/{session_id}/files")
    def list_files(session_id: str) -> dict[str, Any]:
        rec = _session_or_404(session_id)
        return {"files": rec.workspace.list_tree()}

    @app.get("/v1/sessions/{session_id}/file")
    def read_file(session_id: str, path: str) -> dict[str, Any]:
        rec = _session_or_404(session_id)
        try:
            content = rec.workspace.read_text(path)
        except PathEscapeError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="File not found.") from None
        return {"path": path, "content": content}

    @app.put("/v1/sessions/{session_id}/file")
    def write_file(session_id: str, body: WriteFileBody) -> dict[str, Any]:
        rec = _session_or_404(session_id)
        rec.workspace.write_text(body.path, body.content)
        return {"ok": True, "path": body.path}

    @app.post("/v1/sessions/{session_id}/commands")
    def run_command(session_id: str, body: CommandBody) -> dict[str, Any]:
        rec = _session_or_404(session_id)
        runner = CommandRunner(cwd=rec.workspace.root)
        try:
            res = runner.run(body.argv)
        except CommandNotAllowedError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        return runner.to_public_dict(res)

    @app.post("/v1/sessions/{session_id}/scaffold")
    async def scaffold(
        session_id: str,
        body: ScaffoldBody,
        state: AppStateDep,
    ) -> dict[str, Any]:
        rec = _session_or_404(session_id)
        out = await state.coordinator.scaffold(user_prompt=body.prompt, workspace=rec.workspace)
        cmd_results: list[dict[str, Any]] = []
        runner = CommandRunner(cwd=rec.workspace.root)
        if body.run_npm_install and not out.parse_error:
            r = runner.run(["npm", "install"])
            cmd_results.append({"step": "npm_install", **runner.to_public_dict(r)})
        if body.run_npm_build and not out.parse_error:
            r = runner.run(["npm", "run", "build"])
            cmd_results.append({"step": "npm_build", **runner.to_public_dict(r)})
        return {
            "parse_error": out.parse_error,
            "written_paths": out.written_paths,
            "file_count": len(out.written_paths),
            "commands": cmd_results,
            "model_excerpt": out.raw_model_text[:4000],
        }

    @app.post("/v1/sessions/{session_id}/swarm")
    async def swarm(
        session_id: str,
        body: SwarmBody,
        state: AppStateDep,
    ) -> dict[str, Any]:
        _session_or_404(session_id)
        agent = state.meta_agent(body.memory_mode, session_id=session_id)

        events: list[dict[str, Any]] = []

        def _cb(evt: dict[str, Any]) -> None:
            events.append(dict(evt))

        try:
            result = await agent.run(
                prompt=body.prompt,
                agent_names=body.agent_names,
                pattern=body.pattern,
                reflect=body.reflect,
                progress_cb=_cb,
            )
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=str(e)) from e

        return {
            "final_output": result.final_output,
            "by_agent": result.by_agent,
            "judge_report": result.judge_report,
            "events": events,
        }

    def _preview_file_response(rec: SessionRecord, relative: str) -> FileResponse:
        rel = relative.strip().lstrip("/") or "index.html"
        try:
            file_path = resolve_under_root(root=rec.workspace.root, relative=rel)
        except PathEscapeError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        if not file_path.is_file():
            raise HTTPException(status_code=404, detail="File not found.") from None
        media, _ = mimetypes.guess_type(str(file_path))
        return FileResponse(
            path=str(file_path),
            media_type=media or "application/octet-stream",
        )

    @app.get("/v1/sessions/{session_id}/preview")
    def preview_file_query(session_id: str, path: str = "index.html") -> FileResponse:
        rec = _session_or_404(session_id)
        return _preview_file_response(rec, path)

    @app.get("/v1/sessions/{session_id}/preview/{file_path:path}")
    def preview_file_path(session_id: str, file_path: str) -> FileResponse:
        """Path-based preview so iframe relative assets (JS/CSS) resolve correctly."""
        rec = _session_or_404(session_id)
        return _preview_file_response(rec, file_path)

    @app.post("/v1/sessions/{session_id}/swarm/stream")
    async def swarm_stream(
        session_id: str,
        body: SwarmBody,
        state: AppStateDep,
    ) -> StreamingResponse:
        _session_or_404(session_id)
        agent = state.meta_agent(body.memory_mode, session_id=session_id)
        queue: asyncio.Queue[tuple[str, Any]] = asyncio.Queue()

        async def _run() -> None:
            events: list[dict[str, Any]] = []

            def _cb(evt: dict[str, Any]) -> None:
                events.append(dict(evt))
                queue.put_nowait(("progress", dict(evt)))

            try:
                result = await agent.run(
                    prompt=body.prompt,
                    agent_names=body.agent_names,
                    pattern=body.pattern,
                    reflect=body.reflect,
                    progress_cb=_cb,
                )
                await queue.put(
                    (
                        "complete",
                        {
                            "final_output": result.final_output,
                            "by_agent": result.by_agent,
                            "judge_report": result.judge_report,
                            "events": events,
                        },
                    )
                )
            except Exception as e:  # noqa: BLE001
                await queue.put(("error", str(e)))

        async def _events() -> AsyncIterator[bytes]:
            task = asyncio.create_task(_run())
            try:
                while True:
                    kind, payload = await queue.get()
                    if kind == "progress":
                        chunk = {"type": "progress", "event": payload}
                        yield f"data: {json.dumps(chunk)}\n\n".encode()
                    elif kind == "complete":
                        chunk = {"type": "complete", "result": payload}
                        yield f"data: {json.dumps(chunk)}\n\n".encode()
                        break
                    elif kind == "error":
                        chunk = {"type": "error", "message": payload}
                        yield f"data: {json.dumps(chunk)}\n\n".encode()
                        break
            finally:
                if not task.done():
                    task.cancel()

        return StreamingResponse(
            _events(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return app


app = create_app()
