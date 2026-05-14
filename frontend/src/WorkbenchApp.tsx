import React, { useCallback, useMemo, useState } from 'react'

const apiBase = () => (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!r.ok) {
    const t = await r.text()
    throw new Error(`${r.status} ${r.statusText}: ${t}`)
  }
  return (await r.json()) as T
}

export default function WorkbenchApp() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [files, setFiles] = useState<string[]>([])
  const [path, setPath] = useState('README.md')
  const [content, setContent] = useState('')
  const [scaffoldPrompt, setScaffoldPrompt] = useState(
    'Create a minimal Vite + React + TypeScript app with npm scripts dev/build.',
  )
  const [swarmPrompt, setSwarmPrompt] = useState('Summarize how you would structure this repo.')
  const [log, setLog] = useState('')
  const [busy, setBusy] = useState(false)

  const appendLog = useCallback((label: string, obj: unknown) => {
    setLog((prev) => prev + `\n\n--- ${label} ---\n` + JSON.stringify(obj, null, 2))
  }, [])

  const refreshFiles = useCallback(async (sid: string) => {
    const data = await api<{ files: string[] }>(`/v1/sessions/${sid}/files`)
    setFiles(data.files)
  }, [])

  const newSession = useCallback(async () => {
    setBusy(true)
    try {
      const res = await api<{ id: string }>('/v1/sessions', { method: 'POST' })
      setSessionId(res.id)
      setLog(`Session ${res.id}`)
      await refreshFiles(res.id)
    } catch (e) {
      appendLog('error', String(e))
    } finally {
      setBusy(false)
    }
  }, [appendLog, refreshFiles])

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
        appendLog('loadFile', String(e))
      } finally {
        setBusy(false)
      }
    },
    [appendLog, sessionId],
  )

  const saveFile = useCallback(async () => {
    if (!sessionId) return
    setBusy(true)
    try {
      await api(`/v1/sessions/${sessionId}/file`, {
        method: 'PUT',
        body: JSON.stringify({ path, content }),
      })
      await refreshFiles(sessionId)
      appendLog('saved', { path })
    } catch (e) {
      appendLog('save', String(e))
    } finally {
      setBusy(false)
    }
  }, [appendLog, content, path, refreshFiles, sessionId])

  const scaffold = useCallback(async () => {
    if (!sessionId) return
    setBusy(true)
    try {
      const res = await api<Record<string, unknown>>(`/v1/sessions/${sessionId}/scaffold`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: scaffoldPrompt,
          run_npm_install: true,
          run_npm_build: false,
        }),
      })
      appendLog('scaffold', res)
      await refreshFiles(sessionId)
    } catch (e) {
      appendLog('scaffold_error', String(e))
    } finally {
      setBusy(false)
    }
  }, [appendLog, refreshFiles, scaffoldPrompt, sessionId])

  const runCmd = useCallback(
    async (argv: string[]) => {
      if (!sessionId) return
      setBusy(true)
      try {
        const res = await api(`/v1/sessions/${sessionId}/commands`, {
          method: 'POST',
          body: JSON.stringify({ argv }),
        })
        appendLog(`cmd ${argv.join(' ')}`, res)
      } catch (e) {
        appendLog('cmd_error', String(e))
      } finally {
        setBusy(false)
      }
    },
    [appendLog, sessionId],
  )

  const runSwarm = useCallback(async () => {
    if (!sessionId) return
    setBusy(true)
    try {
      const res = await api(`/v1/sessions/${sessionId}/swarm`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: swarmPrompt,
          agent_names: ['researcher', 'coder', 'writer'],
          pattern: 'debate',
          reflect: false,
          memory_mode: 'none',
        }),
      })
      appendLog('swarm', res)
    } catch (e) {
      appendLog('swarm_error', String(e))
    } finally {
      setBusy(false)
    }
  }, [appendLog, sessionId, swarmPrompt])

  const fileList = useMemo(
    () =>
      files.map((f) => (
        <li key={f}>
          <button
            type="button"
            className="text-indigo-600 hover:underline text-sm"
            onClick={() => void loadFile(f)}
          >
            {f}
          </button>
        </li>
      )),
    [files, loadFile],
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Swarm Workbench</h1>
          <p className="text-slate-400 text-sm mt-1">
            Sessions, LLM scaffold (same router as the swarm), npm allowlist, and swarm API.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {sessionId ? `session: ${sessionId.slice(0, 10)}…` : 'no session'}
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium"
            onClick={() => void newSession()}
          >
            New session
          </button>
          <button
            type="button"
            disabled={!sessionId || busy}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sm"
            onClick={() => sessionId && void refreshFiles(sessionId)}
          >
            Refresh files
          </button>
          <button
            type="button"
            disabled={!sessionId || busy}
            className="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-sm"
            onClick={() => void scaffold()}
          >
            Scaffold + npm install
          </button>
          <button
            type="button"
            disabled={!sessionId || busy}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sm"
            onClick={() => void runCmd(['npm', 'run', 'build'])}
          >
            npm run build
          </button>
          <button
            type="button"
            disabled={!sessionId || busy}
            className="px-3 py-2 rounded bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-sm"
            onClick={() => void runSwarm()}
          >
            Run swarm (debate)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          <section className="lg:col-span-3 flex flex-col border border-slate-800 rounded-lg bg-slate-900/40 min-h-0">
            <div className="px-3 py-2 border-b border-slate-800 text-sm font-medium text-slate-300">
              Files
            </div>
            <ul className="flex-1 overflow-auto p-3 space-y-1 text-sm">{fileList}</ul>
          </section>

          <section className="lg:col-span-5 flex flex-col border border-slate-800 rounded-lg bg-slate-900/40 min-h-0">
            <div className="px-3 py-2 border-b border-slate-800 text-sm font-medium text-slate-300">
              Editor
            </div>
            <div className="p-2 flex flex-col gap-2 flex-1 min-h-0">
              <input
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm font-mono"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="relative/path.ts"
              />
              <textarea
                className="flex-1 min-h-[200px] bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
              />
              <button
                type="button"
                disabled={!sessionId || busy}
                className="self-start px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-sm disabled:opacity-50"
                onClick={() => void saveFile()}
              >
                Save file
              </button>
            </div>
          </section>

          <section className="lg:col-span-4 flex flex-col border border-slate-800 rounded-lg bg-slate-900/40 min-h-0">
            <div className="px-3 py-2 border-b border-slate-800 text-sm font-medium text-slate-300">
              Prompts
            </div>
            <div className="p-3 flex flex-col gap-3 flex-1 min-h-0">
              <label className="text-xs text-slate-400">
                Scaffold prompt
                <textarea
                  className="mt-1 w-full min-h-[100px] bg-slate-950 border border-slate-800 rounded p-2 text-xs"
                  value={scaffoldPrompt}
                  onChange={(e) => setScaffoldPrompt(e.target.value)}
                />
              </label>
              <label className="text-xs text-slate-400">
                Swarm prompt
                <textarea
                  className="mt-1 w-full min-h-[80px] bg-slate-950 border border-slate-800 rounded p-2 text-xs"
                  value={swarmPrompt}
                  onChange={(e) => setSwarmPrompt(e.target.value)}
                />
              </label>
            </div>
          </section>
        </div>

        <section className="border border-slate-800 rounded-lg bg-black/40 flex flex-col h-56 shrink-0">
          <div className="px-3 py-2 border-b border-slate-800 text-sm font-medium text-slate-300">
            Output / JSON log
          </div>
          <pre className="flex-1 overflow-auto p-3 text-xs text-emerald-200/90 whitespace-pre-wrap">
            {log || '…'}
          </pre>
        </section>
      </main>
    </div>
  )
}
