#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

docker compose -f infra/docker-compose.yml up -d

python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -e ".[dev]"

pytest -q

echo "Smoke OK"

