import type { SwarmResponse } from '../types/workbench'
import { apiBase } from './apiHealth'

export { apiBase }

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
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

export function formatCommandOutput(res: {
  argv?: string[]
  exit_code?: number
  stdout?: string
  stderr?: string
}): string {
  const argv = res.argv?.join(' ') ?? 'command'
  const code = res.exit_code ?? -1
  const out = [
    `$ ${argv}`,
    res.stdout ? res.stdout.trimEnd() : '',
    res.stderr ? `[stderr]\n${res.stderr.trimEnd()}` : '',
    `exit ${code}`,
  ].filter(Boolean)
  return out.join('\n')
}

/** Path-based preview URL so relative JS/CSS in the iframe resolve under /preview/… */
export function previewUrl(sessionId: string, path = 'index.html'): string {
  const rel = path.trim().replace(/^\//, '') || 'index.html'
  const segments = rel.split('/').map(encodeURIComponent).join('/')
  return `${apiBase()}/v1/sessions/${sessionId}/preview/${segments}`
}

export type SwarmStreamHandlers = {
  onProgress: (event: Record<string, unknown>) => void
  onComplete: (result: SwarmResponse) => void
  onError: (message: string) => void
}

export async function streamSwarm(
  sessionId: string,
  body: Record<string, unknown>,
  handlers: SwarmStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const r = await fetch(`${apiBase()}/v1/sessions/${sessionId}/swarm/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!r.ok) {
    const t = await r.text()
    handlers.onError(`${r.status}: ${t}`)
    return
  }
  const reader = r.body?.getReader()
  if (!reader) {
    handlers.onError('No response body')
    return
  }
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      try {
        const data = JSON.parse(line.slice(6)) as {
          type: string
          event?: Record<string, unknown>
          result?: SwarmResponse
          message?: string
        }
        if (data.type === 'progress' && data.event) handlers.onProgress(data.event)
        if (data.type === 'complete' && data.result) handlers.onComplete(data.result)
        if (data.type === 'error') handlers.onError(data.message ?? 'Unknown error')
      } catch {
        /* skip malformed chunk */
      }
    }
  }
}
