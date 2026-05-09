import asyncio
import json
from dataclasses import dataclass
from typing import Any, AsyncIterator, Callable

from kafka import KafkaConsumer, KafkaProducer
from pydantic import BaseModel

@dataclass(frozen=True)
class KafkaConfig:
    brokers: str = "localhost:9092"

class KafkaBus:
    def __init__(self, *, cfg: KafkaConfig) -> None:
        self.cfg = cfg
        self._producer = KafkaProducer(
            bootstrap_servers=cfg.brokers,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )

    async def publish(self, *, topic: str, message: dict[str, Any] | BaseModel) -> None:
        """Publishes a message to a Kafka topic without blocking the event loop."""
        data = message.model_dump() if isinstance(message, BaseModel) else message
        await asyncio.to_thread(self._publish_sync, topic, data)

    def _publish_sync(self, topic: str, data: dict[str, Any]) -> None:
        self._producer.send(topic, data)
        self._producer.flush(timeout=5)

    async def subscribe(self, *, topic: str, group_id: str) -> AsyncIterator[dict[str, Any]]:
        """Asynchronously consumes messages from a Kafka topic."""
        # Note: This is a simplified async wrapper around the blocking KafkaConsumer
        consumer = KafkaConsumer(
            topic,
            bootstrap_servers=self.cfg.brokers,
            group_id=group_id,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            value_deserializer=lambda b: json.loads(b.decode("utf-8")),
        )
        
        try:
            while True:
                # Poll in a thread to avoid blocking
                msg_pack = await asyncio.to_thread(consumer.poll, timeout_ms=1000)
                for tp, messages in msg_pack.items():
                    for msg in messages:
                        yield msg.value
                await asyncio.sleep(0.1)
        finally:
            await asyncio.to_thread(consumer.close)

