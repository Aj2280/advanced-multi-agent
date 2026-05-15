import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Hammer, Users } from 'lucide-react'
import type { AgentId, SwarmPattern } from '../../types/workbench'
import { filterTemplates } from '../../lib/promptTemplates'
import { Panel } from '../ui/Panel'
import { PromptEditor } from '../ui/PromptEditor'
import { SearchField } from '../ui/SearchField'
import { Button } from '../ui/Button'

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
  templateSearch,
  onTemplateSearch,
  onBuildPrompt,
  onSwarmPrompt,
  onPattern,
  onToggleAgent,
  onRunBuild,
  onRunSwarm,
  disabled,
}: {
  buildPrompt: string
  swarmPrompt: string
  pattern: SwarmPattern
  selectedAgents: AgentId[]
  templateSearch: string
  onTemplateSearch: (v: string) => void
  onBuildPrompt: (v: string) => void
  onSwarmPrompt: (v: string) => void
  onPattern: (p: SwarmPattern) => void
  onToggleAgent: (id: AgentId) => void
  onRunBuild: () => void
  onRunSwarm: () => void
  disabled?: boolean
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const templates = useMemo(() => filterTemplates(templateSearch), [templateSearch])

  return (
    <Panel title="Prompt" className="h-full">
      <div className="flex flex-col h-full min-h-0">
        <div className="shrink-0 px-2 pt-2 pb-2 border-b border-border/50 bg-violet-500/5">
          <SearchField
            id="prompt-template-search"
            label="Search prompts"
            value={templateSearch}
            onChange={onTemplateSearch}
            disabled={disabled}
            placeholder="landing, api, dashboard, todo…"
            hint={templateSearch ? `${templates.length} template${templates.length === 1 ? '' : 's'}` : 'Click a chip to fill the prompt'}
          />
        </div>

        <div className="shrink-0 max-h-28 overflow-y-auto custom-scroll px-2 py-2 border-b border-border/40">
          {templates.length === 0 ? (
            <p className="text-[10px] text-zinc-600 px-1">No templates match. Try “landing” or “api”.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onBuildPrompt(t.prompt)}
                  className="rounded-lg px-2 py-1 text-[10px] font-medium border border-border bg-canvas/60 text-zinc-400 hover:text-violet-200 hover:border-violet-500/40 hover:bg-violet-500/10 transition-colors disabled:opacity-40"
                  title={t.prompt}
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-3 flex flex-col gap-4">
          <PromptEditor
            label="Build prompt"
            value={buildPrompt}
            onChange={onBuildPrompt}
            onClear={() => onBuildPrompt('')}
            onSubmit={onRunSwarm}
            disabled={disabled}
            minRows={5}
            placeholder="e.g. Build a React + Vite todo app with dark mode…"
          />

          <div className="flex gap-2 shrink-0">
            <Button
              variant="primary"
              className="flex-1 !py-2 text-xs gap-1.5"
              onClick={onRunBuild}
              disabled={disabled || !buildPrompt.trim()}
            >
              <Hammer className="w-3.5 h-3.5" />
              Generate app
            </Button>
            <Button
              variant="success"
              className="flex-1 !py-2 text-xs gap-1.5"
              onClick={onRunSwarm}
              disabled={disabled || !(swarmPrompt.trim() || buildPrompt.trim())}
            >
              <Users className="w-3.5 h-3.5" />
              Run swarm
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Swarm & agents
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-1 border-t border-border/50">
              <PromptEditor
                label="Swarm prompt (optional)"
                value={swarmPrompt}
                onChange={onSwarmPrompt}
                onClear={() => onSwarmPrompt('')}
                disabled={disabled}
                minRows={3}
                hint="Uses build prompt if empty"
                placeholder="Override for debate…"
              />

              <div>
                <span className="text-[11px] font-medium text-zinc-500">Orchestration</span>
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
                <span className="text-[11px] font-medium text-zinc-500">Agents</span>
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
                          'rounded-xl p-2.5 text-left border transition-all',
                          on
                            ? 'border-cyan-500/40 bg-cyan-500/10'
                            : 'border-border bg-canvas/50 opacity-60 hover:opacity-100',
                        ].join(' ')}
                      >
                        <div className="text-xs font-medium text-zinc-200">{a.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{a.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
