from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from communication.router import ProviderRouter
from observability.tracer import Tracer
from workbench.runner import CommandResult, CommandRunner
from workbench.session import SessionWorkspace

_BUILD_SYSTEM = """You are a senior full-stack engineer generating a small web project scaffold.

Output rules (strict):
1) Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
   {"files":[{"path":"relative/path","content":"file contents as string"}, ...]}
2) Every path must be a relative POSIX path (no '..', no absolute paths).
3) Prefer a minimal Vite + React + TypeScript app when the user asks for a website or SPA:
   - package.json with scripts: dev, build, preview
   - vite.config.ts, tsconfig.json, index.html
   - src/main.tsx, src/App.tsx using React 18
   - Tailwind is optional; plain CSS in src/App.css is fine.
4) Keep the scaffold small (<= 25 files) and production-minded (clear README in README.md).
5) Do not include secrets, API keys, or .env files with real credentials.
"""


@dataclass(frozen=True)
class ScaffoldOutcome:
    raw_model_text: str
    files: list[dict[str, str]]
    written_paths: list[str]
    parse_error: str | None


def _extract_json_object(text: str) -> dict[str, Any]:
    t = text.strip()
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}\s*$", t)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", t, re.IGNORECASE)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON inside fence: {e}") from e
    raise ValueError("Model did not return parseable JSON.")


class BuildCoordinator:
    """
    Uses the same ProviderRouter as the swarm to turn a natural-language prompt into files.
    """

    def __init__(
        self,
        *,
        router: ProviderRouter,
        tracer: Tracer,
    ) -> None:
        self._router = router
        self._tracer = tracer

    async def scaffold(
        self,
        *,
        user_prompt: str,
        workspace: SessionWorkspace,
        agent: str = "builder",
    ) -> ScaffoldOutcome:
        with self._tracer.span("workbench.scaffold"):
            raw = await self._router.complete(
                system=_BUILD_SYSTEM,
                user=user_prompt,
                agent=agent,
                extra_context={},
            )
        parse_error: str | None = None
        try:
            data = _extract_json_object(raw)
        except ValueError as e:
            parse_error = str(e)
            return ScaffoldOutcome(
                raw_model_text=raw,
                files=[],
                written_paths=[],
                parse_error=parse_error,
            )
        items = data.get("files")
        if not isinstance(items, list):
            parse_error = "JSON must contain a 'files' array."
            return ScaffoldOutcome(
                raw_model_text=raw,
                files=[],
                written_paths=[],
                parse_error=parse_error,
            )
        normalized: list[dict[str, str]] = []
        for it in items:
            if not isinstance(it, dict):
                continue
            p = it.get("path")
            c = it.get("content")
            if isinstance(p, str) and isinstance(c, str):
                normalized.append({"path": p, "content": c})
        if not normalized:
            parse_error = "No valid file objects in 'files' array."
            return ScaffoldOutcome(
                raw_model_text=raw,
                files=[],
                written_paths=[],
                parse_error=parse_error,
            )
        written = workspace.apply_files(normalized)
        return ScaffoldOutcome(
            raw_model_text=raw,
            files=normalized,
            written_paths=written,
            parse_error=None,
        )

    def npm_install(self, workspace: SessionWorkspace) -> CommandResult:
        runner = CommandRunner(cwd=workspace.root)
        return runner.run(["npm", "install"])

    def npm_build(self, workspace: SessionWorkspace) -> CommandResult:
        runner = CommandRunner(cwd=workspace.root)
        return runner.run(["npm", "run", "build"])
