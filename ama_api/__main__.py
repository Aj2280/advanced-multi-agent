"""Run: AMA_API_PORT=8800 python -m ama_api (or `ama-api` console script)."""

from __future__ import annotations

import os

import uvicorn


def main() -> None:
    port = int(os.environ.get("AMA_API_PORT", "8800"))
    host = os.environ.get("AMA_API_HOST", "0.0.0.0")
    reload = os.environ.get("AMA_API_RELOAD") == "1"
    uvicorn.run("ama_api.app:app", host=host, port=port, reload=reload)


if __name__ == "__main__":
    main()
