import type { AgentId, SwarmPattern } from '../../types/workbench'
import { Panel } from '../ui/Panel'

const AGENTS: { id: AgentId; label: string; desc: string }[] = [
  { id: 'researcher', label: 'Researcher', desc: 'Facts & search' },
  { id: 'coder', label: 'Coder', desc: 'Code & sandbox' },
  { id: 'analyst', label: 'Analyst', desc: 'Analysis' },
  { id: 'writer', label: 'Writer', desc: 'Synthesis' },
]

export function BuildComposer({
  buildPrompt,
  swarmPrompt,
  pattern,
  selectedAgents,
  onBuildPrompt,
  onSwarmPrompt,
  onPattern,
  onToggleAgent,
  disabled,
}: {
  buildPrompt: string
  swarmPrompt: string
  pattern: SwarmPattern
  selectedAgents: AgentId[]
  onBuildPrompt: (v: string) => void
  onSwarmPrompt: (v: string) => void
  onPattern: (p: SwarmPattern) => void
  onToggleAgent: (id: AgentId) => void
  disabled?: boolean
}) {
  return (
    <Panel title="Build" className="h-full">
      <div className="flex flex-col gap-4 p-3 overflow-auto custom-scroll flex-1">
        <label className="block">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            What should we build?
          </span>
          <textarea
            className="mt-2 w-full min-h-[120px] rounded-xl bg-canvas border border-border p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-y"
            value={buildPrompt}
            onChange={(e) => onBuildPrompt(e.target.value)}
            disabled={disabled}
            placeholder="Describe your app, API, or feature…"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Swarm override (optional)
          </span>
          <textarea
            className="mt-2 w-full min-h-[64px] rounded-xl bg-canvas border border-border p-3 text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500/30 resize-y"
            value={swarmPrompt}
            onChange={(e) => onSwarmPrompt(e.target.value)}
            disabled={disabled}
            placeholder="Leave empty to reuse build prompt for debate…"
          />
        </label>

        <div>
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Orchestration
          </span>
          <div className="mt-2 flex gap-2">
            {(['debate', 'pipeline', 'competitive'] as SwarmPattern[]).map((p) => (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => onPattern(p)}
                className={[
                  'flex-1 rounded-lg py-2 text-xs font-medium capitalize border transition-all',
                  pattern === p
                    ? 'border-violet-500/60 bg-violet-500/15 text-violet-200'
                    : 'border-border text-zinc-500 hover:border-zinc-600',
                ].join(' ')}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Agents
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {AGENTS.map((a) => {
              const on = selectedAgents.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggleAgent(a.id)}
                  className={[
                    'rounded-xl p-3 text-left border transition-all',
                    on
                      ? 'border-cyan-500/40 bg-cyan-500/10'
                      : 'border-border bg-canvas/50 opacity-60 hover:opacity-100',
                  ].join(' ')}
                >
                  <div className="text-sm font-medium text-zinc-200">{a.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{a.desc}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Panel>
  )
}
