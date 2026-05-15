import { useCallback, useRef, useState } from 'react'
import { api, formatCommandOutput, streamSwarm } from '../lib/api'
import { useToast } from '../components/ui/Toast'
import type {
  AgentId,
  AgentStatus,
  BottomTab,
  CenterTab,
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
  const { toast } = useToast()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [files, setFiles] = useState<string[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [path, setPath] = useState('')
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const [buildPrompt, setBuildPrompt] = useState(
    'Build a polished landing page with Vite, React, TypeScript, and Tailwind. Include hero, features, and footer.',
  )
  const [swarmPrompt, setSwarmPrompt] = useState('')
  const [pattern, setPattern] = useState<SwarmPattern>('debate')
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>(['researcher', 'coder', 'writer'])
  const [busy, setBusy] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal')
  const [centerTab, setCenterTab] = useState<CenterTab>('editor')
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(
    ALL_AGENTS.map((a) => ({ id: a.id, label: a.label, state: 'idle' })),
  )
  const [swarmResult, setSwarmResult] = useState<SwarmResponse | null>(null)
  const [activeAgentView, setActiveAgentView] = useState<string | null>(null)
  const swarmAbort = useRef<AbortController | null>(null)

  const isDirty = path.length > 0 && content !== savedContent
  const hasIndex = files.some(
    (f) =>
      f === 'index.html' ||
      f.endsWith('/index.html') ||
      f === 'dist/index.html' ||
      f.endsWith('.html'),
  )

  const pushLog = useCallback((kind: LogKind, title: string, body: string) => {
    setLogs((prev) => [...prev, { id: logId(), kind, title, body, ts: Date.now() }])
  }, [])

  const handleApiError = useCallback(
    (title: string, e: unknown) => {
      const msg = String(e)
      pushLog('error', title, msg)
      if (msg.includes('Failed to fetch') || msg.includes('Connection refused')) {
        toast({
          tone: 'error',
          title: 'Cannot reach API',
          message: 'Start the backend: ./scripts/dev.sh',
        })
      } else {
        toast({ tone: 'error', title, message: msg.slice(0, 200) })
      }
    },
    [pushLog, toast],
  )

  const refreshFiles = useCallback(async (sid: string) => {
    setFilesLoading(true)
    try {
      const data = await api<{ files: string[] }>(`/v1/sessions/${sid}/files`)
      setFiles(data.files)
      setPreviewKey((k) => k + 1)
    } finally {
      setFilesLoading(false)
    }
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
      setSavedContent('')
      pushLog('success', 'Session', `Created ${res.id}`)
      await refreshFiles(res.id)
    } catch (e) {
      handleApiError('Session', e)
    } finally {
      setBusy(false)
    }
  }, [handleApiError, pushLog, refreshFiles, toast])

  const loadFile = useCallback(
    async (p: string, opts?: { force?: boolean }) => {
      if (!sessionId) return
      if (!opts?.force && isDirty && !window.confirm('Discard unsaved changes?')) return
      setBusy(true)
      try {
        const q = new URLSearchParams({ path: p })
        const data = await api<{ content: string }>(`/v1/sessions/${sessionId}/file?${q}`)
        setPath(p)
        setContent(data.content)
        setSavedContent(data.content)
        setCenterTab('editor')
      } catch (e) {
        handleApiError('Open file', e)
      } finally {
        setBusy(false)
      }
    },
    [handleApiError, isDirty, sessionId],
  )

  const saveFile = useCallback(async () => {
    if (!sessionId || !path) return
    setBusy(true)
    try {
      await api(`/v1/sessions/${sessionId}/file`, {
        method: 'PUT',
        body: JSON.stringify({ path, content }),
      })
      setSavedContent(content)
      await refreshFiles(sessionId)
      pushLog('success', 'Saved', path)
      toast({ tone: 'success', title: 'File saved', message: path })
    } catch (e) {
      handleApiError('Save', e)
    } finally {
      setBusy(false)
    }
  }, [content, handleApiError, path, pushLog, refreshFiles, sessionId, toast])

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
        toast({ tone: 'error', title: 'Scaffold failed', message: res.parse_error })
      } else {
        pushLog('success', 'Scaffold', `Wrote ${res.file_count} file(s)`)
        toast({ tone: 'success', title: 'Project generated', message: `${res.file_count} files` })
        for (const cmd of res.commands ?? []) {
          pushLog(
            cmd.exit_code === 0 ? 'command' : 'error',
            cmd.step ?? 'npm',
            formatCommandOutput(cmd),
          )
        }
      }
      await refreshFiles(sessionId)
      const idx = res.written_paths?.find((p) => p.endsWith('index.html'))
      if (idx) {
        await loadFile(idx, { force: true })
        setCenterTab('preview')
      } else if (res.written_paths?.[0]) {
        await loadFile(res.written_paths[0], { force: true })
      }
    } catch (e) {
      handleApiError('Scaffold', e)
    } finally {
      setBusy(false)
    }
  }, [buildPrompt, handleApiError, loadFile, pushLog, refreshFiles, sessionId, toast])

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
      if (res.exit_code === 0) {
        toast({ tone: 'success', title: 'Build succeeded' })
        setPreviewKey((k) => k + 1)
      } else {
        toast({ tone: 'error', title: 'Build failed' })
      }
    } catch (e) {
      handleApiError('Build', e)
    } finally {
      setBusy(false)
    }
  }, [handleApiError, pushLog, sessionId, toast])

  const applySwarmResult = useCallback(
    (res: SwarmResponse, selected: AgentId[]) => {
      setSwarmResult(res)
      setAgentStatuses(
        selected.map((id) => ({
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
        const done = Object.keys(res.by_agent ?? {})
        setActiveAgentView(done[0] ?? null)
      }
      pushLog('swarm', 'Complete', res.final_output.slice(0, 2000))
    },
    [pushLog],
  )

  const runSwarm = useCallback(async () => {
    if (!sessionId) return
    const prompt = swarmPrompt.trim() || buildPrompt
    swarmAbort.current?.abort()
    const ac = new AbortController()
    swarmAbort.current = ac

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
    pushLog('info', 'Swarm', `Starting ${pattern} (streaming)…`)

    const body = {
      prompt,
      agent_names: selectedAgents,
      pattern,
      reflect: false,
      memory_mode: 'none',
    }

    try {
      await streamSwarm(
        sessionId,
        body,
        {
          onProgress: (evt) => {
            const t = evt.type as string
            const agent = evt.agent as string | undefined
            if (t === 'agent_start' && agent) {
              setAgentStatuses((prev) =>
                prev.map((a) => (a.id === agent ? { ...a, state: 'running' } : a)),
              )
            }
            if (t === 'agent_done' && agent) {
              setAgentStatuses((prev) =>
                prev.map((a) => (a.id === agent ? { ...a, state: 'done' } : a)),
              )
            }
            if (t === 'judge_done') {
              pushLog('info', 'Judge', `Winner: ${evt.winner}`)
            }
          },
          onComplete: (result) => {
            applySwarmResult(
              {
                final_output: result.final_output,
                by_agent: result.by_agent,
                judge_report: result.judge_report,
                events: result.events ?? [],
              },
              selectedAgents,
            )
            toast({ tone: 'success', title: 'Swarm complete' })
          },
          onError: (msg) => {
            setAgentStatuses((s) => s.map((a) => ({ ...a, state: 'error' })))
            handleApiError('Swarm', new Error(msg))
          },
        },
        ac.signal,
      )
    } catch (e) {
      if ((e as Error).name !== 'AbortError') handleApiError('Swarm', e)
    } finally {
      setBusy(false)
    }
  }, [
    applySwarmResult,
    buildPrompt,
    handleApiError,
    pattern,
    pushLog,
    selectedAgents,
    sessionId,
    swarmPrompt,
    toast,
  ])

  const toggleAgent = useCallback((id: AgentId) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

  const setContentTracked = useCallback((c: string) => {
    setContent(c)
  }, [])

  return {
    sessionId,
    files,
    filesLoading,
    path,
    setPath,
    content,
    setContent: setContentTracked,
    isDirty,
    hasIndex,
    previewKey,
    bumpPreview: () => setPreviewKey((k) => k + 1),
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
    centerTab,
    setCenterTab,
    agentStatuses,
    swarmResult,
    activeAgentView,
    setActiveAgentView,
    newSession,
    loadFile,
    saveFile,
    scaffold,
    runBuild,
    runSwarm,
    refreshFiles: () => sessionId && refreshFiles(sessionId),
  }
}
