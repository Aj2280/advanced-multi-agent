import React, { useState, useEffect } from 'react';

const Dashboard: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [agents] = useState([
    { id: 'meta', status: 'thinking', task: 'Orchestrating swarm...' },
    { id: 'researcher', status: 'idle', task: '-' },
    { id: 'coder', status: 'executing', task: 'Writing sandbox code' }
  ]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8 font-sans transition-colors duration-300">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-500">
            Advanced Multi-Agent Swarm
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Real-time Visualization & Orchestration</p>
        </div>
        
        <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                theme === t 
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-300' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {agents.map(agent => (
          <div key={agent.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-blue-500 transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold capitalize">{agent.id} Agent</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium 
                ${agent.status === 'executing' || agent.status === 'thinking' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                {agent.status}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Current Task:
              <p className="mt-1 text-gray-800 dark:text-gray-200 font-medium">{agent.task}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Live Memory Hit Stream</h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-green-500/30 text-green-700 dark:text-green-400">
            [L4 Semantic] Recalled past context for 'Redis vs Kafka' (Dist: 0.12)
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border border-blue-500/30 text-blue-700 dark:text-blue-400">
            [L2 Session] Quota tracked: 43 tokens used. Cache hit!
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
