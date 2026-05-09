FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY pyproject.toml README.md /app/
COPY agents /app/agents
COPY communication /app/communication
COPY config /app/config
COPY infra /app/infra
COPY memory /app/memory
COPY observability /app/observability
COPY self_improvement /app/self_improvement
COPY tests /app/tests
COPY main.py /app/main.py

RUN pip install -U pip && pip install -e ".[dev]"

CMD ["python", "-m", "main", "--help"]

