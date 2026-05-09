from __future__ import annotations

import os
from dataclasses import dataclass

from prometheus_client import Counter, Histogram, REGISTRY, start_http_server

_SERVER_STARTED = False


def _get_or_create_counter(name: str, documentation: str, labelnames: list[str]) -> Counter:
    try:
        return Counter(name, documentation, labelnames)
    except ValueError:
        # Prometheus client raises "Duplicated timeseries in CollectorRegistry" when a metric
        # with the same name is registered twice (e.g., Streamlit script re-runs).
        existing = getattr(REGISTRY, "_names_to_collectors", {}).get(name)
        if existing is None:
            raise
        return existing


def _get_or_create_histogram(name: str, documentation: str, labelnames: list[str]) -> Histogram:
    try:
        return Histogram(name, documentation, labelnames)
    except ValueError:
        existing = getattr(REGISTRY, "_names_to_collectors", {}).get(name)
        if existing is None:
            raise
        return existing


@dataclass(frozen=True)
class Metrics:
    provider_requests_total: Counter
    provider_failures_total: Counter
    provider_latency_seconds: Histogram
    memory_writes_total: Counter

    def __init__(self, *, port: int | None = None) -> None:
        port = port if port is not None else int(os.environ.get("AMA_METRICS_PORT", "9102"))
        # Best-effort: don't crash the app if the port is already in use
        # (common when a previous run is still serving metrics).
        global _SERVER_STARTED  # noqa: PLW0603
        if not _SERVER_STARTED:
            try:
                start_http_server(port)
            except OSError:
                pass
            _SERVER_STARTED = True

        object.__setattr__(
            self,
            "provider_requests_total",
            _get_or_create_counter("ama_provider_requests_total", "Provider requests", ["provider"]),
        )
        object.__setattr__(
            self,
            "provider_failures_total",
            _get_or_create_counter("ama_provider_failures_total", "Provider failures", ["provider"]),
        )
        object.__setattr__(
            self,
            "provider_latency_seconds",
            _get_or_create_histogram("ama_provider_latency_seconds", "Provider latency", ["provider"]),
        )
        object.__setattr__(
            self,
            "memory_writes_total",
            _get_or_create_counter("ama_memory_writes_total", "Memory writes", ["kind"]),
        )

