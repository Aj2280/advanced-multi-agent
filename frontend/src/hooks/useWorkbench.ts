import { useCallback, useMemo, useState } from 'react'
import { api, formatCommandOutput } from '../lib/api'
import type {
  AgentId,
  AgentStatus,
  BottomTab,
  LogEntry,
  LogKind,
  ScaffoldResponse,
  SwarmPattern,
  SwarmResponse,
} from '../types/workbench'

const ALL_AGENTS: { id: AgentId; label: string }[] = [
  { id: 'researcher', label: 'Researcher' },
  { id: 'coder', label: 'Coder' },
  { id: 'analyst', label: 'Analyst' },
  { id: 'writer', label: 'Writer' },
]

function logId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useWorkbench() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [files, setFiles] = useState<string[]>([])
  const [path, setPath] = useState('')
  const [content, setContent] = useState('')
  const [buildPrompt, setBuildPrompt] = useState(
    'Build a polished landing page with Vite, React, TypeScript, and Tailwind. Include hero, features, and footer.',
  )
  const [swarmPrompt, setSwarmPrompt] = useState('')
  const [pattern, setPattern] = useState<SwarmPattern>('debate')
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>(['researcher', 'coder', 'writer'])
  const [busy, setBusy] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal')
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(
    ALL_AGENTS.map((a) => ({ id: a.id, label: a.label, state: 'idle' })),
  )
  const [swarmResult, setSwarmResult] = useState<SwarmResponse | null>(null)
  const [activeAgentView, setActiveAgentView] = useState<string | null>(null)

  const pushLog = useCallback((kind: LogKind, title: string, body: string) => {
    setLogs((prev) => [...prev, { id: logId(), kind, title, body, ts: Date.now() }])
  }, [])

  const refreshFiles = useCallback(async (sid: string) => {
    const data = await api<{ files: string[] }>(`/v1/sessions/${sid}/files`)
    setFiles(data.files)
  }, [])

  const newSession = useCallback(async () => {
    setBusy(true)
    setSwarmResult(null)
    setAgentStatuses(ALL_AGENTS.map((a) => ({ id: a.id, label: a.label, state: 'idle' })))
    try {
      const res = await api<{ id: string }>('/v1/sessions', { method: 'POST' })
      setSessionId(res.id)
      setFiles([])
      setPath('')
      setContent('')
      pushLog('success', 'Session', `Created ${res.id}`)
      await refreshFiles(res.id)
    } catch (e) {
      pushLog('error', 'Session', String(e))
    } finally {
      setBusy(false)
    }
  }, [pushLog, refreshFiles])

  const loadFile = useCallback(
    async (p: string) => {
      if (!sessionId) return
      setBusy(true)
      try {
        const q = new URLSearchParams({ path: p })
        const data = await api<{ content: string }>(`/v1/sessions/${sessionId}/file?${q}`)
        setPath(p)
        setContent(data.content)
      } catch (e) {
        pushLog('error', 'Open file', String(e))
      } finally {
        setBusy(false)
      }
    },
    [pushLog, sessionId],
  )

  const saveFile = useCallback(async () => {
    if (!sessionId || !path) return
    setBusy(true)
    try {
      await api(`/v1/sessions/${sessionId}/file`, {
        method: 'PUT',
        body: JSON.stringify({ path, content }),
      })
      await refreshFiles(sessionId)
      pushLog('success', 'Saved', path)
    } catch (e) {
      pushLog('error', 'Save', String(e))
    } finally {
      setBusy(false)
    }
  }, [content, path, pushLog, refreshFiles, sessionId])

  const scaffold = useCallback(async () => {
    if (!sessionId) return
    setBusy(true)
    setBottomTab('terminal')
    pushLog('info', 'Scaffold', 'Generating project files…')
    try {
      const res = await api<ScaffoldResponse>(`/v1/sessions/${sessionId}/scaffold`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: buildPrompt,
          run_npm_install: true,
          run_npm_build: false,
        }),
      })
      if (res.parse_error) {
        pushLog('error', 'Scaffold parse', res.parse_error)
        if (res.model_excerpt) pushLog('info', 'Model excerpt', res.model_excerpt)
      } else {
        pushLog('success', 'Scaffold', `Wrote ${res.file_count} file(s)`)
        for (const cmd of res.commands ?? []) {
          pushLog(
            cmd.exit_code === 0 ? 'command' : 'error',
            cmd.step ?? 'npm',
            formatCommandOutput(cmd),
          )
        }
      }
      await refreshFiles(sessionId)
      if (res.written_paths?.[0]) void loadFile(res.written_paths[0])
    } catch (e) {
      pushLog('error', 'Scaffold', String(e))
    } finally {
      setBusy(false)
    }
  }, [buildPrompt, loadFile, pushLog, refreshFiles, sessionId])

  const runBuild = useCallback(async () => {
    if (!sessionId) return
    setBusy(true)
    setBottomTab('terminal')
    try {
      const res = await api<{ argv: string[]; exit_code: number; stdout: string; stderr: string }>(
        `/v1/sessions/${sessionId}/commands`,
        { method: 'POST', body: JSON.stringify({ argv: ['npm', 'run', 'build'] }) },
      )
      pushLog(res.exit_code === 0 ? 'command' : 'error', 'Build', formatCommandOutput(res))
    } catch (e) {
      pushLog('error', 'Build', String(e))
    } finally {
      setBusy(false)
    }
  }, [pushLog, sessionId])

  const runSwarm = useCallback(async () => {
    if (!sessionId) return
    const prompt = swarmPrompt.trim() || buildPrompt
    setBusy(true)
    setBottomTab('agents')
    setSwarmResult(null)
    setAgentStatuses(
      selectedAgents.map((id) => ({
        id,
        label: ALL_AGENTS.find((a) => a.id === id)?.label ?? id,
        state: 'running',
      })),
    )
    pushLog('info', 'Swarm', `Starting ${pattern} with ${selectedAgents.join(', ')}…`)
    try {
      const res = await api<SwarmResponse>(`/v1/sessions/${sessionId}/swarm`, {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          agent_names: selectedAgents,
          pattern,
          reflect: false,
          memory_mode: 'none',
        }),
      })
      setSwarmResult(res)
      const done = Object.keys(res.by_agent ?? {})
      setAgentStatuses(
        selectedAgents.map((id) => ({
          id,
          label: ALL_AGENTS.find((a) => a.id === id)?.label ?? id,
          state: 'done',
          excerpt: (res.by_agent[id] ?? '').slice(0, 120),
        })),
      )
      const winner = res.events?.find((e) => e.type === 'judge_done')
      if (winner?.winner) {
        pushLog('success', 'Debate winner', `${winner.winner} (score ${winner.score ?? '—'})`)
        setActiveAgentView(winner.winner)
      } else {
        setActiveAgentView(done[0] ?? null)
      }
      pushLog('swarm', 'Complete', res.final_output.slice(0, 2000))
    } catch (e) {
      setAgentStatuses((s) => s.map((a) => ({ ...a, state: 'error' })))
      pushLog('error', 'Swarm', String(e))
    } finally {
      setBusy(false)
    }
  }, [buildPrompt, pattern, pushLog, selectedAgents, sessionId, swarmPrompt])

  const toggleAgent = useCallback((id: AgentId) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

  const terminalText = useMemo(
    () =>
      logs
        .map((l) => {
          const prefix =
            l.kind === 'error' ? '[error]' : l.kind === 'success' ? '[ok]' : `[${l.kind}]`
          return `${prefix} ${l.title}\n${l.body}`
        })
        .join('\n\n'),
    [logs],
  )

  return {
    sessionId,
    files,
    path,
    setPath,
    content,
    setContent,
    buildPrompt,
    setBuildPrompt,
    swarmPrompt,
    setSwarmPrompt,
    pattern,
    setPattern,
    selectedAgents,
    toggleAgent,
    busy,
    logs,
    bottomTab,
    setBottomTab,
    agentStatuses,
    swarmResult,
    activeAgentView,
    setActiveAgentView,
    terminalText,
    newSession,
    loadFile,
    saveFile,
    scaffold,
    runBuild,
    runSwarm,
    refreshFiles: () => sessionId && refreshFiles(sessionId),
  }
}
