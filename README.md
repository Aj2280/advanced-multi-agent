# advanced-multi-agent (working MVP)

Production-style **multi-agent swarm** skeleton with:
- **Meta orchestration** + **debate/vote** selection
- **Unified multi-tier memory** (L1 deque, L2 Redis, L3 SQLite FTS5, L4 Chroma)
- **Provider routing** + **circuit breaker**
- **Observability**: Prometheus metrics + OpenTelemetry traces to **Jaeger**

## Quick start (local)

### 1) Start dependencies

```bash
cd advanced-multi-agent
docker compose -f infra/docker-compose.yml up -d
```

- Jaeger UI: `http://localhost:16686`
- Grafana: `http://localhost:3000`
- Prometheus: `http://localhost:9090`

### 2) Install Python deps

```bash
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -e ".[dev]"
```

### 3) Configure providers

Copy `.env.example` to `.env` and set at least one provider key/base URL.

### 4) Run

```bash
python -m main \
  --mode swarm \
  --agents researcher,coder,analyst,writer \
  --pattern debate \
  --memory all \
  --reflect \
  "Research Redis vs Kafka tradeoffs, propose a minimal architecture, and output a markdown report."
```

### (Optional) Agent Chat Website (local)

Run a simple Streamlit chat UI for the swarm agent:

```bash
streamlit run chat_ui.py --server.port 8502
```

Then open `http://localhost:8502`.

### Metrics (always-on)

If you want `http://localhost:9102/metrics` to be available even after a run finishes:

```bash
python -m observability.metrics_server
```

## Tests

```bash
pytest -q
```

