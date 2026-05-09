import React, { useState } from 'react';

const Dashboard: React.FC = () => {
  const [agents] = useState([
    { id: 'meta', status: 'thinking', task: 'Orchestrating swarm...' },
    { id: 'researcher', status: 'idle', task: '-' },
    { id: 'coder', status: 'executing', task: 'Writing sandbox code' }
  ]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Advanced Multi-Agent Swarm
        </h1>
        <p className="text-gray-400 mt-2">Real-time Visualization & Orchestration</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {agents.map(agent => (
          <div key={agent.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg hover:border-blue-500 transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold capitalize">{agent.id} Agent</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium 
                ${agent.status === 'executing' || agent.status === 'thinking' ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>
                {agent.status}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Current Task:
              <p className="mt-1 text-gray-200">{agent.task}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Live Memory Hit Stream</h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-3 bg-gray-900 rounded border border-green-500/30 text-green-400">[L4 Semantic] Recalled past context for 'Redis vs Kafka' (Dist: 0.12)</div>
          <div className="p-3 bg-gray-900 rounded border border-blue-500/30 text-blue-400">[L2 Session] Quota tracked: 43 tokens used. Cache hit!</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
