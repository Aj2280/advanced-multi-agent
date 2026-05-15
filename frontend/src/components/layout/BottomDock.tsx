import type { BottomTab } from '../../types/workbench'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { SwarmPanel } from '../agents/SwarmPanel'
import type { AgentStatus, LogEntry, SwarmResponse } from '../../types/workbench'

const tabs: { id: BottomTab; label: string }[] = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'agents', label: 'Agents' },
  { id: 'build', label: 'Build log' },
]

export function BottomDock({
  tab,
  onTab,
  logs,
  terminalFallback,
  agents,
  swarmResult,
  activeAgent,
  onSelectAgent,
}: {
  tab: BottomTab
  onTab: (t: BottomTab) => void
  logs: LogEntry[]
  terminalFallback?: string
  agents: AgentStatus[]
  swarmResult: SwarmResponse | null
  activeAgent: string | null
  onSelectAgent: (id: string) => void
}) {
  return (
    <div className="h-full min-h-0 flex flex-col bg-canvas/95">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={[
              'px-3 py-1 rounded-md text-xs font-medium transition-colors',
              tab === t.id
                ? 'bg-surface-elevated text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            {t.label}
            {t.id === 'terminal' && logs.length > 0 && (
              <span className="ml-1.5 text-[10px] text-violet-400">{logs.length}</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'terminal' && <TerminalPanel logs={logs} fallback={terminalFallback} />}
        {tab === 'agents' && (
          <div className="h-full p-2">
            <SwarmPanel
              agents={agents}
              swarmResult={swarmResult}
              activeAgent={activeAgent}
              onSelectAgent={onSelectAgent}
            />
          </div>
        )}
        {tab === 'build' && (
          <pre className="h-full overflow-auto p-4 text-xs font-mono text-zinc-500 custom-scroll">
            {logs
              .filter((l) => l.kind === 'scaffold' || l.kind === 'swarm' || l.kind === 'info')
              .map((l) => `${l.title}\n${l.body}`)
              .join('\n\n---\n\n') || 'Build events appear here.'}
          </pre>
        )}
      </div>
    </div>
  )
}
