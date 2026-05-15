import type { AgentStatus, SwarmResponse } from '../../types/workbench'
import { Panel } from '../ui/Panel'

const stateStyles = {
  idle: 'bg-zinc-800 text-zinc-500',
  running: 'bg-amber-500/20 text-amber-300 animate-pulse',
  done: 'bg-emerald-500/20 text-emerald-300',
  error: 'bg-rose-500/20 text-rose-300',
}

export function SwarmPanel({
  agents,
  swarmResult,
  activeAgent,
  onSelectAgent,
}: {
  agents: AgentStatus[]
  swarmResult: SwarmResponse | null
  activeAgent: string | null
  onSelectAgent: (id: string) => void
}) {
  const body =
    activeAgent && swarmResult?.by_agent[activeAgent]
      ? swarmResult.by_agent[activeAgent]
      : swarmResult?.final_output ?? ''

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        {agents.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelectAgent(a.id)}
            className={[
              'rounded-xl border p-3 text-left transition-all',
              activeAgent === a.id
                ? 'border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/30'
                : 'border-border bg-surface/60 hover:bg-surface-hover',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-semibold text-zinc-200">{a.label}</span>
              <span
                className={[
                  'text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold',
                  stateStyles[a.state],
                ].join(' ')}
              >
                {a.state}
              </span>
            </div>
            {a.excerpt && (
              <p className="mt-2 text-[10px] text-zinc-500 line-clamp-2 font-mono">{a.excerpt}</p>
            )}
          </button>
        ))}
      </div>

      {swarmResult?.judge_report && (
        <div className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200/90">
          <pre className="whitespace-pre-wrap font-sans">{swarmResult.judge_report}</pre>
        </div>
      )}

      <Panel title={activeAgent ? `Output · ${activeAgent}` : 'Swarm output'} className="flex-1 min-h-0">
        <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-zinc-300 leading-relaxed custom-scroll whitespace-pre-wrap">
          {body || 'Run swarm to see per-agent debate output here.'}
        </pre>
      </Panel>
    </div>
  )
}
