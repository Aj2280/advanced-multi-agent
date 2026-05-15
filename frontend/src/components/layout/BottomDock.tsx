import type { BottomTab } from '../../types/workbench'
import { TerminalPanel } from '../terminal/TerminalPanel'
import { SwarmPanel } from '../agents/SwarmPanel'
import type { AgentStatus, LogEntry, SwarmResponse } from '../../types/workbench'
import { TabBar } from '../ui/TabBar'

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
  const tabItems = tabs.map((t) => ({
    ...t,
    badge: t.id === 'terminal' ? logs.length : undefined,
  }))

  return (
    <div className="h-full min-h-0 flex flex-col bg-canvas/95 border-t border-border/50">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <TabBar tabs={tabItems} active={tab} onChange={onTab} />
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
