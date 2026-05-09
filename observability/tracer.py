from __future__ import annotations

import os
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Iterator

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


@dataclass(frozen=True)
class Tracer:
    name: str

    @staticmethod
    def from_env() -> "Tracer":
        service_name = os.environ.get("OTEL_SERVICE_NAME", "advanced-multi-agent")
        endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()

        provider = TracerProvider(resource=Resource.create({"service.name": service_name}))
        if endpoint:
            processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint, insecure=True))
            provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)
        return Tracer(name=service_name)

    @contextmanager
    def span(self, name: str, attributes: dict[str, Any] | None = None) -> Iterator[None]:
        tracer = trace.get_tracer(self.name)
        with tracer.start_as_current_span(name) as sp:
            if attributes:
                for k, v in attributes.items():
                    sp.set_attribute(k, v)
            yield

