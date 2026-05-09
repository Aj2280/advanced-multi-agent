#!/bin/bash

echo "🚀 Starting Advanced Multi-Agent Swarm Ecosystem..."

# 1. Start Docker Infrastructure in the background
echo "🐳 Starting Docker services (Kafka, Redis, Chroma, Jaeger)..."
docker compose -f infra/docker-compose.yml up -d

# 2. Wait for services to be healthy
echo "⏳ Waiting for infrastructure to stabilize..."
sleep 2

# 3. Handle Port Conflicts (Clear port 8502 if in use)
echo "🧹 Checking for existing processes on port 8502..."
lsof -ti:8502 | xargs kill -9 2>/dev/null || true

# 4. Start the Streamlit Dashboard
echo ""
echo "🌟 Swarm Ecosystem Links:"
echo "--------------------------------------------------"
echo "🖥️  Main Dashboard:  http://localhost:8502"
echo "🕵️  Jaeger Traces:   http://localhost:16686"
echo "📊 Grafana:         http://localhost:3000"
echo "📈 Prometheus:      http://localhost:9090"
echo "--------------------------------------------------"
echo ""

source .venv/bin/activate
streamlit run chat_ui.py --server.port 8502
