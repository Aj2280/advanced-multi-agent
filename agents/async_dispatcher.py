import asyncio
import uuid
from typing import Any, Dict

from agents.orchestrator import Orchestrator
from communication.kafka_bus import KafkaBus
from communication.protocol import SwarmTask, AgentMessage

class AsyncDispatcher:
    def __init__(
        self,
        *,
        orchestrator: Orchestrator,
        kafka: KafkaBus,
        task_topic: str = "swarm_tasks",
    ) -> None:
        self.orchestrator = orchestrator
        self.kafka = kafka
        self.task_topic = task_topic
        self._running = False

    async def start(self):
        """Starts the dispatcher to listen for incoming Kafka tasks."""
        self._running = True
        print(f"📡 Async Dispatcher started. Listening on topic: {self.task_topic}")
        
        async for task_data in self.kafka.subscribe(topic=self.task_topic, group_id="swarm_dispatcher"):
            try:
                task = SwarmTask(**task_data)
                # Run the agent task in the background
                asyncio.create_task(self._process_task(task))
            except Exception as e:
                print(f"❌ Error parsing SwarmTask: {e}")

    async def _process_task(self, task: SwarmTask):
        """Routes a task to the specific agent and publishes the result."""
        print(f"⚡ Processing task {task.task_id} for agent {task.target_agent}")
        
        # Build the specific agent
        agents = self.orchestrator._build_agents([task.target_agent])
        agent = agents.get(task.target_agent)
        
        if not agent:
            print(f"⚠️ Agent {task.target_agent} not found.")
            return

        try:
            # Execute agent logic
            result = await agent.run(prompt=task.prompt, context=task.context)
            
            # If a reply topic is provided, send the result back
            if task.reply_to:
                response = AgentMessage(
                    kind="agent",
                    sender=task.target_agent,
                    content=result.content,
                    metadata={"task_id": task.task_id, **result.metadata}
                )
                await self.kafka.publish(topic=task.reply_to, message=response)
                print(f"✅ Task {task.task_id} complete. Response sent to {task.reply_to}")
            else:
                print(f"✅ Task {task.task_id} complete. (No reply-to topic)")
                
        except Exception as e:
            print(f"❌ Error executing task {task.task_id}: {e}")

    async def submit_task(self, task: SwarmTask):
        """Helper to submit a new task to the Kafka bus."""
        await self.kafka.publish(topic=self.task_topic, message=task)
