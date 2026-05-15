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

cleanup() {
  jobs -p | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting API on port ${API_PORT} ..."
AMA_API_PORT="$API_PORT" python -m ama_api &
API_PID=$!

for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    echo "API healthy at http://127.0.0.1:${API_PORT}/health"
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API process exited. Check errors above."
    exit 1
  fi
  sleep 0.5
done

echo "Starting Vite on port ${UI_PORT} (open http://127.0.0.1:${UI_PORT}/) ..."
echo "Do not paste smart quotes into the URL — use plain http://127.0.0.1:${UI_PORT}/"
cd frontend
exec npm run dev -- --host 0.0.0.0 --port "$UI_PORT"
