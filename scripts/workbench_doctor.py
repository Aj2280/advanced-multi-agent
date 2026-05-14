#!/usr/bin/env python3
"""
Quick local checks when the browser shows ERR_CONNECTION_REFUSED or the UI cannot reach the API.

Usage (from repo root):
  python scripts/workbench_doctor.py
  python scripts/workbench_doctor.py --api-port 8800 --ui-port 5173
"""
from __future__ import annotations

import argparse
import os
import socket
import sys
import urllib.error
import urllib.request
from pathlib import Path


def _tcp_open(host: str, port: int, timeout_s: float = 0.6) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout_s):
            return True
    except OSError:
        return False


def _http_ok(url: str, timeout_s: float = 2.0) -> tuple[bool, str]:
    try:
        with urllib.request.urlopen(url, timeout=timeout_s) as r:  # noqa: S310 — fixed URLs only
            body = r.read(200).decode("utf-8", errors="replace")
            return r.status == 200, body[:120]
    except urllib.error.URLError as e:
        return False, str(e.reason) if getattr(e, "reason", None) else str(e)
    except OSError as e:
        return False, str(e)


def main() -> int:
    p = argparse.ArgumentParser(description="Workbench / Vite connectivity doctor")
    p.add_argument("--api-port", type=int, default=int(os.environ.get("AMA_API_PORT", "8800")))
    p.add_argument("--ui-port", type=int, default=5173)
    args = p.parse_args()

    root = Path(__file__).resolve().parent.parent
    env_path = root / ".env"
    print(f"Repo: {root}")
    print(f".env present: {env_path.is_file()}")
    if not env_path.is_file():
        print("  → Copy .env.example to .env and add at least one LLM API key for scaffold/swarm.")

    try:
        from dotenv import load_dotenv

        load_dotenv(env_path, override=False)
    except ImportError:
        pass

    keys = (
        "OPENAI_API_KEY",
        "GROQ_API_KEY",
        "GEMINI_API_KEY",
        "OPENROUTER_API_KEY",
        "CEREBRAS_API_KEY",
    )
    set_keys = [k for k in keys if os.environ.get(k)]
    print(f"LLM env keys set (of common set): {len(set_keys)} — {', '.join(set_keys) or '(none)'}")
    if not set_keys:
        print("  → Without keys, /scaffold and /swarm will fail at runtime (API may still start).")

    api_host = "127.0.0.1"
    ui_host = "127.0.0.1"

    api_tcp = _tcp_open(api_host, args.api_port)
    ui_tcp = _tcp_open(ui_host, args.ui_port)

    api_label = "open" if api_tcp else "CLOSED — nothing listening"
    print()
    print(f"TCP {api_host}:{args.api_port} (API):  {api_label}")
    if not api_tcp:
        if (root / "ama_api" / "app.py").is_file():
            print("  → Fix: in repo root, run:  export AMA_DISABLE_HITL=1 && ama-api")
            print("     (or: python -m ama_api)")
        else:
            print(
                "  → No Workbench API in this checkout on port 8800; "
                "ignore unless you use the optional ama_api package.",
            )

    ui_label = "open" if ui_tcp else "CLOSED — nothing listening"
    print(f"TCP {ui_host}:{args.ui_port} (Vite): {ui_label}")
    if not ui_tcp:
        print("  → Fix: cd frontend && npm install && npm run dev")
        print("     Use the exact URL Vite prints (port may differ if 5173 is busy).")

    if api_tcp:
        ok, detail = _http_ok(f"http://{api_host}:{args.api_port}/health")
        print()
        print(f"GET /health: {'OK' if ok else 'FAILED'} — {detail}")
        if not ok:
            print("  → Port is open but HTTP failed; check logs in the API terminal.")

    print()
    if api_tcp and ui_tcp:
        print("Both ports accept connections. If the browser still fails, try http://127.0.0.1:5173/")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
