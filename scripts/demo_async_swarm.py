import asyncio
import os
import uuid
from dotenv import load_dotenv

from communication.kafka_bus import KafkaBus, KafkaConfig
from communication.router import ProviderRouter
from communication.protocol import SwarmTask
from memory.unified_memory import UnifiedMemory, UnifiedMemoryConfig, UnifiedMemoryMode
from observability.metrics import Metrics
from observability.tracer import Tracer
from agents.orchestrator import Orchestrator
from agents.async_dispatcher import AsyncDispatcher

async def main():
    load_dotenv()
    
    # 1. Setup Infrastructure
    tracer = Tracer.from_env()
    metrics = Metrics()
    
    router = ProviderRouter.from_yaml(
        path="config/models.yaml",
        env=os.environ,
        tracer=tracer,
        metrics=metrics
    )
    
    memory = UnifiedMemory(
        config=UnifiedMemoryConfig.from_env(mode=UnifiedMemoryMode.all),
        tracer=tracer,
        metrics=metrics
    )
    
    orchestrator = Orchestrator(
        router=router,
        memory=memory,
        tracer=tracer,
        metrics=metrics
    )
    
    kafka = KafkaBus(cfg=KafkaConfig())
    dispatcher = AsyncDispatcher(orchestrator=orchestrator, kafka=kafka)
    
    # 2. Start Dispatcher in the background
    asyncio.create_task(dispatcher.start())
    await asyncio.sleep(2) # Give it a second to connect
    
    # 3. Submit two tasks simultaneously (Asynchronous!)
    task1 = SwarmTask(
        task_id=str(uuid.uuid4()),
        target_agent="researcher",
        prompt="Research the history of Kafka as a message bus.",
        reply_to="swarm_results"
    )
    
    task2 = SwarmTask(
        task_id=str(uuid.uuid4()),
        target_agent="coder",
        prompt="Write a simple python function to produce a Fibonacci sequence.",
        reply_to="swarm_results"
    )
    
    print("🚀 Submitting tasks to Kafka...")
    await dispatcher.submit_task(task1)
    await dispatcher.submit_task(task2)
    
    # 4. Listen for results on the results topic
    print("👂 Listening for results on 'swarm_results'...")
    results_count = 0
    async for msg in kafka.subscribe(topic="swarm_results", group_id="demo_listener"):
        print(f"\n📥 RECEIVED RESULT from {msg['sender']}:")
        print(f"Content: {msg['content'][:200]}...")
        results_count += 1
        if results_count >= 2:
            break

    print("\n✅ Demo Complete. Both tasks were processed asynchronously via Kafka!")

if __name__ == "__main__":
    asyncio.run(main())
