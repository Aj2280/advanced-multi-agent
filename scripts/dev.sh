#!/usr/bin/env bash
# Start Workbench API + Vite UI. Run from repo root: ./scripts/dev.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_PORT="${AMA_API_PORT:-8800}"
UI_PORT="${VITE_PORT:-5173}"

if [[ ! -f .env ]]; then
  echo "WARNING: No .env file. Copy .env.example to .env and add API keys for scaffold/swarm."
fi

if [[ ! -d .venv ]]; then
  echo "Creating .venv ..."
  python3 -m venv .venv
fi
# shellcheck source=/dev/null
source .venv/bin/activate
pip install -q -e ".[dev]"

if [[ ! -d frontend/node_modules ]]; then
  echo "Installing frontend dependencies ..."
  (cd frontend && npm install)
fi

export AMA_DISABLE_HITL="${AMA_DISABLE_HITL:-1}"
export AMA_API_HOST="${AMA_API_HOST:-0.0.0.0}"
export AMA_API_CORS_ALLOW_ALL="${AMA_API_CORS_ALLOW_ALL:-1}"
export VITE_PROXY_API="http://127.0.0.1:${API_PORT}"
export AMA_API_PORT="$API_PORT"

cleanup() {
  jobs -p | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting API on port ${API_PORT} (host ${AMA_API_HOST}) ..."
AMA_API_PORT="$API_PORT" AMA_API_HOST="$AMA_API_HOST" python -m ama_api &
API_PID=$!

API_READY=0
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    echo "API healthy at http://127.0.0.1:${API_PORT}/health"
    API_READY=1
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "ERROR: API process exited. Check errors above."
    exit 1
  fi
  sleep 0.5
done

if [[ "$API_READY" -ne 1 ]]; then
  echo "ERROR: API did not become healthy on port ${API_PORT} within 20s."
  echo "  Check: .venv active, pip install -e \".[dev]\", and port not in use."
  kill "$API_PID" 2>/dev/null || true
  exit 1
fi

echo "Starting Vite on port ${UI_PORT} (open http://127.0.0.1:${UI_PORT}/) ..."
echo "Do not paste smart quotes into the URL — use plain http://127.0.0.1:${UI_PORT}/"
echo "If the UI looks unstyled, stop Vite and re-run ./scripts/dev.sh (PostCSS/Tailwind must load)."
cd frontend
# Ensure postcss.config.js is picked up (Tailwind in dev)
exec npm run dev -- --host 0.0.0.0 --port "$UI_PORT" --strictPort
